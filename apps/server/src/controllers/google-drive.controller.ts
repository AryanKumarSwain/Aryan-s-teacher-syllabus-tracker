import type { NextFunction, Request, Response } from 'express';
import { googleDriveService } from '../services/google-drive.service.js';
import { getTenantId } from '../middleware/tenant.js';
import { sendSuccess } from '../utils/api-response.js';
import { env } from '../config/env.js';
import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';

export const googleDriveController = {
  /**
   * Returns Google OAuth URL for frontend to redirect
   */
  async getAuthUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const returnUrl = (req.query.returnUrl as string) || `${env.APP_URL}/admin/exam-papers`;
      const authUrl = googleDriveService.getAuthUrl(schoolId, req.user?.sub, returnUrl);
      sendSuccess(res, { authUrl });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Direct redirect to Google OAuth
   */
  async connect(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const returnUrl = (req.query.returnUrl as string) || `${env.APP_URL}/admin/exam-papers`;
      const authUrl = googleDriveService.getAuthUrl(schoolId, req.user?.sub, returnUrl);
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Google OAuth Callback
   */
  async callback(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;
      const error = req.query.error as string;

      const fallbackUrl = `${env.APP_URL}/admin/exam-papers`;

      if (error) {
        console.error('[Google Drive OAuth error callback]:', error);
        return res.redirect(`${fallbackUrl}?drive_error=${encodeURIComponent(error)}`);
      }

      if (!code || !state) {
        return res.redirect(`${fallbackUrl}?drive_error=missing_credentials`);
      }

      const result = await googleDriveService.handleCallback(code, state);
      const separator = result.returnUrl.includes('?') ? '&' : '?';
      return res.redirect(`${result.returnUrl}${separator}drive_connected=true`);
    } catch (error: any) {
      console.error('[Google Drive callback handler error]:', error);
      const fallbackUrl = `${env.APP_URL}/admin/exam-papers`;
      return res.redirect(`${fallbackUrl}?drive_error=${encodeURIComponent(error?.message || 'callback_failed')}`);
    }
  },

  /**
   * Checks Google Drive connection status
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const status = await googleDriveService.getStatus(schoolId);
      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Disconnects Google Drive
   */
  async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      await googleDriveService.disconnect(schoolId);
      sendSuccess(res, { message: 'Google Drive disconnected successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upload an Exam Paper to Google Drive
   */
  async uploadPaper(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = getTenantId(req);
      const paperId = String(req.params.id);

      let buffer: Buffer | null = null;
      let customFileName = req.body.fileName as string | undefined;

      if (req.file) {
        buffer = req.file.buffer;
        if (!customFileName && req.file.originalname) {
          customFileName = req.file.originalname;
        }
      } else {
        // Fallback: Check if paper has existing pdfUrl
        const paper = await prisma.examPaper.findFirst({
          where: { id: paperId, schoolId },
          select: { pdfUrl: true, examName: true },
        });

        if (paper?.pdfUrl) {
          const fetchRes = await fetch(paper.pdfUrl);
          if (fetchRes.ok) {
            const arrayBuf = await fetchRes.arrayBuffer();
            buffer = Buffer.from(arrayBuf);
          }
        }
      }

      if (!buffer) {
        throw new AppError('No PDF file provided for upload. Please upload or generate the PDF first.', 400);
      }

      const result = await googleDriveService.uploadExamPaper(schoolId, paperId, buffer, customFileName);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
};
