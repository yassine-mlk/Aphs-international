import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from './ui/use-toast';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (imageUrl: string) => void;
  onImageRemoved: () => void;
  bucketName: string;
  folderPath?: string;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  bucketName,
  folderPath = '',
  maxSizeMB = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const uploadImage = async (file: File) => {
    try {
      // Validation du fichier
      if (!acceptedTypes.includes(file.type)) {
        toast({
          title: "Erreur",
          description: "Type de fichier non supporté. Utilisez JPG, PNG ou WebP.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({
          title: "Erreur",
          description: `Le fichier est trop volumineux. Taille maximum: ${maxSizeMB}MB`,
          variant: "destructive",
        });
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

      // Simulation du progrès (Supabase ne fournit pas de progrès réel)
      const progressTimer = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressTimer);
            return 80;
          }
          return prev + 10;
        });
      }, 200);

      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressTimer);

      if (error) {
        throw error;
      }

      setUploadProgress(90);

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      setUploadProgress(100);

      toast({
        title: "Succès",
        description: "Image uploadée avec succès",
      });

      onImageUploaded(urlData.publicUrl);

    } catch (error: any) {
      console.error('Erreur lors de l\'upload:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'uploader l'image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    try {
      // Extraire le chemin du fichier depuis l'URL
      const urlParts = currentImageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

      // Supprimer le fichier du storage
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        console.warn('Erreur lors de la suppression du fichier:', error);
      }

      onImageRemoved();

      toast({
        title: "Succès",
        description: "Image supprimée avec succès",
      });

    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'image",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Label>Image du projet</Label>
      
      {currentImageUrl ? (
        <div className="relative">
          <img 
            src={currentImageUrl} 
            alt="Image du projet" 
            className="w-full h-48 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Aucune image sélectionnée
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1"
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? 'Upload en cours...' : 'Choisir une image'}
        </Button>
        
        {currentImageUrl && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRemoveImage}
          >
            <X className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        )}
      </div>

      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-gray-500">
        Formats supportés: JPG, PNG, WebP. Taille maximum: {maxSizeMB}MB
      </p>
    </div>
  );
};

export default ImageUpload; 