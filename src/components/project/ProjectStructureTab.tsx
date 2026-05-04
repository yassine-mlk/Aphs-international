import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Layers, ChevronRight, User, ExternalLink, Loader2, Plus, Trash2, X, ChevronUp, ChevronDown, FileCheck, PlusCircle, CheckCircle2, GitBranch, Calendar, Clock, ArrowRight, AlertTriangle, Pencil } from 'lucide-react';
import { format, addDays, differenceInDays, parseISO, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import AvatarStack from './AvatarStack';
import { usePlan } from '@/hooks/usePlan';
import { notifyStandardTaskAssigned } from '@/lib/notifications/standardTaskNotifications';
import { notifyWorkflowTaskAssigned } from '@/lib/notifications/workflowNotifications';

interface StructureSectionInput {
  id: string;
  title: string;
  status: 'pending' | 'started' | 'completed';
  deadline?: string;
  start_date?: string;
  end_date?: string;
  actual_start_date?: string;
  planned_end_date?: string;
  items: { 
    id: string; 
    title: string; 
    status: 'pending' | 'started' | 'completed';
    deadline?: string;
    start_date?: string;
    end_date?: string;
    actual_start_date?: string;
    planned_end_date?: string;
    tasks: { id: string; title: string; order_index: number }[] 
  }[];
}

interface TaskAssignment {
  id: string;
  phase_id: string;
  section_id: string;
  subsection_id: string;
  task_name: string;
  status: string;
  assigned_to: string[];
  validators: { user_id: string; days_limit: number }[];
}

interface ProjectStructureTabProps {
  conceptionStructure: StructureSectionInput[];
  realizationStructure: StructureSectionInput[];
  projectId: string;
  projectName?: string;
  tenantId?: string;
  isAdmin?: boolean;
  onStructureChange?: () => void;
  onlyAssignedTasks?: boolean;
}

interface Intervenant {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  specialty?: string;
}

interface FullTaskAssignment extends TaskAssignment {
  project_id: string;
  project_name?: string;
  section_name?: string;
  subsection_name?: string;
  deadline: string;
  validation_deadline: string;
  start_date?: string;
  end_date?: string;
  file_extension: string;
  comment?: string;
  assignment_type: 'standard' | 'workflow';
  executor_days_limit: number;
  max_revisions: number;
  transparency_mode: boolean;
  created_at?: string;
  updated_at?: string;
}

const FILE_EXTENSIONS = [
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'doc', label: 'Word (.doc)' },
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'xls', label: 'Excel (.xls)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'jpg', label: 'Image JPEG (.jpg, .jpeg)' },
  { value: 'png', label: 'Image PNG (.png)' },
  { value: 'zip', label: 'Archive ZIP (.zip)' },
  { value: 'dwg', label: 'AutoCAD (.dwg)' },
  { value: 'other', label: 'Autre' }
];

const STATUS_LABELS: Record<string, string> = {
  open: 'OUVERT',
  in_review: 'EN REVUE',
  approved: 'TERMINÉ',
  rejected: 'BLOQUÉ',
  vso: 'TERMINÉ',
  vao: 'TERMINÉ',
  var: 'BLOQUÉ',
  closed: 'TERMINÉ',
  blocked: 'BLOQUÉ'
};

const STATUS_STYLES: Record<string, { bg: string, text: string }> = {
  open: { bg: '#F0F0F0', text: '#666' },
  in_review: { bg: '#FFF3E0', text: '#E65100' },
  approved: { bg: '#E8F5E9', text: '#2E7D32' },
  rejected: { bg: '#FFEBEE', text: '#C62828' },
  vso: { bg: '#E8F5E9', text: '#2E7D32' },
  vao: { bg: '#E8F5E9', text: '#2E7D32' },
  var: { bg: '#FFEBEE', text: '#C62828' },
  closed: { bg: '#E8F5E9', text: '#2E7D32' },
  blocked: { bg: '#FFEBEE', text: '#C62828' }
};

