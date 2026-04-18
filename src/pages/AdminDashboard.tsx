import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Briefcase, 
  Users, 
  ClipboardCheck, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Video,
  RefreshCw
} from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRecentActivities, type RecentActivity } from '@/hooks/useRecentActivities';
import { ActivityIcon } from '@/components/ActivityIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSkeleton } from '@/components/Skeletons';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overdueProjects: number;
  totalIntervenants: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  unassignedTasks: number;
  tasksToValidate: number;
  unreadMessages: number;
  staleConversations: number;
  activeMeetings: number;
  upcomingMeetings: number;
}

type AdminUrgencyType = 'task_unassigned' | 'task_overdue' | 'task_to_validate' | 'task_deadline_soon' | 'conversation_stale';

interface AdminUrgencyItem {
  id: string;
  type: AdminUrgencyType;
  title: string;
  description: string;
  score: number;
  date?: string;
  action?: { label: string; to: string };
}



const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchData, supabase } = useSupabase();
  const { user } = useAuth();

  const noResponseThresholdHours = 24;

  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    overdueProjects: 0,
    totalIntervenants: 0,
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    unassignedTasks: 0,
    tasksToValidate: 0,
    unreadMessages: 0,
    staleConversations: 0,
    activeMeetings: 0,
    upcomingMeetings: 0
  });

  const [urgentItems, setUrgentItems] = useState<AdminUrgencyItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Utiliser le hook pour les activités récentes
  const { activities: recentActivities, loading: activitiesLoading } = useRecentActivities();



  // Charger les statistiques
  const loadStats = async () => {
    setLoading(true);
    try {
      const now = new Date();

      // Charger les projets
      const projects = await fetchData<any>('projects', {
        columns: 'id, name, status, deadline'
      }) || [];

      const projectsById = new Map<string, any>(projects.map((p: any) => [p.id, p]));

      const overdueProjects = projects.filter((p: any) => {
        if (!p.deadline) return false;
        const deadline = new Date(p.deadline);
        if (isNaN(deadline.getTime())) return false;
        return deadline < now && p.status !== 'completed' && p.status !== 'finalized';
      }).length;

      // Charger les intervenants
      const intervenants = await fetchData<any>('profiles', {
        columns: 'user_id, role',
        filters: [{ column: 'role', operator: 'neq', value: 'admin' }]
      }) || [];

      // Charger les tâches depuis task_assignments
      const taskAssignmentsData = await fetchData<any>('task_assignments', {
        columns: 'id, status, deadline, validation_deadline, assigned_to, project_id, task_name'
      }) || [];

      // Filtrer pour ne garder que les tâches dont le projet existe
      const projectIds = new Set(projects.map((p: any) => p.id));
      const taskAssignments = taskAssignmentsData.filter((t: any) => projectIds.has(t.project_id));

      // Debug pour vérifier les données
      console.log('Task assignments chargées (filtrées):', taskAssignments);
      console.log('Nombre de tâches trouvées:', taskAssignments.length);

      const tasksToValidate = taskAssignments.filter((t: any) => t.status === 'submitted').length;

      // Messages: non lus + conversations sans réponse > X heures (scope: conversations de l'admin)
      let unreadMessages = 0;
      let staleConversations = 0;
      try {
        if (user?.id) {
          const { data: participations, error: participationsError } = await supabase
            .rpc('get_user_conversations', { p_user_id: user.id });

          if (!participationsError && participations && participations.length > 0) {
            const conversationIds = participations.map((p: any) => p.conversation_id).filter(Boolean);
            const threshold = new Date(now.getTime() - noResponseThresholdHours * 60 * 60 * 1000);

            if (conversationIds.length > 0) {
              const { data: recentMessages, error: messagesError } = await supabase
                .from('messages')
                .select('id, conversation_id, sender_id, created_at')
                .in('conversation_id', conversationIds)
                .order('created_at', { ascending: false })
                .limit(500);

              if (!messagesError && recentMessages && recentMessages.length > 0) {
                const messageIds = recentMessages.map(m => m.id);

                const { data: reads, error: readsError } = await supabase
                  .from('message_reads')
                  .select('message_id')
                  .eq('user_id', user.id)
                  .in('message_id', messageIds);

                if (!readsError) {
                  const readIds = new Set((reads || []).map(r => r.message_id));
                  unreadMessages = recentMessages.filter(m => m.sender_id !== user.id && !readIds.has(m.id)).length;
                }

                const lastByConversation = new Map<string, any>();
                for (const msg of recentMessages) {
                  if (!lastByConversation.has(msg.conversation_id)) {
                    lastByConversation.set(msg.conversation_id, msg);
                  }
                }

                staleConversations = Array.from(lastByConversation.values()).filter(msg => {
                  const createdAt = new Date(msg.created_at);
                  if (isNaN(createdAt.getTime())) return false;
                  return createdAt < threshold && msg.sender_id !== user.id;
                }).length;
              }
            }
          }
        }
      } catch (e) {
        console.warn('Erreur lors du chargement des KPIs messages:', e);
      }

      // Réunions
      let activeMeetings = 0;
      let upcomingMeetings = 0;
      try {
        const { data: meetings, error: meetingsError } = await supabase
          .from('video_meetings')
          .select('id, status, scheduled_time')
          .in('status', ['scheduled', 'active']);

        if (!meetingsError && meetings) {
          activeMeetings = meetings.filter((m: any) => m.status === 'active').length;
          upcomingMeetings = meetings.filter((m: any) => m.status === 'scheduled' && m.scheduled_time && new Date(m.scheduled_time) > now).length;
        }
      } catch (e) {
        console.warn('Erreur lors du chargement des KPIs réunions:', e);
      }

      // Calculer les statistiques
      const newStats: DashboardStats = {
        totalProjects: projects.length,
        activeProjects: projects.filter((p: any) => p.status === 'active' || p.status === 'in_progress' || p.status === 'assigned').length,
        completedProjects: projects.filter((p: any) => p.status === 'completed' || p.status === 'finalized').length,
        overdueProjects,
        totalIntervenants: intervenants.length,
        totalTasks: taskAssignments.length,
        pendingTasks: taskAssignments.filter((t: any) => 
          t.status === 'assigned' || 
          t.status === 'in_progress' || 
          t.status === 'submitted' ||
          t.status === 'rejected'
        ).length,
        completedTasks: taskAssignments.filter((t: any) => t.status === 'validated' || t.status === 'finalized').length,
        overdueTasks: taskAssignments.filter((t: any) => 
          t.deadline && 
          new Date(t.deadline) < now && 
          t.status !== 'validated' &&
          t.status !== 'finalized'
        ).length,
        unassignedTasks: taskAssignments.filter((t: any) => !t.assigned_to || t.assigned_to.length === 0).length,
        tasksToValidate,
        unreadMessages,
        staleConversations,
        activeMeetings,
        upcomingMeetings
      };

      console.log('Statistiques calculées:', newStats);

      setStats(newStats);

      // Construire le bloc "À faire maintenant" (Top 10 urgences)
      const urgencyItems: AdminUrgencyItem[] = [];

      const formatProjectName = (projectId: string) => {
        return projectsById.get(projectId)?.name || 'Projet';
      };

      for (const task of taskAssignments) {
        const projectName = formatProjectName(task.project_id);

        const isUnassigned = !task.assigned_to || task.assigned_to.length === 0;
        const isSubmitted = task.status === 'submitted';

        const deadline = task.deadline ? new Date(task.deadline) : null;
        const validationDeadline = task.validation_deadline ? new Date(task.validation_deadline) : null;

        const isOverdue = !!deadline && !isNaN(deadline.getTime()) && deadline < now && task.status !== 'validated' && task.status !== 'finalized';
        const daysToDeadline = deadline && !isNaN(deadline.getTime()) ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

        if (isUnassigned) {
          urgencyItems.push({
            id: `task_unassigned_${task.id}`,
            type: 'task_unassigned',
            title: 'Tâche à assigner',
            description: `${projectName} • ${task.task_name}`,
            score: 100,
            date: task.deadline,
            action: { label: 'Ouvrir projet', to: `/dashboard/projets/${task.project_id}` }
          });
        }

        if (isSubmitted) {
          let score = 85;
          if (validationDeadline && !isNaN(validationDeadline.getTime())) {
            const daysToValidationDeadline = Math.ceil((validationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            score += Math.max(0, 10 - Math.min(10, daysToValidationDeadline));
            if (validationDeadline < now) score = 95;
          }
          urgencyItems.push({
            id: `task_to_validate_${task.id}`,
            type: 'task_to_validate',
            title: 'Tâche à valider',
            description: `${projectName} • ${task.task_name}`,
            score,
            date: task.validation_deadline || task.deadline,
            action: { label: 'Voir tâche', to: `/dashboard/tasks/${task.id}` }
          });
        }

        if (isOverdue) {
          const score = 90 + Math.min(9, Math.max(0, (daysToDeadline || 0) * -1));
          urgencyItems.push({
            id: `task_overdue_${task.id}`,
            type: 'task_overdue',
            title: 'Tâche en retard',
            description: `${projectName} • ${task.task_name}`,
            score,
            date: task.deadline,
            action: { label: 'Voir tâche', to: `/dashboard/tasks/${task.id}` }
          });
        } else if (daysToDeadline !== null && daysToDeadline >= 0 && daysToDeadline <= 3 && task.status !== 'validated' && task.status !== 'finalized') {
          urgencyItems.push({
            id: `task_deadline_soon_${task.id}`,
            type: 'task_deadline_soon',
            title: 'Deadline proche',
            description: `${projectName} • ${task.task_name} (J-${daysToDeadline})`,
            score: 70 + (3 - daysToDeadline),
            date: task.deadline,
            action: { label: 'Voir tâche', to: `/dashboard/tasks/${task.id}` }
          });
        }
      }

      urgencyItems.sort((a, b) => b.score - a.score);
      setUrgentItems(urgencyItems.slice(0, 10));

      // Les activités récentes sont maintenant gérées par le hook useRecentActivities

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();

    // S'abonner aux changements de la table task_assignments
    const channel = supabase
      .channel('admin-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignments'
        },
        () => {
          console.log('Changement détecté dans task_assignments, actualisation des stats...');
          loadStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => {
          console.log('Changement détecté dans projects, actualisation des stats...');
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fonction pour formater la date
  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Récemment';
    const now = new Date();
    const past = new Date(timestamp);
    
    // Vérifier si la date est valide
    if (isNaN(past.getTime())) return 'Récemment';
    
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'À l\'instant';
    } else if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} min`;
    } else if (diffInMinutes < 1440) {
      return `Il y a ${Math.floor(diffInMinutes / 60)} h`;
    } else {
      const diffInDays = Math.floor(diffInMinutes / 1440);
      if (diffInDays === 1) return 'Hier';
      if (diffInDays < 30) return `Il y a ${diffInDays} j`;
      return past.toLocaleDateString('fr-FR');
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-background p-6"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <motion.div variants={itemVariants} className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black text-black tracking-tight">
              Tableau de Bord
            </h1>
          </div>
        </motion.div>

        {/* KPI essentiels */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-xl bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-50">
                <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider">Projets</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-4xl font-black text-black">{stats.totalProjects}</div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700">
                    {stats.activeProjects} actifs
                  </Badge>
                  <Badge variant="secondary" className="bg-red-600 text-white hover:bg-red-700">
                    {stats.overdueProjects} en retard
                  </Badge>
                  <Badge variant="secondary" className="bg-black text-white hover:bg-gray-800">
                    {stats.completedProjects} terminés
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-xl bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-50">
                <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider">Intervenants</CardTitle>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <Users className="h-5 w-5 text-black" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-4xl font-black text-black">{stats.totalIntervenants}</div>
                <p className="text-sm text-gray-500 mt-2 font-medium">
                  Spécialistes actifs
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-xl bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-50">
                <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tâches</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <ClipboardCheck className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-4xl font-black text-black">{stats.totalTasks}</div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant="secondary" className="bg-orange-600 text-white hover:bg-orange-700">
                    {stats.unassignedTasks} à assigner
                  </Badge>
                  <Badge variant="secondary" className="bg-purple-600 text-white hover:bg-purple-700">
                    {stats.tasksToValidate} à valider
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-bold">
                    {stats.pendingTasks} en cours
                  </Badge>
                  <Badge variant="secondary" className="bg-gray-100 text-black font-bold">
                    {stats.completedTasks} validées
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-xl bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-50">
                <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider">Alertes</CardTitle>
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-4xl font-black text-red-600">{stats.overdueTasks + stats.unassignedTasks}</div>
                <div className="flex flex-col gap-1 mt-3">
                  <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                    {stats.overdueTasks} tâches en retard
                  </p>
                  <p className="text-xs text-orange-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
                    {stats.unassignedTasks} tâches non assignées
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="border-0 shadow-2xl bg-white rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 pb-4">
                <CardTitle className="flex items-center gap-2 text-black font-bold">
                  <Activity className="h-5 w-5 text-blue-600" />
                  À faire maintenant
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Top 10 urgences triées par criticité (assignation, retards, validations)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {urgentItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucune urgence détectée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {urgentItems.map(item => (
                      <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                            <Badge
                              variant="secondary"
                              className={
                                item.type === 'task_unassigned'
                                  ? 'bg-orange-600 text-white'
                                  : item.type === 'task_overdue'
                                    ? 'bg-red-600 text-white'
                                    : item.type === 'task_to_validate'
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-blue-600 text-white'
                              }
                            >
                              {item.type === 'task_unassigned'
                                ? 'À assigner'
                                : item.type === 'task_overdue'
                                  ? 'Retard'
                                  : item.type === 'task_to_validate'
                                    ? 'À valider'
                                    : 'À surveiller'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{item.description}</p>
                          {item.date && (
                            <p className="text-xs text-gray-400 mt-1">Échéance: {new Date(item.date).toLocaleDateString('fr-FR')}</p>
                          )}
                        </div>
                        {item.action && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(item.action!.to)}
                            className="flex-shrink-0"
                          >
                            {item.action.label}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-6">
            <Card className="border-0 shadow-2xl bg-white rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 pb-4">
                <CardTitle className="flex items-center gap-2 text-black font-bold">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Messages
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Suivi des conversations de l’admin
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Non lus</span>
                  <Badge variant="secondary" className="bg-blue-600 text-white">{stats.unreadMessages}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Sans réponse &gt; {noResponseThresholdHours}h</span>
                  <Badge variant="secondary" className="bg-orange-600 text-white">{stats.staleConversations}</Badge>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard/messages')}
                  className="w-full"
                >
                  Ouvrir la messagerie
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-2xl bg-white rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 pb-4">
                <CardTitle className="flex items-center gap-2 text-black font-bold">
                  <Video className="h-5 w-5 text-blue-600" />
                  Réunions
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Visio en cours et à venir
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">En cours</span>
                  <Badge variant="secondary" className="bg-red-600 text-white">{stats.activeMeetings}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">À venir</span>
                  <Badge variant="secondary" className="bg-blue-600 text-white">{stats.upcomingMeetings}</Badge>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard/visio')}
                  className="w-full"
                >
                  Ouvrir la visio
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

          {/* Activités récentes */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-2xl bg-white rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 pb-4">
                <CardTitle className="flex items-center gap-2 text-black font-bold">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Activités Récentes
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Dernières actions effectuées sur la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {activitiesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center space-x-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentActivities.length > 0 ? (
                    <AnimatePresence mode="popLayout">
                      {recentActivities.map((activity) => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          key={activity.id} 
                          className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-1">
                            <ActivityIcon type={activity.iconType} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                            <p className="text-sm text-gray-500">{activity.description}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucune activité récente</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard; 