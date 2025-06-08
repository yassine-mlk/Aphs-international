// Hook pour gérer les assignements de tâches
// Basé sur les fonctions existantes dans ProjectDetails.tsx

import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
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

export const useTaskAssignments = () => {
  const { fetchData, insertData, updateData, deleteData, getUsers } = useSupabase();
  const { toast } = useToast();
  
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupérer tous les assignements de tâches
  const fetchAllTaskAssignments = useCallback(async (filters?: TaskAssignmentFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryFilters: any[] = [];
      
      if (filters?.project_id) {
        queryFilters.push({ column: 'project_id', operator: 'eq', value: filters.project_id });
      }
      if (filters?.phase_id) {
        queryFilters.push({ column: 'phase_id', operator: 'eq', value: filters.phase_id });
      }
      if (filters?.section_id) {
        queryFilters.push({ column: 'section_id', operator: 'eq', value: filters.section_id });
      }
      if (filters?.assigned_to) {
        queryFilters.push({ column: 'assigned_to', operator: 'eq', value: filters.assigned_to });
      }
      if (filters?.status) {
        queryFilters.push({ column: 'status', operator: 'eq', value: filters.status });
      }
      if (filters?.deadline_from) {
        queryFilters.push({ column: 'deadline', operator: 'gte', value: filters.deadline_from });
      }
      if (filters?.deadline_to) {
        queryFilters.push({ column: 'deadline', operator: 'lte', value: filters.deadline_to });
      }

      const data = await fetchData<TaskAssignment>('task_assignments', {
        columns: '*',
        filters: queryFilters.length > 0 ? queryFilters : undefined,
        order: { column: 'deadline', ascending: true }
      });

      let filteredData = data || [];

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
      console.error('Erreur fetchAllTaskAssignments:', err);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchData, toast]);

  // Récupérer les assignements d'un projet spécifique
  const fetchProjectTaskAssignments = useCallback(async (projectId: string) => {
    return await fetchAllTaskAssignments({ project_id: projectId });
  }, [fetchAllTaskAssignments]);

  // Récupérer les assignements d'un intervenant spécifique
  const fetchUserTaskAssignments = useCallback(async (userId: string) => {
    return await fetchAllTaskAssignments({ assigned_to: userId });
  }, [fetchAllTaskAssignments]);

  // Créer un nouvel assignement
  const createTaskAssignment = useCallback(async (data: CreateTaskAssignmentData): Promise<TaskAssignment | null> => {
    // Validation des données
    const validationErrors = validateTaskAssignment(data);
    if (validationErrors.length > 0) {
      toast({
        title: "Erreur de validation",
        description: validationErrors.join(', '),
        variant: "destructive",
      });
      return null;
    }

    // Vérifier si la tâche est déjà assignée
    const existingAssignment = await fetchData<TaskAssignment>('task_assignments', {
      columns: '*',
      filters: [
        { column: 'project_id', operator: 'eq', value: data.project_id },
        { column: 'phase_id', operator: 'eq', value: data.phase_id },
        { column: 'section_id', operator: 'eq', value: data.section_id },
        { column: 'subsection_id', operator: 'eq', value: data.subsection_id },
        { column: 'task_name', operator: 'eq', value: data.task_name }
      ]
    });

    if (existingAssignment && existingAssignment.length > 0) {
      toast({
        title: "Erreur",
        description: "Cette tâche est déjà assignée",
        variant: "destructive",
      });
      return null;
    }

    try {
      const assignmentData = {
        ...data,
        status: 'assigned' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await insertData('task_assignments', assignmentData);
      
      if (result) {
        toast({
          title: "Succès",
          description: "Tâche assignée avec succès",
        });
        
        // Actualiser la liste locale
        await fetchAllTaskAssignments();
        return result;
      }
      return null;
    } catch (err) {
      console.error('Erreur createTaskAssignment:', err);
      toast({
        title: "Erreur",
        description: "Impossible d'assigner la tâche",
        variant: "destructive",
      });
      return null;
    }
  }, [fetchData, insertData, toast, fetchAllTaskAssignments]);

  // Mettre à jour un assignement
  const updateTaskAssignment = useCallback(async (data: UpdateTaskAssignmentData): Promise<any | null> => {
    try {
      const updatePayload = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const result = await updateData('task_assignments', updatePayload);
      
      if (result) {
        toast({
          title: "Succès",
          description: "Assignement mis à jour avec succès",
        });
        
        // Actualiser la liste locale
        await fetchAllTaskAssignments();
        return result;
      }
      return null;
    } catch (err) {
      console.error('Erreur updateTaskAssignment:', err);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'assignement",
        variant: "destructive",
      });
      return null;
    }
  }, [updateData, toast, fetchAllTaskAssignments]);

  // Supprimer un assignement (désassigner)
  const deleteTaskAssignment = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await deleteData('task_assignments', id);
      
      if (success) {
        toast({
          title: "Succès",
          description: "Tâche désassignée avec succès",
        });
        
        // Actualiser la liste locale
        await fetchAllTaskAssignments();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erreur deleteTaskAssignment:', err);
      toast({
        title: "Erreur",
        description: "Impossible de désassigner la tâche",
        variant: "destructive",
      });
      return false;
    }
  }, [deleteData, toast, fetchAllTaskAssignments]);

  // Marquer une tâche comme en cours
  const markTaskInProgress = useCallback(async (id: string): Promise<boolean> => {
    return await updateTaskAssignment({
      id,
      status: 'in_progress'
    }) !== null;
  }, [updateTaskAssignment]);

  // Soumettre une tâche
  const submitTask = useCallback(async (id: string, fileUrl: string): Promise<boolean> => {
    return await updateTaskAssignment({
      id,
      status: 'submitted',
      file_url: fileUrl,
      submitted_at: new Date().toISOString()
    }) !== null;
  }, [updateTaskAssignment]);

  // Valider une tâche (admin)
  const validateTask = useCallback(async (id: string, validatedBy: string, validationComment?: string): Promise<boolean> => {
    return await updateTaskAssignment({
      id,
      status: 'validated',
      validated_by: validatedBy,
      validated_at: new Date().toISOString(),
      validation_comment: validationComment
    }) !== null;
  }, [updateTaskAssignment]);

  // Rejeter une tâche (admin)
  const rejectTask = useCallback(async (id: string, validatedBy: string, validationComment: string): Promise<boolean> => {
    return await updateTaskAssignment({
      id,
      status: 'rejected',
      validated_by: validatedBy,
      validated_at: new Date().toISOString(),
      validation_comment: validationComment
    }) !== null;
  }, [updateTaskAssignment]);

  // Récupérer les assignements avec détails enrichis
  const fetchTaskAssignmentsWithDetails = useCallback(async (filters?: TaskAssignmentFilters): Promise<TaskAssignmentWithDetails[]> => {
    const assignments = await fetchAllTaskAssignments(filters);
    const enrichedAssignments: TaskAssignmentWithDetails[] = [];

    for (const assignment of assignments) {
      try {
        // Récupérer les détails de l'assigné
        const assigneeDetails = await fetchData<any>('profiles', {
          columns: 'user_id, email, first_name, last_name, role, specialty',
          filters: [{ column: 'user_id', operator: 'eq', value: assignment.assigned_to }]
        });

        // Récupérer les détails du projet
        const projectDetails = await fetchData<any>('projects', {
          columns: 'id, name, description, start_date',
          filters: [{ column: 'id', operator: 'eq', value: assignment.project_id }]
        });

        // Récupérer les détails des validateurs
        const validatorPromises = assignment.validators.map(validatorId =>
          fetchData<any>('profiles', {
            columns: 'user_id, email, first_name, last_name, role, specialty',
            filters: [{ column: 'user_id', operator: 'eq', value: validatorId }]
          })
        );
        const validatorResults = await Promise.all(validatorPromises);

        const enriched: TaskAssignmentWithDetails = {
          ...assignment,
          assignee: assigneeDetails?.[0] ? {
            id: assigneeDetails[0].user_id,
            email: assigneeDetails[0].email,
            first_name: assigneeDetails[0].first_name,
            last_name: assigneeDetails[0].last_name,
            role: assigneeDetails[0].role,
            specialty: assigneeDetails[0].specialty
          } : undefined,
          project: projectDetails?.[0] ? {
            id: projectDetails[0].id,
            name: projectDetails[0].name,
            description: projectDetails[0].description,
            start_date: projectDetails[0].start_date
          } : undefined,
          validator_details: validatorResults.filter(result => result && result.length > 0).map(result => ({
            id: result[0].user_id,
            email: result[0].email,
            first_name: result[0].first_name,
            last_name: result[0].last_name,
            role: result[0].role,
            specialty: result[0].specialty
          }))
        };

        enrichedAssignments.push(enriched);
      } catch (err) {
        console.error('Erreur lors de l\'enrichissement des données:', err);
        // Ajouter l'assignement sans enrichissement en cas d'erreur
        enrichedAssignments.push(assignment);
      }
    }

    return enrichedAssignments;
  }, [fetchAllTaskAssignments, fetchData]);

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
  ): Promise<TaskAssignment | null> => {
    try {
      const existing = await fetchData<TaskAssignment>('task_assignments', {
        columns: '*',
        filters: [
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'phase_id', operator: 'eq', value: phaseId },
          { column: 'section_id', operator: 'eq', value: sectionId },
          { column: 'subsection_id', operator: 'eq', value: subsectionId },
          { column: 'task_name', operator: 'eq', value: taskName }
        ]
      });

      return existing && existing.length > 0 ? existing[0] : null;
    } catch (err) {
      console.error('Erreur checkTaskExists:', err);
      return null;
    }
  }, [fetchData]);

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