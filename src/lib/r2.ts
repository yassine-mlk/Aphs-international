import { supabase } from '@/lib/supabase';

// Configuration publique Cloudflare R2 (lecture seule, pas de secrets)
const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN || "";

/**
 * Upload un fichier vers Cloudflare R2 via l'Edge Function (presigned URL)
 * Les secrets R2 restent côté serveur.
 */
export const uploadToR2 = async (
  file: File | Blob,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const MULTIPART_THRESHOLD = 10 * 1024 * 1024; // 10 Mo

  if (file.size <= MULTIPART_THRESHOLD) {
    return uploadSimple(file, path);
  } else {
    return uploadMultipart(file, path, onProgress);
  }
};

/**
 * Upload simple pour les petits fichiers via presigned URL
 */
async function uploadSimple(file: File | Blob, path: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('r2-upload', {
    body: {
      action: 'getUploadUrl',
      path,
      contentType: file.type || 'application/octet-stream',
    },
  });

  if (error || data?.error) {
    throw new Error(data?.error || error?.message || "Impossible d'obtenir l'URL d'upload");
  }

  const { uploadUrl, publicUrl } = data;

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload échoué: ${uploadResponse.statusText}`);
  }

  return publicUrl;
}

/**
 * Upload multipart pour les gros fichiers (jusqu'à 5Go)
 */
async function uploadMultipart(
  file: File | Blob,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const { data: initData, error: initError } = await supabase.functions.invoke('r2-upload', {
    body: {
      action: 'initMultipartUpload',
      path,
      contentType: file.type || 'application/octet-stream',
    },
  });

  if (initError || initData?.error) {
    throw new Error(initData?.error || initError?.message || "Impossible d'initialiser l'upload multipart");
  }

  const { uploadId } = initData;
  if (!uploadId) throw new Error("Impossible d'obtenir un ID d'upload");

  try {
    const PART_SIZE = 5 * 1024 * 1024; // 5 Mo
    const numParts = Math.ceil(file.size / PART_SIZE);
    const parts: { ETag: string; PartNumber: number }[] = [];

    for (let i = 0; i < numParts; i++) {
      const start = i * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      const partBlob = file.slice(start, end);

      const { data: partData, error: partError } = await supabase.functions.invoke('r2-upload', {
        body: {
          action: 'getPartUploadUrl',
          path,
          uploadId,
          partNumber: i + 1,
        },
      });

      if (partError || partData?.error) {
        throw new Error(`Erreur lors de l'obtention de l'URL pour la partie ${i + 1}`);
      }

      const partResponse = await fetch(partData.partUrl, {
        method: 'PUT',
        body: partBlob,
      });

      if (!partResponse.ok) {
        throw new Error(`Upload de la partie ${i + 1} échoué`);
      }

      parts.push({
        ETag: partResponse.headers.get('ETag') || '',
        PartNumber: i + 1,
      });

      if (onProgress) {
        onProgress(Math.round(((i + 1) / numParts) * 100));
      }
    }

    const { data: completeData, error: completeError } = await supabase.functions.invoke('r2-upload', {
      body: {
        action: 'completeMultipartUpload',
        path,
        uploadId,
        parts,
      },
    });

    if (completeError || completeData?.error) {
      throw new Error(completeData?.error || completeError?.message || "Erreur lors de la finalisation de l'upload");
    }

    return completeData.publicUrl;
  } catch (error) {
    throw error;
  }
}
