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
  MessageSquare
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
  status: 'assigned' | 'in_progress' | 'submitted' | 'validated' | 'rejected';
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

const statusLabels = {
  assigned: { label: 'Assignée', color: 'bg-yellow-500' },
  in_progress: { label: 'En cours', color: 'bg-blue-500' },
  submitted: { label: 'Soumise', color: 'bg-orange-500' },
  validated: { label: 'Validée', color: 'bg-green-500' },
  rejected: { label: 'Rejetée', color: 'bg-red-500' }
};

const TaskDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchData, updateData, uploadFile, getFileUrl, supabase } = useSupabase();
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [task, setTask] = useState<TaskAssignment | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [validators, setValidators] = useState<Intervenant[]>([]);
  const [assignedUser, setAssignedUser] = useState<Intervenant | null>(null);
  const [infoSheet, setInfoSheet] = useState<TaskInfoSheet | null>(null);
  
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  
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
          const userData = await fetchData<Intervenant>('profiles', {
            columns: 'id,email,first_name,last_name,role',
            filters: [{ column: 'id', operator: 'eq', value: data[0].assigned_to }]
          });
          
          if (userData && userData.length > 0) {
            setAssignedUser(userData[0]);
          }
          
          // Fetch validators details
          if (data[0].validators.length > 0) {
            const validatorsData = await fetchData<Intervenant>('profiles', {
              columns: 'id,email,first_name,last_name,role',
              filters: [{ column: 'id', operator: 'in', value: `(${data[0].validators.join(',')})` }]
            });
            
            if (validatorsData) {
              setValidators(validatorsData);
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
          title: "Erreur",
          description: "Impossible de charger les détails de la tâche",
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
        title: "Succès",
        description: "La tâche a été démarrée avec succès",
      });
    } catch (error) {
      console.error('Erreur lors du démarrage de la tâche:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer la tâche",
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
      // 1. Generate a unique file name
      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `task_${task.id}_${timestamp}.${fileExt}`;
      
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
      
      // Try to create a signed URL approach
      const { data: signedURLData, error: signedURLError } = await supabase.storage
        .from('task_submissions')
        .createSignedUploadUrl(fileName);
        
      if (signedURLError) {
        throw new Error(signedURLError.message);
      }
      
      // Use the signed URL to upload the file
      const { signedUrl, path } = signedURLData;
      
      // Upload file with the signed URL
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type,
        },
        body: selectedFile,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }
      
      clearInterval(progressTimer);
      setUploadProgress(90);
      
      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('task_submissions')
        .getPublicUrl(path);
      
      const fileUrl = urlData.publicUrl;
      
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
      
      toast({
        title: "Succès",
        description: "La tâche a été soumise avec succès",
      });
      
      setIsSubmitDialogOpen(false);
    } catch (error: any) {
      console.error('Erreur lors de la soumission de la tâche:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de soumettre la tâche",
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
  
  const handleValidateTask = async () => {
    if (!task) return;
    
    try {
      await updateData('task_assignments', {
        id: task.id,
        status: 'validated',
        validated_at: new Date().toISOString(),
        validation_comment: validationComment,
        validated_by: user?.id,
        updated_at: new Date().toISOString()
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
      
      toast({
        title: "Succès",
        description: "La tâche a été validée avec succès",
      });
      
      setIsValidateDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors de la validation de la tâche:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider la tâche",
        variant: "destructive",
      });
    }
  };
  
  const handleRejectTask = async () => {
    if (!task) return;
    
    try {
      await updateData('task_assignments', {
        id: task.id,
        status: 'rejected',
        validated_at: new Date().toISOString(),
        validation_comment: validationComment,
        validated_by: user?.id,
        updated_at: new Date().toISOString()
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
      
      toast({
        title: "Succès",
        description: "La tâche a été rejetée",
      });
      
      setIsRejectDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors du rejet de la tâche:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter la tâche",
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
    const statusMap: Record<string, string> = {
      assigned: 'bg-yellow-500',
      in_progress: 'bg-blue-500',
      submitted: 'bg-orange-500',
      validated: 'bg-green-500',
      rejected: 'bg-red-500'
    };
    return statusMap[status] || 'bg-gray-500';
  };
  
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      assigned: 'Assignée',
      in_progress: 'En cours',
      submitted: 'Soumise',
      validated: 'Validée',
      rejected: 'Rejetée'
    };
    return statusMap[status] || 'Inconnu';
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
        <h3 className="text-lg font-medium mb-2">Tâche non trouvée</h3>
        <p className="text-gray-500 mb-4">La tâche que vous recherchez n'existe pas ou a été supprimée.</p>
        <Button onClick={handleBackToTasks}>Retour aux tâches</Button>
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
              Phase {task.phase_id === 'conception' ? 'Conception' : 'Réalisation'} {' > '}
              Section {task.section_id} {' > '}
              Sous-section {task.subsection_id}
            </p>
          </div>
        </div>
        <div>
          <Badge 
            className={`${getStatusColor(task.status)} text-white px-3 py-1 text-xs`}
          >
            {getStatusLabel(task.status)}
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
                  Fiche informative
                </Badge>
                <Badge variant="outline" className="bg-blue-500 bg-opacity-10 text-blue-600 border-blue-500">
                  Document de référence
                </Badge>
                <span className="text-sm text-gray-500 ml-3">
                  {expandedInfoSheet ? "Cliquez pour réduire" : "Cliquez pour afficher les instructions détaillées"}
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
            <CardTitle>Détails de la tâche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-md font-medium mb-2 block">Intervenant assigné</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                  <User className="h-5 w-5 text-gray-500" />
                  <span>
                    {assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : 'Non assigné'}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-md font-medium mb-2 block">Validateurs</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                  <Users className="h-5 w-5 text-gray-500" />
                  <span>
                    {validators.length > 0 
                      ? validators.map(v => `${v.first_name} ${v.last_name}`).join(', ')
                      : 'Aucun validateur défini'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-md font-medium mb-2 block">Date limite de livraison</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span>{formatDate(task.deadline)}</span>
                  {getRemainingDays(task.deadline) > 0 ? (
                    <Badge className="ml-2 bg-blue-500">{getRemainingDays(task.deadline)} jours restants</Badge>
                  ) : (
                    <Badge className="ml-2 bg-red-500">Délai dépassé</Badge>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-md font-medium mb-2 block">Date limite de validation</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span>{formatDate(task.validation_deadline)}</span>
                  {getRemainingDays(task.validation_deadline) > 0 ? (
                    <Badge className="ml-2 bg-blue-500">{getRemainingDays(task.validation_deadline)} jours restants</Badge>
                  ) : (
                    <Badge className="ml-2 bg-red-500">Délai dépassé</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <Label className="text-md font-medium mb-2 block">Format de fichier attendu</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                <FileUp className="h-5 w-5 text-gray-500" />
                <span>
                  {task.file_extension === 'pdf' && 'Document PDF (.pdf)'}
                  {task.file_extension === 'doc' && 'Document Word (.doc, .docx)'}
                  {task.file_extension === 'xls' && 'Feuille de calcul Excel (.xls, .xlsx)'}
                  {task.file_extension === 'ppt' && 'Présentation PowerPoint (.ppt, .pptx)'}
                  {task.file_extension === 'txt' && 'Fichier texte (.txt)'}
                  {task.file_extension === 'jpg' && 'Image JPEG (.jpg, .jpeg)'}
                  {task.file_extension === 'png' && 'Image PNG (.png)'}
                  {task.file_extension === 'zip' && 'Archive ZIP (.zip)'}
                  {task.file_extension === 'dwg' && 'Dessin AutoCAD (.dwg)'}
                  {task.file_extension === 'other' && 'Autre format'}
                </span>
              </div>
            </div>
            
            {task.comment && (
              <div>
                <Label className="text-md font-medium mb-2 block">Instructions</Label>
                <div className="p-3 bg-gray-50 rounded-md whitespace-pre-line">
                  {task.comment}
                </div>
              </div>
            )}
            
            {task.file_url && (
              <div>
                <Label className="text-md font-medium mb-2 block">Fichier soumis</Label>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-gray-500" />
                    <span>{task.submitted_at ? `Soumis le ${formatDateTime(task.submitted_at)}` : 'Fichier téléchargé'}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(task.file_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </div>
            )}
            
            {task.validation_comment && (
              <div>
                <Label className="text-md font-medium mb-2 block">Commentaire de validation</Label>
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
                Démarrer la tâche
              </Button>
            )}
            
            {isAssignedUser && (task.status === 'assigned' || task.status === 'in_progress' || task.status === 'rejected') && (
              <Button 
                onClick={handleOpenSubmitDialog}
                className="bg-green-600 hover:bg-green-700"
              >
                <FileUp className="h-4 w-4 mr-2" />
                Soumettre le livrable
              </Button>
            )}
            
            {/* Actions for validators */}
            {(isValidator || isAdmin) && task.status === 'submitted' && (
              <div className="flex gap-2">
                <Button 
                  onClick={handleOpenValidateDialog}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Valider
                </Button>
                <Button 
                  onClick={handleOpenRejectDialog}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
        
        {/* Timeline */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Timeline item for task creation */}
              <div className="relative pl-6 pb-6 border-l-2 border-gray-200">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-aphs-teal border-4 border-white"></div>
                <div className="text-sm">
                  <p className="font-medium">Tâche créée</p>
                  <p className="text-gray-500">{formatDateTime(task.created_at)}</p>
                </div>
              </div>
              
              {/* Timeline item for task start */}
              {(task.status === 'in_progress' || task.status === 'submitted' || task.status === 'validated' || task.status === 'rejected') && (
                <div className="relative pl-6 pb-6 border-l-2 border-gray-200">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white"></div>
                  <div className="text-sm">
                    <p className="font-medium">Tâche démarrée</p>
                    <p className="text-gray-500">
                      {/* We don't have exact time for task start, using updated_at as approximation */}
                      {formatDateTime(task.updated_at)}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Timeline item for task submission */}
              {(task.status === 'submitted' || task.status === 'validated' || task.status === 'rejected') && task.submitted_at && (
                <div className="relative pl-6 pb-6 border-l-2 border-gray-200">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-orange-500 border-4 border-white"></div>
                  <div className="text-sm">
                    <p className="font-medium">Livrable soumis</p>
                    <p className="text-gray-500">{formatDateTime(task.submitted_at)}</p>
                  </div>
                </div>
              )}
              
              {/* Timeline item for task validation */}
              {(task.status === 'validated' || task.status === 'rejected') && task.validated_at && (
                <div className="relative pl-6 pb-6 border-l-2 border-gray-200">
                  <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full ${task.status === 'validated' ? 'bg-green-500' : 'bg-red-500'} border-4 border-white`}></div>
                  <div className="text-sm">
                    <p className="font-medium">
                      {task.status === 'validated' ? 'Livrable validé' : 'Livrable rejeté'}
                    </p>
                    <p className="text-gray-500">{formatDateTime(task.validated_at)}</p>
                  </div>
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
    </div>
  );
};

export default TaskDetails; 