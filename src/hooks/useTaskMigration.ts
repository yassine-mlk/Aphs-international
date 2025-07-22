// Hook pour la migration des tâches legacy vers le nouveau système

import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { ProjectTask } from '../types/project';
import { LegacyTaskAssignment, convertProjectTaskToLegacy } from '../types/legacy-migration';

// Interface pour les tâches de la table task_assignments
interface TaskAssignment {
  id: string;
  project_id: string;
  phase_id: string;
  section_id: string;
  subsection_id: string;
  task_name: string;
  assigned_to: string;
  deadline: string;
  validation_deadline: string;
  validators: string[];
  file_extension: string;
  comment?: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'validated' | 'rejected';
  created_at?: string;
  updated_at?: string;
  file_url?: string;
  validation_comment?: string;
  submitted_at?: string;
  validated_at?: string;
  validated_by?: string;
  project?: {
    id: string;
    name: string;
  };
}

export interface UseTaskMigrationReturn {
  loading: boolean;
  error: string | null;
  fetchLegacyTasks: (userId?: string) => Promise<LegacyTaskAssignment[]>;
  fetchTasksForUser: (userId: string) => Promise<LegacyTaskAssignment[]>;
  fetchAllTasks: () => Promise<LegacyTaskAssignment[]>;
  updateTaskStatus: (taskId: string, status: ProjectTask['status'], comments?: string) => Promise<boolean>;
}

