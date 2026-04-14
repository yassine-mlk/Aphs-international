import React, { createContext, useContext, useState, useCallback } from 'react';
import { uploadToR2 } from '@/lib/r2';

interface UploadState {
  progress: number;
  isUploading: boolean;
  fileUrl: string | null;
  error: string | null;
  fileName: string | null;
  fileSize: number | null;
  uploadedBytes: number | null;
  startTime: number | null;
  speedBps: number | null;
  etaSec: number | null;
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
    // Initialiser l'état de l'upload avec les métadonnées du fichier
    setUploads(prev => ({
      ...prev,
      [taskId]: { 
        progress: 0, 
        isUploading: true, 
        fileUrl: null, 
        error: null,
        fileName: file.name,
        fileSize: file.size,
        uploadedBytes: 0,
        startTime: Date.now(),
        speedBps: 0,
        etaSec: null
      }
    }));

    try {
      const url = await uploadToR2(file, path, (progress) => {
        setUploads(prev => {
          const current = prev[taskId];
          if (!current || !current.startTime) return prev;
          
          const now = Date.now();
          const uploadedBytes = Math.round((progress / 100) * (current.fileSize || 0));
          const duration = (now - current.startTime) / 1000;
          const speedBps = duration > 0 ? uploadedBytes / duration : 0;
          const remainingBytes = (current.fileSize || 0) - uploadedBytes;
          const etaSec = speedBps > 0 ? Math.round(remainingBytes / speedBps) : null;
          
          return {
            ...prev,
            [taskId]: { 
              ...current, 
              progress,
              uploadedBytes,
              speedBps,
              etaSec
            }
          };
        });
      });

      setUploads(prev => ({
        ...prev,
        [taskId]: { 
          ...prev[taskId], 
          progress: 100, 
          isUploading: false, 
          fileUrl: url,
          uploadedBytes: prev[taskId]?.fileSize || 0,
          speedBps: 0,
          etaSec: 0
        }
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
