import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, CheckCircle, XCircle, ArrowRight, FileText, 
  RotateCcw, AlertCircle, ChevronDown, ChevronUp 
} from "lucide-react";
import { TaskSubmission, VisaInstance, VisaStep } from "@/types/visa";

interface VersionTimelineProps {
  submissions: TaskSubmission[];
  instances?: Record<string, VisaInstance>;
  steps?: Record<string, VisaStep[]>;
  onResubmit?: (submissionId: string, instanceId?: string) => void;
  expandedSubmission?: string | null;
  onToggleExpand?: (submissionId: string) => void;
  loading?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  validated: { label: 'Validé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  refused: { label: 'Refusé', color: 'bg-red-100 text-red-800', icon: XCircle },
  en_cours: { label: 'En cours visa', color: 'bg-blue-100 text-blue-800', icon: ArrowRight },
  valide: { label: 'Visa OK', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  refuse: { label: 'VAR - À refaire', color: 'bg-red-100 text-red-800', icon: RotateCcw },
};

const OPINION_LABELS: Record<string, string> = {
  F: 'Favorable',
  D: 'Défavorable',
  S: 'Suspendu',
  HM: 'Hors Mission',
};

const VISA_LABELS: Record<string, string> = {
  VSO: 'Visa Sans Obs',
  VAO: 'Visa Avec Obs',
  VAR: 'Visa À Resoumettre',
};

export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  submissions,
  instances,
  steps,
  onResubmit,
  expandedSubmission,
  onToggleExpand,
}) => {
  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>Aucune soumission pour cette tâche</p>
          <p className="text-sm">Cliquez sur "Déposer" pour commencer</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission, index) => {
        const instance = submission.visa_instance_id ? instances[submission.visa_instance_id] : null;
        const instanceSteps = instance ? steps[instance.id] || [] : [];
        const status = instance?.status || submission.simple_status || 'pending';
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        const StatusIcon = config.icon;
        const isExpanded = expandedSubmission === submission.id;
        const isLatest = index === submissions.length - 1;

        return (
          <Card key={submission.id} className={isLatest ? 'ring-1 ring-teal-500' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Numéro de version */}
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">
                    V{submission.version_index}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{submission.file_name}</CardTitle>
                      {isLatest && <Badge variant="outline" className="text-xs">Dernier</Badge>}
                    </div>
                    <p className="text-sm text-gray-500">
                      Déposé le {new Date(submission.submitted_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <Badge className={`${config.color} flex items-center gap-1`}>
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Étapes de visa (si applicable) */}
              {instance && instanceSteps.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2 mb-4">
                  <p className="text-sm font-medium text-gray-700">Circuit de validation :</p>
                  <div className="space-y-2">
                    {instanceSteps.map((step, stepIdx) => {
                      const isCompleted = !!step.completed_at;
                      const isCurrent = step.step_order === instance.current_step_index && !isCompleted;
                      
                      return (
                        <div 
                          key={step.id} 
                          className={`flex items-center gap-3 p-2 rounded ${
                            isCurrent ? 'bg-blue-50 border border-blue-200' : 
                            isCompleted ? 'bg-gray-50' : 'opacity-50'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            isCompleted ? 'bg-green-100 text-green-700' :
                            isCurrent ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {stepIdx + 1}
                          </div>
                          
                          <div className="flex-1">
                            <p className="text-sm font-medium">{step.validator_role}</p>
                            {isCompleted && (
                              <div className="flex items-center gap-2 mt-1">
                                {step.opinion && (
                                  <Badge variant="outline" className="text-xs">
                                    {OPINION_LABELS[step.opinion] || step.opinion}
                                  </Badge>
                                )}
                                {step.visa_status && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      step.visa_status === 'VSO' ? 'border-green-500 text-green-700' :
                                      step.visa_status === 'VAO' ? 'border-yellow-500 text-yellow-700' :
                                      'border-red-500 text-red-700'
                                    }`}
                                  >
                                    {VISA_LABELS[step.visa_status]}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {isCurrent && (
                            <Badge variant="outline" className="text-xs bg-blue-50">
                              En cours
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleExpand?.(submission.id)}
                >
                  {isExpanded ? (
                    <><ChevronUp className="h-4 w-4 mr-1" /> Moins de détails</>
                  ) : (
                    <><ChevronDown className="h-4 w-4 mr-1" /> Plus de détails</>
                  )}
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-1" />
                      Voir
                    </a>
                  </Button>

                  {/* Bouton Resoumettre (si VAR) */}
                  {instance?.status === 'refuse' && isLatest && onResubmit && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => onResubmit(submission.id, instance.id)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Resoumettre V{parseInt(submission.version_index) + 1}
                    </Button>
                  )}
                </div>
              </div>

              {/* Détails expandés */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                  <p><strong>ID Soumission:</strong> {submission.id.slice(0, 8)}...</p>
                  {instance && (
                    <>
                      <p><strong>Instance Visa:</strong> {instance.id.slice(0, 8)}...</p>
                      <p><strong>Étape actuelle:</strong> {instance.current_step_index + 1} / {instance.total_steps}</p>
                    </>
                  )}
                  {submission.simple_validated_by && (
                    <p><strong>Validé par:</strong> {submission.simple_validated_by}</p>
                  )}
                  {submission.simple_comments && (
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="font-medium">Commentaires:</p>
                      <p>{submission.simple_comments}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
