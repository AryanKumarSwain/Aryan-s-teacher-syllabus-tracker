import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

function getCloudinary() {
  const cloudName = env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    const msg = `[Cloudinary config missing]: cloudName=${!!cloudName}, apiKey=${!!apiKey}, apiSecret=${!!apiSecret}`;
    console.error(msg);
    throw new Error('Cloudinary credentials are not properly configured on server. Please check .env file.');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  return cloudinary;
}

export async function uploadImage(file: File | Buffer, folder: string = 'exam-papers'): Promise<string> {
  const cld = getCloudinary();
  const buffer = file instanceof Buffer ? file : Buffer.from(await (file as File).arrayBuffer());

  return new Promise((resolve, reject) => {
    cld.uploader.upload_stream(
      { 
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary upload failed]:', error);
          reject(error);
        } else {
          resolve(result?.secure_url || '');
        }
      }
    ).end(buffer);
  });
}
