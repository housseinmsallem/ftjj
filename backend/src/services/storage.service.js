import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const provider = process.env.STORAGE_PROVIDER || 'local';
const maxSizeMb = Number(process.env.UPLOAD_MAX_MB || 10);
const allowedMimeTypes = (process.env.UPLOAD_ALLOWED_MIMES || 'image/jpeg,image/png,image/webp,application/pdf').split(',');

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

const s3 = new S3Client({
  region: process.env.S3_REGION || 'eu-west-3',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  credentials: process.env.S3_ACCESS_KEY_ID ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } : undefined
});

export const uploadPolicy = { maxSizeBytes: maxSizeMb * 1024 * 1024, allowedMimeTypes };

export function validateUpload(file) {
  if (!file) throw new Error('Fichier manquant');
  if (!allowedMimeTypes.includes(file.mimetype)) throw new Error(`Type fichier non autorise: ${file.mimetype}`);
  if (file.size > uploadPolicy.maxSizeBytes) throw new Error(`Fichier trop volumineux. Max ${maxSizeMb} MB`);
}

export async function storeFile(file, folder = 'documents') {
  validateUpload(file);
  if (provider === 'cloudinary') {
    const result = await cloudinary.uploader.upload(file.path, { folder: `ftjj/${folder}`, resource_type: 'auto' });
    fs.unlinkSync(file.path);
    return { provider, url: result.secure_url, key: result.public_id, size: file.size, mimeType: file.mimetype, originalName: file.originalname };
  }
  if (provider === 's3' || provider === 'ovh') {
    const bucket = process.env.S3_BUCKET;
    const key = `ftjj/${folder}/${Date.now()}-${file.originalname}`.replace(/\s+/g, '-');
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: fs.createReadStream(file.path), ContentType: file.mimetype }));
    fs.unlinkSync(file.path);
    const base = process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${bucket}`;
    return { provider, url: `${base}/${key}`, key, size: file.size, mimeType: file.mimetype, originalName: file.originalname };
  }
  const publicPath = `/uploads/${path.basename(file.path)}`;
  return { provider: 'local', url: publicPath, key: file.filename, size: file.size, mimeType: file.mimetype, originalName: file.originalname };
}

export async function deleteStoredFile(meta) {
  if (!meta?.key) return;
  if (meta.provider === 'cloudinary') await cloudinary.uploader.destroy(meta.key, { resource_type: 'auto' });
  if (meta.provider === 's3' || meta.provider === 'ovh') await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: meta.key }));
}
