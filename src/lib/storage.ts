import { supabase } from '@/lib/supabase';

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

  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
};

export const uploadFile = async (
  file: File,
  path: string,
  useR2: boolean = true
): Promise<string> => {
  if (useR2) {
    const { uploadToR2 } = await import('./r2');
    return await uploadToR2(file, path);
  }
  return await uploadToStorage(file, path);
};
