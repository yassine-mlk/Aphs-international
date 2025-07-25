import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  FileUp, 
  User, 
  Users,
  CheckCircle2,
  XCircle,
  Download,
  Send,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import {
  TaskSubmissionHistory,
  TaskSubmissionHistoryWithUser,
  CreateTaskSubmissionHistoryData,
  TaskSubmissionActionType,
  TASK_SUBMISSION_ACTION_LABELS,
  TASK_SUBMISSION_ACTION_COLORS
} from '@/types/taskSubmissionHistory';
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';

// Interface for project
interface Project {
  id: string;
  name: string;
}

// Interface for user/intervenant
interface Intervenant {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

// Interface for task assignment
interface TaskAssignment {
  id: string;
  project_id: string;
  phase_id: string; // "conception" or "realisation"
  section_id: string; // "A", "B", "C", etc.
  subsection_id: string; // "A1", "A2", "B1", etc.
  task_name: string;
  assigned_to: string; // ID of the intervenant
  deadline: string;
  validation_deadline: string;
  validators: string[]; // IDs of the intervenant validators
  file_extension: string;
  comment?: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'validated' | 'rejected' | 'finalized';
  created_at: string;
  updated_at: string;
  file_url?: string;
  submitted_at?: string;
  validated_at?: string;
  validation_comment?: string;
  validated_by?: string;
}

// Interface pour les fiches informatives
interface TaskInfoSheet {
  id: string;
  phase_id: string;
  section_id: string;
  subsection_id: string;
  task_name: string;
  info_sheet: string;
  language: string; // 'fr', 'en', 'es', 'ar'
  created_at: string;
  updated_at: string;
}

// Interface pour les données provenant de la table profiles
interface ProfileData {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

// Moved statusLabels to use translations instead of hardcoded French
const getStatusLabel = (status: string, t: any) => {
  switch (status) {
    case 'assigned':
      return { label: t.status.assigned, color: 'bg-yellow-500' };
    case 'in_progress':
      return { label: t.status.inProgress, color: 'bg-blue-500' };
    case 'submitted':
      return { label: t.status.submitted, color: 'bg-orange-500' };
    case 'validated':
      return { label: t.status.validated, color: 'bg-green-500' };
    case 'rejected':
      return { label: t.status.rejected, color: 'bg-red-500' };
    default:
      return { label: t.status.unknown, color: 'bg-gray-500' };
  }
};

const TaskDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchData, updateData, uploadFile, getFileUrl, supabase, insertData } = useSupabase();
  const { user } = useAuth();
  const { language } = useLanguage();
  const {
    notifyFileValidationRequest,
    createAdminNotification,
    notifyTaskStatusChange,
    notifyFileUploadedToProject
  } = useNotificationTriggers();
  
  const t = translations[language as keyof typeof translations].tasks;
  
