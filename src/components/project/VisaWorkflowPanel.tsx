import React, { useState, useEffect } from 'react';

// Composant de contournement pour éviter les avertissements sur data-lov-id avec React.Fragment
const SafeFragment = ({ children }: { children: React.ReactNode }) => <>{children}</>;

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  FileUp,
  Download,
  User,
  History,
  ChevronRight,
  Loader2,
  MessageSquare,
  Route,
  FileCheck,
  Eye
} from 'lucide-react';
import { useVisaWorkflow } from '@/hooks/useVisaWorkflow';
import { uploadToR2 } from '@/lib/r2';
import {
  VisaWorkflowFull,
  VisaOpinion,
  VISA_OPINION_LABELS,
  VISA_STATUS_LABELS,
  VisaWorkflowStatus,
  getValidOpinions
} from '@/types/visaWorkflow';

interface VisaWorkflowPanelProps {
  taskAssignmentId: string;
  currentUserId: string;
  isValidator: boolean;
  isAdmin: boolean;
  fileExtension: string;
}

export const VisaWorkflowPanel: React.FC<VisaWorkflowPanelProps> = ({
  taskAssignmentId,
  currentUserId,
  isValidator,
  isAdmin,
  fileExtension
}) => {
  const { fetchWorkflow, submitDocument, submitValidation, submitAdminDecision } = useVisaWorkflow();
  
  const [workflow, setWorkflow] = useState<VisaWorkflowFull | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitComment, setSubmitComment] = useState('');
  const [selectedOpinion, setSelectedOpinion] = useState<VisaOpinion | null>(null);
  const [validationComment, setValidationComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);

  // Charger le workflow
  const loadWorkflow = async () => {
    setLoading(true);
    const data = await fetchWorkflow(taskAssignmentId);
    setWorkflow(data);
    setLoading(false);
  };

  useEffect(() => {
    loadWorkflow();
  }, [taskAssignmentId]);

  // State for specific submission being validated
  const [validatingSubmissionId, setValidatingSubmissionId] = useState<string | null>(null);

  // Vérifier si c'est le tour du validateur actuel
  const isCurrentValidator = workflow && 
    (workflow.task_type === 'standard' 
      ? isValidator && workflow.status !== 'approved' && workflow.status !== 'closed'
      : workflow.current_validator_id === currentUserId && workflow.status === 'in_review');

  // Vérifier si l'exécutant peut soumettre
  const userSubmissions = workflow?.submissions?.filter(sub => sub.executor_id === currentUserId) || [];
  const latestUserSubmission = userSubmissions.length > 0 ? userSubmissions[0] : null;
  const hasRejectedSubmission = latestUserSubmission?.reviews?.some(r => r.opinion === 'D');

  const canSubmit = workflow && 
    workflow.executor_ids.includes(currentUserId) &&
    (workflow.task_type === 'standard' 
      ? workflow.status !== 'approved' && workflow.status !== 'closed' && (!latestUserSubmission || hasRejectedSubmission)
      : (workflow.status === 'open' || workflow.status === 'var' || workflow.status === 'revision_required'));

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle document submission
  const handleSubmitDocument = async () => {
    if (!selectedFile || !workflow) return;
    
    setSubmitting(true);
    
    try {
      // Upload file to Cloudflare R2
      const filePath = `visa-workflows/${workflow.id}/${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`;
      const fileUrl = await uploadToR2(selectedFile, filePath);
      
      const success = await submitDocument(workflow.id, {
        file_url: fileUrl,
        file_name: selectedFile.name,
        comment: submitComment
      }, currentUserId);
      
      if (success) {
        setIsSubmitDialogOpen(false);
        setSelectedFile(null);
        setSubmitComment('');
        loadWorkflow();
      }
    } catch (error) {
    } finally {
      setSubmitting(false);
    }
  };

  // Handle validation
  const handleSubmitValidation = async () => {
    if (!selectedOpinion || !validationComment.trim() || !workflow) return;
    
    setSubmitting(true);
    
    const result = await submitValidation(
      workflow.id, 
      {
        opinion: selectedOpinion,
        comment: validationComment
      }, 
      currentUserId,
      validatingSubmissionId || undefined
    );
    
    if (result.success) {
      setIsValidateDialogOpen(false);
      setSelectedOpinion(null);
      setValidationComment('');
      setValidatingSubmissionId(null);
      loadWorkflow();
    }
    
    setSubmitting(false);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get opinion icon
  const getOpinionIcon = (opinion: VisaOpinion) => {
    switch (opinion) {
      case 'F': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'D': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'S': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'HM': return <Ban className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-aps-teal" />
          <span className="ml-2 text-gray-500">Chargement du workflow...</span>
        </CardContent>
      </Card>
    );
  }

  if (!workflow) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-6 text-center text-gray-500">
          Aucun workflow VISA configuré pour cette tâche.
        </CardContent>
      </Card>
    );
  }

  const isWorkflow = workflow.task_type === 'workflow';
  const isStandard = workflow.task_type === 'standard';

  // Stats pour le workflow
  const totalSteps = workflow.validators.length;
  const latestSubmission = isWorkflow ? workflow.submissions[0] : null;
  const reviewsCount = latestSubmission?.reviews?.length || 0;
  
  const completedSteps = (workflow.status === 'vso' || workflow.status === 'vao')
    ? totalSteps 
    : reviewsCount;
    
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  // Viewing version state (Workflow only)
  const currentVersion = isWorkflow ? (workflow.submissions[0]?.version || 1) : 0;
  const displayVersion = viewingVersion ?? currentVersion;
  const currentSubmission = isWorkflow 
    ? workflow.submissions.find(s => s.version === displayVersion)
    : null;
  
  const getStatusConfig = (status: string) => {
    const mapping: Record<string, VisaWorkflowStatus> = {
      'open': 'pending_execution',
      'in_review': 'pending_validation',
      'var': 'revision_required',
      'vso': 'validated',
      'vao': 'validated',
      'blocked': 'blocked',
      'rejected': 'revision_required',
      'approved': 'validated',
      'closed': 'validated'
    };
    const visaStatus = mapping[status] || 'pending_execution';
    return VISA_STATUS_LABELS[visaStatus];
  };

  const statusConfig = getStatusConfig(workflow.status);

  // Filtrer les exécuteurs visibles pour l'affichage des soumissions
  const visibleExecutorIds = isStandard 
    ? (isAdmin || isValidator 
        ? workflow.executor_ids 
        : workflow.executor_ids.filter(id => id === currentUserId))
    : [];

  return (
    <>
      <Card className="border-0 shadow-md bg-gradient-to-br from-white to-gray-50">

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Route className="h-6 w-6 text-blue-600" />
              </div>
              <span>{isStandard ? 'Tâche Classique' : 'Workflow VISA'}</span>
            </CardTitle>
            <Badge className={`${statusConfig.color} px-3 py-1 text-sm font-medium`}>
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Bar - Only for Workflow */}
          {isWorkflow && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Avancement du circuit</span>
                <span className="text-sm font-bold text-blue-600">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <p className="text-xs text-gray-500">
                {completedSteps} / {totalSteps} étapes complétées
              </p>
            </div>
          )}

          {/* Executor Info - Separate from validation chain */}
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-purple-600" />
              Exécuteur
            </Label>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">
                  {workflow.executor_ids.map(id => workflow.all_names?.[id]).join(', ')}
                </p>
                <p className="text-xs text-gray-500">Responsable de la soumission des documents</p>
              </div>
            </div>
          </div>

          {/* Validation Steps - Visual Flow - Only for Workflow */}
          {isWorkflow && (
            <div className="space-y-4">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-blue-600" />
                Circuit de validation ({workflow.validators.length} validateur{workflow.validators.length > 1 ? 's' : ''})
              </Label>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {workflow.validators.length === 0 ? (
                  <span className="text-sm text-gray-500 italic">Aucun validateur configuré</span>
                ) : (
                  workflow.validators.map((v, index) => {
                    const isCurrent = workflow.current_validator_id === v.user_id && workflow.status === 'in_review';
                    const validation = latestSubmission?.reviews?.find(r => r.validator_id === v.user_id);
                    const isPast = !!validation;
                    
                    return (
                      <SafeFragment key={v.user_id}>
                        <div className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border min-w-[80px] ${
                          isCurrent ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' :
                          isPast ? 'bg-green-50 border-green-300' :
                          'bg-gray-50 border-gray-200'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isCurrent ? 'bg-blue-600 text-white animate-pulse' :
                            isPast ? 'bg-green-600 text-white' :
                            'bg-gray-300 text-gray-600'
                          }`}>
                            {isPast && validation?.opinion === 'F' ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <span className="text-xs text-center font-medium truncate max-w-[70px]">
                            {workflow.all_names?.[v.user_id]?.split(' ')[0] || `Val ${index + 1}`}
                          </span>
                          {validation && (
                            <Badge className={`${VISA_OPINION_LABELS[validation.opinion].color} text-[10px] px-1 py-0 border-none`}>
                              {VISA_OPINION_LABELS[validation.opinion].label.substring(0, 3)}
                            </Badge>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] text-blue-600 font-medium bg-blue-100 px-1 rounded">en cours</span>
                          )}
                        </div>
                        {index < workflow.validators.length - 1 && (
                          <ChevronRight className={`h-5 w-5 flex-shrink-0 ${isPast ? 'text-green-500' : 'text-gray-300'}`} />
                        )}
                      </SafeFragment>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Fichier(s) et Soumissions */}
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {isStandard ? <FileCheck className="h-5 w-5 text-blue-600" /> : <FileUp className="h-5 w-5 text-blue-600" />}
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    {isStandard ? 'Soumissions des intervenants' : 'Version du document'}
                  </p>
                  {isWorkflow && (
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-gray-900">v{displayVersion}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isWorkflow && workflow.submissions.length > 1 && (
                  <select
                    value={displayVersion}
                    onChange={(e) => setViewingVersion(Number(e.target.value))}
                    className="text-sm border rounded-md px-2 py-1 bg-white"
                  >
                    {workflow.submissions.map((sub) => (
                      <option key={sub.id} value={sub.version}>
                        v{sub.version} {sub.version === currentVersion ? '(actuelle)' : ''}
                      </option>
                    ))}
                  </select>
                )}
                {isWorkflow && currentSubmission && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => window.open(currentSubmission.file_url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                    Voir
                  </Button>
                )}
              </div>
            </div>
            
            {isStandard ? (
              <div className="space-y-3">
                {visibleExecutorIds.map(executorId => {
                  const latestSub = [...workflow.submissions]
                    .filter(s => s.executor_id === executorId)
                    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0];
                  
                  return (
                    <div key={executorId} className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-gray-500" />
                          <span className="text-sm font-medium">{workflow.all_names?.[executorId] || 'Exécuteur'}</span>
                        </div>
                        {latestSub ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none text-[10px]">
                            Soumis le {formatDate(latestSub.submitted_at)}
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-none text-[10px]">
                            En attente
                          </Badge>
                        )}
                      </div>
                      
                      {latestSub ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileCheck className="h-4 w-4 text-blue-600 shrink-0" />
                              <span className="text-xs truncate text-gray-600">
                                {latestSub.file_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[10px] gap-1"
                                onClick={() => window.open(latestSub.file_url, '_blank')}
                              >
                                <Eye className="h-3 w-3" />
                                Voir
                              </Button>
                              {isValidator && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-[10px] gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                                  onClick={() => {
                                    setValidatingSubmissionId(latestSub.id);
                                    setIsValidateDialogOpen(true);
                                  }}
                                  disabled={latestSub.reviews?.some(r => r.validator_id === currentUserId)}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  {latestSub.reviews?.some(r => r.validator_id === currentUserId) ? 'Déjà validé' : 'Valider'}
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Affichage des reviews pour cette soumission */}
                          {latestSub.reviews && latestSub.reviews.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-[10px] font-medium text-gray-500 uppercase">Avis des validateurs :</p>
                              {latestSub.reviews.map(review => (
                                <div key={review.id} className="flex items-center justify-between bg-white/50 p-1.5 rounded border border-gray-100">
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${VISA_OPINION_LABELS[review.opinion].color.split(' ')[0]}`} />
                                    <span className="text-[10px] font-medium text-gray-700">{workflow.all_names?.[review.validator_id]}</span>
                                  </div>
                                  <Badge className={`${VISA_OPINION_LABELS[review.opinion].color} text-[9px] px-1 py-0 border-none`}>
                                    {VISA_OPINION_LABELS[review.opinion].standardLabel || VISA_OPINION_LABELS[review.opinion].label}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 italic">Aucun document déposé par cet intervenant.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Logic existante pour les workflows type visa */
              <>
                {currentSubmission ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {currentSubmission.file_name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => window.open(currentSubmission.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                      Télécharger
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg text-gray-400">
                    <FileUp className="h-5 w-5 mr-2" />
                    <span className="text-sm">Aucun fichier soumis pour cette version</span>
                  </div>
                )}
                
                {currentSubmission && (
                  <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                    <div className="flex items-center justify-between">
                      <span>Soumis par: <strong>{currentSubmission.executor_name}</strong></span>
                      <span>{formatDate(currentSubmission.submitted_at)}</span>
                    </div>
                    {currentSubmission.comment && (
                      <p className="mt-1 italic">"{currentSubmission.comment}"</p>
                    )}
                  </div>
                )}
              </>
            )}
            
            {workflow.task_type !== 'standard' && viewingVersion && viewingVersion !== workflow.current_version && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-blue-600"
                onClick={() => setViewingVersion(null)}
              >
                Revenir à la version actuelle (v{workflow.current_version})
              </Button>
            )}
          </div>

          {/* Historique Timeline - Style Standard */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <History className="h-4 w-4" />
              Historique de la tâche
            </h4>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {/* Workflow creation */}
              <div className="relative pl-6 pb-4 border-l-2 border-gray-200">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-purple-500 border-4 border-white"></div>
                <div className="text-sm">
                  <p className="font-medium">Workflow VISA créé</p>
                  <p className="text-gray-500 text-xs">{formatDate(workflow.created_at)}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                    <User className="h-3 w-3" />
                    <span>Exécuteur: {workflow.executor_ids.map(id => workflow.all_names?.[id]).join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <span className="font-medium text-xs bg-gray-100 px-1.5 py-0.5 rounded">{workflow.validators.length}</span>
                    <span>validateur{workflow.validators.length > 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {/* All events chronologically */}
              {(() => {
                if (workflow.history && workflow.history.length > 0) {
                  return workflow.history.map((event) => {
                    const isSubmission = event.action === 'submission';
                    const isValidation = event.action === 'validation';
                    const isStatusChange = event.action === 'status_change';
                    
                    if (isStandard && !isAdmin && !isValidator && event.user_id !== currentUserId && event.action === 'submission') {
                      return null;
                    }
                    
                    return (
                      <div key={event.id} className={`relative pl-6 pb-4 border-l-2 ${
                        isSubmission ? 'border-blue-200' : 
                        isValidation ? 'border-green-200' : 
                        'border-gray-200'
                      }`}>
                        <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-4 border-white ${
                          isSubmission ? 'bg-blue-600' : 
                          isValidation ? (event.details?.opinion === 'F' ? 'bg-green-600' : 'bg-red-600') : 
                          'bg-gray-400'
                        }`}></div>
                        <div className="text-sm">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {isSubmission ? 'Document soumis' : 
                               isValidation ? 'Avis de validation' : 
                               isStatusChange ? 'Changement de statut' : event.action}
                            </p>
                            {isValidation && (
                              <Badge className={`text-[10px] ${VISA_OPINION_LABELS[event.details?.opinion as VisaOpinion]?.color}`}>
                                {VISA_OPINION_LABELS[event.details?.opinion as VisaOpinion]?.label}
                              </Badge>
                            )}
                            {isStatusChange && (
                              <Badge variant="outline" className="text-[10px]">
                                {event.new_status}
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs">{formatDate(event.created_at)}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                            <User className="h-3 w-3" />
                            <span>{workflow.all_names?.[event.user_id] || 'Système'}</span>
                          </div>
                          {event.details?.file_name && (
                            <div className="mt-2 p-2 bg-gray-50 rounded border flex items-center justify-between gap-2">
                              <span className="text-xs truncate">{event.details.file_name}</span>
                              {event.details.version && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0">v{event.details.version}</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                }

                // Fallback to local reconstruction if history table is empty
                const events: any[] = [];
                
                // Add submissions and their reviews
                workflow.submissions.forEach(sub => {
                  events.push({
                    type: 'submission',
                    date: sub.submitted_at,
                    data: sub,
                    version: sub.version
                  });
                  
                  sub.reviews?.forEach(val => {
                    events.push({
                      type: 'validation',
                      date: val.reviewed_at,
                      data: val,
                      version: sub.version
                    });
                  });
                });
                
                // Sort by date (oldest first)
                events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                return events.map((event) => {
                  if (event.type === 'submission') {
                    const sub = event.data;
                    const isCurrent = event.version === currentVersion;
                    return (
                      <div key={`sub-${sub.id}`} className="relative pl-6 pb-4 border-l-2 border-blue-200">
                        <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-4 border-white ${
                          isCurrent ? 'bg-blue-600' : 'bg-blue-400'
                        }`}></div>
                        <div className="text-sm">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">Document soumis</p>
                            <Badge className={`text-[10px] ${isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                              v{event.version} {isCurrent ? '(actuelle)' : ''}
                            </Badge>
                          </div>
                          <p className="text-gray-500 text-xs">{formatDate(sub.submitted_at)}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                            <User className="h-3 w-3" />
                            <span>{sub.executor_name}</span>
                          </div>
                          <div className="mt-2 p-2 bg-gray-50 rounded border">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs truncate">{sub.file_name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => window.open(sub.file_url, '_blank')}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                            {sub.comment && (
                              <p className="mt-1 text-xs text-gray-600 italic">"{sub.comment}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const val = event.data;
                    return (
                      <div key={`val-${val.id}`} className="relative pl-6 pb-4 border-l-2 border-gray-200">
                        <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full ${VISA_OPINION_LABELS[val.opinion as VisaOpinion].color.split(' ')[0]} border-4 border-white`}></div>
                        <div className="text-sm">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">Avis de validation</p>
                            <Badge className={`text-[10px] ${VISA_OPINION_LABELS[val.opinion as VisaOpinion].color}`}>
                              {VISA_OPINION_LABELS[val.opinion as VisaOpinion].label}
                            </Badge>
                          </div>
                          <p className="text-gray-500 text-xs">{formatDate(val.reviewed_at)}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                            <User className="h-3 w-3" />
                            <span>{val.validator_name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <FileCheck className="h-3 w-3" />
                            <span>v{event.version}</span>
                          </div>
                          {val.comment && (
                            <p className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 italic">
                              "{val.comment}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                });
              })()}

              {/* Empty state */}
              {workflow.submissions.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Aucune action effectuée sur ce workflow
                </div>
              )}
            </div>
          </div>

          {/* Actions Admin (uniquement pour les tâches standard) */}
          {isAdmin && workflow.task_type === 'standard' && workflow.status !== 'approved' && workflow.status !== 'closed' && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-800 mb-3">
                <Route className="h-4 w-4" />
                Décision de l'Administrateur
              </h4>
              <p className="text-xs text-amber-700 mb-4">
              En tant qu'administrateur, vous pouvez trancher sur la validation finale de cette tâche, 
              même si certains avis sont défavorables ou si des soumissions manquent.
            </p>

            {workflow.validation_summary && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-800">Soumissions :</span>
                  <span className={`font-bold ${workflow.validation_summary.is_fully_submitted ? 'text-green-600' : 'text-amber-600'}`}>
                    {workflow.validation_summary.submitted_executors} / {workflow.validation_summary.total_executors} exécuteurs
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-800">Avis défavorables :</span>
                  <span className={`font-bold ${workflow.validation_summary.has_rejections ? 'text-red-600' : 'text-green-600'}`}>
                    {workflow.validation_summary.has_rejections ? 'OUI' : 'AUCUN'}
                  </span>
                </div>
              </div>
            )}
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2 h-9 text-xs"
                  onClick={async () => {
                    if (confirm('Voulez-vous vraiment valider définitivement cette tâche ?')) {
                      setSubmitting(true);
                      const success = await submitAdminDecision(workflow.id, 'approved');
                      if (success) loadWorkflow();
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Valider la tâche
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-amber-300 text-amber-800 hover:bg-amber-100 gap-2 h-9 text-xs"
                  onClick={async () => {
                    if (confirm('Voulez-vous relancer la tâche (demander de nouvelles soumissions) ?')) {
                      setSubmitting(true);
                      const success = await submitAdminDecision(workflow.id, 'rejected');
                      if (success) loadWorkflow();
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                >
                  <Clock className="h-4 w-4" />
                  Relancer la tâche
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        {/* Actions */}
        <CardFooter className="flex flex-wrap gap-2">
          {canSubmit && (
            <Button
              onClick={() => setIsSubmitDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileUp className="h-4 w-4 mr-2" />
              {(workflow.status === 'var' || workflow.status === 'rejected' || hasRejectedSubmission) ? 'Resoumettre' : 'Soumettre'}
            </Button>
          )}
          
          {isCurrentValidator && (
            <Button
              onClick={() => setIsValidateDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Donner mon avis
            </Button>
          )}
          
          {workflow.status === 'validated' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Document validé par tous les validateurs</span>
            </div>
          )}
          
          {workflow.status === 'out_of_scope' && (
            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <Ban className="h-5 w-5" />
              <span className="font-medium">Document hors mission</span>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Submit Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {workflow.status === 'revision_required' ? 'Resoumettre le document' : 'Soumettre un document'}
            </DialogTitle>
            <DialogDescription>
              Version {workflow.current_version || 1} du workflow VISA
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <Label htmlFor="visa-file">
              Fichier ({fileExtension})<span className="text-red-500">*</span>
            </Label>
            <Input
              id="visa-file"
              type="file"
              onChange={handleFileChange}
              accept={`.${fileExtension === 'other' ? '*' : fileExtension}`}
            />
            
            <div className="grid gap-2">
              <Label htmlFor="submit-comment">Commentaire (optionnel)</Label>
              <Textarea
                id="submit-comment"
                rows={3}
                placeholder="Décrivez les modifications apportées..."
                value={submitComment}
                onChange={(e) => setSubmitComment(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmitDocument}
              disabled={!selectedFile || submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4 mr-2" />
                  Soumettre
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validate Dialog */}
      <Dialog open={isValidateDialogOpen} onOpenChange={setIsValidateDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Donner votre avis</DialogTitle>
            <DialogDescription>
              {workflow.task_type === 'workflow' ? (
                <>Vous êtes le validateur {(workflow.current_validator_idx ?? 0) + 1} sur {workflow.validator_order?.length || 0}.</>
              ) : (
                <>
                  {validatingSubmissionId ? (
                    <>Validation de la soumission de <strong>{workflow.submissions.find(s => s.id === validatingSubmissionId)?.executor_name}</strong>.</>
                  ) : (
                    <>Validation de la soumission de l'exécuteur.</>
                  )}
                </>
              )}
              <br />
              Version {validatingSubmissionId 
                ? workflow.submissions.find(s => s.id === validatingSubmissionId)?.version 
                : workflow.current_version} du document.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Options d'avis */}
            <div className="grid grid-cols-2 gap-3">
              {getValidOpinions(workflow.task_type).map((opinion) => {
                const config = VISA_OPINION_LABELS[opinion];
                const isSelected = selectedOpinion === opinion;
                
                return (
                  <button
                    key={opinion}
                    onClick={() => setSelectedOpinion(opinion)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected 
                        ? 'border-aps-teal bg-aps-teal/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getOpinionIcon(opinion)}
                      <span className="font-medium">
                        {workflow.task_type === 'standard' ? config.standardLabel || config.label : config.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                  </button>
                );
              })}
            </div>
            
            {/* Commentaire obligatoire */}
            <div className="grid gap-2">
              <Label htmlFor="validation-comment">
                Commentaire <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="validation-comment"
                rows={4}
                placeholder="Votre commentaire détaillé est obligatoire..."
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Ce commentaire sera conservé dans l'historique et visible par tous.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsValidateDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmitValidation}
              disabled={!selectedOpinion || !validationComment.trim() || submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enregistrer l'avis
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
