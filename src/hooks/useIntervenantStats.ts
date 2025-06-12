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
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          *,
          projects!inner(name)
        `)
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(task => ({
        ...task,
        project_name: task.projects?.name || 'Projet inconnu'
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
         .select(`
           project_id,
           status,
           projects!inner(id, name, description, status, start_date, end_date)
         `)
         .eq('assigned_to', user.id);

       if (taskError) throw taskError;

       // Grouper par projet et calculer les statistiques
       const projectMap = new Map();
       
       if (taskData) {
         for (const task of taskData) {
           const project = task.projects;
           if (!project || !Array.isArray(project) || project.length === 0) continue;
           
           const projectInfo = project[0]; // Prendre le premier projet de la liste

           if (!projectMap.has(projectInfo.id)) {
             projectMap.set(projectInfo.id, {
               ...projectInfo,
               total_tasks: 0,
               completed_tasks: 0
             });
           }

           const projectData = projectMap.get(projectInfo.id);
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