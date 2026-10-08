import { prisma } from '@school-syllabus/database';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error-handler.js';

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink?: string;
  folderPath: string;
  classFolderName: string;
  subjectFolderName: string;
}

export class GoogleDriveService {
  /**
   * Generates the Google OAuth authorization URL for Google Drive access
   */
  getAuthUrl(schoolId: string, userId?: string, returnUrl?: string): string {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new AppError('Google Client ID and Secret are not configured on the server', 500);
    }

    const redirectUri = env.GOOGLE_DRIVE_CALLBACK_URL || env.GOOGLE_CALLBACK_URL;
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

    const statePayload = JSON.stringify({
      type: 'GOOGLE_DRIVE',
      schoolId,
      userId,
      returnUrl: returnUrl || `${env.APP_URL}/admin/exam-papers`,
    });
    const state = Buffer.from(statePayload).toString('base64url');

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent select_account',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      state,
    });

    return `${rootUrl}?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for tokens and saves to database
   */
  async handleCallback(code: string, stateStr: string): Promise<{ schoolId: string; returnUrl: string; email?: string }> {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new AppError('Google OAuth is not configured', 500);
    }

    let state: { schoolId: string; userId?: string; returnUrl?: string };
    try {
      const decoded = Buffer.from(stateStr, 'base64url').toString('utf-8');
      state = JSON.parse(decoded);
    } catch {
      throw new AppError('Invalid OAuth state parameter', 400);
    }

    const { schoolId, userId, returnUrl } = state;
    if (!schoolId) {
      throw new AppError('Missing school ID in state parameter', 400);
    }

    const redirectUri = env.GOOGLE_DRIVE_CALLBACK_URL || env.GOOGLE_CALLBACK_URL;

    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as any;
    if (!tokenRes.ok) {
      console.error('[Google Drive token exchange failed]:', tokenData);
      throw new AppError(tokenData.error_description || 'Failed to exchange Google Drive code for token', 400);
    }

    // 2. Fetch authenticated user email
    let email: string | undefined;
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userRes.ok) {
        const userInfo = (await userRes.json()) as any;
        email = userInfo.email;
      }
    } catch (e) {
      console.warn('[Failed to fetch Google user email]:', e);
    }

    // 3. Store tokens in database
    const expiryDate = BigInt(Date.now() + (tokenData.expires_in || 3600) * 1000);

    await prisma.googleDriveToken.upsert({
      where: { schoolId },
      create: {
        schoolId,
        userId: userId || null,
        email: email || null,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || '',
        expiryDate,
      },
      update: {
        userId: userId || undefined,
        email: email || undefined,
        accessToken: tokenData.access_token,
        ...(tokenData.refresh_token ? { refreshToken: tokenData.refresh_token } : {}),
        expiryDate,
      },
    });

    return {
      schoolId,
      returnUrl: returnUrl || `${env.APP_URL}/admin/exam-papers`,
      email,
    };
  }

  /**
   * Retrieves a valid access token for the school, refreshing if expired
   */
  async getValidAccessToken(schoolId: string): Promise<string> {
    const token = await prisma.googleDriveToken.findUnique({
      where: { schoolId },
    });

    if (!token || !token.refreshToken) {
      throw new AppError('Google Drive is not connected for this school. Please connect Google Drive first.', 400);
    }

    const now = BigInt(Date.now());
    const isExpired = !token.expiryDate || token.expiryDate <= (now + 60000n);

    if (!isExpired) {
      return token.accessToken;
    }

    // Refresh token
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        refresh_token: token.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const refreshData = (await refreshRes.json()) as any;
    if (!refreshRes.ok) {
      console.error('[Google Drive token refresh failed]:', refreshData);
      throw new AppError(
        refreshData.error_description || 'Google Drive authorization expired. Please reconnect your Google Drive account.',
        401,
      );
    }

    const newExpiryDate = BigInt(Date.now() + (refreshData.expires_in || 3600) * 1000);

    await prisma.googleDriveToken.update({
      where: { schoolId },
      data: {
        accessToken: refreshData.access_token,
        expiryDate: newExpiryDate,
      },
    });

    return refreshData.access_token;
  }

  /**
   * Finds or creates a folder inside Google Drive under an optional parent folder
   */
  async findOrCreateFolder(accessToken: string, folderName: string, parentFolderId?: string): Promise<string> {
    const sanitizedName = folderName.replace(/'/g, "\\'");
    const parentClause = parentFolderId ? `'${parentFolderId}' in parents` : `'root' in parents`;
    const query = `mimeType='application/vnd.google-apps.folder' and name='${sanitizedName}' and ${parentClause} and trashed=false`;

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (searchRes.ok) {
      const data = (await searchRes.json()) as any;
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Folder doesn't exist, create it
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : [],
      }),
    });

    const createData = (await createRes.json()) as any;
    if (!createRes.ok) {
      console.error('[Google Drive folder creation failed]:', createData);
      throw new AppError(createData.error?.message || `Failed to create Google Drive folder: ${folderName}`, 500);
    }

    return createData.id;
  }

  /**
   * Uploads a file to Google Drive under a specific folder using multipart upload
   */
  async uploadFileToFolder(
    accessToken: string,
    fileName: string,
    folderId: string,
    fileBuffer: Buffer,
    mimeType: string = 'application/pdf',
  ): Promise<{ id: string; name: string; webViewLink?: string; webContentLink?: string }> {
    const boundary = `----GoogleDriveBoundary${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = JSON.stringify({
      name: fileName,
      parents: [folderId],
    });

    const metadataHeader = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      metadata;

    const mediaHeader = delimiter +
      `Content-Type: ${mimeType}\r\n\r\n`;

    const multipartRequestBody = Buffer.concat([
      Buffer.from(metadataHeader, 'utf-8'),
      Buffer.from(mediaHeader, 'utf-8'),
      fileBuffer,
      Buffer.from(closeDelimiter, 'utf-8'),
    ]);

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink';
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(multipartRequestBody.length),
      },
      body: multipartRequestBody,
    });

    const uploadData = (await uploadRes.json()) as any;
    if (!uploadRes.ok) {
      console.error('[Google Drive file upload failed]:', uploadData);
      throw new AppError(uploadData.error?.message || `Failed to upload file to Google Drive: ${fileName}`, 500);
    }

    return uploadData;
  }

  /**
   * Uploads an exam paper to Google Drive with automatic Class -> Subject folder structure
   */
  async uploadExamPaper(
    schoolId: string,
    paperId: string,
    pdfBuffer: Buffer,
    customFileName?: string,
  ): Promise<DriveUploadResult> {
    const paper = await prisma.examPaper.findFirst({
      where: { id: paperId, schoolId },
      include: {
        class: true,
        subject: true,
        school: true,
      },
    });

    if (!paper) {
      throw new AppError('Exam paper not found', 404);
    }

    const accessToken = await this.getValidAccessToken(schoolId);

    // 1. Root Exam Papers Folder
    const rootFolderName = 'Exam Papers';
    const rootFolderId = await this.findOrCreateFolder(accessToken, rootFolderName);

    // 2. Classwise Folder (e.g. "Class 10")
    const className = paper.class?.name ? `Class ${paper.class.name.replace(/^class\s*/i, '')}` : 'Unassigned Class';
    const classFolderId = await this.findOrCreateFolder(accessToken, className, rootFolderId);

    // 3. Subjectwise Subfolder (e.g. "Mathematics")
    const subjectName = paper.subject?.name || 'General';
    const subjectFolderId = await this.findOrCreateFolder(accessToken, subjectName, classFolderId);

    // 4. File Name formatting
    const cleanExamName = paper.examName.replace(/[/\\?%*:|"<>]/g, '_').trim();
    const finalFileName = customFileName
      ? `${customFileName.replace(/\.pdf$/i, '')}.pdf`
      : `${cleanExamName}.pdf`;

    // 5. Upload PDF file
    const uploadedFile = await this.uploadFileToFolder(
      accessToken,
      finalFileName,
      subjectFolderId,
      pdfBuffer,
      'application/pdf',
    );

    // 6. Update database with Drive links
    await prisma.examPaper.update({
      where: { id: paperId },
      data: {
        googleDriveFileId: uploadedFile.id,
        googleDriveWebViewLink: uploadedFile.webViewLink || null,
      },
    });

    return {
      fileId: uploadedFile.id,
      fileName: uploadedFile.name,
      webViewLink: uploadedFile.webViewLink,
      folderPath: `${rootFolderName} / ${className} / ${subjectName}`,
      classFolderName: className,
      subjectFolderName: subjectName,
    };
  }

  /**
   * Fetches user and storage quota from Google Drive API
   */
  async getStorageQuota(accessToken: string): Promise<{
    limit?: number;
    usage: number;
    usageInDrive?: number;
    percent?: number;
    email?: string;
  } | null> {
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn('[Failed to fetch Drive storageQuota]:', res.status, errText);
        return null;
      }
      const data = (await res.json()) as any;
      const quota = data?.storageQuota;
      if (!quota) return null;

      const limit = quota.limit ? Number(quota.limit) : undefined;
      const usage = quota.usage ? Number(quota.usage) : 0;
      const usageInDrive = quota.usageInDrive ? Number(quota.usageInDrive) : 0;
      const percent = limit && limit > 0 ? Math.min(100, Math.round((usage / limit) * 100)) : undefined;

      return {
        limit,
        usage,
        usageInDrive,
        percent,
        email: data.user?.emailAddress,
      };
    } catch (err) {
      console.warn('[Error fetching Google Drive quota]:', err);
      return null;
    }
  }

  /**
   * Gets Google Drive connection status and storage quota for the school
   */
  async getStatus(schoolId: string): Promise<{
    connected: boolean;
    email?: string | null;
    updatedAt?: Date;
    storage?: {
      limit?: number;
      usage: number;
      usageInDrive?: number;
      percent?: number;
      formattedUsage: string;
      formattedLimit?: string;
      isNearFull: boolean;
      isCritical: boolean;
    } | null;
  }> {
    const token = await prisma.googleDriveToken.findUnique({
      where: { schoolId },
      select: { email: true, updatedAt: true, refreshToken: true },
    });

    if (!token || !token.refreshToken) {
      return { connected: false };
    }

    let storage = null;
    let resolvedEmail = token.email;

    try {
      const accessToken = await this.getValidAccessToken(schoolId);
      const quota = await this.getStorageQuota(accessToken);
      if (quota) {
        if (quota.email && quota.email !== token.email) {
          resolvedEmail = quota.email;
          prisma.googleDriveToken.update({
            where: { schoolId },
            data: { email: quota.email },
          }).catch(() => {});
        }

        const formatBytes = (bytes: number) => {
          if (bytes >= 1024 * 1024 * 1024) {
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
          }
          return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        };

        const isNearFull = quota.percent !== undefined && quota.percent >= 80;
        const isCritical = quota.percent !== undefined && quota.percent >= 90;

        storage = {
          limit: quota.limit,
          usage: quota.usage,
          usageInDrive: quota.usageInDrive,
          percent: quota.percent,
          formattedUsage: formatBytes(quota.usage),
          formattedLimit: quota.limit ? formatBytes(quota.limit) : undefined,
          isNearFull,
          isCritical,
        };
      }
    } catch (e) {
      console.warn('[Could not retrieve Google Drive storage details]:', e);
    }

    return {
      connected: true,
      email: resolvedEmail,
      updatedAt: token.updatedAt,
      storage,
    };
  }

  /**
   * Disconnects Google Drive from the school
   */
  async disconnect(schoolId: string): Promise<void> {
    await prisma.googleDriveToken.deleteMany({
      where: { schoolId },
    });
  }
}

export const googleDriveService = new GoogleDriveService();
