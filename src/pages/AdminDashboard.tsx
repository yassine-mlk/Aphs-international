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
  PenTool
} from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useRecentActivities, type RecentActivity } from '@/hooks/useRecentActivities';
import { useAdminDocuments } from '@/hooks/useAdminDocuments';
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
  totalCompanies: number;
  totalSoloMembers: number;
  totalStandardTasks: number;
  standardTasksToAssign: number;
  standardTasksInProgress: number;
  standardTasksOverdue: number;
  standardTasksValidated: number;
  totalWorkflows: number;
  workflowsInReview: number;
  workflowsVSO: number;
  workflowsBlocked: number;
  activeMeetings: number;
  upcomingMeetings: number;
  totalAlerts: number;
}

type AdminUrgencyType = 'task_unassigned' | 'task_overdue' | 'task_to_validate' | 'task_deadline_soon' | 'conversation_stale' | 'project_overdue' | 'workflow_blocked';

interface AdminUrgencyItem {
  id: string;
  type: AdminUrgencyType;
  title: string;
  description: string;
  score?: number;
  date?: string;
  action?: { label: string; to: string };
}



const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchData, supabase } = useSupabase();
  const { user, role, status } = useAuth();
  const { tenant } = useTenant();

  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    overdueProjects: 0,
    totalIntervenants: 0,
    totalCompanies: 0,
    totalSoloMembers: 0,
    totalStandardTasks: 0,
    standardTasksToAssign: 0,
    standardTasksInProgress: 0,
    standardTasksOverdue: 0,
    standardTasksValidated: 0,
    totalWorkflows: 0,
    workflowsInReview: 0,
    workflowsVSO: 0,
    workflowsBlocked: 0,
    activeMeetings: 0,
    upcomingMeetings: 0,
    totalAlerts: 0
  });

  const [urgentItems, setUrgentItems] = useState<AdminUrgencyItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Utiliser le hook pour les activités récentes
  const { activities: recentActivities, loading: activitiesLoading } = useRecentActivities();
  
  // Hook pour les documents en attente (admin)
  const { pendingCount: adminPendingDocsCount, loading: adminPendingDocsLoading } = useAdminDocuments();

  // Charger les statistiques
  const loadStats = async () => {
    if (status !== 'authenticated' || !tenant?.id) return;
    setLoading(true);
    try {
      const now = new Date();

      // Charger les projets
      const projects = await fetchData<any>('projects', {
        columns: 'id, name, status, deadline',
        filters: [{ column: 'tenant_id', operator: 'eq', value: tenant.id }]
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
        columns: 'user_id, role, company',
        filters: [
          { column: 'role', operator: 'neq', value: 'admin' },
          { column: 'tenant_id', operator: 'eq', value: tenant.id }
        ]
      }) || [];

      // Charger les tâches depuis task_assignments_view (vue consolidée)
      const taskAssignmentsData = await fetchData<any>('task_assignments_view', {
        columns: 'id, status, deadline, validation_deadline, assigned_to, project_id, task_name, assignment_type',
        filters: [{ column: 'tenant_id', operator: 'eq', value: tenant.id }]
      }) || [];

      // Filtrer pour ne garder que les tâches dont le projet existe
      const projectIds = new Set(projects.map((p: any) => p.id));
      const taskAssignments = taskAssignmentsData.filter((t: any) => projectIds.has(t.project_id));

      const standardTasks = taskAssignments.filter((t: any) => t.assignment_type === 'standard');
      const workflows = taskAssignments.filter((t: any) => t.assignment_type === 'workflow');

      const standardTasksToAssign = standardTasks.filter((t: any) => !t.assigned_to || t.assigned_to.length === 0).length;
      const standardTasksInProgress = standardTasks.filter((t: any) => t.status === 'in_progress' || t.status === 'submitted').length;
      const standardTasksOverdue = standardTasks.filter((t: any) => t.deadline && new Date(t.deadline) < now && t.status !== 'validated' && t.status !== 'finalized').length;
      const standardTasksValidated = standardTasks.filter((t: any) => t.status === 'validated' || t.status === 'finalized').length;

      const workflowsInReview = workflows.filter((t: any) => t.status === 'in_review').length;
      const workflowsVSO = workflows.filter((t: any) => t.status === 'vso').length;
      const workflowsBlocked = workflows.filter((t: any) => t.status === 'blocked' || t.status === 'rejected').length;

      // Réunions
      let activeMeetings = 0;
      let upcomingMeetings = 0;

      // Calculer les statistiques
      const newStats: DashboardStats = {
        totalProjects: projects.length,
        activeProjects: projects.filter((p: any) => p.status === 'active' || p.status === 'in_progress' || p.status === 'assigned').length,
        completedProjects: projects.filter((p: any) => p.status === 'completed' || p.status === 'finalized').length,
        overdueProjects,
        totalIntervenants: intervenants.length,
        totalCompanies: new Set(intervenants.map((i: any) => i.company).filter(Boolean)).size,
        totalSoloMembers: intervenants.filter((i: any) => !i.company).length,
        totalStandardTasks: standardTasks.length,
        standardTasksToAssign,
        standardTasksInProgress,
        standardTasksOverdue,
        standardTasksValidated,
        totalWorkflows: workflows.length,
        workflowsInReview,
        workflowsVSO,
        workflowsBlocked,
        activeMeetings,
        upcomingMeetings,
        totalAlerts: overdueProjects + standardTasksOverdue + workflowsBlocked
      };


      setStats(newStats);

      // Construire la liste des urgences
      const urgentItems: AdminUrgencyItem[] = [];

      // Projets en retard
      projects.filter((p: any) => p.status !== 'completed' && p.deadline && new Date(p.deadline) < now).forEach((p: any) => {
        urgentItems.push({
          id: `project_${p.id}`,
          type: 'project_overdue',
          title: 'Projet en retard',
          description: p.name,
          date: p.deadline,
          action: { label: 'Voir projet', to: `/dashboard/projets/${p.id}` }
        });
      });

      // Tâches standards en retard
      standardTasks.filter((t: any) => t.status !== 'validated' && t.status !== 'finalized' && t.deadline && new Date(t.deadline) < now).forEach((t: any) => {
        const project = projects.find((p: any) => p.id === t.project_id);
        urgentItems.push({
          id: `task_overdue_${t.id}`,
          type: 'task_overdue',
          title: 'Tâche en retard',
          description: `${project?.name || 'Projet inconnu'} • ${t.task_name}`,
          date: t.deadline,
          action: { label: 'Voir tâche', to: `/dashboard/tasks/${t.id}` }
        });
      });

      // Tâches standards non assignées
      standardTasks.filter((t: any) => !t.assigned_to || t.assigned_to.length === 0).forEach((t: any) => {
        const project = projects.find((p: any) => p.id === t.project_id);
        urgentItems.push({
          id: `task_unassigned_${t.id}`,
          type: 'task_unassigned',
          title: 'Tâche non assignée',
          description: `${project?.name || 'Projet inconnu'} • ${t.task_name}`,
          action: { label: 'Assigner', to: `/dashboard/projets/${t.project_id}` }
        });
      });

      // Tâches standards à valider
      standardTasks.filter((t: any) => t.status === 'submitted').forEach((t: any) => {
        const project = projects.find((p: any) => p.id === t.project_id);
        urgentItems.push({
          id: `task_validate_${t.id}`,
          type: 'task_to_validate',
          title: 'Tâche à statuer',
          description: `${project?.name || 'Projet inconnu'} • ${t.task_name}`,
          action: { label: 'Statuer', to: `/dashboard/tasks/${t.id}` }
        });
      });

      // Workflows bloqués
      workflows.filter((t: any) => t.status === 'blocked' || t.status === 'rejected').forEach((t: any) => {
        const project = projects.find((p: any) => p.id === t.project_id);
        urgentItems.push({
          id: `workflow_blocked_${t.id}`,
          type: 'workflow_blocked',
          title: 'Workflow bloqué',
          description: `${project?.name || 'Projet inconnu'} • ${t.task_name}`,
          action: { label: 'Voir workflow', to: `/dashboard/tasks/${t.id}` }
        });
      });

      setUrgentItems(urgentItems.sort((a, b) => {
        // Priorité: retard > non assigné > à valider
        const weights: any = {
          'project_overdue': 1,
          'task_overdue': 2,
          'workflow_blocked': 3,
          'task_unassigned': 4,
          'task_to_validate': 5
        };
        return (weights[a.type] || 99) - (weights[b.type] || 99);
      }).slice(0, 10));

      // Les activités récentes sont maintenant gérées par le hook useRecentActivities

    } catch (error) {
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
    if (status === 'authenticated' && tenant?.id) {
      loadStats();

      // S'abonner aux changements de la table task_assignments
      const channel = supabase
        .channel('admin-dashboard-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'standard_task_assignments'
          },
          () => {
            loadStats();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'workflow_task_assignments'
          },
          () => {
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
            loadStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [status, tenant?.id]);

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



  // Supabase Realtime pour le refresh auto
  useEffect(() => {
    if (!tenant?.id) return;

    const channels = [
      supabase.channel('projects_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `tenant_id=eq.${tenant.id}` }, () => loadStats())
        .subscribe(),
      supabase.channel('tasks_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadStats())
        .subscribe()
    ];

    const interval = setInterval(() => loadStats(), 60000); // Backup refresh every 60s

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
      clearInterval(interval);
    };
  }, [tenant?.id]);

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
      className="min-h-screen bg-[#F8F9FA] p-4 md:p-8"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* SECTION 1: Header personnalisé */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500 capitalize">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              Bonjour, {user?.user_metadata?.first_name || 'Admin'} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Voici un résumé de l'activité de vos projets
            </p>
          </div>
        </motion.div>

        {/* SECTION 2: KPI Cards redesignées */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Card Projets */}
          <motion.div variants={itemVariants}>
            <Card 
              className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate('/dashboard/projets')}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Projets</p>
                    <h3 className="text-4xl font-black text-gray-900 mt-2">{stats.totalProjects}</h3>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Briefcase className="h-6 w-6 text-[#1976D2]" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  <Badge variant="secondary" className="bg-blue-50 text-[#1976D2] border-blue-100 font-bold text-[10px]">
                    {stats.activeProjects} actifs
                  </Badge>
                  <Badge variant="secondary" className="bg-red-50 text-[#D32F2F] border-red-100 font-bold text-[10px]">
                    {stats.overdueProjects} retards
                  </Badge>
                  <Badge variant="secondary" className="bg-green-50 text-[#388E3C] border-green-100 font-bold text-[10px]">
                    {stats.completedProjects} terminés
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card Intervenants */}
          <motion.div variants={itemVariants}>
            <Card 
              className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate('/dashboard/intervenants')}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Intervenants</p>
                    <h3 className="text-4xl font-black text-gray-900 mt-2">{stats.totalIntervenants}</h3>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl">
                    <Users className="h-6 w-6 text-[#388E3C]" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  <Badge variant="secondary" className="bg-gray-50 text-gray-600 border-gray-100 font-bold text-[10px]">
                    {stats.totalCompanies} entreprises
                  </Badge>
                  <Badge variant="secondary" className="bg-gray-50 text-gray-600 border-gray-100 font-bold text-[10px]">
                    {stats.totalSoloMembers} membres solo
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card Tâches Standards */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tâches Standards</p>
                    <h3 className="text-4xl font-black text-gray-900 mt-2">{stats.totalStandardTasks}</h3>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <ClipboardCheck className="h-6 w-6 text-[#F57C00]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-6">
                  <Badge variant="secondary" className="bg-gray-100 text-gray-500 font-bold text-[10px] justify-center">
                    {stats.standardTasksToAssign} à assigner
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-50 text-[#1976D2] font-bold text-[10px] justify-center">
                    {stats.standardTasksInProgress} en cours
                  </Badge>
                  <Badge variant="secondary" className="bg-red-50 text-[#D32F2F] font-bold text-[10px] justify-center">
                    {stats.standardTasksOverdue} en retard
                  </Badge>
                  <Badge variant="secondary" className="bg-green-50 text-[#388E3C] font-bold text-[10px] justify-center">
                    {stats.standardTasksValidated} validées
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card Workflows */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Workflows</p>
                    <h3 className="text-4xl font-black text-gray-900 mt-2">{stats.totalWorkflows}</h3>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <Activity className="h-6 w-6 text-[#7B1FA2]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-6">
                  <Badge variant="secondary" className="bg-orange-50 text-[#F57C00] font-bold text-[10px] justify-center">
                    {stats.workflowsInReview} en revue
                  </Badge>
                  <Badge variant="secondary" className="bg-green-50 text-[#388E3C] font-bold text-[10px] justify-center">
                    {stats.workflowsVSO} VSO
                  </Badge>
                  <Badge variant="secondary" className="bg-red-50 text-[#D32F2F] font-bold text-[10px] justify-center col-span-2">
                    {stats.workflowsBlocked} bloqués
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card Alertes (Optionnelle si > 0) */}
          {stats.totalAlerts > 0 && (
            <motion.div variants={itemVariants} className="col-span-full">
              <Card className="border-0 shadow-sm bg-red-50/50 rounded-2xl overflow-hidden">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-[#D32F2F]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#D32F2F]">
                        {stats.totalAlerts} alerte{stats.totalAlerts > 1 ? 's' : ''} nécessitant votre attention
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {stats.overdueProjects > 0 && (
                      <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                        {stats.overdueProjects} projets en retard
                      </span>
                    )}
                    {stats.standardTasksOverdue > 0 && (
                      <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                        {stats.standardTasksOverdue} tâches en retard
                      </span>
                    )}
                    {stats.workflowsBlocked > 0 && (
                      <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                        {stats.workflowsBlocked} workflows bloqués
                      </span>
                    )}

                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* SECTION 3: Deux colonnes À traiter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne Gauche: Tâches Standards */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">⚡</span> Tâches Standards
              </h2>
              <div className="flex gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">En retard</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">À assigner</Badge>
              </div>
            </div>

            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardContent className="p-0 divide-y divide-gray-50">
                {urgentItems.filter(i => i.type.startsWith('task_')).length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <CheckCircle className="h-10 w-10 mx-auto mb-4 opacity-20" />
                    <p>Aucune tâche standard urgente</p>
                  </div>
                ) : (
                  urgentItems.filter(i => i.type !== 'conversation_stale' && !i.id.includes('workflow')).slice(0, 5).map(item => (
                    <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              item.type === 'task_overdue' ? 'bg-[#D32F2F]' : 
                              item.type === 'task_unassigned' ? 'bg-[#F57C00]' : 'bg-[#1976D2]'
                            }`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              {item.title}
                            </span>
                          </div>
                          <h4 className="font-bold text-gray-900 group-hover:text-[#1976D2] transition-colors">
                            {item.description.split(' • ')[1]}
                          </h4>
                          <p className="text-xs text-gray-500 font-medium">
                            Projet : {item.description.split(' • ')[0]}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-2">
                            {item.date && `Échéance: ${new Date(item.date).toLocaleDateString('fr-FR')}`}
                          </p>
                        </div>
                        {item.action && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-[#1976D2] font-bold text-xs"
                            onClick={() => navigate(item.action!.to)}
                          >
                            Voir tâche →
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Colonne Droite: Workflows */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">🔄</span> Workflows en cours
              </h2>
              <div className="flex gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">Bloqués</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">En attente</Badge>
              </div>
            </div>

            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardContent className="p-0 divide-y divide-gray-50">
                {/* Simulation de workflows pour l'exemple, à adapter avec les vraies données */}
                <div className="p-12 text-center text-gray-400">
                  <Activity className="h-10 w-10 mx-auto mb-4 opacity-20" />
                  <p>Aucun workflow bloqué</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard; 