import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  FileUp, 
  User, 
  CheckCircle2, 
  History, 
  ListChecks, 
  FileText, 
  Send, 
  Eye, 
  AlertTriangle, 
  Users, 
  RotateCcw, 
  AlertCircle,
  ChevronUp,
  ChevronDown,
  X,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  TASK_STATUS_LABELS, 
  TASK_STATUS_COLORS, 
  PHASE_LABELS,
  TaskStatus
} from '@/types/taskAssignment';
import { 
  VISA_OPINION_LABELS,
  VisaOpinion
} from '@/types/visaWorkflow';
import { useVisaWorkflow } from '@/hooks/useVisaWorkflow';
import { VisaWorkflowFull } from '@/types/visaWorkflow';
import { uploadToR2 } from '@/lib/r2';

interface Review {
  id: string;
  submission_id: string;
  validator_id: string;
  validator_name?: string;
  opinion: string;
  comment: string;
  reviewed_at: string;
}

interface Task {
  id: string;
  project_id: string;
  project_name: string;
  phase_id: string;
  section_id: string;
  section_name?: string;
  subsection_id: string;
  subsection_name?: string;
  task_name: string;
  status: TaskStatus;
  assignment_type: 'standard' | 'workflow';
  deadline: string;
  validation_deadline: string;
  start_date: string;
  end_date: string;
  file_extension: string;
  comment: string;
  priority: string;
  assigned_to: string[];
  validators: { user_id: string; days_limit: number; role: string }[];
  executor_days_limit: number;
  transparency_mode: boolean;
  max_revisions: number;
  revision_count: number;
  closed_by?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

const TaskDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const { user, status: authStatus, isSuperAdmin, role: userRole } = useAuth();
  const isAdmin = isSuperAdmin || userRole === 'admin';
  const { fetchWorkflow, submitDocument, submitValidation, submitAdminDecision, reassignValidators } = useVisaWorkflow();
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [workflow, setWorkflow] = useState<VisaWorkflowFull | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [canViewInfoSheets, setCanViewInfoSheets] = useState(false);
  const [infoSheet, setInfoSheet] = useState<string | null>(null);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  
  // États pour la validation
  const [selectedOpinion, setSelectedOpinion] = useState<string>('');
  const [validationComment, setValidationComment] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [reassignForm, setReassignForm] = useState<{
    executor_id: string;
    validators: { user_id: string; days_limit: number }[];
    max_revisions: number;
    deadline: string;
    comment: string;
  }>({
    executor_id: '',
    validators: [],
    max_revisions: 3,
    deadline: '',
    comment: ''
  });

  // Vérifier si un utilisateur est dans la liste des validateurs
  const isUserValidator = (userId: string, validators: any[]) => {
    return validators.some((v: any) => v.user_id === userId);
  };

