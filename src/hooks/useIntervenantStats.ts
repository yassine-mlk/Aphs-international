import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from './useSupabase';
import { useToast } from '@/components/ui/use-toast';

// Types pour les données de l'intervenant
interface IntervenantTask {
  id: string;
  task_name: string;
  status: 'pending' | 'in_progress' | 'validated' | 'rejected';
  deadline: string;
  validation_deadline: string;
  project_id: string;
  project_name: string;
  phase_id: string;
  section_id: string;
  subsection_id: string;
  created_at: string;
  assigned_at: string;
  completed_at?: string;
  comment?: string;
}

interface RecentActivity {
  id: string;
  type: 'task_assigned' | 'task_completed' | 'task_validated' | 'project_joined';
  title: string;
  description: string;
  date: string;
  project_name?: string;
  task_name?: string;
}

interface IntervenantProject {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date?: string;
  total_tasks: number;
  completed_tasks: number;
  progress: number;
}

interface IntervenantStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  validatedTasks: number;
  overdueTasks: number;
  completionRate: number;
  totalProjects: number;
  activeProjects: number;
}

export function useIntervenantStats() {
  const { user } = useAuth();
  const { fetchData, supabase } = useSupabase();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<IntervenantStats | null>(null);
  const [tasks, setTasks] = useState<IntervenantTask[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [projects, setProjects] = useState<IntervenantProject[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Récupérer les tâches de l'intervenant
  const fetchTasks = useCallback(async () => {
    if (!user?.id) return [];

    try {
      // Récupérer d'abord les task_assignments
      const { data: tasks, error: taskError } = await supabase
        .from('task_assignments')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (taskError) throw taskError;

      // Récupérer les projets séparément
      const projectIds = [...new Set(tasks?.map(t => t.project_id).filter(Boolean))];
      if (projectIds.length === 0) return tasks || [];

      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);

      if (projectError) throw projectError;

      // Combiner les données
      const projectMap = new Map(projects?.map(p => [p.id, p.name]) || []);
      return (tasks || []).map(task => ({
        ...task,
        project_name: projectMap.get(task.project_id) || 'Projet inconnu'
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des tâches:', error);
      return [];
    }
  }, [user?.id, supabase]);

  // Récupérer les projets de l'intervenant
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return [];

    try {
      // Récupérer les projets via les tâches assignées
      const { data: taskData, error: taskError } = await supabase
        .from('task_assignments')
        .select('project_id, status')
        .eq('assigned_to', user.id);

      if (taskError) throw taskError;

      // Récupérer les projets séparément
      const projectIds = [...new Set(taskData?.map(t => t.project_id).filter(Boolean))];
      if (projectIds.length === 0) return [];

      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('id, name, description, status, start_date, end_date')
        .in('id', projectIds);

      if (projectError) throw projectError;

       // Grouper par projet et calculer les statistiques
       const projectMap = new Map();
       
       if (taskData && projects) {
         // Créer une map des projets par ID
         const projectsById = new Map(projects.map(p => [p.id, p]));
         
         for (const task of taskData) {
           const project = projectsById.get(task.project_id);
           if (!project) continue;

           if (!projectMap.has(project.id)) {
             projectMap.set(project.id, {
               ...project,
               total_tasks: 0,
               completed_tasks: 0
             });
           }

           const projectData = projectMap.get(project.id);
           projectData.total_tasks++;
           
           // Compter les tâches complétées/validées
           if (task.status === 'validated' || task.status === 'completed') {
             projectData.completed_tasks++;
           }
         }
       }

      // Calculer la progression et formater les résultats
      return Array.from(projectMap.values()).map(project => ({
        ...project,
        progress: project.total_tasks > 0 
          ? Math.round((project.completed_tasks / project.total_tasks) * 100)
          : 0
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des projets:', error);
      return [];
    }
  }, [user?.id, supabase]);

  // Générer les activités récentes
  const generateRecentActivities = useCallback((tasks: IntervenantTask[], projects: IntervenantProject[]) => {
    const activities: RecentActivity[] = [];

    // Activités basées sur les tâches
    tasks.slice(0, 10).forEach(task => {
      // Tâche assignée
      activities.push({
        id: `task_assigned_${task.id}`,
        type: 'task_assigned',
        title: 'Nouvelle tâche assignée',
        description: `${task.task_name} dans le projet ${task.project_name}`,
        date: task.assigned_at || task.created_at,
        project_name: task.project_name,
        task_name: task.task_name
      });

      // Tâche complétée
      if (task.completed_at && task.status === 'validated') {
        activities.push({
          id: `task_completed_${task.id}`,
          type: 'task_validated',
          title: 'Tâche validée',
          description: `${task.task_name} a été validée`,
          date: task.completed_at,
          project_name: task.project_name,
          task_name: task.task_name
        });
      }
    });

    // Activités basées sur les projets (adhésion aux projets)
    projects.forEach(project => {
      activities.push({
        id: `project_joined_${project.id}`,
        type: 'project_joined',
        title: 'Assigné à un projet',
        description: `Vous avez été assigné au projet ${project.name}`,
        date: project.start_date,
        project_name: project.name
      });
    });

    // Trier par date décroissante et prendre les 15 plus récentes
    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);
  }, []);

  // Calculer les statistiques
  const calculateStats = useCallback((tasks: IntervenantTask[], projects: IntervenantProject[]): IntervenantStats => {
    const now = new Date();
    
    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const completedTasks = tasks.filter(t => t.status === 'validated').length;
    const validatedTasks = completedTasks; // Même chose pour l'instant
    
    // Tâches en retard (deadline dépassée et pas encore validées)
    const overdueTasks = tasks.filter(t => {
      return t.status !== 'validated' && new Date(t.deadline) < now;
    }).length;

    // Taux de completion
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;

    return {
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      validatedTasks,
      overdueTasks,
      completionRate,
      totalProjects,
      activeProjects
    };
  }, []);

  // Charger toutes les données
  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [tasksData, projectsData] = await Promise.all([
        fetchTasks(),
        fetchProjects()
      ]);

      setTasks(tasksData);
      setProjects(projectsData);
      
      const calculatedStats = calculateStats(tasksData, projectsData);
      setStats(calculatedStats);

      const activities = generateRecentActivities(tasksData, projectsData);
      setRecentActivities(activities);

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setError('Impossible de charger les données');
      toast({
        title: "Erreur",
        description: "Impossible de charger vos données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchTasks, fetchProjects, calculateStats, generateRecentActivities, toast]);

  // Actualiser les données
  const refetch = useCallback(() => {
    loadData();
  }, [loadData]);

  // Charger les données au montage du composant
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    loading,
    error,
    stats,
    tasks: tasks.slice(0, 10), // Limiter à 10 tâches récentes
    recentActivities,
    projects,
    refetch
  };
} 