import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

function isCloudinaryConfigured(): boolean {
  const cloudName = env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;

  return !!(
    cloudName &&
    apiKey &&
    apiSecret &&
    !cloudName.includes('your_') &&
    !cloudName.includes('example') &&
    cloudName.trim() !== ''
  );
}

function getCloudinary() {
  const cloudName = env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  return cloudinary;
}

/**
 * Detect file extension from buffer magic bytes
 */
function detectExtension(buffer: Buffer): string {
  if (buffer.length >= 4) {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'png';
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpg';
    }
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return 'gif';
    }
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      return 'webp';
    }
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'pdf';
    }
    // SVG detection (starts with <?xml or <svg)
    const startStr = buffer.slice(0, 100).toString('utf-8').trim();
    if (startStr.startsWith('<?xml') || startStr.startsWith('<svg')) {
      return 'svg';
    }
  }
  return 'png';
}

/**
 * Saves file to local uploads directory and returns an accessible URL
 */
async function saveToLocalUploads(buffer: Buffer, folder: string, ext: string): Promise<string> {
  const uploadsDir = path.resolve(process.cwd(), 'uploads', folder);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.promises.writeFile(filePath, buffer);

  // Return root-relative URL so it cleanly resolves on any domain, IP or port without CORS issues
  return `/api/uploads/${folder}/${fileName}`;
}

export async function uploadImage(file: File | Buffer, folder: string = 'exam-papers'): Promise<string> {
  const buffer = file instanceof Buffer ? file : Buffer.from(await (file as File).arrayBuffer());
  const ext = detectExtension(buffer);

  // 1. If Cloudinary is configured, attempt upload
  if (isCloudinaryConfigured()) {
    try {
      const cld = getCloudinary();
      const uploadedUrl = await new Promise<string>((resolve, reject) => {
        cld.uploader.upload_stream(
          { 
            folder,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result?.secure_url || '');
            }
          }
        ).end(buffer);
      });

      if (uploadedUrl) {
        return uploadedUrl;
      }
    } catch (error: any) {
      console.warn(`[Cloudinary upload error (${error?.message || error}), gracefully falling back to local storage]`);
    }
  }

  // 2. Reliable Local Storage Fallback
  return saveToLocalUploads(buffer, folder, ext);
}
