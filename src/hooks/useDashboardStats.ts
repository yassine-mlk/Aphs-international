import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

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
  type: 'meeting' | 'deadline' | 'training' | 'call';
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchProjectStats = useCallback(async () => {
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
      console.error('Erreur lors de la récupération des statistiques de projets:', error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        pendingProjects: 0
      };
    }
  }, []);

  const fetchIntervenantStats = useCallback(async () => {
    try {
      // Récupérer depuis la table profiles
      let users: any[] = [];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, specialty');

      if (!profilesError && profilesData && profilesData.length > 0) {
        users = profilesData;
      }

      // Si toujours pas de données, essayer avec auth.users via RPC ou la table des utilisateurs
      if (users.length === 0) {
        // Récupérer les utilisateurs qui ont été créés et sont actifs
        const { data: taskUsers, error: taskError } = await supabase
          .from('task_assignments')
          .select('assigned_to')
          .not('assigned_to', 'is', null);

        if (!taskError && taskUsers) {
          // Compter les utilisateurs uniques qui ont des tâches assignées
          const uniqueUsers = new Set(taskUsers.map(t => t.assigned_to));
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
      console.error('Erreur lors de la récupération des statistiques d\'intervenants:', error);
      return {
        totalIntervenants: 0,
        activeIntervenants: 0
      };
    }
  }, []);

  const fetchTaskStats = useCallback(async () => {
    try {
      // Récupérer toutes les tâches assignées
      const { data: tasks, error: tasksError } = await supabase
        .from('task_assignments')
        .select('id, status, deadline, created_at');

      if (tasksError) throw tasksError;

      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'validated')?.length || 0;
      const pendingTasks = tasks?.filter(t => t.status === 'assigned' || t.status === 'in_progress')?.length || 0;
      
      // Calculer les tâches en retard (deadline dépassée et pas encore validées)
      const now = new Date();
      const overdueTasks = tasks?.filter(t => 
        t.deadline && 
        new Date(t.deadline) < now && 
        t.status !== 'validated'
      )?.length || 0;

      return {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques de tâches:', error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0
      };
    }
  }, []);

  const fetchUpcomingEvents = useCallback(async () => {
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

      // Récupérer aussi les réunions programmées
      const { data: meetings, error: meetingsError } = await supabase
        .from('video_meetings')
        .select('id, title, scheduled_time, description')
        .eq('status', 'scheduled')
        .gt('scheduled_time', new Date().toISOString())
        .order('scheduled_time', { ascending: true })
        .limit(3);

      if (!meetingsError && meetings) {
        const meetingEvents: CalendarEvent[] = meetings.map(meeting => ({
          id: meeting.id,
          title: meeting.title,
          date: meeting.scheduled_time,
          type: 'meeting' as const,
          description: meeting.description || `Réunion: ${meeting.title}`
        }));
        events = [...events, ...meetingEvents];
      }

      // Trier tous les événements par date
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return events.slice(0, 5); // Limiter à 5 événements
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      return [];
    }
  }, []);

  const fetchChartData = useCallback(async () => {
    try {
      // Récupérer les tâches terminées dans les 12 derniers mois
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data: tasks, error: tasksError } = await supabase
        .from('task_assignments')
        .select('validated_at, status')
        .eq('status', 'validated')
        .not('validated_at', 'is', null)
        .gt('validated_at', oneYearAgo.toISOString());

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
        const date = new Date(task.validated_at);
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
      console.error('Erreur lors de la récupération des données du graphique:', error);
      return [];
    }
  }, []);

  const fetchRecentActivities = useCallback(async () => {
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

      // Récupérer les tâches récentes
      const { data: recentTasks } = await supabase
        .from('task_assignments')
        .select('id, task_name, status, created_at, project_id')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentTasks) {
        // Récupérer les noms des projets séparément
        const projectIds = recentTasks.map(task => task.project_id).filter(Boolean);
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);

        recentTasks.forEach(task => {
          const project = projects?.find(p => p.id === task.project_id);
          activities.push({
            id: `task_${task.id}`,
            type: task.status === 'validated' ? 'task_completed' : 'task_assigned',
            title: task.status === 'validated' ? 'Tâche terminée' : 'Nouvelle tâche',
            description: `${task.task_name}`,
            timestamp: task.created_at,
            project_name: project?.name
          });
        });
      }

      // Trier par date décroissante
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities.slice(0, 5);
    } catch (error) {
      console.error('Erreur lors de la récupération des activités récentes:', error);
      return [];
    }
  }, []);

  const fetchAllStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [projectStats, intervenantStats, taskStats, upcomingEvents, chartData, recentActivities] = await Promise.all([
        fetchProjectStats(),
        fetchIntervenantStats(),
        fetchTaskStats(),
        fetchUpcomingEvents(),
        fetchChartData(),
        fetchRecentActivities()
      ]);

      const combinedStats: DashboardStats = {
        ...projectStats,
        ...intervenantStats,
        ...taskStats
      };

      setStats(combinedStats);
      setEvents(upcomingEvents);
      setChartData(chartData);
      setRecentActivities(recentActivities);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      setError('Impossible de charger les statistiques du tableau de bord');
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques du tableau de bord",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchProjectStats, fetchIntervenantStats, fetchTaskStats, fetchUpcomingEvents, fetchChartData, fetchRecentActivities, toast]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchAllStats();
    
    const interval = setInterval(() => {
      fetchAllStats();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [fetchAllStats]);

  // Real-time subscriptions for important changes
  useEffect(() => {
    // Subscribe to projects changes
    const projectsSubscription = supabase
      .channel('dashboard_projects')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'projects' 
        }, 
        () => {
          // Refresh stats when projects change
          fetchAllStats();
        }
      )
      .subscribe();

    // Subscribe to task assignments changes
    const tasksSubscription = supabase
      .channel('dashboard_tasks')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'task_assignments' 
        }, 
        () => {
          // Refresh stats when tasks change
          fetchAllStats();
        }
      )
      .subscribe();

    return () => {
      projectsSubscription.unsubscribe();
      tasksSubscription.unsubscribe();
    };
  }, [fetchAllStats]);

  const refetch = useCallback(() => {
    fetchAllStats();
  }, [fetchAllStats]);

  return {
    stats,
    events,
    chartData,
    recentActivities,
    loading,
    error,
    lastUpdate,
    refetch
  };
} 