export const useTaskMigration = (): UseTaskMigrationReturn => {
  const { fetchData, updateData } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour convertir TaskAssignment vers LegacyTaskAssignment
  const convertTaskAssignmentToLegacy = (task: TaskAssignment): LegacyTaskAssignment => {
    return {
      id: task.id,
      project_id: task.project_id,
      task_name: task.task_name,
      phase_id: task.phase_id,
      section_id: task.section_id,
      subsection_id: task.subsection_id,
      assigned_to: task.assigned_to,
      deadline: task.deadline,
      validation_deadline: task.validation_deadline,
      validators: task.validators || [],
      file_extension: task.file_extension,
      comment: task.comment,
      status: task.status,
      created_at: task.created_at,
      updated_at: task.updated_at,
      file_url: task.file_url,
      validation_comment: task.validation_comment,
      submitted_at: task.submitted_at,
      validated_at: task.validated_at,
      validated_by: task.validated_by,
      project: task.project
    };
  };

  // Fonction pour récupérer les tâches depuis task_assignments
  const fetchLegacyTasks = useCallback(async (userId?: string): Promise<LegacyTaskAssignment[]> => {
    setLoading(true);
    setError(null);
    
    try {
      let filters = [];
      if (userId) {
        filters.push({ column: 'assigned_to', operator: 'eq', value: userId });
      }

      // Récupérer les tâches depuis task_assignments avec les informations du projet
      const taskAssignments = await fetchData<TaskAssignment>('task_assignments', {
        columns: '*',
        filters: filters.length > 0 ? filters : undefined,
        order: { column: 'created_at', ascending: false }
      });

      // Récupérer les informations des projets
      const projectIds = Array.from(new Set(taskAssignments.map(task => task.project_id)));
      let projectsMap: Record<string, { id: string; name: string }> = {};
      
      if (projectIds.length > 0) {
        const projects = await fetchData<{ id: string; name: string }>('projects', {
          columns: 'id,name',
          filters: [{ column: 'id', operator: 'in', value: projectIds }]
        });
        
        projectsMap = projects.reduce((acc, project) => {
          acc[project.id] = project;
          return acc;
        }, {} as Record<string, { id: string; name: string }>);
      }

      // Ajouter les informations du projet aux tâches et convertir au format legacy
      const legacyTasks = taskAssignments.map(task => {
        const taskWithProject = {
          ...task,
          project: projectsMap[task.project_id]
        };
        return convertTaskAssignmentToLegacy(taskWithProject);
      });
      
      return legacyTasks;
    } catch (err) {
      console.error('Erreur lors de la récupération des tâches:', err);
      setError('Impossible de charger les tâches');
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // Fonction spécifique pour récupérer les tâches d'un utilisateur
  const fetchTasksForUser = useCallback(async (userId: string): Promise<LegacyTaskAssignment[]> => {
    setLoading(true);
    setError(null);
    
    try {
      // Récupérer les tâches assignées à l'utilisateur depuis task_assignments
      const assignedTasks = await fetchData<TaskAssignment>('task_assignments', {
        columns: '*',
        filters: [{ column: 'assigned_to', operator: 'eq', value: userId }],
        order: { column: 'created_at', ascending: false }
      });

      // Récupérer toutes les tâches pour filtrer celles où l'utilisateur est validateur
      const allTasks = await fetchData<TaskAssignment>('task_assignments', {
        columns: '*',
        order: { column: 'created_at', ascending: false }
      });

      // Filtrer les tâches où l'utilisateur est validateur
      const validatorTasks = allTasks.filter(task => 
        task.validators && task.validators.includes(userId)
      );

      // Combiner les tâches en évitant les doublons
      const userTasks = [...assignedTasks];
      
      validatorTasks.forEach(validatorTask => {
        if (!userTasks.some(task => task.id === validatorTask.id)) {
          userTasks.push(validatorTask);
        }
      });

      // Récupérer les informations des projets
      const projectIds = Array.from(new Set(userTasks.map(task => task.project_id)));
      let projectsMap: Record<string, { id: string; name: string }> = {};
      
      if (projectIds.length > 0) {
        const projects = await fetchData<{ id: string; name: string }>('projects', {
          columns: 'id,name',
          filters: [{ column: 'id', operator: 'in', value: projectIds }]
        });
        
        projectsMap = projects.reduce((acc, project) => {
          acc[project.id] = project;
          return acc;
        }, {} as Record<string, { id: string; name: string }>);
      }

      // Ajouter les informations du projet aux tâches et convertir au format legacy
      const legacyTasks = userTasks.map(task => {
        const taskWithProject = {
          ...task,
          project: projectsMap[task.project_id]
        };
        return convertTaskAssignmentToLegacy(taskWithProject);
      });
      
      return legacyTasks;
    } catch (err) {
      console.error('Erreur lors de la récupération des tâches utilisateur:', err);
      setError('Impossible de charger les tâches de l\'utilisateur');
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // Fonction pour récupérer toutes les tâches
  const fetchAllTasks = useCallback(async (): Promise<LegacyTaskAssignment[]> => {
    return fetchLegacyTasks();
  }, [fetchLegacyTasks]);

  // Fonction pour mettre à jour le statut d'une tâche
  const updateTaskStatus = useCallback(async (
    taskId: string, 
    status: ProjectTask['status'], 
    comments?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Mapping des statuts entre project_tasks et task_assignments
      const statusMapping: Record<ProjectTask['status'], TaskAssignment['status']> = {
        'assigned': 'assigned',
        'in_progress': 'in_progress',
        'submitted': 'submitted',
        'validated': 'validated',
        'rejected': 'rejected'
      };

      const mappedStatus = statusMapping[status];
      
      const updateData_obj: Partial<TaskAssignment> & { id: string } = {
        id: taskId,
        status: mappedStatus,
        updated_at: new Date().toISOString()
      };

      // Ajouter des champs spécifiques selon le statut
      switch (mappedStatus) {
        case 'submitted':
          updateData_obj.submitted_at = new Date().toISOString();
          if (comments) {
            updateData_obj.comment = comments;
          }
          break;
        case 'validated':
          updateData_obj.validated_at = new Date().toISOString();
          if (comments) {
            updateData_obj.validation_comment = comments;
          }
          break;
        case 'rejected':
          updateData_obj.validated_at = new Date().toISOString();
          if (comments) {
            updateData_obj.validation_comment = comments;
          }
          break;
      }

      const result = await updateData('task_assignments', updateData_obj);
      return !!result;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la tâche:', err);
      setError('Impossible de mettre à jour la tâche');
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateData]);

  return {
    loading,
    error,
    fetchLegacyTasks,
    fetchTasksForUser,
    fetchAllTasks,
    updateTaskStatus
  };
}; 