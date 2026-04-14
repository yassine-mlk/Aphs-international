import React, { createContext, useContext, useState, useCallback } from 'react';
import { uploadToR2 } from '@/lib/r2';

interface UploadState {
  progress: number;
  isUploading: boolean;
  fileUrl: string | null;
  error: string | null;
}

interface UploadContextType {
  uploads: Record<string, UploadState>;
  startUpload: (taskId: string, file: File, path: string) => Promise<string>;
  getUpload: (taskId: string) => UploadState | undefined;
  clearUpload: (taskId: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});

  const startUpload = useCallback(async (taskId: string, file: File, path: string): Promise<string> => {
    // Initialiser l'état de l'upload
    setUploads(prev => ({
      ...prev,
      [taskId]: { progress: 0, isUploading: true, fileUrl: null, error: null }
    }));

    try {
      const url = await uploadToR2(file, path, (progress) => {
        setUploads(prev => ({
          ...prev,
          [taskId]: { ...prev[taskId], progress }
        }));
      });

      setUploads(prev => ({
        ...prev,
        [taskId]: { ...prev[taskId], progress: 100, isUploading: false, fileUrl: url }
      }));

      return url;
    } catch (error: any) {
      setUploads(prev => ({
        ...prev,
        [taskId]: { ...prev[taskId], isUploading: false, error: error.message }
      }));
      throw error;
    }
  }, []);

  const getUpload = useCallback((taskId: string) => {
    return uploads[taskId];
  }, [uploads]);

  const clearUpload = useCallback((taskId: string) => {
    setUploads(prev => {
      const newUploads = { ...prev };
      delete newUploads[taskId];
      return newUploads;
    });
  }, []);

  return (
    <UploadContext.Provider value={{ uploads, startUpload, getUpload, clearUpload }}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};
