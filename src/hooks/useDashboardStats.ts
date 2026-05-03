import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Interface pour les statistiques du tableau de bord
export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  pendingProjects: number;
  totalIntervenants: number;
  activeIntervenants: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
}

// Interface pour les événements du calendrier
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'deadline' | 'training' | 'call';
  project_id?: string;
  description?: string;
}

// Interface pour les données du graphique
export interface ChartData {
  mois: string;
  projets: number;
}

// Interface pour les activités récentes
export interface RecentActivity {
  id: string;
  type: 'project_created' | 'project_completed' | 'task_assigned' | 'task_completed' | 'user_joined';
  title: string;
  description: string;
  timestamp: string;
  user_name?: string;
  project_name?: string;
}

export function useDashboardStats() {
  const { status } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchProjectStats = useCallback(async () => {
    if (status !== 'authenticated') return {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      pendingProjects: 0
    };
    try {
      // Récupérer tous les projets
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status, created_at');

      if (projectsError) throw projectsError;

      const totalProjects = projects?.length || 0;
      const activeProjects = projects?.filter(p => p.status === 'active' || p.status === 'in_progress')?.length || 0;
      const completedProjects = projects?.filter(p => p.status === 'completed')?.length || 0;
      const pendingProjects = projects?.filter(p => p.status === 'pending' || p.status === 'draft')?.length || 0;

      return {
        totalProjects,
        activeProjects,
        completedProjects,
        pendingProjects
      };
    } catch (error) {
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        pendingProjects: 0
      };
    }
  }, []);

  const fetchIntervenantStats = useCallback(async () => {
    if (status !== 'authenticated') return {
      totalIntervenants: 0,
      activeIntervenants: 0
    };
    try {
      // Récupérer depuis la table profiles
      let users: any[] = [];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, role, specialty');

      if (!profilesError && profilesData && profilesData.length > 0) {
        users = profilesData;
      }

      // Si toujours pas de données, essayer avec les assignations réelles via la vue
      if (users.length === 0) {
        // Récupérer les utilisateurs uniques depuis task_assignments_view
        const { data: taskUsers, error: taskError } = await supabase
          .from('task_assignments_view')
          .select('user_id');

        if (!taskError && taskUsers) {
          // Compter les utilisateurs uniques
          const uniqueUsers = new Set(taskUsers.map(t => t.user_id));
          users = Array.from(uniqueUsers).map(id => ({ id, role: 'intervenant' }));
        }
      }

      // Filtrer les intervenants (excluant les admins)
      const intervenants = users.filter(u => 
        u.role !== 'admin' && 
        u.specialty !== 'admin' &&
        u.id // Assurez-vous qu'il y a un ID
      );
      
      const totalIntervenants = intervenants.length;
      // Pour l'instant, considérer tous les intervenants comme actifs
      const activeIntervenants = totalIntervenants;

      return {
        totalIntervenants,
        activeIntervenants
      };
    } catch (error) {
      return {
        totalIntervenants: 0,
        activeIntervenants: 0
      };
    }
  }, []);

  const fetchTaskStats = useCallback(async () => {
    if (status !== 'authenticated') return {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0
    };
    try {
      // Récupérer toutes les tâches depuis la vue unifiée
      const { data: tasks, error: tasksError } = await supabase
        .from('task_assignments_view')
        .select('id, status, deadline, created_at');

      if (tasksError) throw tasksError;

      const totalTasks = tasks?.length || 0;
      // Statuts de succès selon le type (approved pour parallel, vso/vao pour sequential)
      const completedStatuses = ['approved', 'vso', 'vao'];
      const completedTasks = tasks?.filter(t => completedStatuses.includes(t.status))?.length || 0;
      const pendingTasks = tasks?.filter(t => t.status === 'open' || t.status === 'in_review' || t.status === 'var')?.length || 0;
      
      // Calculer les tâches en retard (deadline dépassée et pas encore validées)
      const now = new Date();
      const overdueTasks = tasks?.filter(t => 
        t.deadline && 
        new Date(t.deadline) < now && 
        !completedStatuses.includes(t.status)
      )?.length || 0;

      return {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks
      };
    } catch (error) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0
      };
    }
  }, []);

  const fetchUpcomingEvents = useCallback(async () => {
    if (status !== 'authenticated') return [];
    try {
      // Récupérer les projets avec des dates importantes
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, deadline, status')
        .not('deadline', 'is', null)
        .gt('deadline', new Date().toISOString())
        .order('deadline', { ascending: true })
        .limit(5);

      if (projectsError) throw projectsError;

      let events: CalendarEvent[] = projects?.map(project => ({
        id: project.id,
        title: `Livraison: ${project.name}`,
        date: project.deadline,
        type: 'deadline' as const,
        project_id: project.id,
        description: `Date limite pour le projet ${project.name}`
      })) || [];

      // Récupérer les tâches (pour le calendrier)
      const { data: tasks, error: tasksError } = await supabase
        .from('task_assignments_view')
        .select('id, task_name, deadline, project_id, comment')
        .order('deadline', { ascending: true });

      if (!tasksError && tasks) {
        const taskEvents: CalendarEvent[] = tasks
          .filter(task => task.deadline)
          .map(task => ({
            id: task.id,
            title: task.task_name,
            date: task.deadline!,
            type: 'deadline' as const,
            project_id: task.project_id,
            description: task.comment || `Échéance de la tâche: ${task.task_name}`
          }));
        events = [...events, ...taskEvents];
      }

      // Trier tous les événements par date
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return events.slice(0, 5); // Limiter à 5 événements
    } catch (error) {
      return [];
    }
  }, []);

  const fetchChartData = useCallback(async () => {
    if (status !== 'authenticated') return [];
    try {
      // Récupérer les tâches terminées dans les 12 derniers mois
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const completedStatuses = ['approved', 'vso', 'vao'];

      const { data: tasks, error: tasksError } = await supabase
        .from('task_assignments_view')
        .select('updated_at, status')
        .in('status', completedStatuses)
        .not('updated_at', 'is', null)
        .gt('updated_at', oneYearAgo.toISOString());

      if (tasksError) throw tasksError;

      // Grouper par mois
      const monthCounts: { [key: string]: number } = {};
      const months = [
        'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
        'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
      ];

      // Initialiser tous les mois à 0
      months.forEach(month => {
        monthCounts[month] = 0;
      });

      // Compter les tâches terminées par mois
      tasks?.forEach(task => {
        const date = new Date(task.updated_at);
        const monthIndex = date.getMonth();
        const monthName = months[monthIndex];
        monthCounts[monthName]++;
      });

      const chartData: ChartData[] = months.map(month => ({
        mois: month,
        projets: monthCounts[month] // Garder le nom "projets" pour la compatibilité avec le graphique
      }));

      return chartData;
    } catch (error) {
      return [];
    }
  }, []);

  const fetchRecentActivities = useCallback(async () => {
    if (status !== 'authenticated') return [];
    try {
      const activities: RecentActivity[] = [];

      // Récupérer les projets récents
      const { data: recentProjects } = await supabase
        .from('projects')
        .select('id, name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentProjects) {
        recentProjects.forEach(project => {
          activities.push({
            id: `project_${project.id}`,
            type: project.status === 'completed' ? 'project_completed' : 'project_created',
            title: project.status === 'completed' ? 'Projet terminé' : 'Nouveau projet',
            description: `${project.name}`,
            timestamp: project.created_at,
            project_name: project.name
          });
        });
      }

      // Récupérer les tâches récentes via la vue pour avoir le nom du projet
      const { data: recentTasks } = await supabase
        .from('task_assignments_view')
        .select('id, task_name, status, created_at, project_name')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentTasks) {
        const completedStatuses = ['approved', 'vso', 'vao'];
        recentTasks.forEach(task => {
          activities.push({
            id: `task_${task.id}`,
            type: completedStatuses.includes(task.status) ? 'task_completed' : 'task_assigned',
            title: completedStatuses.includes(task.status) ? 'Tâche terminée' : 'Nouvelle tâche',
            description: `${task.task_name}`,
            timestamp: task.created_at,
            project_name: task.project_name
          });
        });
      }

      // Trier par date décroissante
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities.slice(0, 5);
    } catch (error) {
      return [];
    }
  }, []);

  const fetchAllData = useCallback(async (silent = false) => {
    if (status !== 'authenticated') return;
    
    if (!silent) setLoading(true);
    setError(null);

    try {
      const [projStats, userStats, taskStats, upcomingEvents, recentAct, chartStats] = await Promise.all([
        fetchProjectStats(),
        fetchIntervenantStats(),
        fetchTaskStats(),
        fetchUpcomingEvents(),
        fetchRecentActivities(),
        fetchChartData()
      ]);

      setStats({
        ...projStats,
        ...userStats,
        ...taskStats
      });
      setEvents(upcomingEvents);
      setRecentActivities(recentAct);
      setChartData(chartStats);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError("Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }, [status, fetchProjectStats, fetchIntervenantStats, fetchTaskStats, fetchUpcomingEvents, fetchRecentActivities, fetchChartData]);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Realtime subscription for dashboard
  useEffect(() => {
    if (status !== 'authenticated') return;

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'standard_tasks' }, () => fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_tasks' }, () => fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchAllData(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status, fetchAllData]);

  return {
    stats,
    events,
    chartData,
    recentActivities,
    loading,
    error,
    lastUpdate,
    refetch: fetchAllData
  };
} 