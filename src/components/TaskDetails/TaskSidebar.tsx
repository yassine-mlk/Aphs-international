import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { ListChecks, CheckCircle2, Clock, Calendar, User } from 'lucide-react';
import { VisaOpinion } from '@/types/visaWorkflow';

interface TaskSidebarProps {
  task: any;
  workflow: any;
  isSequential: boolean;
  participantNames: Record<string, string>;
}

export const TaskSidebar: React.FC<TaskSidebarProps> = ({
  task,
  workflow,
  isSequential,
  participantNames
}) => {
  if (isSequential) {
    const totalSteps = 1 + (task.validators?.length || 0);
    const currentStep = task.status === 'in_review' ? 1 + (workflow?.current_validator_idx || 1) : 
                      (['vso', 'vao', 'var', 'closed', 'blocked'].includes(task.status)) ? totalSteps : 1;
    const progress = (currentStep / totalSteps) * 100;

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-blue-600" />
            Circuit de validation
          </CardTitle>
          
          {/* Barre de progression */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-[10px] font-medium text-gray-500 uppercase">
              <span>Étape {currentStep} / {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="relative space-y-0 pb-2">
            {/* Ligne verticale de connexion */}
            <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-gray-100"></div>

            {/* Nœud Executor */}
            {(() => {
              const isSubmitted = ['in_review', 'vso', 'vao', 'var', 'closed', 'blocked'].includes(task.status);
              const isCurrent = ['open', 'var', 'vao'].includes(task.status);
              const executorNames = task.assigned_to.map((id: string) => participantNames[id]).filter(Boolean).join(', ') || "Exécuteur";
              
              return (
                <div className="relative pl-10 pb-8">
                  <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 ${
                    isSubmitted ? 'bg-green-500 border-green-500 text-white' :
                    isCurrent ? 'bg-blue-600 border-blue-600 text-white animate-pulse shadow-lg shadow-blue-200' :
                    'bg-white border-gray-200 text-gray-400'
                  }`}>
                    {isSubmitted ? <CheckCircle2 className="h-4 w-4" /> : "E"}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${isCurrent ? 'text-blue-700' : 'text-gray-900'}`}>
                      {executorNames}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Exécuteur</span>
                    {isSubmitted && workflow?.submissions?.[0] && (
                      <span className="text-[10px] text-green-600 mt-0.5">
                        Soumis le {new Date(workflow.submissions[0].submitted_at).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Nœuds Validateurs */}
            {task.validators.map((v: any, idx: number) => {
              const validatorOrder = idx + 1;
              const latestSub = workflow?.submissions?.[0];
              const review = latestSub?.reviews?.find((r: any) => r.validator_id === v.user_id);
              const opinion = review?.opinion as VisaOpinion;
              const isCurrent = task.status === 'in_review' && workflow?.current_validator_id === v.user_id;
              const isDone = !!review;
              const validatorName = workflow?.all_names?.[v.user_id] || participantNames[v.user_id] || `Validateur ${validatorOrder}`;

              let circleClass = 'bg-white border-gray-200 text-gray-400';
              let textClass = 'text-gray-500';
              
              if (isDone) {
                if (opinion === 'F' || opinion === 'HM') circleClass = 'bg-green-500 border-green-500 text-white';
                else if (opinion === 'D') circleClass = 'bg-red-500 border-red-500 text-white';
                else if (opinion === 'S') circleClass = 'bg-orange-500 border-orange-500 text-white';
              } else if (isCurrent) {
                circleClass = 'bg-blue-600 border-blue-600 text-white animate-pulse shadow-lg shadow-blue-200';
                textClass = 'text-blue-700 font-bold';
              }

              return (
                <div key={v.user_id || idx} className="relative pl-10 pb-8 last:pb-2">
                  <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 font-bold text-xs ${circleClass}`}>
                    {isDone ? opinion : validatorOrder}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm ${textClass}`}>{validatorName}</span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Validateur {validatorOrder}</span>
                    
                    {isDone && (
                      <>
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          Avis rendu le {new Date(review.reviewed_at).toLocaleDateString('fr-FR')} à {new Date(review.reviewed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {review.comment && (
                          <p className="text-[11px] text-gray-600 italic mt-1 line-clamp-2">
                            "{review.comment}"
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compteur de tours restants */}
          <Separator className="my-4" />
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 font-medium">Tour actuel :</span>
              <Badge variant="outline" className="font-bold">
                {task.revision_count || 0} / {task.max_revisions || 3}
              </Badge>
            </div>
            <div className="mt-2 flex justify-between items-center text-xs">
              <span className="text-gray-600 font-medium">Tours restants :</span>
              <span className="font-bold text-gray-900">
                {Math.max(0, (task.max_revisions || 3) - (task.revision_count || 0))} tour(s)
              </span>
            </div>
            {(task.status as string) === 'blocked' && (
              <div className="mt-3">
                <Badge className="w-full justify-center bg-red-100 text-red-700 border-red-200 font-black text-[10px] uppercase">
                  ⛔ Circuit bloqué
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Échéances
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 uppercase">Fin prévue pour la remise (Exécuteurs)</Label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="font-semibold">{new Date(task.deadline).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 uppercase">Fin prévue pour la validation (Validateurs)</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-amber-700">
                {task.validation_deadline && !task.validation_deadline.startsWith('1970') && !task.validation_deadline.startsWith('0001')
                  ? new Date(task.validation_deadline).toLocaleDateString('fr-FR') 
                  : 'À définir'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Participants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase">Exécuteurs</Label>
            <div className="flex flex-wrap gap-2">
              {task.assigned_to.map((id: string, idx: number) => (
                <Badge key={id || idx} variant="secondary">
                  {participantNames[id] || `Intervenant ${idx + 1}`}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase">Validateurs</Label>
            <div className="space-y-2">
              {task.validators.map((v: any, idx: number) => (
                <div key={v.user_id || idx} className="flex items-center gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </div>
                  <span>{participantNames[v.user_id] || `Validateur ${idx + 1}`}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
