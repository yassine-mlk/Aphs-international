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
} from '@/components/ui/dialog';
import { PHASE_LABELS } from '@/types/taskAssignment';
import { VisaWorkflow, VisaSubmission, VisaOpinion, VISA_OPINION_LABELS, calculateWorkflowProgress } from '@/types/visaWorkflow';

import { TaskHeader } from '@/components/TaskDetails/TaskHeader';
import { TaskInfoCard } from '@/components/TaskDetails/TaskInfoCard';
import { TaskSubmissionForm } from '@/components/TaskDetails/TaskSubmissionForm';
import { TaskValidationForm } from '@/components/TaskDetails/TaskValidationForm';
import { TaskHistory } from '@/components/TaskDetails/TaskHistory';
import { TaskSidebar } from '@/components/TaskDetails/TaskSidebar';
import { TaskAdminActions } from '@/components/TaskDetails/TaskAdminActions';
import { TaskFullHistory } from '@/components/TaskDetails/TaskFullHistory';

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
      <TaskHeader 
        task={task}
        workflow={workflow}
        statusLabel={statusLabel}
        statusColor={statusColor}
        onBack={() => navigate(-1)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne Gauche: Détails et Soumission */}
        <div className="lg:col-span-2 space-y-6">
          <TaskInfoCard 
            task={task}
            infoSheet={infoSheet}
            canViewInfoSheets={canViewInfoSheets}
            isSequential={isSequential}
            activeIntervener={activeIntervener}
            dynamicDeadline={dynamicDeadline}
            isDeadlineNear={isDeadlineNear}
            isDeadlinePassed={isDeadlinePassed}
          />

          {canSubmit && (
            <TaskSubmissionForm 
              task={task}
              file={file}
              setFile={setFile}
              comment={comment}
              setComment={setComment}
              submitting={submitting}
              uploadProgress={uploadProgress}
              handleSubmit={handleSubmit}
              hasRejectedSubmission={hasRejectedSubmission}
            />
          )}

          {canValidate && (
            <TaskValidationForm 
              task={task}
              workflow={workflow}
              selectedSubmissionId={selectedSubmissionId}
              selectedOpinion={selectedOpinion}
              setSelectedOpinion={setSelectedOpinion}
              validationComment={validationComment}
              setValidationComment={setValidationComment}
              submitting={submitting}
              handleValidate={handleValidate}
            />
          )}

          <TaskHistory 
            task={task}
            workflow={workflow}
            visibleSubmissions={visibleSubmissions}
            isSequential={isSequential}
            selectedSubmissionId={selectedSubmissionId}
            setSelectedSubmissionId={setSelectedSubmissionId}
            isAdmin={isAdmin}
            isExecutor={isExecutor}
            isValidator={isValidator}
            user={user}
          />
        </div>

        {/* Colonne Droite: Participants et Délais */}
        <div className="space-y-6">
          <TaskSidebar 
            task={task}
            workflow={workflow}
            isSequential={isSequential}
            participantNames={participantNames}
          />

          <TaskAdminActions 
            task={task}
            workflow={workflow}
            isAdmin={isAdmin}
            isSequential={isSequential}
            participantNames={participantNames}
            submitting={submitting}
            setSubmitting={setSubmitting}
            setTask={setTask}
            loadTaskDetails={loadTaskDetails}
            submitAdminDecision={submitAdminDecision}
            handleAdminDecision={handleAdminDecision}
            isReassignModalOpen={isReassignModalOpen}
            setIsReassignModalOpen={setIsReassignModalOpen}
            reassignForm={reassignForm}
            setReassignForm={setReassignForm}
            allUsers={allUsers}
            setAllUsers={setAllUsers}
            reassignValidators={reassignValidators}
            user={user}
          />
        </div>
      </div>

      <TaskFullHistory 
        task={task}
        workflow={workflow}
        visibleHistory={visibleHistory}
        isSequential={isSequential}
        participantNames={participantNames}
        getHistoryActionLabel={getHistoryActionLabel}
        getHistoryIcon={getHistoryIcon}
      />
    </div>
  );
};

export default TaskDetails;