  const [task, setTask] = useState<TaskAssignment | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [validators, setValidators] = useState<Intervenant[]>([]);
  const [assignedUser, setAssignedUser] = useState<Intervenant | null>(null);
  const [infoSheet, setInfoSheet] = useState<TaskInfoSheet | null>(null);
  const [submissionHistory, setSubmissionHistory] = useState<TaskSubmissionHistoryWithUser[]>([]);
  const [hasPendingSubmission, setHasPendingSubmission] = useState<boolean>(false);
  
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitComment, setSubmitComment] = useState('');
  const [validationComment, setValidationComment] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  const [expandedInfoSheet, setExpandedInfoSheet] = useState<string | null>(null);
  
  // Determine if current user is assigned to this task
  const isAssignedUser = user?.id === task?.assigned_to;
  
  // Determine if current user is a validator for this task
  const isValidator = task?.validators.includes(user?.id || '') || false;
  
  // Determine if current user is an admin
  const isAdmin = user?.user_metadata?.role === 'admin' || 
                 user?.email === 'admin@aphs.com' || 
                 JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin';
  
  // Determine if the user can take actions on this task
  const canTakeAction = isAssignedUser || isValidator || isAdmin;
  
  // Load submission history
  const loadSubmissionHistory = async (taskId: string) => {
    try {
      const historyData = await fetchData<TaskSubmissionHistory>('task_submission_history', {
        columns: '*',
        filters: [{ column: 'task_assignment_id', operator: 'eq', value: taskId }],
        order: { column: 'performed_at', ascending: true }
      });
      
      if (historyData && historyData.length > 0) {
        // Récupérer les informations des utilisateurs qui ont effectué les actions
        const userIds = Array.from(new Set(historyData.map(h => h.performed_by)));
        if (userIds.length > 0) {
          const usersData = await fetchData<ProfileData>('profiles', {
            columns: 'user_id,email,first_name,last_name,role',
            filters: [{ column: 'user_id', operator: 'in', value: `(${userIds.join(',')})` }]
          });
          
          // Mapper les données avec les utilisateurs
          const historyWithUsers = historyData.map(history => {
            const user = usersData.find(u => u.user_id === history.performed_by);
            return {
              ...history,
              performer: user ? {
                id: user.user_id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
              } : undefined
            };
          });
          
          setSubmissionHistory(historyWithUsers);
          setHasPendingSubmission(checkPendingSubmission(historyWithUsers));
        } else {
          setSubmissionHistory(historyData.map(h => ({ ...h, performer: undefined })));
          setHasPendingSubmission(checkPendingSubmission(historyData.map(h => ({ ...h, performer: undefined }))));
        }
      } else {
        setSubmissionHistory([]);
        setHasPendingSubmission(false);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique des soumissions:', error);
      setSubmissionHistory([]);
      setHasPendingSubmission(false);
    }
  };
  
  // Create submission history entry
  const createSubmissionHistoryEntry = async (data: CreateTaskSubmissionHistoryData) => {
    try {
      await insertData('task_submission_history', data);
    } catch (error) {
      console.error('Erreur lors de la création de l\'entrée d\'historique:', error);
    }
  };
  
  // Check if there is a pending submission (submitted but not yet validated/rejected)
  const checkPendingSubmission = (history: TaskSubmissionHistoryWithUser[]): boolean => {
    if (history.length === 0) return false;
    
    // Sort by performed_at to get the latest actions
    const sortedHistory = [...history].sort((a, b) => 
      new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()
    );
    
    // Find the latest submission action
    const latestSubmission = sortedHistory.find(entry => 
      entry.action_type === 'submitted' || entry.action_type === 'resubmitted'
    );
    
    if (!latestSubmission) return false;
    
    // Check if there's a validation/rejection after this submission
    const validationAfterSubmission = sortedHistory.find(entry => 
      (entry.action_type === 'validated' || entry.action_type === 'rejected') &&
      new Date(entry.performed_at) > new Date(latestSubmission.performed_at)
    );
    
    // If there's no validation/rejection after the latest submission, it's pending
    return !validationAfterSubmission;
  };
  
  // Load task details
  useEffect(() => {
    const fetchTaskDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const data = await fetchData<TaskAssignment>('task_assignments', {
          columns: '*',
          filters: [{ column: 'id', operator: 'eq', value: id }]
        });
        
        if (data && data.length > 0) {
          setTask(data[0]);
          
          // Fetch project details
          const projectData = await fetchData<Project>('projects', {
            columns: 'id,name',
            filters: [{ column: 'id', operator: 'eq', value: data[0].project_id }]
          });
          
          if (projectData && projectData.length > 0) {
            setProject(projectData[0]);
          }
          
          // Fetch assigned user details
          const userData = await fetchData<ProfileData>('profiles', {
            columns: 'user_id,email,first_name,last_name,role',
            filters: [{ column: 'user_id', operator: 'eq', value: data[0].assigned_to }]
          });
          
          if (userData && userData.length > 0) {
            setAssignedUser({
              id: userData[0].user_id,
              email: userData[0].email,
              first_name: userData[0].first_name,
              last_name: userData[0].last_name,
              role: userData[0].role
            });
          }
          
          // Fetch validators details
          if (data[0].validators.length > 0) {
            const validatorsData = await fetchData<ProfileData>('profiles', {
              columns: 'user_id,email,first_name,last_name,role',
              filters: [{ column: 'user_id', operator: 'in', value: `(${data[0].validators.join(',')})` }]
            });
            
            if (validatorsData) {
              const formattedValidators = validatorsData.map(v => ({
                id: v.user_id,
                email: v.email,
                first_name: v.first_name,
                last_name: v.last_name,
                role: v.role
              }));
              setValidators(formattedValidators);
            }
          }
          
          // Fetch info sheet
          const infoSheetData = await fetchData<TaskInfoSheet>('task_info_sheets', {
            columns: '*',
            filters: [
              { column: 'phase_id', operator: 'eq', value: data[0].phase_id },
              { column: 'section_id', operator: 'eq', value: data[0].section_id },
              { column: 'subsection_id', operator: 'eq', value: data[0].subsection_id },
              { column: 'task_name', operator: 'eq', value: data[0].task_name },
              { column: 'language', operator: 'eq', value: language }
            ]
          });
          
          if (infoSheetData && infoSheetData.length > 0) {
            setInfoSheet(infoSheetData[0]);
          } else {
            // Fallback vers la fiche en français si la fiche dans la langue actuelle n'existe pas
            const fallbackInfoSheetData = await fetchData<TaskInfoSheet>('task_info_sheets', {
              columns: '*',
              filters: [
                { column: 'phase_id', operator: 'eq', value: data[0].phase_id },
                { column: 'section_id', operator: 'eq', value: data[0].section_id },
                { column: 'subsection_id', operator: 'eq', value: data[0].subsection_id },
                { column: 'task_name', operator: 'eq', value: data[0].task_name },
                { column: 'language', operator: 'eq', value: 'fr' }
              ]
            });
            
            if (fallbackInfoSheetData && fallbackInfoSheetData.length > 0) {
              setInfoSheet(fallbackInfoSheetData[0]);
            }
          }
          
          // Load submission history
          await loadSubmissionHistory(id);
        } else {
          toast({
            title: "Erreur",
            description: "Tâche non trouvée",
            variant: "destructive",
          });
          navigate('/dashboard/tasks');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des détails de la tâche:', error);
        toast({
          title: t.details.toasts.error,
          description: t.details.toasts.cannotLoadDetails,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTaskDetails();
  }, [id, fetchData, navigate, toast, language]);
  
  const handleStartTask = async () => {
    if (!task) return;
    
    try {
      await updateData('task_assignments', {
        id: task.id,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      });
      
      // Update local state
      setTask({
        ...task,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      });
      
      toast({
        title: t.details.toasts.success,
        description: t.details.toasts.taskStarted,
      });
    } catch (error) {
      console.error('Erreur lors du démarrage de la tâche:', error);
              toast({
          title: t.details.toasts.error,
          description: t.details.toasts.cannotStartTask,
          variant: "destructive",
        });
    }
  };
  
  const handleOpenSubmitDialog = () => {
    setSelectedFile(null);
    setSubmitComment('');
    setIsSubmitDialogOpen(true);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };
  
  const handleSubmitTask = async () => {
    if (!task || !selectedFile) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Vérifier la taille du fichier (limite à 50MB pour les fichiers AutoCAD)
      const maxSize = selectedFile.name.toLowerCase().endsWith('.dwg') ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB pour DWG, 10MB pour autres
      if (selectedFile.size > maxSize) {
        throw new Error(`Le fichier est trop volumineux. Taille maximale : ${Math.round(maxSize / (1024 * 1024))}MB`);
      }
      
      // 1. Generate a unique file name
      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      const fileName = `task_${task.id}_${timestamp}.${fileExt}`;
      
      // Déterminer le Content-Type approprié
      let contentType = selectedFile.type;
      if (fileExt === 'dwg') {
        // Utiliser un type MIME générique pour éviter les erreurs Supabase
        contentType = 'application/octet-stream'; // Type générique accepté par Supabase
      } else if (!contentType || contentType === 'application/octet-stream') {
        // Fallback pour les types non reconnus
        const mimeTypes: { [key: string]: string } = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'txt': 'text/plain',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'zip': 'application/zip',
          'dwg': 'application/octet-stream' // Type générique pour AutoCAD
        };
        contentType = mimeTypes[fileExt] || 'application/octet-stream';
      }
      
      console.log(`Uploading file: ${selectedFile.name} (${Math.round(selectedFile.size / 1024)}KB) with type: ${contentType}`);
      
      // Using a timer to simulate upload progress since we don't have actual upload progress
      const progressTimer = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressTimer);
            return 80;
          }
          return prev + 10;
        });
      }, 300);
      
      // Essayer d'abord l'upload direct pour les petits fichiers
      let fileUrl: string;
      let uploadSuccess = false;
      
      if (selectedFile.size <= 5 * 1024 * 1024) { // 5MB
        try {
          console.log('Tentative d\'upload direct...');
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('task_submissions')
            .upload(fileName, selectedFile, {
              contentType: contentType,
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            console.log('Upload direct échoué, tentative avec URL signée...', uploadError);
            throw uploadError;
          }
          
          const { data: urlData } = supabase.storage
            .from('task_submissions')
            .getPublicUrl(uploadData.path);
          
          fileUrl = urlData.publicUrl;
          uploadSuccess = true;
          console.log('Upload direct réussi');
        } catch (directUploadError) {
          console.log('Upload direct échoué, passage à l\'URL signée...', directUploadError);
        }
      }
      
      // Si l'upload direct échoue ou pour les gros fichiers, utiliser l'URL signée
      if (!uploadSuccess) {
        console.log('Utilisation de l\'URL signée...');
      
      // Try to create a signed URL approach
      const { data: signedURLData, error: signedURLError } = await supabase.storage
        .from('task_submissions')
        .createSignedUploadUrl(fileName);
        
      if (signedURLError) {
          throw new Error(`Erreur lors de la création de l'URL signée: ${signedURLError.message}`);
      }
      
      // Use the signed URL to upload the file
      const { signedUrl, path } = signedURLData;
      
      // Upload file with the signed URL
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': contentType,
            'Cache-Control': '3600'
        },
        body: selectedFile,
      });
      
      if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload response error:', uploadResponse.status, errorText);
          throw new Error(`Upload failed with status: ${uploadResponse.status} - ${errorText}`);
      }
      
      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('task_submissions')
        .getPublicUrl(path);
      
        fileUrl = urlData.publicUrl;
      }
      
      clearInterval(progressTimer);
      setUploadProgress(90);
      
      setUploadProgress(95);
      
      // 3. Update the task assignment record
      await updateData('task_assignments', {
        id: task.id,
        status: 'submitted',
        file_url: fileUrl,
        submitted_at: new Date().toISOString(),
        comment: submitComment || task.comment,
        updated_at: new Date().toISOString()
      });
      
      // Create submission history entry
      const isResubmission = task.status === 'rejected';
      await createSubmissionHistoryEntry({
        task_assignment_id: task.id,
        action_type: isResubmission ? 'resubmitted' : 'submitted',
        file_url: fileUrl,
        file_name: selectedFile.name,
        comment: submitComment,
        performed_by: user!.id,
        metadata: {
          file_size: selectedFile.size,
          file_type: selectedFile.type
        }
      });

      // Update local state
      setTask({
        ...task,
        status: 'submitted',
        file_url: fileUrl,
        submitted_at: new Date().toISOString(),
        comment: submitComment || task.comment,
        updated_at: new Date().toISOString()
      });
      
      setUploadProgress(100);
      
      // === NOTIFICATIONS SYSTÈME ===
      try {
        // Récupérer le nom de l'intervenant qui soumet
        const uploaderName = assignedUser ? 
          `${assignedUser.first_name} ${assignedUser.last_name}` : 
          'Intervenant inconnu';
          
        // 1. Notifier tous les membres du projet et l'admin
        await notifyFileUploadedToProject(
          task.project_id,
          selectedFile.name,
            uploaderName,
          task.task_name,
          project?.name
        );
        
        // 2. Notifier le changement de statut
        await notifyTaskStatusChange(
          task.project_id,
          task.task_name,
          'submitted',
            uploaderName,
            project?.name
          );
        
        console.log(`Notifications envoyées: Admin + ${task.validators.length} validateur(s)`);
      } catch (notificationError) {
        console.error('Erreur lors de l\'envoi des notifications:', notificationError);
        // Ne pas faire échouer la soumission si les notifications échouent
      }
      
      toast({
        title: t.details.toasts.success,
        description: t.details.toasts.taskSubmitted,
      });
      
      // Recharger l'historique pour mettre à jour l'affichage
      await loadSubmissionHistory(task.id);
      
      setIsSubmitDialogOpen(false);
    } catch (error: any) {
      console.error('Erreur lors de la soumission de la tâche:', error);
              toast({
          title: t.details.toasts.error,
          description: error.message || t.details.toasts.cannotSubmitTask,
          variant: "destructive",
        });
    } finally {
      setUploading(false);
    }
  };
  
  const handleOpenValidateDialog = () => {
    setValidationComment('');
    setIsValidateDialogOpen(true);
  };
  
  const handleOpenRejectDialog = () => {
    setValidationComment('');
    setIsRejectDialogOpen(true);
  };
  
  const handleOpenFinalizeDialog = () => {
    setValidationComment('');
    setIsFinalizeDialogOpen(true);
  };
  
  const handleValidateTask = async () => {
    if (!task) return;
    
    try {
      // First update only the status to satisfy the constraint
      await updateData('task_assignments', {
        id: task.id,
        status: 'validated',
        updated_at: new Date().toISOString()
      });
      
      // Then update the validation fields
      await updateData('task_assignments', {
        id: task.id,
        validated_at: new Date().toISOString(),
        validation_comment: validationComment,
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      // Create submission history entry
      await createSubmissionHistoryEntry({
        task_assignment_id: task.id,
        action_type: 'validated',
        validation_comment: validationComment,
        performed_by: user!.id,
        metadata: {
          validated_file_url: task.file_url
        }
      });

      // Update local state
      setTask({
        ...task,
        status: 'validated',
        validated_at: new Date().toISOString(),
        validation_comment: validationComment,
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      // === NOTIFICATIONS SYSTÈME ===
      try {
        // Récupérer le nom du validateur
        const validatorName = user?.user_metadata?.first_name && user?.user_metadata?.last_name 
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : user?.email || 'Validateur inconnu';
          
        // Notifier le changement de statut
        await notifyTaskStatusChange(
          task.project_id,
          task.task_name,
          'validated',
          validatorName,
          project?.name
        );
        
        console.log(`Notification de validation envoyée pour la tâche ${task.task_name}`);
      } catch (notificationError) {
        console.error('Erreur lors de l\'envoi de la notification:', notificationError);
      }
      
      toast({
        title: t.details.toasts.success,
        description: t.details.toasts.taskValidated,
      });
      
      // Recharger l'historique pour mettre à jour l'affichage
      await loadSubmissionHistory(task.id);
      
      setIsValidateDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors de la validation de la tâche:', error);
              toast({
          title: t.details.toasts.error,
          description: t.details.toasts.cannotValidateTask,
          variant: "destructive",
        });
    }
  };
  
  const handleRejectTask = async () => {
    if (!task) return;
    
    try {
      // First update only the status to satisfy the constraint
      await updateData('task_assignments', {
        id: task.id,
        status: 'rejected',
        updated_at: new Date().toISOString()
      });
      
      // Then update the validation fields
      await updateData('task_assignments', {
        id: task.id,
        validated_at: new Date().toISOString(),
        validation_comment: validationComment,
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      // Create submission history entry
      await createSubmissionHistoryEntry({
        task_assignment_id: task.id,
        action_type: 'rejected',
        validation_comment: validationComment,
        performed_by: user!.id,
        metadata: {
          rejected_file_url: task.file_url
        }
      });

      // Update local state
      setTask({
        ...task,
        status: 'rejected',
        validated_at: new Date().toISOString(),
        validation_comment: validationComment,
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      // === NOTIFICATIONS SYSTÈME ===
      try {
        // Récupérer le nom du validateur
        const validatorName = user?.user_metadata?.first_name && user?.user_metadata?.last_name 
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : user?.email || 'Validateur inconnu';
          
        // Notifier le changement de statut
        await notifyTaskStatusChange(
          task.project_id,
          task.task_name,
          'rejected',
          validatorName,
          project?.name
        );
        
        console.log(`Notification de rejet envoyée pour la tâche ${task.task_name}`);
      } catch (notificationError) {
        console.error('Erreur lors de l\'envoi de la notification:', notificationError);
      }
      
      toast({
        title: t.details.toasts.success,
        description: t.details.toasts.taskRejected,
      });
      
      // Recharger l'historique pour mettre à jour l'affichage
      await loadSubmissionHistory(task.id);
      
      setIsRejectDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors du rejet de la tâche:', error);
      toast({
        title: t.details.toasts.error,
        description: t.details.toasts.cannotRejectTask,
        variant: "destructive",
      });
    }
  };

  const handleFinalizeTask = async () => {
    if (!task) return;
    
    try {
      // First update only the status to finalized
      await updateData('task_assignments', {
        id: task.id,
        status: 'finalized',
        updated_at: new Date().toISOString()
      });
      
      // Then update the validation fields for final validation
      await updateData('task_assignments', {
        id: task.id,
        validated_at: new Date().toISOString(),
        validation_comment: validationComment || 'Validation finale par l\'administrateur',
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      // Create submission history entry for finalization
      await createSubmissionHistoryEntry({
        task_assignment_id: task.id,
        action_type: 'finalized',
        validation_comment: validationComment || 'Validation finale par l\'administrateur',
        performed_by: user!.id,
        metadata: {
          finalized_file_url: task.file_url,
          admin_finalization: true
        }
      });

      // Update local state
      setTask({
        ...task,
        status: 'finalized',
        validated_at: new Date().toISOString(),
        validation_comment: validationComment || 'Validation finale par l\'administrateur',
        validated_by: user?.id,
        updated_at: new Date().toISOString()
      });
      
      toast({
        title: t.details.toasts.success,
        description: t.details.toasts.taskFinalized,
      });
      
      // Recharger l'historique pour mettre à jour l'affichage
      await loadSubmissionHistory(task.id);
      
      setIsFinalizeDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors de la finalisation de la tâche:', error);
      toast({
        title: t.details.toasts.error,
        description: t.details.toasts.cannotFinalizeTask,
        variant: "destructive",
      });
    }
  };
  
  const handleBackToTasks = () => {
    navigate('/dashboard/tasks');
  };
  
  const handleNavigateToProject = () => {
    if (project) {
      navigate(`/dashboard/projets/${project.id}`);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getRemainingDays = (deadlineDate: string) => {
    const deadline = new Date(deadlineDate).getTime();
    const today = new Date().getTime();
    const diff = deadline - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'submitted': return 'bg-yellow-500';
      case 'validated': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'finalized': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };
  

  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
      </div>
    );
  }
  
  if (!task || !project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">{t.details.taskNotFound}</h3>
        <p className="text-gray-500 mb-4">{t.details.taskNotFoundMessage}</p>
        <Button onClick={handleBackToTasks}>{t.details.backToTasks}</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleBackToTasks}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{task.task_name}</h1>
            <p className="text-muted-foreground">
              <button 
                onClick={handleNavigateToProject}
                className="text-blue-500 hover:underline hover:text-blue-700 transition-colors"
              >
                {project.name}
              </button>
              {' > '}
              {t.details.phase} {task.phase_id === 'conception' ? t.filters.conception : t.filters.realization} {' > '}
              {t.details.section} {task.section_id} {' > '}
              {t.details.subsection} {task.subsection_id}
            </p>
          </div>
        </div>
        <div>
          <Badge 
            className={`${getStatusColor(task.status)} text-white px-3 py-1 text-xs`}
          >
            {getStatusLabel(task.status, t).label}
          </Badge>
        </div>
      </div>
      
      {/* Fiche informative repositionnée après le titre - maintenant déroulable */}
      {infoSheet && (
        <Accordion
          type="single" 
          collapsible 
          value={expandedInfoSheet}
          onValueChange={setExpandedInfoSheet}
          className="w-full"
        >
          <AccordionItem 
            value="info-sheet" 
            className="border-0 shadow-md bg-gradient-to-r from-aphs-teal/5 to-aphs-navy/5 rounded-md"
          >
            <AccordionTrigger className="px-6 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-aphs-teal bg-opacity-10 text-aphs-teal border-aphs-teal">
                  {t.details.infoSheet}
                </Badge>
                <Badge variant="outline" className="bg-blue-500 bg-opacity-10 text-blue-600 border-blue-500">
                  {t.details.referenceDocument}
                </Badge>
                <span className="text-sm text-gray-500 ml-3">
                  {expandedInfoSheet ? t.details.clickToCollapse : t.details.detailedInstructions}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-6 pb-4">
                <div className="p-4 bg-white rounded-md border border-l-4 border-l-aphs-teal whitespace-pre-line">
                  {infoSheet.info_sheet}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      
      {/* Task content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Task info */}
        <Card className="md:col-span-2 border-0 shadow-md">
          <CardHeader>
            <CardTitle>{t.details.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-md font-medium mb-2 block">{t.details.assignedSpecialist}</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                  <User className="h-5 w-5 text-gray-500" />
                  <span>
                    {assignedUser ? (
                      assignedUser.first_name && assignedUser.last_name
                        ? `${assignedUser.first_name} ${assignedUser.last_name}`
                        : assignedUser.first_name || assignedUser.last_name
                        ? `${assignedUser.first_name || ''} ${assignedUser.last_name || ''}`.trim()
                        : assignedUser.email
                    ) : t.details.unassigned}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-md font-medium mb-2 block">{t.details.validators}</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                  <Users className="h-5 w-5 text-gray-500" />
                  <span>
                    {validators.length > 0 
                      ? validators.map(v => {
                          if (v.first_name && v.last_name) {
                            return `${v.first_name} ${v.last_name}`;
                          } else if (v.first_name || v.last_name) {
                            return `${v.first_name || ''} ${v.last_name || ''}`.trim();
                          } else {
                            return v.email;
                          }
                        }).join(', ')
                      : t.details.noValidators}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-md font-medium mb-2 block">{t.details.submissionDeadline}</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span>{formatDate(task.deadline)}</span>
                  {getRemainingDays(task.deadline) > 0 ? (
                    <Badge className="ml-2 bg-blue-500">{getRemainingDays(task.deadline)} {t.details.remainingDays}</Badge>
                  ) : (
                    <Badge className="ml-2 bg-red-500">{t.details.overdue}</Badge>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-md font-medium mb-2 block">{t.details.validationDeadlineShort}</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span>{formatDate(task.validation_deadline)}</span>
                  {getRemainingDays(task.validation_deadline) > 0 ? (
                    <Badge className="ml-2 bg-blue-500">{getRemainingDays(task.validation_deadline)} {t.details.remainingDays}</Badge>
                  ) : (
                    <Badge className="ml-2 bg-red-500">{t.details.overdue}</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <Label className="text-md font-medium mb-2 block">{t.details.expectedFileFormat}</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                <FileUp className="h-5 w-5 text-gray-500" />
                <span>
                  {task.file_extension === 'pdf' && t.details.fileTypes.pdf}
                  {task.file_extension === 'doc' && t.details.fileTypes.doc}
                  {task.file_extension === 'xls' && t.details.fileTypes.xls}
                  {task.file_extension === 'ppt' && t.details.fileTypes.ppt}
                  {task.file_extension === 'txt' && t.details.fileTypes.txt}
                  {task.file_extension === 'jpg' && t.details.fileTypes.jpg}
                  {task.file_extension === 'png' && t.details.fileTypes.png}
                  {task.file_extension === 'zip' && t.details.fileTypes.zip}
                  {task.file_extension === 'dwg' && t.details.fileTypes.dwg}
                  {task.file_extension === 'other' && t.details.fileTypes.other}
                </span>
              </div>
            </div>
            
            {task.comment && (
              <div>
                <Label className="text-md font-medium mb-2 block">{t.details.instructions}</Label>
                <div className="p-3 bg-gray-50 rounded-md whitespace-pre-line">
                  {task.comment}
                </div>
              </div>
            )}
            
            {task.file_url && (
              <div>
                <Label className="text-md font-medium mb-2 block">{t.details.submittedFile}</Label>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-gray-500" />
                    <span>{task.submitted_at ? `${t.details.submittedAt} ${formatDateTime(task.submitted_at)}` : 'Fichier téléchargé'}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(task.file_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t.details.downloadFile}
                  </Button>
                </div>
              </div>
            )}
            
            {task.validation_comment && (
              <div>
                <Label className="text-md font-medium mb-2 block">{t.details.validationComment}</Label>
                <div className="p-3 bg-gray-50 rounded-md whitespace-pre-line">
                  {task.validation_comment}
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            {/* Actions for assigned user */}
            {isAssignedUser && task.status === 'assigned' && (
              <Button 
                onClick={handleStartTask}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {t.details.start}
              </Button>
            )}
            
            {isAssignedUser && (task.status === 'assigned' || task.status === 'in_progress' || task.status === 'rejected') && !hasPendingSubmission && (
              <Button 
                onClick={handleOpenSubmitDialog}
                className="bg-green-600 hover:bg-green-700"
              >
                <FileUp className="h-4 w-4 mr-2" />
                {t.details.submit}
              </Button>
            )}
            
            {/* Message when submission is pending */}
            {isAssignedUser && hasPendingSubmission && task.status !== 'finalized' && (
              <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                {t.details.pendingValidation}
              </div>
            )}
            
            {/* Message when task is finalized */}
            {task.status === 'finalized' && (
              <div className="text-sm text-purple-600 bg-purple-50 p-2 rounded border border-purple-200">
                <CheckCircle2 className="h-4 w-4 inline mr-2" />
                {t.details.taskFinalized}
              </div>
            )}
            
            {/* Actions for validators */}
            {(isValidator || isAdmin) && (task.status === 'submitted' || hasPendingSubmission) && task.status !== 'finalized' && (
              <div className="flex gap-2">
                <Button 
                  onClick={handleOpenValidateDialog}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t.details.validate}
                </Button>
                <Button 
                  onClick={handleOpenRejectDialog}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t.details.reject}
                </Button>
              </div>
            )}
            
            {/* Admin final validation */}
            {isAdmin && task.status === 'validated' && (
              <Button 
                onClick={handleOpenFinalizeDialog}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t.details.finalize}
              </Button>
            )}
          </CardFooter>
        </Card>
        
        {/* Timeline */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>{t.details.history}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Timeline item for task creation */}
              <div className="relative pl-6 pb-6 border-l-2 border-gray-200">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-aphs-teal border-4 border-white"></div>
                <div className="text-sm">
                  <p className="font-medium">{t.details.taskCreated}</p>
                  <p className="text-gray-500">{formatDateTime(task.created_at)}</p>
                </div>
              </div>
              
              {/* Dynamic timeline from submission history */}
              {submissionHistory.map((entry, index) => (
                <div key={entry.id} className="relative pl-6 pb-6 border-l-2 border-gray-200">
                  <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full ${TASK_SUBMISSION_ACTION_COLORS[entry.action_type]} border-4 border-white`}></div>
                  <div className="text-sm">
                    <p className="font-medium">{TASK_SUBMISSION_ACTION_LABELS[entry.action_type]}</p>
                    <p className="text-gray-500">
                      {formatDateTime(entry.performed_at)}
                      {entry.performer && (
                        <span> par {entry.performer.first_name} {entry.performer.last_name}</span>
                      )}
                    </p>
                    
                    {/* Show file info for submissions */}
                    {(entry.action_type === 'submitted' || entry.action_type === 'resubmitted') && entry.file_url && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileUp className="h-4 w-4 text-gray-500" />
                          <a 
                            href={entry.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs"
                          >
                            {entry.file_name || 'Fichier soumis'}
                          </a>
                        </div>
                        {entry.comment && (
                          <p className="text-xs text-gray-600 mt-1">{entry.comment}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Show validation/rejection comments */}
                    {(entry.action_type === 'validated' || entry.action_type === 'rejected' || entry.action_type === 'finalized') && entry.validation_comment && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-600">{entry.validation_comment}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Show message if no submission history */}
              {submissionHistory.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Aucune action effectuée sur cette tâche
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Submit dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Soumettre un livrable</DialogTitle>
            <DialogDescription>
              Téléchargez le fichier demandé et ajoutez un commentaire si nécessaire.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <Label htmlFor="file">Fichier ({task.file_extension})<span className="text-red-500">*</span></Label>
            <input
              id="file"
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-gray-50 file:text-gray-700
                hover:file:bg-gray-100"
              accept={`.${task.file_extension === 'other' ? '*' : task.file_extension}`}
            />
            
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Progression</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="comment">Commentaire (optionnel)</Label>
              <Textarea
                id="comment"
                rows={4}
                placeholder="Ajoutez un commentaire sur votre livrable..."
                value={submitComment}
                onChange={(e) => setSubmitComment(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>Annuler</Button>
            <Button 
              onClick={handleSubmitTask} 
              disabled={!selectedFile || uploading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Validate dialog */}
      <Dialog open={isValidateDialogOpen} onOpenChange={setIsValidateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Valider le livrable</DialogTitle>
            <DialogDescription>
              Confirmez la validation de ce livrable et ajoutez un commentaire si nécessaire.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="validation-comment">Commentaire de validation (optionnel)</Label>
              <Textarea
                id="validation-comment"
                rows={4}
                placeholder="Ajoutez un commentaire de validation..."
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsValidateDialogOpen(false)}>Annuler</Button>
            <Button 
              onClick={handleValidateTask}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject dialog */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeter le livrable</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de rejeter ce livrable. Veuillez expliquer la raison du rejet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Label htmlFor="reject-comment" className="mb-2 block">Motif du rejet<span className="text-red-500">*</span></Label>
            <Textarea
              id="reject-comment"
              rows={4}
              placeholder="Expliquez pourquoi ce livrable est rejeté..."
              value={validationComment}
              onChange={(e) => setValidationComment(e.target.value)}
              className="w-full"
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRejectTask}
              className="bg-red-600 hover:bg-red-700"
              disabled={!validationComment.trim()}
            >
              Rejeter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Finalize dialog */}
      <Dialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Validation finale et clôture</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de finaliser définitivement cette tâche. 
              Une fois finalisée, la tâche ne pourra plus être modifiée, désassignée ou réassignée.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Attention</span>
              </div>
              <p className="text-sm text-amber-700">
                Cette action est irréversible. La tâche sera définitivement clôturée et ne pourra plus être modifiée.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="finalize-comment">Commentaire de validation finale (optionnel)</Label>
              <Textarea
                id="finalize-comment"
                rows={4}
                placeholder="Ajoutez un commentaire pour la validation finale..."
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinalizeDialogOpen(false)}>Annuler</Button>
            <Button 
              onClick={handleFinalizeTask}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Finaliser et clôturer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskDetails; 