import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, File, X, AlertCircle, CheckCircle } from "lucide-react";
import { useSupabase } from '@/hooks/useSupabase';

interface TaskAssignment {
  id: string;
  task_name: string;
  section: string;
  phase: string;
  status: string;
}

interface SubmissionUploaderProps {
  // Mode 1: Single assignment (legacy)
  assignmentId?: string;
  occurrenceNumber?: number;
  expectedFormat?: string;
  previousVersions?: Array<{ version_index: string; file_name: string; submitted_at: string }>;
  onUploadComplete?: (fileUrl: string, fileName: string) => void;
  onCancel?: () => void;
  
  // Mode 2: Task list (for intervenant space)
  taskAssignments?: TaskAssignment[];
  onSubmit?: (assignmentId: string, file: File, fileName: string) => Promise<void>;
  loading?: boolean;
}

export const SubmissionUploader: React.FC<SubmissionUploaderProps> = ({
  assignmentId: singleAssignmentId,
  occurrenceNumber,
  expectedFormat,
  previousVersions,
  onUploadComplete,
  onCancel,
  taskAssignments,
  onSubmit,
  loading: externalLoading,
}) => {
  const { supabase } = useSupabase();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(singleAssignmentId || '');
  
  // Determine mode
  const isTaskListMode = !!taskAssignments && !!onSubmit;
  const loading = externalLoading || uploading;
  const [error, setError] = useState<string | null>(null);

  const nextVersionIndex = previousVersions.length > 0
    ? (parseInt(previousVersions[previousVersions.length - 1].version_index) + 1).toString()
    : '0';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Vérifier l'extension
    const ext = selected.name.split('.').pop()?.toLowerCase();
    const expectedExt = expectedFormat.toLowerCase();
    
    if (ext !== expectedExt && !expectedFormat.includes(ext || '')) {
      setError(`Format attendu: ${expectedFormat.toUpperCase()}, reçu: ${ext?.toUpperCase()}`);
      return;
    }

    // Vérifier taille (max 50MB)
    if (selected.size > 50 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 50MB)');
      return;
    }

    setFile(selected);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      const filePath = `submissions/${assignmentId}/${occurrenceNumber}/v${nextVersionIndex}_${Date.now()}_${file.name}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      onUploadComplete(publicUrl, file.name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Déposer un document</CardTitle>
        <CardDescription>
          Occurrence S{occurrenceNumber} • Version {nextVersionIndex}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info version précédente */}
        {previousVersions.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Versions précédentes :</p>
                <ul className="mt-1 space-y-1">
                  {previousVersions.slice(-3).map((v) => (
                    <li key={v.version_index} className="text-amber-700">
                      V{v.version_index}: {v.file_name} ({new Date(v.submitted_at).toLocaleDateString('fr-FR')})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Format attendu */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Format attendu :</span>
          <Badge variant="outline">{expectedFormat.toUpperCase()}</Badge>
        </div>

        {/* Zone upload */}
        {!file ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 mb-2">
              Glissez-déposez un fichier ou
            </p>
            <Input
              type="file"
              accept={`.${expectedFormat}`}
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <Label htmlFor="file-upload" className="cursor-pointer">
              <Button variant="outline" type="button" asChild>
                <span>Parcourir</span>
              </Button>
            </Label>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <File className="h-8 w-8 text-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFile} disabled={uploading}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Barre de progression */}
            {uploading && (
              <div className="mt-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Upload en cours...</p>
              </div>
            )}
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={uploading}>
            Annuler
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || uploading}
            className="bg-teal-500 hover:bg-teal-600"
          >
            {uploading ? 'Upload...' : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Déposer Version {nextVersionIndex}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
