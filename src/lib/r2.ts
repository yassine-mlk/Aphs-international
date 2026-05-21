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

const PART_SIZE = 20 * 1024 * 1024; // 20 Mo par part
const UPLOAD_CONCURRENCY = 6; // 6 uploads en parallèle max
const MAX_RETRIES = 2;

async function uploadPartWithRetry(
  url: string,
  blob: Blob,
  retries: number = MAX_RETRIES
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { method: 'PUT', body: blob });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.headers.get('ETag') || '';
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, (attempt + 1) * 500));
    }
  }
  throw new Error('Upload de part échoué');
}

/**
 * Upload multipart pour les gros fichiers (jusqu'à 5Go)
 * Toutes les presigned URLs sont générées en 1 seul appel Edge Function.
 * Les parts sont uploadées en parallèle avec retry.
 */
async function uploadMultipart(
  file: File | Blob,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const numParts = Math.ceil(file.size / PART_SIZE);

  // 1. Initialisation : récupère TOUTES les presigned URLs en 1 appel
  const { data: initData, error: initError } = await supabase.functions.invoke('r2-upload', {
    body: {
      action: 'initMultipartUpload',
      path,
      contentType: file.type || 'application/octet-stream',
      numParts,
    },
  });

  if (initError || initData?.error) {
    throw new Error(initData?.error || initError?.message || "Impossible d'initialiser l'upload multipart");
  }

  const { uploadId, partUrls, publicUrl } = initData;
  if (!uploadId || !partUrls?.length) throw new Error("Impossible d'obtenir un ID d'upload");

  const parts: { ETag: string; PartNumber: number }[] = [];
  let completedParts = 0;

  // 2. Upload concurrent des parts avec retry
  async function uploadPart(index: number): Promise<void> {
    const partNumber = index + 1;
    const start = index * PART_SIZE;
    const end = Math.min(start + PART_SIZE, file.size);
    const partBlob = file.slice(start, end);

    // L'url est à l'index `index` du tableau reçu
    const etag = await uploadPartWithRetry(partUrls[index], partBlob);

    parts.push({ ETag: etag, PartNumber: partNumber });

    completedParts++;
    if (onProgress) {
      onProgress(Math.round((completedParts / numParts) * 100));
    }
  }

  try {
    // Pool de concurrence : lance les uploads par lots de UPLOAD_CONCURRENCY
    const executing = new Set<Promise<void>>();
    for (let i = 0; i < numParts; i++) {
      const p = uploadPart(i).finally(() => executing.delete(p));
      executing.add(p);
      if (executing.size >= UPLOAD_CONCURRENCY) {
        await Promise.race(executing);
      }
    }
    await Promise.all(executing);

    // Trier les parts par PartNumber (le order peut varier avec la concurrence)
    parts.sort((a, b) => a.PartNumber - b.PartNumber);

    // 3. Finalisation
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

    return completeData.publicUrl || publicUrl;
  } catch (error) {
    // Nettoyage : annuler l'upload multipart pour éviter les parts orphelines
    try {
      await supabase.functions.invoke('r2-upload', {
        body: {
          action: 'abortMultipartUpload',
          path,
          uploadId,
        },
      });
    } catch {
      // Échec du nettoyage non bloquant
    }
    throw error;
  }
}