  // Charger les détails de la tâche
  const loadTaskDetails = useCallback(async () => {
    if (!id || !user?.id || authStatus !== 'authenticated') return;
    
    try {
      setLoading(true);
      
      // Récupérer la tâche via la vue
      const { data: taskData, error: taskError } = await supabase
        .from('task_assignments_view')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (taskError) throw taskError;
      
      if (!taskData) {
        toast({
          title: "Tâche non trouvée",
          description: "La tâche demandée n'existe pas ou vous n'y avez pas accès.",
          variant: "destructive",
        });
        navigate(-1);
        return;
      }
      
      setTask(taskData);

      // Vérifier les permissions pour les fiches informatives
      if (isAdmin) {
        setCanViewInfoSheets(true);
      } else {
        const { data: memberData } = await supabase
          .from('membre')
          .select('can_view_info_sheets')
          .eq('project_id', taskData.project_id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (memberData?.can_view_info_sheets) {
          setCanViewInfoSheets(true);
        }
      }

      // Récupérer la fiche informative si autorisé
      // On cherche d'abord dans le snapshot du projet
      const { data: taskSnapshot } = await supabase
        .from('project_tasks_snapshot')
        .select('info_sheet')
        .eq('project_id', taskData.project_id)
        .eq('title', taskData.task_name)
        .maybeSingle();

      if (taskSnapshot?.info_sheet) {
        setInfoSheet(taskSnapshot.info_sheet);
      } else {
        // Si pas de snapshot, on cherche dans la table globale via le nom de la tâche et les IDs de structure
        const { data: globalSheet } = await supabase
          .from('task_info_sheets')
          .select('info_sheet')
          .eq('phase_id', taskData.phase_id)
          .eq('section_id', taskData.section_id)
          .eq('subsection_id', taskData.subsection_id)
          .eq('task_name', taskData.task_name)
          .eq('language', 'fr')
          .maybeSingle();
        
        if (globalSheet?.info_sheet) {
          setInfoSheet(globalSheet.info_sheet);
        }
      }

      // Récupérer les noms de tous les participants (exécuteurs et validateurs)
      const participantIds = [
        ...taskData.assigned_to,
        ...taskData.validators.map((v: any) => v.user_id)
      ];

      if (participantIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', participantIds);
        
        if (!profilesError && profiles) {
          const names: Record<string, string> = {};
          profiles.forEach(p => {
            names[p.user_id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Utilisateur inconnu';
          });
          setParticipantNames(names);
        }
      }

      // Charger les détails du workflow/submissions via le hook unifié
      const workflowData = await fetchWorkflow(taskData.id);
      setWorkflow(workflowData);
      
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails de la tâche",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, authStatus, supabase, toast, navigate, fetchWorkflow]);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      loadTaskDetails();
    }
  }, [loadTaskDetails, authStatus]);

  // Realtime subscription for task details and workflow
  useEffect(() => {
    if (!id || authStatus !== 'authenticated') return;

    const taskChannel = supabase
      .channel(`task-realtime-${id}`)
      // Changements sur la tâche standard
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'standard_tasks', 
        filter: `id=eq.${id}` 
      }, () => loadTaskDetails())
      // Changements sur la tâche workflow
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'workflow_tasks', 
        filter: `id=eq.${id}` 
      }, () => loadTaskDetails())
      // Changements sur les révisions
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'task_revisions', 
        filter: `task_id=eq.${id}` 
      }, () => loadTaskDetails())
      // Changements sur les avis
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'task_reviews' 
      }, async (payload) => {
        // Le filtrage par task_id est difficile ici car task_reviews n'a pas forcément task_id directement
        // mais via submission_id. On recharge si on reçoit n'importe quel review par précaution ou si on peut filtrer.
        loadTaskDetails();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
    };
  }, [id, authStatus, loadTaskDetails]);

  // Soumettre la tâche
  const handleSubmit = async () => {
    if (!task?.id || !user?.id) return;

    if (!file) {
      toast({
        title: "Fichier requis",
        description: "Veuillez sélectionner un fichier à soumettre",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    setUploadProgress(0);
    
    try {
      let finalFileUrl = '';
      let finalFileName = '';

      // Upload sur R2
      const timestamp = new Date().getTime();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const path = `tasks/${task.id}/${timestamp}_${cleanFileName}`;
      
      try {
        finalFileUrl = await uploadToR2(file, path, (progress) => {
          setUploadProgress(progress);
        });
        finalFileName = file.name;
      } catch (uploadError) {
        console.error('Erreur upload R2:', uploadError);
        throw new Error("Erreur lors de l'upload du fichier vers Cloudflare R2");
      }

      // Soumission via le hook unifié
      const success = await submitDocument(
        task.id,
        {
          file_url: finalFileUrl,
          file_name: finalFileName,
          comment: comment
        },
        user.id
      );
      
      if (success) {
        setComment('');
        setFile(null);
        setUploadProgress(0);
        loadTaskDetails();
      }
    } catch (error: any) {
      console.error('Erreur lors de la soumission:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de soumettre la tâche",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Soumettre la validation
  const handleValidate = async () => {
    if (!task?.id || !user?.id || !selectedOpinion) return;
    
    setSubmitting(true);
    try {
      // Validation via le hook unifié
      const result = await submitValidation(
        task.id,
        {
          opinion: selectedOpinion as VisaOpinion,
          comment: validationComment
        },
        user.id,
        selectedSubmissionId || undefined
      );
      
      if (result.success) {
        setSelectedOpinion('');
        setValidationComment('');
        setSelectedSubmissionId(null);
        loadTaskDetails();
      }
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre avis",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Gérer la décision admin
  const handleAdminDecision = async (decision: 'approved' | 'rejected' | 'closed' | 'relaunch_partial' | 'relaunch_complete') => {
    if (!task?.id) return;
    
    const confirmMsg = {
      approved: "Approuver définitivement cette tâche ?",
      rejected: "Rejeter cette tâche ?",
      closed: "Clôturer cette tâche ?",
      relaunch_partial: "Relancer uniquement les intervenants dont le projet a été refusé ?",
      relaunch_complete: "Relancer complètement la tâche (reset total) ?"
    }[decision];

    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    try {
      const success = await submitAdminDecision(task.id, decision);
      if (success) {
        loadTaskDetails();
      }
    } catch (error) {
      console.error('Erreur decision admin:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">Tâche non trouvée</h3>
        <p className="text-gray-500 mb-4">La tâche demandée n'existe pas ou vous n'y avez pas accès.</p>
        <Button onClick={() => navigate(-1)}>
          Retour
        </Button>
      </div>
    );
  }

  const statusLabel = TASK_STATUS_LABELS[task.status];
  const statusColor = TASK_STATUS_COLORS[task.status];

  const isExecutor = task.assigned_to.includes(user?.id || '');
  const isValidator = isUserValidator(user?.id || '', task.validators);

  // --- LOGIQUE POUR LES TÂCHES SÉQUENTIELLES (WORKFLOW) ---
  const isSequential = task.assignment_type === 'workflow';

  // Calcul de l'intervenant actif et de l'étape actuelle
  const getActiveIntervener = () => {
    if (!isSequential || !workflow) return null;

    const status = task.status;
    const totalValidators = task.validators?.length || 0;
    const currentIdx = workflow.current_validator_idx || 0;

    if (['open', 'var', 'vao'].includes(status)) {
      const executorNames = task.assigned_to.map(id => participantNames[id]).filter(Boolean).join(', ');
      return {
        label: "En attente de soumission",
        name: executorNames || "Exécuteur",
        type: 'executor'
      };
    }

    if (status === 'in_review') {
      const validatorName = workflow.current_validator_name || participantNames[workflow.current_validator_id || ''] || "Validateur";
      return {
        label: "En cours de validation",
        name: `${validatorName} (Validator ${currentIdx} / ${totalValidators})`,
        type: 'validator'
      };
    }

    return null;
  };

  const activeIntervener = getActiveIntervener();

  // Calcul dynamique de la date de remise
  const getDynamicDeadline = () => {
    if (!isSequential || !workflow || !task.deadline) return null;

    const totalSteps = 1 + (task.validators?.length || 0); // Executor + Validators
    const startDate = new Date(task.start_date || task.created_at);
    const finalDeadline = new Date(task.deadline);
    
    if (isNaN(startDate.getTime()) || isNaN(finalDeadline.getTime())) return null;

    const totalDays = Math.max(1, Math.floor((finalDeadline.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysPerStep = Math.floor(totalDays / totalSteps);

    let currentStep = 0;
    if (['open', 'var', 'vao'].includes(task.status)) {
      currentStep = 1;
    } else if (task.status === 'in_review') {
      currentStep = 1 + (workflow.current_validator_idx || 1);
    } else {
      return finalDeadline; // Tâche terminée
    }

    const dynamicDeadline = new Date(startDate);
    dynamicDeadline.setDate(startDate.getDate() + (daysPerStep * currentStep));
    
    // Ne pas dépasser le deadline final
    return dynamicDeadline > finalDeadline ? finalDeadline : dynamicDeadline;
  };

  const dynamicDeadline = getDynamicDeadline();
  const isDeadlineNear = dynamicDeadline && (dynamicDeadline.getTime() - new Date().getTime()) < (3 * 24 * 60 * 60 * 1000);
  const isDeadlinePassed = dynamicDeadline && dynamicDeadline < new Date();

  // --- FIN LOGIQUE SÉQUENTIELLE ---
  
  const isCurrentWorkflowValidator = isSequential && workflow?.current_validator_id === user?.id;

  // Pour les tâches standard, on autorise la soumission tant que la tâche n'est pas close/approuvée
  // ET que l'utilisateur n'a pas encore soumis de document OU que sa dernière soumission a été rejetée
  const userSubmissions = workflow?.submissions?.filter(sub => sub.executor_id === user?.id) || [];
  const latestUserSubmission = userSubmissions.length > 0 ? userSubmissions[0] : null;
  const hasRejectedSubmission = latestUserSubmission?.reviews?.some(r => r.opinion === 'D');

  const canSubmit = isExecutor && (
    task.assignment_type === 'standard' 
      ? (task.status !== 'approved' && task.status !== 'closed' && (!latestUserSubmission || hasRejectedSubmission))
      : (task.status === 'open' || task.status === 'var')
  );

  // Un validateur peut valider s'il est son tour (workflow) ou s'il est assigné (standard)
  // ET s'il n'a pas déjà validé la soumission sélectionnée (standard)
  const hasAlreadyValidatedSelected = isValidator && task.assignment_type === 'standard' && selectedSubmissionId &&
    workflow?.submissions?.find(s => s.id === selectedSubmissionId)?.reviews?.some(r => r.validator_id === user?.id);

  const canValidate = (isCurrentWorkflowValidator || (isValidator && task.assignment_type === 'standard')) && 
    task.status === 'in_review' && !hasAlreadyValidatedSelected;

  // Filtrer les soumissions : un exécuteur ne voit que SES soumissions, 
  // SAUF si le mode transparence est activé OU s'il est aussi validateur/admin
  const visibleSubmissions = workflow?.submissions?.filter(sub => {
    if (task.assignment_type === 'standard') {
      if (isAdmin || task.transparency_mode || isValidator) return true;
      if (isExecutor) return sub.executor_id === user?.id;
    }
    if (isAdmin || isValidator || task?.transparency_mode) return true;
    return sub.executor_id === user?.id;
  }) || [];

  // Filtrer l'historique : même logique pour la transparence
  const visibleHistory = workflow?.history?.filter(item => {
    if (task.assignment_type === 'standard') {
      if (isAdmin || task.transparency_mode) return true;
      return item.user_id === user?.id || item.details?.executor_id === user?.id;
    }
    if (isAdmin || isValidator || task?.transparency_mode) return true;
    // Un exécuteur ne voit que ses propres actions (soumissions) 
    // et les décisions administratives globales
    return item.user_id === user?.id || item.action === 'admin_decision' || item.action === 'status_change';
  }) || [];

  const getHistoryActionLabel = (action: string, details?: any) => {
    switch (action) {
      case 'submission': return 'Nouvelle soumission';
      case 'validation': return 'Avis de validation';
      case 'status_change': return 'Changement de statut';
      case 'admin_decision': 
        const decision = details?.decision;
        if (decision === 'relaunch_partial') return 'Relance partielle';
        if (decision === 'relaunch_complete') return 'Relance complète';
        if (decision === 'approved') return 'Approbation finale';
        if (decision === 'closed') return 'Clôture de la tâche';
        return 'Décision admin';
      default: return action;
    }
  };

  const getHistoryIcon = (action: string) => {
    switch (action) {
      case 'submission': return <FileUp className="h-4 w-4 text-blue-500" />;
      case 'validation': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'admin_decision': return <ListChecks className="h-4 w-4 text-purple-500" />;
      default: return <History className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{task.task_name}</h1>
                  {task.assignment_type === 'workflow' && (
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      Indice {workflow?.current_version_label || 'A'}
                    </Badge>
                  )}
                </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-500 text-sm">
                {PHASE_LABELS[task.phase_id as any] || task.phase_id} • {task.section_name || `Section ${task.section_id}`} • {task.subsection_name || `Sous-section ${task.subsection_id}`}
              </p>
              {task.transparency_mode && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] h-5 flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Mode Transparence
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Badge className={`${statusColor} text-sm px-3 py-1`}>
          {statusLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne Gauche: Détails et Soumission */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fiche Informative (si disponible et autorisé) */}
          {canViewInfoSheets && infoSheet && (
            <Card className="border-blue-100 bg-blue-50/10 overflow-hidden transition-all duration-300">
              <button 
                onClick={() => setShowInfoSheet(!showInfoSheet)}
                className="w-full flex items-center justify-between p-4 hover:bg-blue-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-blue-900">Fiche Informative</h3>
                    <p className="text-xs text-blue-600/70">Consignes et objectifs détaillés pour cette tâche</p>
                  </div>
                </div>
                {showInfoSheet ? (
                  <ChevronUp className="h-5 w-5 text-blue-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-blue-400" />
                )}
              </button>
              
              {showInfoSheet && (
                <CardContent className="pt-0 pb-6 px-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="prose prose-sm max-w-none text-slate-700 bg-white p-5 rounded-xl border border-blue-100 shadow-sm">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {infoSheet}
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Informations principales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.comment && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{task.comment}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-1">
                  <Label className="text-gray-500">Projet</Label>
                  <div className="flex items-center gap-2">
                    <FileUp className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{task.project_name}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-gray-500">
                    {task.assignment_type === 'standard' ? 'Fin prévue pour la remise' : 'Échéance globale du circuit'}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{new Date(task.deadline).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-gray-500">Type de tâche</Label>
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">
                      {task.assignment_type === 'workflow' ? 'Revue documentaire séquentielle' : 'Collecte Parallèle'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-gray-500">Extension attendue</Label>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="font-medium uppercase">{task.file_extension}</span>
                  </div>
                </div>

                {/* Nouveaux champs pour les tâches séquentielles */}
                {isSequential && activeIntervener && (
                  <>
                    <div className="space-y-1 sm:col-span-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                      <Label className="text-blue-700 font-semibold">Intervenant actif</Label>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-blue-900">
                          {activeIntervener.label} — {activeIntervener.name}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 sm:col-span-2 p-3 bg-amber-50/30 rounded-lg border border-amber-100">
                      <Label className="text-amber-700 font-semibold">Date de remise dynamique</Label>
                      <div className="flex items-center gap-2">
                        <Clock className={`h-4 w-4 ${isDeadlinePassed ? 'text-red-500' : isDeadlineNear ? 'text-orange-500' : 'text-amber-500'}`} />
                        <span className={`font-bold ${
                          isDeadlinePassed ? 'text-red-600' : 
                          isDeadlineNear ? 'text-orange-600' : 
                          'text-amber-700'
                        }`}>
                          Date de remise : {dynamicDeadline ? dynamicDeadline.toLocaleDateString('fr-FR') : 'Non définie'}
                          {isDeadlinePassed && " (Retard)"}
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-600 mt-1 italic">
                        Basé sur la répartition équitable du délai global entre tous les intervenants.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Formulaire de soumission (si applicable) */}
          {canSubmit && (
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
          )}

          {/* Formulaire de validation (si applicable) */}
          {canValidate && (
            <Card id="validation-form" className="border-amber-200 shadow-sm scroll-mt-6">
              <CardHeader className="bg-amber-50/50">
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <CheckCircle2 className="h-5 w-5" />
                  Statuer sur le document
                  {task.assignment_type === 'standard' && (
                    <span className="text-sm font-normal text-amber-600 ml-auto">
                      {selectedSubmissionId 
                        ? `Validation de : ${workflow?.submissions.find(s => s.id === selectedSubmissionId)?.executor_name}` 
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
                      onClick={() => handleValidate()}
                      disabled={submitting || !selectedOpinion || (task.assignment_type === 'standard' && !selectedSubmissionId)}
                    >
                      {submitting ? 'Traitement en cours...' : 'Enregistrer mon avis'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Historique des soumissions et avis */}
          <Card className={isSequential ? "border-blue-100 shadow-md" : ""}>
            <CardHeader className={isSequential ? "bg-blue-50/30" : ""}>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-gray-600" />
                Révisions et Avis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-12">
                {visibleSubmissions.length > 0 ? (
                  visibleSubmissions.map((sub) => (
                    <div 
                      key={sub.id} 
                      className={`space-y-6 ${
                        selectedSubmissionId === sub.id ? 'bg-blue-50/20 p-6 rounded-xl border-2 border-blue-200' : ''
                      }`}
                    >
                      {/* Header de révision agrandi */}
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-sm ${
                            isSequential ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {isSequential ? (sub.version_label || 'A') : <FileText className="h-7 w-7" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-bold text-gray-900">{sub.executor_name}</p>
                              {sub.version_label === workflow?.current_version_label && isSequential && (
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 text-[10px] uppercase font-black">Dernière</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <p className="text-xs text-gray-500">Soumis le {new Date(sub.submitted_at).toLocaleString('fr-FR')}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {isSequential && sub.visa_status && (
                            <Badge className={`px-3 py-1 text-xs font-bold shadow-sm ${
                              sub.visa_status === 'vso' ? 'bg-green-100 text-green-800 border-green-200' :
                              sub.visa_status === 'vao' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                              'bg-red-100 text-red-800 border-red-200'
                            }`}>
                              {sub.visa_status === 'vso' ? 'Visa Sans Observations' :
                               sub.visa_status === 'vao' ? 'Visa Avec Observations' :
                               'Visa À Resoumettre'}
                            </Badge>
                          )}
                          {!isSequential && sub.reviews?.length > 0 && (
                            (() => {
                              const userHasVoted = sub.reviews?.some(r => r.validator_id === user?.id);
                              const shouldShowBadge = isAdmin || isExecutor || (isValidator && userHasVoted);

                              if (!shouldShowBadge) return null;

                              return (
                                <Badge className={sub.reviews.length >= (task.validators?.length || 0)
                                  ? (sub.reviews.every((r: any) => r.opinion === 'F') ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200")
                                  : "bg-amber-100 text-amber-700 border-amber-200"
                                }>
                                  {sub.reviews.length >= (task.validators?.length || 0)
                                    ? (sub.reviews.every((r: any) => r.opinion === 'F') ? "Validé" : "À corriger")
                                    : "En cours de revue"}
                                </Badge>
                              );
                            })()
                          )}
                          {isValidator && !isSequential && task.status === 'in_review' && !sub.reviews?.some(r => r.validator_id === user?.id) && (
                            <Button 
                              variant={selectedSubmissionId === sub.id ? "default" : "outline"} 
                              size="sm"
                              className="h-8"
                              onClick={() => {
                                setSelectedSubmissionId(sub.id === selectedSubmissionId ? null : sub.id);
                                if (sub.id !== selectedSubmissionId) {
                                  document.getElementById('validation-form')?.scrollIntoView({ behavior: 'smooth' });
                                }
                              }}
                            >
                              {selectedSubmissionId === sub.id ? 'Sélectionné' : 'Statuer'}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Fichier et Commentaire */}
                      <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <FileUp className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Document de révision</p>
                              <a 
                                href={sub.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                              >
                                {sub.file_name || 'Consulter le document'}
                                <Eye className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a href={sub.file_url} target="_blank" rel="noopener noreferrer">
                              Ouvrir
                            </a>
                          </Button>
                        </div>
                        {sub.comment && (
                          <div className="mt-4 pt-4 border-t border-gray-50">
                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Note de l'exécuteur</p>
                            <p className="text-sm text-gray-600 italic">"{sub.comment}"</p>
                          </div>
                        )}
                      </div>

                      {/* Avis des validateurs (Workflow Style) */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Separator className="flex-1" />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Avis du circuit</span>
                          <Separator className="flex-1" />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          {(() => {
                            const filteredReviews = sub.reviews?.filter(review => {
                              if (task.assignment_type === 'standard') {
                                if (isAdmin || task.transparency_mode) return true;
                                if (isExecutor) return sub.executor_id === user?.id;
                                if (isValidator) {
                                  // Un validateur ne voit les avis des autres que s'il a déjà statué
                                  const userHasVoted = sub.reviews?.some(r => r.validator_id === user?.id);
                                  if (userHasVoted) return true;
                                  return review.validator_id === user?.id;
                                }
                              }
                              return true;
                            }) || [];

                            return filteredReviews.length > 0 ? (
                              filteredReviews.map((review) => {
                                const opinion = review.opinion as VisaOpinion;
                                const opinionLabel = VISA_OPINION_LABELS[opinion];
                                
                                // Couleurs personnalisées selon l'avis
                                const colors: Record<VisaOpinion, { bg: string, text: string, border: string }> = {
                                  'F': { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', border: 'border-[#C8E6C9]' },
                                  'D': { bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', border: 'border-[#FFCDD2]' },
                                  'S': { bg: 'bg-[#FFF3E0]', text: 'text-[#E65100]', border: 'border-[#FFE0B2]' },
                                  'HM': { bg: 'bg-[#F5F5F5]', text: 'text-[#616161]', border: 'border-[#E0E0E0]' }
                                };
                                
                                const color = colors[opinion] || colors['HM'];

                                return (
                                  <div 
                                    key={review.id} 
                                    className={`flex items-stretch rounded-xl border ${color.bg} ${color.border} overflow-hidden shadow-sm`}
                                  >
                                    <div className={`w-16 flex items-center justify-center text-2xl font-black ${color.text} border-r ${color.border} bg-white/30`}>
                                      {opinion}
                                    </div>
                                    <div className="flex-1 p-4">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <div>
                                          <p className={`text-sm font-black ${color.text}`}>
                                            {opinionLabel?.label || opinion}
                                          </p>
                                          <p className="text-xs font-bold text-gray-700">
                                            {review.validator_name}
                                          </p>
                                        </div>
                                        <p className="text-[10px] text-gray-500 font-medium">
                                          Rendu le {new Date(review.reviewed_at).toLocaleString('fr-FR')}
                                        </p>
                                      </div>
                                      {review.comment && (
                                        <p className="mt-2 text-sm text-gray-700 italic leading-relaxed">
                                          "{review.comment}"
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-sm text-gray-400 italic">Aucun avis visible pour vous sur cette révision.</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      
                      {/* Séparateur entre les révisions */}
                      <div className="py-4">
                        <Separator className="bg-gray-100" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">Aucune soumission pour le moment.</p>
                    <p className="text-xs text-gray-400 mt-1">Les fichiers soumis apparaîtront ici avec les avis des validateurs.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne Droite: Participants et Délais */}
        <div className="space-y-6">
          {/* Circuit de validation (Timeline) pour Workflow */}
          {isSequential ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-blue-600" />
                  Circuit de validation
                </CardTitle>
                
                {/* Barre de progression */}
                {(() => {
                  const totalSteps = 1 + (task.validators?.length || 0);
                  const currentStep = task.status === 'in_review' ? 1 + (workflow?.current_validator_idx || 1) : 
                                    (['vso', 'vao', 'var', 'closed', 'blocked'].includes(task.status)) ? totalSteps : 1;
                  const progress = (currentStep / totalSteps) * 100;
                  
                  return (
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
                  );
                })()}
              </CardHeader>
              <CardContent className="pt-4">
                <div className="relative space-y-0 pb-2">
                  {/* Ligne verticale de connexion */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-gray-100"></div>

                  {/* Nœud Executor */}
                  {(() => {
                    const isSubmitted = ['in_review', 'vso', 'vao', 'var', 'closed', 'blocked'].includes(task.status);
                    const isCurrent = ['open', 'var', 'vao'].includes(task.status);
                    const executorNames = task.assigned_to.map(id => participantNames[id]).filter(Boolean).join(', ') || "Exécuteur";
                    
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
                  {task.validators.map((v, idx) => {
                    const validatorOrder = idx + 1;
                    const latestSub = workflow?.submissions?.[0];
                    const review = latestSub?.reviews?.find(r => r.validator_id === v.user_id);
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

                {/* Compteur de tours restants (BUG 3) */}
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
          ) : (
            <>
               {/* Ancienne vue simple pour Standard */}
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
                       {task.assigned_to.map((id, idx) => (
                         <Badge key={id || idx} variant="secondary">
                           {participantNames[id] || `Intervenant ${idx + 1}`}
                         </Badge>
                       ))}
                     </div>
                   </div>
                   
                   <div className="space-y-2">
                     <Label className="text-xs text-gray-500 uppercase">Validateurs</Label>
                     <div className="space-y-2">
                       {task.validators.map((v, idx) => (
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
           )}

          {/* Actions Administrateur (Décision Finale) */}
          {(() => {
            if (!isAdmin || !task) return null;

            // Cas pour Workflow Séquentiel
            if (isSequential) {
              const isBlocked = (task.status as string) === 'blocked' || (task.revision_count >= task.max_revisions);
              const isFinished = ['vso', 'vao'].includes(task.status);
              
              // BUG 3: La condition d'affichage doit exclure les tâches déjà clôturées
              const showAdminDecision = (isBlocked || isFinished) && !task.closed_at;

              if (showAdminDecision) {
                return (
                  <Card className={`border-2 shadow-xl ${isBlocked ? 'border-red-200 bg-red-50/10' : 'border-green-200 bg-green-50/10'}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-3 text-lg font-black">
                        {isBlocked ? (
                          <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
                        ) : (
                          <div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
                        )}
                        {isBlocked ? "CIRCUIT BLOQUÉ" : "CIRCUIT TERMINÉ"}
                      </CardTitle>
                      <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        {isBlocked 
                          ? `${task.revision_count} révisions effectuées sans visa favorable.`
                          : `Le circuit a abouti au visa final : ${task.status.toUpperCase()}.`
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-3">
                        {/* Action 1: Clôturer / Valider quand même (BUG 1: avec confirmation et logs) */}
                        <Button 
                          className={`w-full h-12 font-black text-xs uppercase tracking-widest shadow-md ${isBlocked ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
                          onClick={async () => {
                            console.log('Force close triggered for task:', task.id);
                            if (window.confirm("Êtes-vous sûr ? Cette action est irréversible.")) {
                              setSubmitting(true);
                              const success = await submitAdminDecision(task.id, 'closed');
                              if (success) {
                                // BUG 2: Mettre à jour le state local immédiatement
                                setTask(prev => prev ? ({ 
                                  ...prev, 
                                  status: 'closed', 
                                  closed_at: new Date().toISOString(),
                                  closed_by: user?.id
                                }) : null);
                                loadTaskDetails();
                               }
                               setSubmitting(false);
                             }
                           }}
                          disabled={submitting}
                        >
                          {isBlocked ? "Valider quand même" : "Clôturer la tâche"}
                        </Button>

                        {/* Action 2: Relancer le circuit (BUG 2: reset revision_count) */}
                        <Button 
                          variant="outline"
                          className="w-full h-12 font-black text-xs uppercase tracking-widest border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={async () => {
                            console.log('Relaunch circuit triggered for task:', task.id);
                            setSubmitting(true);
                            const success = await submitAdminDecision(task.id, 'relaunch_complete');
                            if (success) {
                              // BUG 2: Mettre à jour le state local immédiatement
                              setTask(prev => prev ? ({ 
                                ...prev, 
                                status: 'open', 
                                revision_count: 0 
                              }) : null);
                              // BUG 4: Reset local des soumissions
                              loadTaskDetails();
                            }
                            setSubmitting(false);
                          }}
                          disabled={submitting}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Relancer le circuit
                        </Button>

                  {/* Action 3: Réassigner les validateurs */}
                  <Button 
                    variant="outline"
                    className="w-full h-12 font-black text-xs uppercase tracking-widest border-purple-200 text-purple-700 hover:bg-purple-50"
                    onClick={async () => {
                      // Charger les utilisateurs pour le sélecteur
                      const { data: profiles } = await supabase
                        .from('profiles')
                        .select('user_id, first_name, last_name, role');
                      if (profiles) setAllUsers(profiles);
                      
                      // Initialiser le formulaire avec les données actuelles
                      setReassignForm({
                        executor_id: task.assigned_to[0] || '',
                        validators: task.validators.map(v => ({ user_id: v.user_id, days_limit: v.days_limit || 5 })),
                        max_revisions: task.max_revisions,
                        deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
                        comment: ''
                      });
                      setIsReassignModalOpen(true);
                    }}
                    disabled={submitting}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Réassigner
                  </Button>
                      </div>
                      
                      <div className="p-3 bg-white/50 rounded-lg border border-gray-100">
                        <p className="text-[10px] text-gray-500 italic text-center leading-tight">
                          {isBlocked 
                            ? "La limite de révisions est atteinte. Vous devez décider de clôturer le dossier en l'état ou de relancer un nouveau cycle." 
                            : "Le circuit est terminé. Vous pouvez maintenant clôturer définitivement la tâche pour l'archiver."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // BUG 1: Afficher un badge vert fixe si clôturé
              if (task.closed_at) {
                return (
                  <div className="bg-green-100 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 shadow-sm">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-black text-sm uppercase tracking-wider">Tâche clôturée</p>
                      <p className="text-xs font-medium">
                        Par {participantNames[task.closed_by || ''] || 'l\'administrateur'} le {new Date(task.closed_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }

            // Cas pour Standard
            const isTaskClosed = ['approved', 'closed'].includes(task.status);
            const latestSub = workflow?.submissions?.[0];
            const allValidatorsResponded = task.validators?.length > 0 && latestSub?.reviews?.length >= task.validators.length;

            if (!isTaskClosed && allValidatorsResponded) {
              return (
                <Card className="border-purple-200 bg-purple-50/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-purple-800">
                      <ListChecks className="h-5 w-5" />
                      Décisions Admin
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                      <Button 
                        variant="outline" 
                        className="justify-start border-green-200 hover:bg-green-50 text-green-700"
                        onClick={() => handleAdminDecision('approved')}
                        disabled={submitting}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approuver
                      </Button>
                      <Button 
                        variant="outline" 
                        className="justify-start border-blue-200 hover:bg-blue-50 text-blue-700"
                        onClick={() => handleAdminDecision('relaunch_partial')}
                        disabled={submitting}
                      >
                        <History className="h-4 w-4 mr-2" />
                        Relancer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Historique complet (Timeline) */}
      <Card className={isSequential ? "border-blue-100 shadow-md" : ""}>
        <CardHeader className={isSequential ? "bg-blue-50/30" : ""}>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-600" />
            {isSequential ? "Historique du workflow" : "Historique de la tâche"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="relative pl-10 space-y-8 before:content-[''] before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
            {visibleHistory.length > 0 ? (
              visibleHistory.map((item, idx) => {
                const actionLabel = getHistoryActionLabel(item.action, item.details);
                const userName = workflow.all_names?.[item.user_id] || participantNames[item.user_id] || 'Système';
                const opinion = item.details?.opinion as VisaOpinion;
                
                // Style spécifique selon l'action
                let itemBg = 'bg-gray-50';
                let iconColor = 'text-gray-500';
                let iconBg = 'bg-gray-100';

                if (item.action === 'submission') {
                  itemBg = 'bg-blue-50/50';
                  iconColor = 'text-blue-600';
                  iconBg = 'bg-blue-100';
                } else if (item.action === 'validation' && opinion) {
                  const colors: Record<VisaOpinion, { bg: string, text: string }> = {
                    'F': { bg: 'bg-green-50', text: 'text-green-600' },
                    'D': { bg: 'bg-red-50', text: 'text-red-600' },
                    'S': { bg: 'bg-orange-50', text: 'text-orange-600' },
                    'HM': { bg: 'bg-gray-50', text: 'text-gray-600' }
                  };
                  itemBg = colors[opinion]?.bg || 'bg-gray-50';
                  iconColor = colors[opinion]?.text || 'text-gray-600';
                  iconBg = colors[opinion]?.bg || 'bg-gray-100';
                } else if (item.action === 'admin_decision') {
                  const decision = item.details?.decision;
                  if (decision === 'approved' || decision === 'closed') {
                    itemBg = 'bg-green-50/50';
                    iconColor = 'text-green-600';
                    iconBg = 'bg-green-100';
                  } else if (decision?.startsWith('relaunch')) {
                    itemBg = 'bg-purple-50/50';
                    iconColor = 'text-purple-600';
                    iconBg = 'bg-purple-100';
                  }
                } else if (item.new_status === 'blocked') {
                  itemBg = 'bg-red-50/50';
                  iconColor = 'text-red-600';
                  iconBg = 'bg-red-100';
                }

                return (
                  <div key={item.id || idx} className={`relative p-4 rounded-xl border border-transparent transition-all hover:border-gray-200 ${itemBg}`}>
                    <div className={`absolute -left-[35px] mt-0.5 w-10 h-10 rounded-full bg-white border-4 border-white shadow-sm flex items-center justify-center z-10 ${iconBg} ${iconColor}`}>
                      {React.cloneElement(getHistoryIcon(item.action) as React.ReactElement, { className: 'h-5 w-5' })}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="font-black text-sm uppercase tracking-wide">
                          {item.action === 'admin_decision' && (item.details?.decision === 'approved' || item.details?.decision === 'closed')
                            ? `Clôture par ${userName}`
                            : `${actionLabel} par ${userName}`
                          }
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-[10px] font-bold text-gray-500">
                            {new Date(item.created_at).toLocaleString('fr-FR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {item.new_status && item.old_status !== item.new_status && (
                        <Badge variant="outline" className="text-[10px] font-black bg-white/50 border-gray-200 h-6">
                          {item.old_status?.toUpperCase() || 'OPEN'} → {item.new_status.toUpperCase()}
                        </Badge>
                      )}
                    </div>

                    {item.details?.comment && (
                      <div className="mt-3 pl-3 border-l-2 border-gray-200/50">
                        <p className="text-sm text-gray-700 italic leading-relaxed">
                          "{item.details.comment}"
                        </p>
                      </div>
                    )}
                    
                    {item.action === 'submission' && item.details?.file_name && (
                      <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-blue-600">
                        <FileText className="h-3 w-3" />
                        {item.details.file_name}
                        {item.details.version && <Badge className="h-4 text-[8px] px-1 bg-blue-600">Indice {item.details.version_label || '?'}</Badge>}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 italic">Aucun historique disponible pour ce workflow.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Réassignation des Validateurs */}
      <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <RotateCcw className="h-6 w-6 text-purple-600" />
              Réassigner le workflow
            </DialogTitle>
            <DialogDescription className="font-medium">
              Modifiez tous les paramètres du circuit pour relancer la tâche.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-8">
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed font-bold">
                La réassignation réinitialisera complètement le circuit et le compteur de révisions (0 / {reassignForm.max_revisions}).
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. EXÉCUTANT */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">1. Exécutant (rédacteur)</Label>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <select 
                    className="w-full bg-transparent text-sm font-bold focus:outline-none"
                    value={reassignForm.executor_id}
                    onChange={(e) => setReassignForm(prev => ({ ...prev, executor_id: e.target.value }))}
                  >
                    <option value="">Sélectionner un exécutant</option>
                    {allUsers.map(u => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.first_name} {u.last_name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. DATE LIMITE */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">2. Date limite finale</Label>
                <Input 
                  type="date"
                  className="font-bold h-11 rounded-xl"
                  value={reassignForm.deadline}
                  onChange={(e) => setReassignForm(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>

              {/* 4. MAX RÉVISIONS */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">3. Nombre de tours max</Label>
                <div className="flex items-center gap-4">
                  <Input 
                    type="number"
                    min="1"
                    max="10"
                    className="w-24 font-bold h-11 rounded-xl text-center"
                    value={reassignForm.max_revisions}
                    onChange={(e) => setReassignForm(prev => ({ ...prev, max_revisions: parseInt(e.target.value) || 1 }))}
                  />
                  <p className="text-[10px] text-gray-400 italic">
                    Limite avant blocage du circuit
                  </p>
                </div>
              </div>
            </div>

            {/* 2. VALIDATEURS */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">4. Circuit des validateurs (ordre séquentiel)</Label>
              
              <div className="space-y-2 border-2 border-dashed border-gray-100 p-4 rounded-2xl">
                {reassignForm.validators.map((v, idx) => (
                  <div key={v.user_id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm group">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-sm font-bold text-gray-700">{participantNames[v.user_id] || "Utilisateur"}</span>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={idx === 0}
                        onClick={() => {
                          const newList = [...reassignForm.validators];
                          [newList[idx], newList[idx-1]] = [newList[idx-1], newList[idx]];
                          setReassignForm(prev => ({ ...prev, validators: newList }));
                        }}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={idx === reassignForm.validators.length - 1}
                        onClick={() => {
                          const newList = [...reassignForm.validators];
                          [newList[idx], newList[idx+1]] = [newList[idx+1], newList[idx]];
                          setReassignForm(prev => ({ ...prev, validators: newList }));
                        }}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setReassignForm(prev => ({
                            ...prev,
                            validators: prev.validators.filter(val => val.user_id !== v.user_id)
                          }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {reassignForm.validators.length === 0 && (
                  <p className="text-center py-6 text-xs text-gray-400 italic">Aucun validateur sélectionné.</p>
                )}

                <div className="pt-2">
                  <select 
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-blue-600 focus:outline-none cursor-pointer"
                    onChange={(e) => {
                      const userId = e.target.value;
                      if (userId && !reassignForm.validators.some(v => v.user_id === userId)) {
                        setReassignForm(prev => ({
                          ...prev,
                          validators: [...prev.validators, { user_id: userId, days_limit: 5 }]
                        }));
                      }
                      e.target.value = "";
                    }}
                  >
                    <option value="">+ Ajouter un validateur...</option>
                    {allUsers
                      .filter(u => !reassignForm.validators.some(v => v.user_id === u.user_id) && u.user_id !== reassignForm.executor_id)
                      .map(u => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.first_name} {u.last_name}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>
            </div>

            {/* 5. INSTRUCTIONS */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">5. Instructions pour la nouvelle révision</Label>
              <Textarea 
                placeholder="Ex: Merci de prendre en compte les remarques de l'indice précédent..."
                className="min-h-[100px] rounded-2xl resize-none font-medium text-sm"
                value={reassignForm.comment}
                onChange={(e) => setReassignForm(prev => ({ ...prev, comment: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-6 border-t">
            <Button variant="ghost" onClick={() => setIsReassignModalOpen(false)} className="font-bold text-xs uppercase tracking-widest">
              Annuler
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700 font-black text-xs uppercase tracking-widest px-8 h-12 shadow-lg shadow-purple-100"
              disabled={!reassignForm.executor_id || reassignForm.validators.length === 0 || !reassignForm.deadline || submitting}
              onClick={async () => {
                setSubmitting(true);
                const success = await reassignValidators(
                  task.id, 
                  reassignForm.executor_id,
                  reassignForm.validators, 
                  reassignForm.max_revisions,
                  reassignForm.deadline,
                  reassignForm.comment
                );
                if (success) {
                  // BUG 2: Mettre à jour le state local immédiatement
                  setTask(prev => prev ? ({ 
                    ...prev, 
                    status: 'open', 
                    revision_count: 0,
                    deadline: reassignForm.deadline,
                    max_revisions: reassignForm.max_revisions
                  }) : null);
                  // BUG 4: Reset local
                  setIsReassignModalOpen(false);
                  loadTaskDetails();
                }
                setSubmitting(false);
              }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer la réassignation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskDetails;