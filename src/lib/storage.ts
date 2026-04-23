import { supabase } from '@/lib/supabase';

/**
 * Upload un fichier vers Supabase Storage (bucket 'documents')
 * Fallback simple si R2 ne fonctionne pas
 */
export const uploadToStorage = async (
  file: File,
  path: string
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
};

/**
 * Upload avec fallback : essaie R2 d'abord, puis Storage si ça échoue
 */
export const uploadFile = async (
  file: File,
  path: string,
  useR2: boolean = false
): Promise<string> => {
  // Si R2 est configuré et demandé, l'utiliser
  if (useR2) {
    try {
      const { uploadToR2 } = await import('./r2');
      return await uploadToR2(file, path);
    } catch (r2Error) {
      // Fallback vers Storage
      return await uploadToStorage(file, path);
    }
  }

  // Par défaut, utiliser Supabase Storage
  return await uploadToStorage(file, path);
};