const ProjectStructureTab: React.FC<ProjectStructureTabProps> = ({
  conceptionStructure,
  realizationStructure,
  projectId,
  projectName,
  tenantId,
  isAdmin,
  onStructureChange,
  onlyAssignedTasks
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can } = usePlan();
  const [activePhase, setActivePhase] = useState<'conception' | 'realisation'>('conception');
  const [assignments, setAssignments] = useState<FullTaskAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  // Map: "user_id" -> "Prénom Nom"
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const isUserAssignedToTask = (assignment: FullTaskAssignment | null) => {
    if (!assignment || !currentUserId) return false;
    const isExecutor = assignment.assigned_to?.includes(currentUserId);
    const isValidator = assignment.validators?.some(v => v.user_id === currentUserId);
    return isExecutor || isValidator;
  };

  // Charger l'ID de l'utilisateur actuel
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // État pour la gestion de l'assignation de tâches
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [loadingIntervenants, setLoadingIntervenants] = useState(false);
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<{
    phase: 'conception' | 'realisation';
    section: string;
    subsection: string;
    taskName: string;
  } | null>(null);

  const [assignmentForm, setAssignmentForm] = useState<{
    assigned_to: string[];
    deadline: string;
    validation_deadline: string;
    start_date: string;
    end_date: string;
    validators: { user_id: string; days_limit: number }[];
    file_extension: string;
    comment: string;
    assignment_type: 'standard' | 'workflow';
    executor_days_limit: number;
    max_revisions: number;
    transparency_mode: boolean;
  }>({
    assigned_to: [],
    deadline: '',
    validation_deadline: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    validators: [],
    file_extension: 'pdf',
    comment: '',
    assignment_type: 'standard',
    executor_days_limit: 3,
    max_revisions: 3,
    transparency_mode: false
  });

  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [isAssignmentModeDialogOpen, setIsAssignmentModeDialogOpen] = useState(false);
  const [startData, setStartData] = useState<{
    type: 'section' | 'item';
    id: string;
    title: string;
    planned_end_date: string;
  } | null>(null);

  const handleStartElement = async () => {
    if (!startData) return;
    try {
      const rpcName = startData.type === 'section' ? 'start_project_section' : 'start_project_item';
      
      // Conversion de la date en ISO pour éviter l'erreur 400
      const plannedDate = new Date(startData.planned_end_date);
      plannedDate.setHours(23, 59, 59, 999);
      const isoPlannedDate = plannedDate.toISOString();

      const { error } = await supabase.rpc(rpcName, {
        [startData.type === 'section' ? 'p_section_id' : 'p_item_id']: startData.id,
        p_planned_end_date: isoPlannedDate
      });

      if (error) throw error;

      // Recharger les assignations sans recharger la page
      const { data: updatedAssignments } = await supabase
        .from('task_assignments_view')
        .select('*')
        .eq('project_id', projectId);

      if (updatedAssignments) {
        setAssignments(updatedAssignments as FullTaskAssignment[]);
        // Mettre à jour les noms
        const allIds = Array.from(new Set(
          updatedAssignments.flatMap((a: any) => {
            const executorIds = a.assigned_to || [];
            const validatorIds = (a.validators as any[])?.map(v => v.user_id) || [];
            return [...executorIds, ...validatorIds];
          })
        ));
        
        if (allIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', allIds);
          const map: Record<string, string> = {};
          (profiles || []).forEach((p: any) => {
            map[p.user_id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.user_id;
          });
          setUserNames(map);
        }
      }

      toast({ title: 'Succès', description: 'Élément débuté avec succès' });
      setIsStartDialogOpen(false);
      
      // Rafraîchir la structure pour mettre à jour les autres onglets (Gantt)
      if (onStructureChange) {
        onStructureChange();
      }
    } catch (error: any) {
      toast({ 
        title: 'Erreur', 
        description: error.message || 'Impossible de débuter l\'élément', 
        variant: 'destructive' 
      });
    }
  };

  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');

  // État pour la désassignation
  const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false);
  const [taskToUnassign, setTaskToUnassign] = useState<FullTaskAssignment | null>(null);

  // Charger les task_assignments du projet
  useEffect(() => {
    if (!projectId) return;
    setLoadingAssignments(true);
    supabase
      .from('task_assignments_view')
      .select('*')
      .eq('project_id', projectId)
      .then(async ({ data }) => {
        const list: FullTaskAssignment[] = (data || []) as FullTaskAssignment[];
        setAssignments(list);

        // Collecter tous les user IDs uniques pour résoudre les noms
        // On inclut les assigned_to et TOUS les validateurs
        const allIds = Array.from(new Set(
          list.flatMap(a => {
            const executorIds = a.assigned_to || [];
            const validatorIds = (a.validators as any[])?.map(v => v.user_id) || [];
            return [...executorIds, ...validatorIds];
          })
        ));
        
        if (allIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', allIds);
          const map: Record<string, string> = {};
          (profiles || []).forEach((p: any) => {
            map[p.user_id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.user_id;
          });
          setUserNames(map);
        }
        setLoadingAssignments(false);
      });
  }, [projectId]);

  // Trouver l'assignment pour une tâche donnée
  const getAssignment = (phase: string, sectionId: string, itemId: string, taskName: string) =>
    assignments.find(
      a => a.phase_id === phase &&
           a.section_id === sectionId &&
           a.subsection_id === itemId &&
           a.task_name === taskName
    ) || null;

  // Charger les membres du projet
  useEffect(() => {
    if (!projectId) return;
    supabase
      .from('membre')
      .select('user_id')
      .eq('project_id', projectId)
      .then(({ data }) => {
        if (data) {
          setProjectMembers(data.map(m => m.user_id));
        }
      });
  }, [projectId]);

  // Charger les intervenants
  const fetchIntervenants = async () => {
    setLoadingIntervenants(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, specialty');

      if (error) throw error;
      setIntervenants(data || []);
    } catch (error) {
    } finally {
      setLoadingIntervenants(false);
    }
  };

  // Filtrer les intervenants pour l'assignation (seulement les membres du projet)
  const filteredIntervenantsForAssignment = useMemo(() => {
    const eligibleIntervenants = intervenants.filter(intervenant =>
      projectMembers.includes(intervenant.user_id)
    );

    if (!assignmentSearchQuery) return eligibleIntervenants;

    return eligibleIntervenants.filter(intervenant =>
      intervenant.first_name.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
      intervenant.last_name.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
      intervenant.email.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
      (intervenant.specialty && intervenant.specialty.toLowerCase().includes(assignmentSearchQuery.toLowerCase()))
    );
  }, [intervenants, assignmentSearchQuery, projectMembers]);

  // Ouvrir le dialogue d'assignation de tâche
  const handleOpenAssignTask = (phase: 'conception' | 'realisation', section: string, subsection: string, taskName: string) => {
    if (!isAdmin) {
      toast({
        title: 'Accès refusé',
        description: 'Seuls les administrateurs peuvent assigner des tâches',
        variant: 'destructive',
      });
      return;
    }

    setSelectedTask({
      phase,
      section,
      subsection,
      taskName
    });

    // Vérifier si la tâche est déjà assignée
    const existingAssignment = getAssignment(phase, section, subsection, taskName);

    if (existingAssignment) {
      // Pré-remplir le formulaire avec l'assignation existante
      setAssignmentForm({
        assigned_to: existingAssignment.assigned_to || [],
        deadline: existingAssignment.deadline ? existingAssignment.deadline.split('T')[0] : '',
        validation_deadline: existingAssignment.validation_deadline ? existingAssignment.validation_deadline.split('T')[0] : '',
        start_date: existingAssignment.start_date ? existingAssignment.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        end_date: existingAssignment.end_date ? existingAssignment.end_date.split('T')[0] : '',
        validators: (existingAssignment.validators || []).map((v: any) => 
          typeof v === 'string' ? { user_id: v, days_limit: 5 } : v
        ),
        file_extension: existingAssignment.file_extension || 'pdf',
        comment: existingAssignment.comment || '',
        assignment_type: existingAssignment.assignment_type || 'standard',
        executor_days_limit: existingAssignment.executor_days_limit || 3,
        max_revisions: existingAssignment.max_revisions || 3,
        transparency_mode: existingAssignment.transparency_mode || false
      });
    } else {
      // Réinitialiser le formulaire
      setAssignmentForm({
        assigned_to: [],
        deadline: '',
        validation_deadline: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        validators: [],
        file_extension: 'pdf',
        comment: '',
        assignment_type: 'standard',
        executor_days_limit: 3,
        max_revisions: 3,
        transparency_mode: false
      });
    }

    // Réinitialiser la recherche
    setAssignmentSearchQuery('');

    // Charger les intervenants si ce n'est pas déjà fait
    if (intervenants.length === 0) {
      fetchIntervenants();
    }

    // Si c'est une nouvelle assignation, demander le type d'abord
    if (!existingAssignment) {
      setIsAssignmentModeDialogOpen(true);
    } else {
      setIsAssignDialogOpen(true);
    }
  };

  // Soumettre l'assignation de tâche
  const handleSubmitAssignment = async () => {
    if (!selectedTask || !projectId) return;

    if (!assignmentForm.assigned_to || assignmentForm.assigned_to.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un intervenant',
        variant: 'destructive',
      });
      return;
    }

    if (!assignmentForm.deadline) {
      toast({
        title: 'Erreur',
        description: 'Veuillez définir une date limite',
        variant: 'destructive',
      });
      return;
    }

    if (assignmentForm.assignment_type === 'standard' && !assignmentForm.validation_deadline) {
      toast({
        title: 'Erreur',
        description: 'Veuillez définir une date limite pour la validation',
        variant: 'destructive',
      });
      return;
    }

    if (assignmentForm.assignment_type === 'standard' && assignmentForm.validation_deadline && assignmentForm.validation_deadline < assignmentForm.deadline) {
      toast({
        title: 'Erreur',
        description: 'La date limite de validation ne peut pas être antérieure à la date limite de soumission',
        variant: 'destructive',
      });
      return;
    }

    if (assignmentForm.start_date && assignmentForm.deadline) {
      if (assignmentForm.deadline < assignmentForm.start_date) {
        toast({
          title: 'Erreur',
          description: 'La date limite ne peut pas être antérieure à la date de début',
          variant: 'destructive',
        });
        return;
      }
    }

    if (assignmentForm.start_date && assignmentForm.end_date) {
      if (assignmentForm.end_date < assignmentForm.start_date) {
        toast({
          title: 'Erreur',
          description: 'La date de fin ne peut pas être antérieure à la date de début',
          variant: 'destructive',
        });
        return;
      }
    }

    if (assignmentForm.validators.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un validateur',
        variant: 'destructive',
      });
      return;
    }

    if (assignmentForm.assigned_to.some(id => assignmentForm.validators.some(v => v.user_id === id))) {
      toast({
        title: 'Erreur',
        description: 'Un intervenant assigné ne peut pas être validateur',
        variant: 'destructive',
      });
      return;
    }

    // Vérifier si la tâche est déjà assignée
    const existingAssignment = getAssignment(
      selectedTask.phase,
      selectedTask.section,
      selectedTask.subsection,
      selectedTask.taskName
    );

    try {
      // Utiliser la fonction RPC pour gérer correctement les tableaux UUID et le workflow
      const { data, error } = await supabase
        .rpc('upsert_task_assignment', {
          p_project_id: projectId,
          p_phase_id: selectedTask.phase,
          p_section_id: selectedTask.section,
          p_subsection_id: selectedTask.subsection,
          p_task_name: selectedTask.taskName,
          p_assigned_to: assignmentForm.assigned_to,
          p_deadline: assignmentForm.deadline,
          p_validation_deadline: assignmentForm.assignment_type === 'workflow' 
            ? assignmentForm.deadline 
            : assignmentForm.validation_deadline,
          p_validators: assignmentForm.validators, // Envoyé tel quel, le RPC devra gérer JSONB ou Array of objects
          p_file_extension: assignmentForm.file_extension,
          p_assignment_type: assignmentForm.assignment_type,
          p_executor_days_limit: assignmentForm.executor_days_limit,
          p_max_revisions: assignmentForm.max_revisions,
          p_id: existingAssignment?.id || null,
          p_comment: assignmentForm.comment || null,
          p_status: existingAssignment?.status || 'open',
          p_start_date: assignmentForm.start_date || null,
          p_end_date: assignmentForm.end_date || null,
          p_transparency_mode: assignmentForm.transparency_mode
        });

      if (error) throw error;
      const result = data;

      if (result) {
        const taskId = existingAssignment?.id || (result as any).id;

        // Notifier les intervenants si c'est une tâche standard
        if (assignmentForm.assignment_type === 'standard') {
          if (taskId) {
            const finalTenantId = tenantId || null;
            await notifyStandardTaskAssigned(
              taskId, 
              assignmentForm.assigned_to, 
              assignmentForm.validators.map(v => v.user_id),
              {
                taskName: selectedTask.taskName,
                projectName: projectName,
                tenantId: finalTenantId,
                deadline: assignmentForm.deadline
              }
            );
          }
        } else if (assignmentForm.assignment_type === 'workflow') {
          if (taskId) {
            // Notifier chaque exécuteur assigné au workflow
            for (const executorId of assignmentForm.assigned_to) {
              await notifyWorkflowTaskAssigned(taskId, executorId);
            }
          }
        }

        toast({
          title: 'Succès',
          description: existingAssignment
            ? "L'assignation a été mise à jour avec succès"
            : 'La tâche a été assignée avec succès',
        });

        // Recharger les assignations
        const { data: updatedAssignments } = await supabase
          .from('task_assignments_view')
          .select('*')
          .eq('project_id', projectId);

        if (updatedAssignments) {
          setAssignments(updatedAssignments);
          // Mettre à jour les noms des utilisateurs
          const allIds = Array.from(new Set(
            updatedAssignments.flatMap((a: any) => {
              const executorIds = a.assigned_to || [];
              const validatorIds = (a.validators as any[])?.map(v => v.user_id) || [];
              return [...executorIds, ...validatorIds];
            })
          ));
          if (allIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, first_name, last_name')
              .in('user_id', allIds);
            const map: Record<string, string> = {};
            (profiles || []).forEach((p: any) => {
              map[p.user_id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.user_id;
            });
            setUserNames(map);
          }
        }

        setIsAssignDialogOpen(false);
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'assigner la tâche',
        variant: 'destructive',
      });
    }
  };

  // Ouvrir la boîte de dialogue de confirmation pour désassigner une tâche
  const handleUnassignTask = (assignment: FullTaskAssignment) => {
    setTaskToUnassign(assignment);
    setIsUnassignDialogOpen(true);
  };

  // Désassigner une tâche
  const confirmUnassignTask = async () => {
    if (!taskToUnassign) return;

    try {
      const table = taskToUnassign.assignment_type === 'workflow' ? 'workflow_tasks' : 'standard_tasks';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', taskToUnassign.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'La tâche a été désassignée avec succès',
      });

      // Mettre à jour la liste des assignations en retirant celle qui a été supprimée
      setAssignments(prev => prev.filter(t => t.id !== taskToUnassign.id));
      setIsUnassignDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de désassigner la tâche',
        variant: 'destructive',
      });
    }
  };

  const filteredStructure = useMemo(() => {
    const baseStructure = activePhase === 'conception' ? conceptionStructure : realizationStructure;
    
    if (!onlyAssignedTasks || isAdmin) return baseStructure;

    return baseStructure
      .map(section => {
        const filteredItems = section.items
          .map(item => {
            const filteredTasks = item.tasks.filter(task => {
              const assignment = getAssignment(activePhase, section.id, item.id, task.title);
              return isUserAssignedToTask(assignment);
            });

            return { ...item, tasks: filteredTasks };
          })
          .filter(item => item.tasks.length > 0);

        return { ...section, items: filteredItems };
      })
      .filter(section => section.items.length > 0);
  }, [activePhase, conceptionStructure, realizationStructure, onlyAssignedTasks, isAdmin, assignments, currentUserId]);

  const getDeadlineStyle = (deadlineStr: string) => {
    if (!deadlineStr) return { color: '#666', icon: null };
    const today = startOfDay(new Date());
    const deadline = startOfDay(parseISO(deadlineStr));
    const daysLeft = differenceInDays(deadline, today);

    if (daysLeft < 0) return { color: '#C62828', icon: <AlertTriangle className="h-3 w-3 mr-1" /> };
    if (daysLeft < 3) return { color: '#E65100', icon: null };
    if (daysLeft < 7) return { color: '#F57F17', icon: null };
    return { color: '#666', icon: null };
  };

  const getStatusBadgeStyle = (status: string) => {
    const style = STATUS_STYLES[status] || { bg: '#F0F0F0', text: '#666' };
    return {
      backgroundColor: style.bg,
      color: style.text,
      fontSize: '11px',
      padding: '3px 8px',
      borderRadius: '20px',
      fontWeight: 'bold',
      border: 'none'
    };
  };

  const currentStructure = filteredStructure;

  return (
    <div className="space-y-6" style={{ position: 'relative', width: '100%' }}>
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Assignement des tâches
            </h2>
            <div className="flex items-center gap-3">
              {loadingAssignments && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Tabs value={activePhase} onValueChange={v => setActivePhase(v as 'conception' | 'realisation')}>
                <TabsList>
                  <TabsTrigger value="conception">Phase Conception</TabsTrigger>
                  <TabsTrigger value="realisation">Phase Réalisation</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {currentStructure.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucune structure définie pour cette phase.
            </div>
          ) : (
            <Accordion type="multiple" className="w-full space-y-3">
              {currentStructure.map((section, si) => {
                const sectionLabel = String.fromCharCode(65 + si);
                // Compter les tâches assignées dans cette section
                const assignedCount = section.items.reduce((acc, item) =>
                  acc + item.tasks.filter(t => getAssignment(activePhase, section.id, item.id, t.title)).length, 0);
                const totalTasks = section.items.reduce((acc, item) => acc + item.tasks.length, 0);

                return (
                  <AccordionItem
                    key={section.id}
                    value={section.id}
                    className="border rounded-lg overflow-hidden border-gray-100"
                  >
                    <AccordionTrigger asChild className="px-4 h-[52px] hover:bg-gray-100 bg-[#F8F9FA]">
                      <div className="flex flex-1 items-center justify-between font-bold text-[15px] transition-all hover:no-underline [&[data-state=open]>svg]:rotate-180 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-[#1A237E] text-white font-bold min-w-[1.8rem] h-6 flex items-center justify-center rounded">
                            {sectionLabel}
                          </Badge>
                          <span className="font-bold text-gray-900">{section.title}</span>
                          <Badge variant="outline" className="ml-auto mr-2 text-[11px] bg-white border-gray-200 text-gray-500">
                            {assignedCount}/{totalTasks} assignée{totalTasks > 1 ? 's' : ''}
                          </Badge>
                          {section.status === 'started' && (
                            <Badge 
                              style={{ backgroundColor: '#E3F2FD', color: '#1565C0', fontSize: '10px', padding: '3px 8px', borderRadius: '20px', border: 'none' }}
                              className="mr-2 uppercase font-bold"
                            >
                              EN COURS
                            </Badge>
                          )}
                          {section.status === 'completed' && (
                            <Badge 
                              style={{ backgroundColor: '#E8F5E9', color: '#2E7D32', fontSize: '10px', padding: '3px 8px', borderRadius: '20px', border: 'none' }}
                              className="mr-2 uppercase font-bold"
                            >
                              TERMINÉ
                            </Badge>
                          )}
                          {section.planned_end_date && (
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 ml-2">
                              <Calendar className="h-3 w-3" />
                              <span>Fin prévue : {format(new Date(section.planned_end_date), 'dd/MM/yyyy')}</span>
                            </div>
                          )}
                          {isAdmin && section.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 mr-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStartData({
                                  type: 'section',
                                  id: section.id,
                                  title: section.title,
                                  planned_end_date: ''
                                });
                                setIsStartDialogOpen(true);
                              }}
                            >
                              Débuter
                            </Button>
                          )}
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-gray-400" />
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="p-0 bg-white">
                      <Accordion type="multiple" className="w-full">
                        {section.items.map((item, ii) => {
                          const itemLabel = `${sectionLabel}${ii + 1}`;
                          const itemAssigned = item.tasks.filter(t => getAssignment(activePhase, section.id, item.id, t.title)).length;
                          
                          // Couleur de bordure selon le statut du lot
                          const borderLeftColor = item.status === 'completed' ? '#2E7D32' : 
                                                 item.status === 'started' ? '#1565C0' : '#E0E0E0';

                          return (
                            <AccordionItem
                              key={item.id}
                              value={item.id}
                              className="border-t border-gray-100 last:border-b-0 ml-4 border-l-[3px]"
                              style={{ borderLeftColor }}
                            >
                              <AccordionTrigger asChild className="px-4 h-[46px] hover:bg-gray-50 bg-white">
                                <div className="flex flex-1 items-center justify-between transition-all hover:no-underline [&[data-state=open]>svg]:rotate-180 cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-600 text-sm min-w-[2.5rem]">{itemLabel}</span>
                                    <span className="text-left font-semibold text-[14px] text-gray-800">{item.title}</span>
                                    <span className="ml-2 text-[11px] text-gray-400 font-normal">
                                      {item.tasks.length} tâche{item.tasks.length > 1 ? 's' : ''}
                                      {itemAssigned > 0 && ` · ${itemAssigned} assignée${itemAssigned > 1 ? 's' : ''}`}
                                    </span>
                                    {item.status === 'started' && (
                                      <Badge 
                                        style={{ backgroundColor: '#E3F2FD', color: '#1565C0', fontSize: '9px', padding: '2px 6px', borderRadius: '20px', border: 'none' }}
                                        className="ml-auto uppercase font-bold h-5"
                                      >
                                        EN COURS
                                      </Badge>
                                    )}
                                    {item.status === 'completed' && (
                                      <Badge 
                                        style={{ backgroundColor: '#E8F5E9', color: '#2E7D32', fontSize: '9px', padding: '2px 6px', borderRadius: '20px', border: 'none' }}
                                        className="ml-auto uppercase font-bold h-5"
                                      >
                                        TERMINÉ
                                      </Badge>
                                    )}
                                    {item.planned_end_date && (
                                      <div className={`flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 ${item.status === 'started' ? 'ml-2' : 'ml-auto'}`}>
                                        <Calendar className="h-3 w-3" />
                                        <span>Fin prévue : {format(new Date(item.planned_end_date), 'dd/MM/yyyy')}</span>
                                      </div>
                                    )}
                                    {isAdmin && section.status === 'started' && item.status === 'pending' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="ml-auto h-6 px-2 text-[10px] text-green-600 hover:text-green-700 hover:bg-green-50 mr-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setStartData({
                                            type: 'item',
                                            id: item.id,
                                            title: item.title,
                                            planned_end_date: ''
                                          });
                                          setIsStartDialogOpen(true);
                                        }}
                                      >
                                        Débuter lot
                                      </Button>
                                    )}
                                  </div>
                                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-gray-400" />
                                </div>
                              </AccordionTrigger>

                              <AccordionContent className="px-0 pb-0 pt-0">
                                <div className="space-y-[1px] bg-gray-100">
                                  {item.tasks.map((task, ti) => {
                                    const assignment = getAssignment(activePhase, section.id, item.id, task.title);
                                    const deadlineStyle = assignment ? getDeadlineStyle(assignment.deadline) : { color: '#666', icon: null };
                                    
                                    return (
                                      <div
                                        key={ti}
                                        className={`flex items-center justify-between gap-3 px-4 h-[42px] ml-8 transition-colors ${
                                          !assignment ? 'bg-[#FFF9C4]/30 hover:bg-[#FFF9C4]/50' : 'bg-[#FAFAFA] hover:bg-gray-50'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="text-[11px] text-gray-400 shrink-0 font-medium">{itemLabel}.{ti + 1}</span>
                                          <span className="text-[13px] font-normal text-gray-700 truncate">{task.title}</span>
                                        </div>

                                        <div className="flex items-center gap-4 shrink-0">
                                          {assignment ? (
                                            <>
                                              {/* Statut */}
                                              <div style={getStatusBadgeStyle(assignment.status)}>
                                                {STATUS_LABELS[assignment.status] || assignment.status}
                                              </div>
                                              
                                              {/* Type d'assignation */}
                                              <Badge 
                                                variant="outline" 
                                                className={`text-[9px] uppercase font-bold px-1.5 h-5 ${
                                                  assignment.assignment_type === 'workflow' 
                                                    ? 'border-indigo-200 text-indigo-700 bg-indigo-50/30' 
                                                    : 'border-blue-200 text-blue-700 bg-blue-50/30'
                                                }`}
                                              >
                                                {assignment.assignment_type === 'workflow' ? 'Workflow' : 'Standard'}
                                              </Badge>

                                              {/* Date de fin prévue (Deadline) */}
                                              {(assignment.assignment_type === 'standard' ? assignment.validation_deadline : assignment.deadline) && (
                                                <div 
                                                  className="flex items-center text-[11px] font-medium"
                                                  style={{ color: getDeadlineStyle(assignment.assignment_type === 'standard' ? assignment.validation_deadline : assignment.deadline).color }}
                                                >
                                                  {getDeadlineStyle(assignment.assignment_type === 'standard' ? assignment.validation_deadline : assignment.deadline).icon}
                                                  <span>Fin prévue : {format(new Date(assignment.assignment_type === 'standard' ? assignment.validation_deadline : assignment.deadline), 'dd/MM/yyyy')}</span>
                                                </div>
                                              )}
                                              
                                              {/* Actions */}
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-7 px-2 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 font-bold"
                                                  onClick={() => navigate(`/dashboard/tasks/${assignment.id}`)}
                                                >
                                                  <ExternalLink className="h-3.5 w-3.5" />
                                                  Voir
                                                </Button>
                                                {isAdmin && (
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                    onClick={() => handleUnassignTask(assignment as FullTaskAssignment)}
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </Button>
                                                )}
                                              </div>
                                            </>
                                          ) : (
                                            isAdmin ? (
                                              item.status === 'started' ? (
                                                <Button
                                                  size="sm"
                                                  variant="default"
                                                  className="h-7 px-3 text-[11px] bg-blue-600 hover:bg-blue-700 text-white gap-1 font-bold shadow-sm"
                                                  onClick={() => handleOpenAssignTask(activePhase, section.id, item.id, task.title)}
                                                >
                                                  <Plus className="h-3.5 w-3.5" />
                                                  Assigner
                                                </Button>
                                              ) : (
                                                <span className="text-[10px] text-orange-500 italic font-medium bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                                                  Lot non ouvert
                                                </span>
                                              )
                                            ) : (
                                              <span className="text-[11px] text-gray-400 italic">Non assignée</span>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'assignation de tâche */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTask && getAssignment(selectedTask.phase, selectedTask.section, selectedTask.subsection, selectedTask.taskName)
                ? 'Modifier l\'assignation'
                : 'Assigner une tâche'}
            </DialogTitle>
            <DialogDescription>
              {selectedTask && (
                <span className="text-sm text-gray-500">
                  {selectedTask.taskName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Sélection des intervenants */}
            <div className="space-y-2">
              <Label>Intervenants assignés *</Label>
              <div className="border rounded-lg p-3 space-y-3">
                <Input
                  placeholder="Rechercher un intervenant..."
                  value={assignmentSearchQuery}
                  onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                  className="mb-2"
                />
                {loadingIntervenants ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredIntervenantsForAssignment.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">
                    {intervenants.length === 0
                      ? 'Aucun intervenant disponible'
                      : 'Aucun membre du projet ne correspond à votre recherche'}
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredIntervenantsForAssignment.map((intervenant) => (
                      <label
                        key={intervenant.user_id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={assignmentForm.assigned_to.includes(intervenant.user_id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              if (assignmentForm.assignment_type === 'workflow') {
                                // For workflow, only one executor
                                setAssignmentForm(prev => ({
                                  ...prev,
                                  assigned_to: [intervenant.user_id]
                                }));
                              } else {
                                // For standard, multiple executors
                                setAssignmentForm(prev => ({
                                  ...prev,
                                  assigned_to: [...prev.assigned_to, intervenant.user_id]
                                }));
                              }
                            } else {
                              setAssignmentForm(prev => ({
                                ...prev,
                                assigned_to: prev.assigned_to.filter(id => id !== intervenant.user_id)
                              }));
                            }
                          }}
                        />
                        <span className="text-sm flex-1">
                          {intervenant.first_name} {intervenant.last_name}
                          {intervenant.specialty && (
                            <span className="text-gray-500 text-xs ml-1">({intervenant.specialty})</span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400">{intervenant.email}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {assignmentForm.assigned_to.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {assignmentForm.assigned_to.map(userId => {
                    const intervenant = intervenants.find(i => i.user_id === userId);
                    return intervenant ? (
                      <Badge key={userId} variant="secondary" className="gap-1">
                        {intervenant.first_name} {intervenant.last_name}
                        <button
                          onClick={() => setAssignmentForm(prev => ({
                            ...prev,
                            assigned_to: prev.assigned_to.filter(id => id !== userId)
                          }))}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Dates adaptées au type d'assignation */}
            <div className={`grid ${assignmentForm.assignment_type === 'standard' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              <div className="space-y-2">
                <Label htmlFor="deadline">
                  {assignmentForm.assignment_type === 'standard' ? 'Date limite de soumission *' : 'Date limite pour la tâche *'}
                </Label>
                <Input
                  id="deadline"
                  type="date"
                  value={assignmentForm.deadline}
                  onChange={(e) => setAssignmentForm(prev => ({ 
                    ...prev, 
                    deadline: e.target.value,
                    end_date: prev.assignment_type === 'workflow' ? e.target.value : prev.validation_deadline 
                  }))}
                />
              </div>
              
              {assignmentForm.assignment_type === 'standard' && (
                <div className="space-y-2">
                  <Label htmlFor="validation_deadline">Date limite de validation *</Label>
                  <Input
                    id="validation_deadline"
                    type="date"
                    value={assignmentForm.validation_deadline}
                    onChange={(e) => setAssignmentForm(prev => ({ 
                      ...prev, 
                      validation_deadline: e.target.value,
                      end_date: e.target.value
                    }))}
                  />
                </div>
              )}
            </div>

            {/* Délai d'exécution - Uniquement pour le Workflow */}
            {assignmentForm.assignment_type === 'workflow' && (
              <div className="space-y-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="executor_days_limit" className="text-sm font-medium text-indigo-900">
                      Délai d'exécution pour l'intervenant (jours)
                    </Label>
                    <p className="text-xs text-indigo-600">Nombre de jours alloués après le début de la tâche</p>
                  </div>
                  <Input
                    id="executor_days_limit"
                    type="number"
                    min="1"
                    className="w-20 bg-white"
                    value={assignmentForm.executor_days_limit}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, executor_days_limit: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
            )}

            {/* Sélection des validateurs */}
            <div className="space-y-2">
              <Label>Validateurs *</Label>
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-xs text-gray-500">
                  Les validateurs ne peuvent pas être parmi les intervenants assignés
                </p>
                {loadingIntervenants ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredIntervenantsForAssignment.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Aucun intervenant disponible
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredIntervenantsForAssignment
                      .filter(i => !assignmentForm.assigned_to.includes(i.user_id))
                      .map((intervenant) => (
                        <label
                          key={intervenant.user_id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                        <Checkbox
                          checked={assignmentForm.validators.some(v => v.user_id === intervenant.user_id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              // Multiple validators allowed for both modes
                              setAssignmentForm(prev => ({
                                ...prev,
                                validators: [...prev.validators, { user_id: intervenant.user_id, days_limit: 5 }]
                              }));
                            } else {
                              setAssignmentForm(prev => ({
                                ...prev,
                                validators: prev.validators.filter(v => v.user_id !== intervenant.user_id)
                              }));
                            }
                          }}
                        />
                          <span className="text-sm flex-1">
                            {intervenant.first_name} {intervenant.last_name}
                          </span>
                        </label>
                      ))}
                  </div>
                )}
              </div>
              {assignmentForm.validators.length > 0 && (
                <div className="mt-4 space-y-3">
                  <Label className="text-sm font-semibold text-indigo-800">
                    {assignmentForm.assignment_type === 'workflow' 
                      ? 'Circuit de validation séquentiel' 
                      : 'Validateur désigné'}
                  </Label>
                  <div className="space-y-2">
                    {assignmentForm.validators.map((validator, index) => {
                      const intervenant = intervenants.find(i => i.user_id === validator.user_id);
                      if (!intervenant) return null;
                      return (
                        <div 
                          key={validator.user_id} 
                          className="flex items-center gap-3 p-3 bg-white rounded-lg border shadow-sm"
                        >
                          {assignmentForm.assignment_type === 'workflow' ? (
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">
                              {index + 1}
                            </span>
                          ) : (
                            <div className="p-1.5 bg-gray-100 rounded-full text-gray-500 shrink-0">
                              <User className="h-3.5 w-3.5" />
                            </div>
                          )}
                          
                          <span className="flex-1 text-sm font-medium truncate">
                            {intervenant.first_name} {intervenant.last_name}
                          </span>
                          
                          {assignmentForm.assignment_type === 'workflow' && (
                            <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border shrink-0">
                              <Label htmlFor={`days-${validator.user_id}`} className="text-[10px] text-gray-500 uppercase font-bold">Délai (j)</Label>
                              <Input
                                id={`days-${validator.user_id}`}
                                type="number"
                                min="1"
                                className="w-12 h-7 text-xs p-1 border-0 focus-visible:ring-0 bg-transparent"
                                value={validator.days_limit}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setAssignmentForm(prev => ({
                                    ...prev,
                                    validators: prev.validators.map(v => 
                                      v.user_id === validator.user_id ? { ...v, days_limit: val } : v
                                    )
                                  }));
                                }}
                              />
                            </div>
                          )}

                          <div className="flex gap-1 border-l pl-2">
                            {assignmentForm.assignment_type === 'workflow' && (
                              <>
                                <button
                                  onClick={() => {
                                    if (index === 0) return;
                                    setAssignmentForm(prev => {
                                      const newValidators = [...prev.validators];
                                      [newValidators[index], newValidators[index - 1]] = [newValidators[index - 1], newValidators[index]];
                                      return { ...prev, validators: newValidators };
                                    });
                                  }}
                                  disabled={index === 0}
                                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
                                  title="Monter"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (index === assignmentForm.validators.length - 1) return;
                                    setAssignmentForm(prev => {
                                      const newValidators = [...prev.validators];
                                      [newValidators[index], newValidators[index + 1]] = [newValidators[index + 1], newValidators[index]];
                                      return { ...prev, validators: newValidators };
                                    });
                                  }}
                                  disabled={index === assignmentForm.validators.length - 1}
                                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
                                  title="Descendre"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setAssignmentForm(prev => ({
                                ...prev,
                                validators: prev.validators.filter(v => v.user_id !== validator.user_id)
                              }))}
                              className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
                              title="Retirer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {assignmentForm.assignment_type === 'workflow' && (
                    <p className="text-[10px] text-blue-600 italic">
                      L'ordre définit le circuit séquentiel. Chaque validateur dispose de son propre délai après la validation précédente.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Nombre maximum de révisions - Uniquement pour le Workflow */}
            {assignmentForm.assignment_type === 'workflow' && (
              <div className="space-y-2 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="max_revisions" className="text-sm font-medium text-amber-900">
                      Nombre maximum de révisions
                    </Label>
                    <p className="text-xs text-amber-600">
                      Au-delà de cette limite, la tâche sera bloquée et nécessitera votre intervention
                    </p>
                  </div>
                  <Input
                    id="max_revisions"
                    type="number"
                    min="1"
                    max="10"
                    className="w-20 bg-white"
                    value={assignmentForm.max_revisions}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setAssignmentForm(prev => ({ 
                        ...prev, 
                        max_revisions: val > 10 ? 10 : val 
                      }));
                    }}
                  />
                </div>
              </div>
            )}

            {/* Configuration du Workflow masquée si déjà choisi au début */}
            <div className="hidden">
              <Select
                value={assignmentForm.assignment_type}
                onValueChange={(value: 'standard' | 'workflow') => 
                  setAssignmentForm(prev => ({ 
                    ...prev, 
                    assignment_type: value
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Collecte Parallèle</SelectItem>
                  <SelectItem value="workflow">Revue séquentielle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Extension de fichier */}
            <div className="space-y-2">
              <Label htmlFor="file_extension">Type de fichier attendu *</Label>
              <Select
                value={assignmentForm.file_extension}
                onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, file_extension: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_EXTENSIONS.map(ext => (
                    <SelectItem key={ext.value} value={ext.value}>{ext.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mode Transparence - Uniquement pour les tâches standard */}
            {assignmentForm.assignment_type === 'standard' && (
              <div className="flex items-center space-x-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <Checkbox 
                  id="transparency_mode" 
                  checked={assignmentForm.transparency_mode}
                  onCheckedChange={(checked) => setAssignmentForm(prev => ({ 
                    ...prev, 
                    transparency_mode: checked === true 
                  }))}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="transparency_mode"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Mode Transparence
                  </Label>
                  <p className="text-xs text-blue-600">
                    Permet aux intervenants de voir les soumissions des autres intervenants sur cette tâche.
                  </p>
                </div>
              </div>
            )}

            {/* Commentaire */}
            <div className="space-y-2">
              <Label htmlFor="comment">Commentaire (optionnel)</Label>
              <Textarea
                id="comment"
                placeholder="Instructions ou informations complémentaires..."
                value={assignmentForm.comment}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, comment: e.target.value }))}
                rows={3}
              />
              {/* Visualisation de la Timeline - Uniquement pour le Workflow */}
              {assignmentForm.assignment_type === 'workflow' && (
                <div className="mt-6 space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      Visualisation de la Timeline
                    </h4>
                    <Badge variant="outline" className="bg-white text-[10px] font-medium">
                      Aujourd'hui : {format(new Date(), 'dd MMM yyyy', { locale: fr })}
                    </Badge>
                  </div>

                  <div className="relative pt-2 pb-6">
                    {/* Ligne centrale */}
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 ml-[11px]" />

                    <div className="space-y-6">
                      {/* Étape 1: Assignation */}
                      <div className="relative flex items-start gap-4 pl-8">
                        <div className="absolute left-0 p-1.5 bg-blue-600 rounded-full text-white z-10">
                          <Plus className="h-3 w-3" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-900">Assignation & Début</p>
                          <p className="text-[10px] text-gray-500">{format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
                        </div>
                      </div>

                      {/* Étape 2: Exécuteur */}
                      {assignmentForm.assigned_to.length > 0 && (
                        <div className="relative flex items-start gap-4 pl-8">
                          <div className="absolute left-0 p-1.5 bg-indigo-500 rounded-full text-white z-10">
                            <User className="h-3 w-3" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-gray-900">
                                Exécution : {intervenants.find(i => i.user_id === assignmentForm.assigned_to[0])?.first_name}
                              </p>
                              <Badge className="h-5 text-[9px] bg-indigo-50 text-indigo-700 border-indigo-100">
                                +{assignmentForm.executor_days_limit}j
                              </Badge>
                            </div>
                            <p className="text-[10px] text-gray-500">
                              Échéance estimée : {format(addDays(new Date(), assignmentForm.executor_days_limit), 'dd MMMM yyyy', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Étapes: Validateurs */}
                      {assignmentForm.validators.map((v, idx) => {
                        const validatorInfo = intervenants.find(i => i.user_id === v.user_id);
                        // Calculer le délai cumulé
                        const cumulativeDays = assignmentForm.executor_days_limit + 
                          assignmentForm.validators.slice(0, idx + 1).reduce((acc, curr) => acc + curr.days_limit, 0);
                        const estimatedDate = addDays(new Date(), cumulativeDays);

                        return (
                          <div key={v.user_id} className="relative flex items-start gap-4 pl-8">
                            <div className="absolute left-0 p-1.5 bg-amber-500 rounded-full text-white z-10">
                              <FileCheck className="h-3 w-3" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-gray-900">
                                  Validation {idx + 1} : {validatorInfo?.first_name}
                                </p>
                                <Badge className="h-5 text-[9px] bg-amber-50 text-amber-700 border-amber-100">
                                  +{v.days_limit}j
                                </Badge>
                              </div>
                              <p className="text-[10px] text-gray-500">
                                Échéance estimée : {format(estimatedDate, 'dd MMMM yyyy', { locale: fr })}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Étape Finale: Échéance prévue vs Timeline */}
                      {assignmentForm.deadline && (
                        <div className="relative flex items-start gap-4 pl-8 pt-2 border-t border-dashed border-gray-300">
                          <div className="absolute left-0 p-1.5 bg-green-600 rounded-full text-white z-10">
                            <Calendar className="h-3 w-3" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-gray-900">Date limite globale</p>
                              <p className="text-xs font-bold text-green-700">
                                {format(parseISO(assignmentForm.deadline), 'dd MMMM yyyy', { locale: fr })}
                              </p>
                            </div>
                            
                            {/* Calcul de la marge */}
                            {(() => {
                              const totalDaysNeeded = assignmentForm.executor_days_limit + 
                                assignmentForm.validators.reduce((acc, curr) => acc + curr.days_limit, 0);
                              const deadlineDate = parseISO(assignmentForm.deadline);
                              const lastStepDate = addDays(new Date(), totalDaysNeeded);
                              const margin = differenceInDays(deadlineDate, lastStepDate);

                              return (
                                <div className={`mt-2 p-2 rounded text-[10px] flex items-center justify-between ${margin >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                  <span className="font-medium">Marge de sécurité :</span>
                                  <span className="font-bold">{margin >= 0 ? `${margin} jours` : `Retard de ${Math.abs(margin)} jours`}</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitAssignment}>
              {selectedTask && getAssignment(selectedTask.phase, selectedTask.section, selectedTask.subsection, selectedTask.taskName)
                ? 'Mettre à jour'
                : 'Assigner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation pour désassigner */}
      <AlertDialog open={isUnassignDialogOpen} onOpenChange={setIsUnassignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désassigner cette tâche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera l'assignation de la tâche "{taskToUnassign?.task_name}".
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsUnassignDialogOpen(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnassignTask}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Désassigner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog pour débuter une section ou un item */}
      <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Débuter {startData?.type === 'section' ? 'la section' : 'le lot'}</DialogTitle>
            <DialogDescription>
              Voulez-vous débuter "{startData?.title}" ? 
              Cela permettra aux intervenants de soumettre leurs documents.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="planned_end_date">Date de fin prévue pour l'ensemble</Label>
              <Input
                id="planned_end_date"
                type="date"
                value={startData?.planned_end_date || ''}
                onChange={(e) => setStartData(prev => prev ? { ...prev, planned_end_date: e.target.value } : null)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleStartElement}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!startData?.planned_end_date}
            >
              Débuter maintenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour choisir le mode d'assignation */}
      <Dialog open={isAssignmentModeDialogOpen} onOpenChange={setIsAssignmentModeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-blue-600" />
              Choisir le mode d'assignation
            </DialogTitle>
            <DialogDescription>
              Comment souhaitez-vous gérer cette tâche ?
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <button
              onClick={() => {
                setAssignmentForm(prev => ({ ...prev, assignment_type: 'standard' }));
                setIsAssignmentModeDialogOpen(false);
                setIsAssignDialogOpen(true);
              }}
              className="flex flex-col items-start p-4 text-left border rounded-lg hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-gray-100 rounded-md group-hover:bg-blue-100 transition-colors">
                  <CheckCircle2 className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <span className="font-semibold text-gray-900">Collecte Parallèle</span>
              </div>
              <p className="text-sm text-gray-500 ml-11">
                Idéal pour la collecte simple de documents. Une validation directe sans circuit séquentiel.
                Un ou plusieurs intervenants peuvent soumettre des documents.
              </p>
            </button>

            <button
              onClick={() => {
                if (!can('sequential' as any)) return;
                setAssignmentForm(prev => ({ ...prev, assignment_type: 'workflow' }));
                setIsAssignmentModeDialogOpen(false);
                setIsAssignDialogOpen(true);
              }}
              className={`flex flex-col items-start p-4 text-left border rounded-lg transition-all group ${
                !can('sequential' as any) 
                  ? 'opacity-60 grayscale cursor-not-allowed bg-gray-50' 
                  : 'hover:border-indigo-500 hover:bg-indigo-50/50'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gray-100 rounded-md group-hover:bg-indigo-100 transition-colors">
                    <GitBranch className="h-5 w-5 text-gray-600 group-hover:text-indigo-600" />
                  </div>
                  <span className="font-semibold text-gray-900">Revue documentaire séquentielle</span>
                </div>
                {!can('sequential' as any) && (
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">
                    PLAN PRO
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 ml-11">
                Pour les documents nécessitant plusieurs niveaux de contrôle (Circuit VISA). 
                Le document passe successivement entre les mains de plusieurs validateurs dans un ordre précis.
                {!can('sequential' as any) && (
                  <span className="block mt-2 text-amber-600 font-medium">
                    Cette fonctionnalité est disponible à partir du plan Pro.
                  </span>
                )}
              </p>
            </button>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAssignmentModeDialogOpen(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectStructureTab;
