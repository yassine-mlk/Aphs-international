import { 
  S3Client, 
  PutObjectCommand, 
  CreateMultipartUploadCommand, 
  UploadPartCommand, 
  CompleteMultipartUploadCommand, 
  AbortMultipartUploadCommand 
} from "@aws-sdk/client-s3";

// Configuration Cloudflare R2
const R2_ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME || "aps-task-files";
const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN || "";

// Log de configuration (sans les secrets)
console.log('R2 Config:', {
  hasAccountId: !!R2_ACCOUNT_ID, 
  hasAccessKey: !!R2_ACCESS_KEY_ID, 
  hasSecretKey: !!R2_SECRET_ACCESS_KEY,
  bucketName: R2_BUCKET_NAME,
  publicDomain: R2_PUBLIC_DOMAIN 
});

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload un fichier (File ou Blob) vers Cloudflare R2
 */
export const uploadToR2 = async (
  file: File | Blob, 
  path: string, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("Configuration Cloudflare R2 manquante");
  }

  // Seuil pour l'upload multipart (10 Mo)
  const MULTIPART_THRESHOLD = 10 * 1024 * 1024;

  if (file.size <= MULTIPART_THRESHOLD) {
    return uploadSimple(file, path);
  } else {
    return uploadMultipart(file, path, onProgress);
  }
};

/**
 * Upload simple pour les petits fichiers
 */
async function uploadSimple(file: File | Blob, path: string): Promise<string> {
  // Convertir en Uint8Array pour le navigateur
  const arrayBuffer = await file.arrayBuffer();
  const body = new Uint8Array(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: path,
    Body: body,
    ContentType: file.type || 'video/webm',
  });

  await s3Client.send(command);
  const baseUrl = R2_PUBLIC_DOMAIN || `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return `${baseUrl}/${path}`;
}

/**
 * Upload multipart pour les gros fichiers (jusqu'à 5Go)
 */
async function uploadMultipart(
  file: File | Blob, 
  path: string, 
  onProgress?: (progress: number) => void
): Promise<string> {
  let uploadId: string | undefined;

  try {
    // 1. Initialiser l'upload multipart
    const createRes = await s3Client.send(new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: path,
      ContentType: file.type,
    }));

    uploadId = createRes.UploadId;
    if (!uploadId) throw new Error("Impossible d'obtenir un ID d'upload");

    // 2. Découper le fichier en morceaux (5 Mo par défaut, minimum requis par S3)
    const PART_SIZE = 5 * 1024 * 1024; 
    const numParts = Math.ceil(file.size / PART_SIZE);
    const parts = [];

    for (let i = 0; i < numParts; i++) {
      const start = i * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      const partBlob = file.slice(start, end);
      
      // Convertir le Blob en Uint8Array pour éviter l'erreur "readableStream.getReader is not a function"
      // Le SDK AWS v3 dans le navigateur préfère les Uint8Array pour le calcul des hashs
      const arrayBuffer = await partBlob.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);


      const partRes = await s3Client.send(new UploadPartCommand({
        Bucket: R2_BUCKET_NAME,
        Key: path,
        UploadId: uploadId,
        PartNumber: i + 1,
        Body: body,
      }));

      parts.push({
        ETag: partRes.ETag,
        PartNumber: i + 1,
      });

      if (onProgress) {
        onProgress(Math.round(((i + 1) / numParts) * 100));
      }
    }

    // 3. Finaliser l'upload
    await s3Client.send(new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: path,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }));

    const baseUrl = R2_PUBLIC_DOMAIN || `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    return `${baseUrl}/${path}`;

  } catch (error) {
    if (uploadId) {
      // Annuler l'upload en cas d'erreur pour libérer l'espace
      await s3Client.send(new AbortMultipartUploadCommand({
        Bucket: R2_BUCKET_NAME,
        Key: path,
        UploadId: uploadId,
      }));
    }
    throw error;
  }
}
