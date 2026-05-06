import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, ListChecks } from 'lucide-react';
import { VISA_OPINION_LABELS, VisaOpinion } from '@/types/visaWorkflow';

interface TaskValidationFormProps {
  task: any;
  workflow: any;
  selectedSubmissionId: string | null;
  selectedOpinion: string;
  setSelectedOpinion: (opinion: string) => void;
  validationComment: string;
  setValidationComment: (comment: string) => void;
  submitting: boolean;
  handleValidate: () => void;
}

export const TaskValidationForm: React.FC<TaskValidationFormProps> = ({
  task,
  workflow,
  selectedSubmissionId,
  selectedOpinion,
  setSelectedOpinion,
  validationComment,
  setValidationComment,
  submitting,
  handleValidate
}) => {
  return (
    <Card id="validation-form" className="border-amber-200 shadow-sm scroll-mt-6">
      <CardHeader className="bg-amber-50/50">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <CheckCircle2 className="h-5 w-5" />
          Statuer sur le document
          {task.assignment_type === 'standard' && (
            <span className="text-sm font-normal text-amber-600 ml-auto">
              {selectedSubmissionId 
                ? `Validation de : ${workflow?.submissions.find((s: any) => s.id === selectedSubmissionId)?.executor_name}` 
                : "Veuillez sélectionner un fichier ci-dessous"}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {task.assignment_type === 'standard' && !selectedSubmissionId ? (
          <div className="bg-amber-50 p-4 rounded-md border border-amber-100 text-amber-800 text-sm flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Veuillez cliquer sur "Statuer" sur l'un des fichiers ci-dessous pour donner votre avis.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <Label>Votre avis {task.assignment_type === 'standard' && "sur cette soumission"}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.entries(task.assignment_type === 'standard' ? { 'F': { label: 'Favorable' }, 'D': { label: 'Défavorable' } } : VISA_OPINION_LABELS) as [VisaOpinion, any][]).map(([key, value]) => (
                  <Button
                    key={key}
                    variant={selectedOpinion === key ? 'default' : 'outline'}
                    className={`h-auto py-3 flex flex-col gap-1 ${selectedOpinion === key ? '' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedOpinion(key)}
                  >
                    <span className="font-bold text-lg">{key}</span>
                    <span className="text-[10px] font-normal uppercase">{value.label}</span>
                  </Button>
                ))}
              </div>
              {selectedOpinion && VISA_OPINION_LABELS[selectedOpinion as VisaOpinion] && (
                <p className="text-xs text-gray-500 italic">
                  {VISA_OPINION_LABELS[selectedOpinion as VisaOpinion].description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="validationComment">Observations / Commentaires</Label>
              <Textarea
                id="validationComment"
                placeholder="Détaillez vos observations ici..."
                className="min-h-[100px]"
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
              />
            </div>

            <Button 
              className="w-full md:w-auto bg-amber-600 hover:bg-amber-700" 
              onClick={handleValidate}
              disabled={submitting || !selectedOpinion || (task.assignment_type === 'standard' && !selectedSubmissionId)}
            >
              {submitting ? 'Traitement en cours...' : 'Enregistrer mon avis'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
