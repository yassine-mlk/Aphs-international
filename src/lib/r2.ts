import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const R2_ENDPOINT = `https://${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_BUCKET = import.meta.env.VITE_R2_BUCKET_NAME || 'aps-task-files';
const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN || '';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID!,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY!,
  },
});

export const uploadToR2 = async (
  file: File | Blob,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: R2_BUCKET,
      Key: path,
      Body: file,
      ContentType: file.type || 'application/octet-stream',
    },
    queueSize: 6,
    partSize: 20 * 1024 * 1024,
  });

  upload.on('httpUploadProgress', (progress) => {
    if (onProgress && progress.total) {
      onProgress(Math.round((progress.loaded / progress.total) * 100));
    }
  });

  await upload.done();

  const publicUrl = R2_PUBLIC_DOMAIN
    ? `${R2_PUBLIC_DOMAIN}/${path}`
    : `https://${R2_BUCKET}.${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${path}`;

  return publicUrl;
};
