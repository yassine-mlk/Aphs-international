import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface TaskSubmissionFormProps {
  task: any;
  file: File | null;
  setFile: (file: File | null) => void;
  comment: string;
  setComment: (comment: string) => void;
  submitting: boolean;
  uploadProgress: number;
  handleSubmit: () => void;
  hasRejectedSubmission: boolean | undefined;
}

export const TaskSubmissionForm: React.FC<TaskSubmissionFormProps> = ({
  task,
  file,
  setFile,
  comment,
  setComment,
  submitting,
  uploadProgress,
  handleSubmit,
  hasRejectedSubmission
}) => {
  return (
    <Card className="border-blue-200 shadow-sm">
      <CardHeader className="bg-blue-50/50">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Send className="h-5 w-5" />
          Soumettre un document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="file">Fichier à soumettre</Label>
            <div className="flex items-center gap-4">
              <Input 
                id="file" 
                type="file"
                accept={`.${task.file_extension},application/pdf`}
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    setFile(selectedFile);
                  }
                }}
                className="flex-1"
              />
              {file && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setFile(null);
                  }}
                >
                  Effacer
                </Button>
              )}
            </div>
            {submitting && uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
                <p className="text-[10px] text-right mt-1 text-gray-500">Upload: {uploadProgress}%</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="comment">Commentaires / Notes de révision</Label>
          <Textarea
            id="comment"
            placeholder="Ajoutez des précisions sur cette version..."
            className="min-h-[100px]"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <Button 
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700" 
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Envoi en cours...' : (task.status === 'var' || task.status === 'rejected' || hasRejectedSubmission ? 'Resoumettre pour validation' : 'Soumettre pour validation')}
        </Button>
      </CardContent>
    </Card>
  );
};
