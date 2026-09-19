import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(file: File | Buffer, folder: string = 'exam-papers'): Promise<string> {
  const buffer = file instanceof Buffer ? file : Buffer.from(await (file as File).arrayBuffer());

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { 
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result?.secure_url || '');
      }
    ).end(buffer);
  });
}
