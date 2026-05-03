// Hook pour gérer les assignements de tâches
// Basé sur les fonctions existantes dans ProjectDetails.tsx

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  TaskAssignment,
  CreateTaskAssignmentData,
  UpdateTaskAssignmentData,
  TaskAssignmentFilters,
  TaskAssignmentStats,
  TaskAssignmentWithDetails,
  TaskAssignmentIntervenant,
  TaskAssignmentProject,
  calculateTaskStats,
  validateTaskAssignment,
  isTaskOverdue,
  isTaskDueSoon
} from '@/types/taskAssignment';
import { 
  notifyStandardTaskAssigned, 
  notifyStandardTaskSubmission, 
  notifyAllSubmissionsReceived, 
  notifyValidatorResponse, 
  notifyValidationComplete, 
  notifyStandardTaskClosed 
} from '@/lib/notifications/standardTaskNotifications';

export const useTaskAssignments = () => {
  const { status } = useAuth();
  const { toast } = useToast();
  
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupérer tous les assignements de tâches
  const fetchAllTaskAssignments = useCallback(async (filters?: TaskAssignmentFilters) => {
    if (status !== 'authenticated') return [];
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('task_assignments_view')
        .select('*')
        .order('deadline', { ascending: true });
      
      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters?.phase_id) {
        query = query.eq('phase_id', filters.phase_id);
      }
      if (filters?.section_id) {
        query = query.eq('section_id', filters.section_id);
      }
      if (filters?.assigned_to) {
        query = query.contains('assigned_to', [filters.assigned_to]);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.deadline_from) {
        query = query.gte('deadline', filters.deadline_from);
      }
      if (filters?.deadline_to) {
        query = query.lte('deadline', filters.deadline_to);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      let filteredData = (data || []) as TaskAssignment[];

      // Filtre côté client pour la recherche textuelle
      if (filters?.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase();
        filteredData = filteredData.filter(assignment => 
          assignment.task_name.toLowerCase().includes(searchTerm) ||
          (assignment.comment && assignment.comment.toLowerCase().includes(searchTerm))
        );
      }

      setTaskAssignments(filteredData);
      return filteredData;
    } catch (err) {
      const errorMessage = 'Erreur lors de la récupération des assignements';
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [status, toast]);

  // Récupérer les assignements d'un projet spécifique
  const fetchProjectTaskAssignments = useCallback(async (projectId: string) => {
    return await fetchAllTaskAssignments({ project_id: projectId });
  }, [fetchAllTaskAssignments]);

  // Récupérer les assignements d'un intervenant spécifique
  const fetchUserTaskAssignments = useCallback(async (userId: string) => {
    return await fetchAllTaskAssignments({ assigned_to: userId });
  }, [fetchAllTaskAssignments]);

  // Créer ou mettre à jour un assignement via RPC
  const upsertTaskAssignment = useCallback(async (data: any): Promise<any | null> => {
    try {
      const { data: result, error: rpcError } = await supabase.rpc('upsert_task_assignment', {
        p_project_id: data.project_id,
        p_phase_id: data.phase_id,
        p_section_id: data.section_id,
        p_subsection_id: data.subsection_id,
        p_task_name: data.task_name,
        p_assigned_to: data.assigned_to,
        p_deadline: data.deadline,
        p_validators: data.validators,
        p_assignment_type: data.assignment_type || 'standard',
        p_file_extension: data.file_extension || 'pdf',
        p_comment: data.comment,
        p_id: (data as any).id,
        p_status: data.status || 'open',
        p_validation_deadline: data.validation_deadline
      });

      if (rpcError) throw rpcError;

      toast({
        title: "Succès",
        description: "Tâche assignée/mise à jour avec succès",
      });

      // Notifications
      try {
        const validatorIds = data.validators ? data.validators.map((v: any) => v.user_id) : [];
        await notifyStandardTaskAssigned(result.id || (data as any).id, data.assigned_to, validatorIds);
      } catch (notifError) {
        console.error('Erreur notification:', notifError);
      }

      await fetchAllTaskAssignments();
      return result;
    } catch (err) {
      console.error('Erreur upsert:', err);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la tâche",
        variant: "destructive",
      });
      return null;
    }
  }, [fetchAllTaskAssignments, toast]);

  // Créer un nouvel assignement (alias pour upsert)
  const createTaskAssignment = useCallback(async (data: CreateTaskAssignmentData): Promise<TaskAssignment | null> => {
    const validationErrors = validateTaskAssignment(data);
    if (validationErrors.length > 0) {
      toast({
        title: "Erreur de validation",
        description: validationErrors.join(', '),
        variant: "destructive",
      });
      return null;
    }
    return await upsertTaskAssignment(data);
  }, [upsertTaskAssignment, toast]);

  // Mettre à jour un assignement (alias pour upsert)
  const updateTaskAssignment = useCallback(async (data: UpdateTaskAssignmentData): Promise<any | null> => {
    // Note: Pour une mise à jour, on a besoin de toutes les infos car le RPC remplace tout
    // Si on n'a que des infos partielles, il faudrait d'abord récupérer la tâche actuelle
    return await upsertTaskAssignment(data);
  }, [upsertTaskAssignment]);

  // Supprimer un assignement (supprime la tâche centrale)
  const deleteTaskAssignment = useCallback(async (id: string): Promise<boolean> => {
    try {
      // On récupère le type pour savoir quelle table cibler
      const { data: taskInfo } = await supabase
        .from('task_assignments_view')
        .select('assignment_type')
        .eq('id', id)
        .maybeSingle();

      if (!taskInfo) throw new Error("Tâche non trouvée");

      const table = taskInfo.assignment_type === 'workflow' ? 'workflow_tasks' : 'standard_tasks';
      
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;

      toast({
        title: "Succès",
        description: "Tâche supprimée avec succès",
      });
      
      await fetchAllTaskAssignments();
      return true;
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la tâche",
        variant: "destructive",
      });
      return false;
    }
  }, [fetchAllTaskAssignments, toast]);

  // Marquer une tâche comme en cours
  const markTaskInProgress = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data: taskInfo } = await supabase
        .from('task_assignments_view')
        .select('assignment_type')
        .eq('id', id)
        .maybeSingle();

      if (!taskInfo) return false;
      const table = taskInfo.assignment_type === 'workflow' ? 'workflow_tasks' : 'standard_tasks';

      const { error } = await supabase
        .from(table)
        .update({ status: 'in_review' }) // in_review car c'est le statut suivant open
        .eq('id', id);
      
      if (!error) {
        // Notifier le rejet
        notifyValidationComplete(id, 'rejected');
        
        await fetchAllTaskAssignments();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }, [fetchAllTaskAssignments]);

  // Soumettre une tâche (crée une soumission)
  const submitTask = useCallback(async (taskId: string, userId: string, fileUrl: string, fileName: string, comment?: string): Promise<boolean> => {
    try {
      // On récupère le type de tâche
      const { data: taskInfo } = await supabase
        .from('task_assignments_view')
        .select('assignment_type')
        .eq('id', taskId)
        .maybeSingle();

      if (!taskInfo) throw new Error("Tâche non trouvée");

      if (taskInfo.assignment_type === 'workflow') {
        // GESTION WORKFLOW
        const { data: latestSub } = await supabase
          .from('workflow_task_submissions')
          .select('version')
          .eq('task_id', taskId)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextVersion = (latestSub?.version || 0) + 1;

        const { error: subError } = await supabase
          .from('workflow_task_submissions')
          .insert({
            task_id: taskId,
            executor_id: userId,
            version: nextVersion,
            file_url: fileUrl,
            file_name: fileName,
            comment: comment || ''
          });

        if (subError) throw subError;

        // Mettre à jour le statut de la tâche workflow
        await supabase
          .from('workflow_tasks')
          .update({ 
            status: 'in_review',
            current_version: nextVersion
          })
          .eq('id', taskId);
      } else {
        // GESTION STANDARD
        const { error: subError } = await supabase
          .from('standard_task_submissions')
          .insert({
            task_id: taskId,
            executor_id: userId,
            file_url: fileUrl,
            file_name: fileName,
            comment: comment || ''
          });

        if (subError) throw subError;

        // Mettre à jour le statut de la tâche standard
        await supabase
          .from('standard_tasks')
          .update({ status: 'in_review' })
          .eq('id', taskId);
        
        // Notifier les validateurs et l'admin
        notifyStandardTaskSubmission(taskId, userId);
        
        // Vérifier si tous les exécuteurs ont soumis
        const { data: statusData } = await supabase.rpc('get_task_validation_status', { p_task_id: taskId });
        if (statusData && statusData.submitted_executors === statusData.total_executors) {
          notifyAllSubmissionsReceived(taskId);
        }
      }

      toast({
        title: "Succès",
        description: "Document soumis avec succès",
      });

      await fetchAllTaskAssignments();
      return true;
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      toast({
        title: "Erreur",
        description: "Impossible de soumettre le document",
        variant: "destructive",
      });
      return false;
    }
  }, [fetchAllTaskAssignments, toast]);

  // Valider une tâche (admin bypass)
  const validateTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data: taskInfo } = await supabase
        .from('task_assignments_view')
        .select('assignment_type')
        .eq('id', id)
        .maybeSingle();

      if (!taskInfo) return false;
      const table = taskInfo.assignment_type === 'workflow' ? 'workflow_tasks' : 'standard_tasks';
      const nextStatus = taskInfo.assignment_type === 'workflow' ? 'vso' : 'approved';

      const { error } = await supabase
        .from(table)
        .update({ status: nextStatus })
        .eq('id', id);
      
      if (!error) {
        // Notifier le résultat de la validation
        notifyValidationComplete(id, nextStatus);
        
        // Si c'est clos, notifier les participants
        if (nextStatus === 'approved' || nextStatus === 'vso') {
          const { data: taskData } = await supabase.from('task_assignments_view').select('assigned_to, validators').eq('id', id).single();
          if (taskData) {
            const participantIds = [...taskData.assigned_to, ...(taskData.validators || []).map((v: any) => v.user_id)];
            notifyStandardTaskClosed(id, participantIds);
          }
        }

        await fetchAllTaskAssignments();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }, [fetchAllTaskAssignments]);

  // Rejeter une tâche (admin bypass)
  const rejectTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data: taskInfo } = await supabase
        .from('task_assignments_view')
        .select('assignment_type')
        .eq('id', id)
        .maybeSingle();

      if (!taskInfo) return false;
      const table = taskInfo.assignment_type === 'workflow' ? 'workflow_tasks' : 'standard_tasks';
      const status = taskInfo.assignment_type === 'workflow' ? 'var' : 'rejected';

      const { error } = await supabase
        .from(table)
        .update({ status })
        .eq('id', id);
      
      if (!error) {
        await fetchAllTaskAssignments();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }, [fetchAllTaskAssignments]);

  // Récupérer les assignements avec détails enrichis
  const fetchTaskAssignmentsWithDetails = useCallback(async (filters?: TaskAssignmentFilters): Promise<TaskAssignmentWithDetails[]> => {
    const assignments = await fetchAllTaskAssignments(filters);
    const enrichedAssignments: TaskAssignmentWithDetails[] = [];

    for (const assignment of assignments) {
      try {
        // Récupérer les détails des assignés
        const { data: assigneeDetails } = await supabase
          .from('profiles')
          .select('user_id, email, first_name, last_name, role, specialty')
          .in('user_id', assignment.assigned_to);

        // Récupérer les détails du projet
        const { data: projectDetails } = await supabase
          .from('projects')
          .select('id, name, description, start_date')
          .eq('id', assignment.project_id)
          .single();

        // Récupérer les détails des validateurs
        const validatorIds = assignment.validators ? assignment.validators.map((v: any) => v.user_id) : [];
        const { data: validatorDetails } = validatorIds.length > 0
          ? await supabase
              .from('profiles')
              .select('user_id, email, first_name, last_name, role, specialty')
              .in('user_id', validatorIds)
          : { data: [] };

        const enriched: TaskAssignmentWithDetails = {
          ...assignment,
          assignees: assigneeDetails ? assigneeDetails.map((profile: any) => ({
            id: profile.user_id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            role: profile.role,
            specialty: profile.specialty
          })) : [],
          project: projectDetails ? {
            id: projectDetails.id,
            name: projectDetails.name,
            description: projectDetails.description,
            start_date: projectDetails.start_date
          } : undefined,
          validator_details: validatorDetails ? validatorDetails.map((profile: any) => ({
            id: profile.user_id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            role: profile.role,
            specialty: profile.specialty
          })) : []
        };

        enrichedAssignments.push(enriched);
      } catch (err) {
        // Ajouter l'assignement sans enrichissement en cas d'erreur
        enrichedAssignments.push(assignment);
      }
    }

    return enrichedAssignments;
  }, [fetchAllTaskAssignments]);

  // Calculer les statistiques
  const getTaskAssignmentStats = useCallback((assignments?: TaskAssignment[]): TaskAssignmentStats => {
    const data = assignments || taskAssignments;
    return calculateTaskStats(data);
  }, [taskAssignments]);

  // Récupérer les tâches en retard
  const getOverdueTasks = useCallback((assignments?: TaskAssignment[]): TaskAssignment[] => {
    const data = assignments || taskAssignments;
    return data.filter(isTaskOverdue);
  }, [taskAssignments]);

  // Récupérer les tâches dues bientôt
  const getTasksDueSoon = useCallback((assignments?: TaskAssignment[]): TaskAssignment[] => {
    const data = assignments || taskAssignments;
    return data.filter(isTaskDueSoon);
  }, [taskAssignments]);

  // Vérifier si une tâche existe déjà
  const checkTaskExists = useCallback(async (
    projectId: string,
    phaseId: string,
    sectionId: string,
    subsectionId: string,
    taskName: string
  ): Promise<boolean> => {
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)
      .eq('section_id', sectionId)
      .eq('subsection_id', subsectionId)
      .eq('title', taskName);

    return !!(data && data.length > 0);
  }, []);

  return {
    // État
    taskAssignments,
    loading,
    error,
    
    // Actions de base
    fetchAllTaskAssignments,
    fetchProjectTaskAssignments,
    fetchUserTaskAssignments,
    createTaskAssignment,
    updateTaskAssignment,
    deleteTaskAssignment,
    
    // Actions spécifiques
    markTaskInProgress,
    submitTask,
    validateTask,
    rejectTask,
    
    // Données enrichies
    fetchTaskAssignmentsWithDetails,
    
    // Utilitaires
    getTaskAssignmentStats,
    getOverdueTasks,
    getTasksDueSoon,
    checkTaskExists,
    
    // Fonctions utilitaires exposées
    isTaskOverdue,
    isTaskDueSoon,
    calculateTaskStats,
    validateTaskAssignment
  };
}; 
