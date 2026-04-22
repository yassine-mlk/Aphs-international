import React, { useState, useEffect } from 'react';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
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
  Eye,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSupabase } from '@/hooks/useSupabase';
import { useVisaWorkflow } from '@/hooks/useVisaWorkflow';
import { uploadToR2 } from '@/lib/r2';
import {
  VisaWorkflowFull,
  VisaOpinion,
  VISA_OPINION_LABELS,
  VISA_STATUS_LABELS,
  VisaValidation,
  VisaSubmission
} from '@/types/visaWorkflow';

interface VisaWorkflowPanelProps {
  taskAssignmentId: string;
  currentUserId: string;
  isAssignedUser: boolean;
  isValidator: boolean;
  isAdmin: boolean;
  fileExtension: string;
}

export const VisaWorkflowPanel: React.FC<VisaWorkflowPanelProps> = ({
  taskAssignmentId,
  currentUserId,
  isAssignedUser,
  isValidator,
  isAdmin,
  fileExtension
}) => {
  const { toast } = useToast();
  const { fetchWorkflow, submitDocument, submitValidation } = useVisaWorkflow();
  
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

  // Vérifier si c'est le tour du validateur actuel
  const isCurrentValidator = workflow && 
    workflow.validator_order[workflow.current_validator_idx] === currentUserId &&
    workflow.status === 'pending_validation';

  // Vérifier si l'exécutant peut soumettre
  const canSubmit = workflow && 
    workflow.executor_id === currentUserId &&
    (workflow.status === 'pending_execution' || workflow.status === 'revision_required');

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
      console.log('Uploading to Cloudflare R2:', filePath);
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
      console.error('Error submitting document:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle validation
  const handleSubmitValidation = async () => {
    if (!selectedOpinion || !validationComment.trim() || !workflow) return;
    
    setSubmitting(true);
    
    const result = await submitValidation(workflow.id, {
      opinion: selectedOpinion,
      comment: validationComment
    }, currentUserId);
    
    if (result.success) {
      setIsValidateDialogOpen(false);
      setSelectedOpinion(null);
      setValidationComment('');
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

  const statusConfig = VISA_STATUS_LABELS[workflow.status];

  // Get validators only (exclude executor if at index 0)
  const validatorsOnly = workflow.validator_order.filter((id, idx) => 
    idx > 0 || id !== workflow.executor_id
  );
  const executorInChain = workflow.validator_order[0] === workflow.executor_id;
  
  // Calculate progress percentage based on validators only
  const totalSteps = validatorsOnly.length;
  const currentValidatorIndex = executorInChain 
    ? workflow.current_validator_idx - 1 
    : workflow.current_validator_idx;
  const completedSteps = workflow.status === 'validated' 
    ? totalSteps 
    : workflow.status === 'pending_validation' && currentValidatorIndex >= 0
      ? currentValidatorIndex 
      : 0;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  // Get submissions grouped by version
  const submissionsByVersion = workflow.submissions.reduce((acc, sub) => {
    acc[sub.version] = sub;
    return acc;
  }, {} as Record<number, VisaSubmission>);
  
  // Get validations grouped by version
  const validationsByVersion = workflow.validations.reduce((acc, val) => {
    if (!acc[val.version]) acc[val.version] = [];
    acc[val.version].push(val);
    return acc;
  }, {} as Record<number, typeof workflow.validations>);
  
  // Viewing version state
  const displayVersion = viewingVersion ?? workflow.current_version;
  const currentSubmission = submissionsByVersion[displayVersion];
  const currentValidations = validationsByVersion[displayVersion] || [];

  return (
    <>
      <Card className="border-0 shadow-md bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Route className="h-6 w-6 text-blue-600" />
              </div>
              <span>Workflow VISA</span>
            </CardTitle>
            <Badge className={`${statusConfig.color} px-3 py-1 text-sm font-medium`}>
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Bar */}
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
                <p className="font-medium">{workflow.executor_name}</p>
                <p className="text-xs text-gray-500">Responsable de la soumission des documents</p>
              </div>
            </div>
          </div>

          {/* Validation Steps - Visual Flow */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-blue-600" />
              Circuit de validation ({validatorsOnly.length} validateur{validatorsOnly.length > 1 ? 's' : ''})
            </Label>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {validatorsOnly.length === 0 ? (
                <span className="text-sm text-gray-500 italic">Aucun validateur configuré</span>
              ) : (
                validatorsOnly.map((validatorId, index) => {
                  const actualIndex = executorInChain ? index + 1 : index;
                  const isCurrent = actualIndex === workflow.current_validator_idx && workflow.status === 'pending_validation';
                  const isPast = actualIndex < workflow.current_validator_idx || workflow.status === 'validated';
                  
                  const validation = workflow.validations.find(v => 
                    v.validator_id === validatorId && v.version === workflow.current_version
                  );
                  
                  return (
                    <React.Fragment key={validatorId}>
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
                          {workflow.validator_names?.[validatorId]?.split(' ')[0] || `Val ${index + 1}`}
                        </span>
                        {validation && (
                          <Badge className={`${VISA_OPINION_LABELS[validation.opinion].color} text-[10px] px-1 py-0`}>
                            {VISA_OPINION_LABELS[validation.opinion].label.substring(0, 3)}
                          </Badge>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] text-blue-600 font-medium bg-blue-100 px-1 rounded">en cours</span>
                        )}
                      </div>
                      {index < validatorsOnly.length - 1 && (
                        <ChevronRight className={`h-5 w-5 flex-shrink-0 ${
                          isPast ? 'text-green-500' : 'text-gray-300'
                        }`} />
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>

          {/* Current File Card with Version Selector */}
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    {viewingVersion && viewingVersion !== workflow.current_version 
                      ? 'Version consultée' 
                      : 'Version actuelle'}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-gray-900">v{displayVersion || 1}</p>
                    {viewingVersion && viewingVersion !== workflow.current_version && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                        Archive
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Version Selector */}
                {workflow.submissions.length > 1 && (
                  <select
                    value={displayVersion}
                    onChange={(e) => setViewingVersion(Number(e.target.value))}
                    className="text-sm border rounded-md px-2 py-1 bg-white"
                  >
                    {workflow.submissions.map((sub) => (
                      <option key={sub.id} value={sub.version}>
                        v{sub.version} {sub.version === workflow.current_version ? '(actuelle)' : ''}
                      </option>
                    ))}
                  </select>
                )}
                {currentSubmission && (
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
            
            {viewingVersion && viewingVersion !== workflow.current_version && (
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
                    <span>Exécuteur: {workflow.executor_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <span className="font-medium text-xs bg-gray-100 px-1.5 py-0.5 rounded">{validatorsOnly.length}</span>
                    <span>validateur{validatorsOnly.length > 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {/* All events chronologically */}
              {(() => {
                // Build chronological events list
                const events = [];
                
                // Add submissions
                workflow.submissions.forEach(sub => {
                  events.push({
                    type: 'submission',
                    date: sub.submitted_at,
                    data: sub,
                    version: sub.version
                  });
                });
                
                // Add validations
                workflow.validations.forEach(val => {
                  events.push({
                    type: 'validation',
                    date: val.created_at,
                    data: val,
                    version: val.version
                  });
                });
                
                // Sort by date (oldest first)
                events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                return events.map((event, index) => {
                  if (event.type === 'submission') {
                    const sub = event.data;
                    const isCurrent = event.version === workflow.current_version;
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
                    const colors = {
                      'F': { bg: 'bg-green-500', border: 'border-green-200', text: 'Favorable' },
                      'D': { bg: 'bg-red-500', border: 'border-red-200', text: 'Défavorable' },
                      'S': { bg: 'bg-yellow-500', border: 'border-yellow-200', text: 'Suspendu' },
                      'HM': { bg: 'bg-gray-500', border: 'border-gray-200', text: 'Hors Mission' }
                    };
                    const color = colors[val.opinion] || colors['HM'];
                    return (
                      <div key={`val-${val.id}`} className="relative pl-6 pb-4 border-l-2 border-gray-200">
                        <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full ${color.bg} border-4 border-white`}></div>
                        <div className="text-sm">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">Avis de validation</p>
                            <Badge className={`text-[10px] ${VISA_OPINION_LABELS[val.opinion].color}`}>
                              {VISA_OPINION_LABELS[val.opinion].label}
                            </Badge>
                          </div>
                          <p className="text-gray-500 text-xs">{formatDate(val.created_at)}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                            <User className="h-3 w-3" />
                            <span>{val.validator_name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <FileCheck className="h-3 w-3" />
                            <span>v{val.version}</span>
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
              {workflow.submissions.length === 0 && workflow.validations.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Aucune action effectuée sur ce workflow
                </div>
              )}
            </div>
          </div>
        </CardContent>

        {/* Actions */}
        <CardFooter className="flex flex-wrap gap-2">
          {canSubmit && (
            <Button
              onClick={() => setIsSubmitDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileUp className="h-4 w-4 mr-2" />
              {workflow.status === 'revision_required' ? 'Resoumettre' : 'Soumettre'}
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
              Vous êtes le validateur {workflow.current_validator_idx + 1} sur {workflow.validator_order.length}.
              Version {workflow.current_version} du document.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Options d'avis */}
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(VISA_OPINION_LABELS) as VisaOpinion[]).map((opinion) => {
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
                      <span className="font-medium">{config.label}</span>
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
