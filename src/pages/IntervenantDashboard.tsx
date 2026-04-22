import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  ClipboardCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Briefcase,
  TrendingUp,
  Settings2,
  Activity,
  RefreshCw,
  Calendar as CalendarIcon,
  LayoutGrid,
  ChevronRight,
  Building2,
  FileCheck,
  PenTool
} from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTenant } from '@/contexts/TenantContext';
import { translations } from '@/lib/translations';
import { useRecentActivities, type RecentActivity } from '@/hooks/useRecentActivities';
import { usePendingDocuments } from '@/hooks/usePendingDocuments';
import { ActivityIcon } from '@/components/ActivityIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { TenantQuotaDisplay } from '@/components/TenantQuotaGuard';
import { DashboardSkeleton } from '@/components/Skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { DeadlineCalendar } from '@/components/DeadlineCalendar';
import { PriorityTasks } from '@/components/PriorityTasks';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';

interface IntervenantStats {
  totalTasks: number;
  assignedTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  validatedTasks: number;
  overdueTasks: number;
  completionRate: number;
  totalProjects: number;
  activeProjects: number;
}

interface TaskItem {
  id: string;
  task_name: string;
  project_name: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'validated' | 'rejected';
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  progress?: number;
}

type TaskWithMeta = {
  id: string;
  task_name?: string;
  status?: string;
  deadline?: string;
  validation_deadline?: string;
  project_id?: string;
  assigned_to?: string[];
  validators?: string[];
};



const IntervenantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchData, supabase } = useSupabase();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { tenant, isLoading: isTenantLoading } = useTenant();

  const [stats, setStats] = useState<IntervenantStats>({
    totalTasks: 0,
    assignedTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    validatedTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    totalProjects: 0,
    activeProjects: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [validationTasks, setValidationTasks] = useState<any[]>([]);

  // État pour le profil utilisateur (nom, prénom)
  const [userProfile, setUserProfile] = useState<{ first_name: string; last_name: string } | null>(null);
  
  // États pour la personnalisation du tableau de bord
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    showCalendar: true,
    showPriorityTasks: true,
    showRecentActivities: true,
    useCustomView: false // Bascule entre vue classique (Tabs) et vue personnalisée
  });

  // Charger les préférences au montage
  useEffect(() => {
    const savedPrefs = localStorage.getItem(`dashboard_prefs_${user?.id}`);
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs));
    }
  }, [user?.id]);

  // Charger le profil utilisateur pour afficher le nom
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;
      try {
        const profile = await fetchData('profiles', {
          columns: 'first_name,last_name',
          filters: [{ column: 'user_id', operator: 'eq', value: user.id }]
        });
        if (profile && profile.length > 0) {
          const p = profile[0] as { first_name: string; last_name: string };
          setUserProfile(p);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
      }
    };
    loadUserProfile();
  }, [user?.id, fetchData]);

  // Sauvegarder les préférences
  const savePreferences = (newPrefs: typeof preferences) => {
    setPreferences(newPrefs);
    localStorage.setItem(`dashboard_prefs_${user?.id}`, JSON.stringify(newPrefs));
  };
  
  // Utiliser le hook pour les activités récentes
  const { activities: recentActivities, loading: activitiesLoading } = useRecentActivities();
  
  // Hook pour les documents en attente
  const { count: pendingDocsCount, loading: pendingDocsLoading } = usePendingDocuments();

  // Déterminer le rôle de l'utilisateur pour l'affichage
  const userRole = user?.user_metadata?.role || JSON.parse(localStorage.getItem('user') || '{}')?.role;
  const isMaitreOuvrage = userRole === 'maitre_ouvrage';
  
  // Obtenir les traductions appropriées
  const t = translations[language as keyof typeof translations];
  const dashboardTranslations = isMaitreOuvrage ? t.dashboard.masterOwner : t.dashboard.specialist;


  // Charger les statistiques
  const loadStats = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    try {
      if (!user?.id) {
        if (!silent) setLoading(false);
        return;
      }

      // 1. Récupérer les projets dont l'utilisateur est membre (même logique que IntervenantProjects.tsx)
      const memberData = await fetchData('membre', {
        columns: '*',
        filters: [{ column: 'user_id', operator: 'eq', value: user.id }]
      }) || [];
      
      console.log('Données membres récupérées:', memberData);

      let projects = [];
      if (memberData && memberData.length > 0) {
        // Récupérer les détails des projets
        const projectIds = memberData
          .map((member: any) => member.project_id)
          .filter((id: any) => id && typeof id === 'string' && id.trim() !== '');
        
        console.log('IDs des projets à récupérer:', projectIds);
        
        if (projectIds.length > 0) {
          // Utiliser une requête directe Supabase au lieu du helper générique pour le filtre 'in'
          const { data: projectsData, error } = await supabase
            .from('projects')
            .select('id, name, status')
            .in('id', projectIds);
          
          if (error) {
            console.error('Erreur lors de la récupération des données depuis projects:', error);
            throw error;
          }
          
          projects = projectsData || [];
        }
      }

      console.log('Projets récupérés:', projects);
      const projectIdsSet = new Set(projects.map((p: any) => p.id));

      // 2. Récupérer toutes les tâches utiles (assigné ou validateur)
      const { data: rawTasks, error: tasksError } = await supabase
        .from('task_assignments')
        .select('id, task_name, status, deadline, validation_deadline, project_id, assigned_to, validators');
      
      if (tasksError) throw tasksError;

      const typedRawTasks = (rawTasks || []) as TaskWithMeta[];

      // Filtrer les tâches assignées à l'utilisateur et dont le projet existe
      const executionTasks = typedRawTasks.filter((t) =>
        Array.isArray(t.assigned_to) && t.assigned_to.includes(user.id) && !!t.project_id && projectIdsSet.has(t.project_id)
      );

      // Filtrer les tâches où l'utilisateur est validateur et dont le projet existe
      const validatorTasks = typedRawTasks.filter((t) =>
        Array.isArray(t.validators) && t.validators.includes(user.id) && !!t.project_id && projectIdsSet.has(t.project_id)
      );

      const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));

      console.log('Tâches exécution (filtrées):', executionTasks);
      console.log('Tâches validation (filtrées):', validatorTasks);

      // 3. Calculer les statistiques
      const now = new Date();
      const newStats: IntervenantStats = {
        totalTasks: executionTasks.length,
        assignedTasks: executionTasks.filter((t: any) => t.status === 'assigned').length,
        inProgressTasks: executionTasks.filter((t: any) => t.status === 'in_progress').length,
        completedTasks: executionTasks.filter((t: any) => t.status === 'submitted').length,
        validatedTasks: executionTasks.filter((t: any) => t.status === 'validated').length,
        overdueTasks: executionTasks.filter((t: any) =>
          t.deadline &&
          new Date(t.deadline) < now &&
          t.status !== 'validated'
        ).length,
        completionRate: executionTasks.length > 0
          ? Math.round((executionTasks.filter((t: any) => t.status === 'validated').length / executionTasks.length) * 100)
          : 0,
        totalProjects: projects.length,
        activeProjects: projects.filter((p: any) => p.status === 'active' || p.status === 'in_progress').length
      };

      console.log('Statistiques calculées:', newStats);
      setStats(newStats);
      setAllTasks(executionTasks.map((t: any) => ({
        ...t,
        project_name: projectMap.get(t.project_id) || 'Projet inconnu'
      })));
      setValidationTasks(validatorTasks.map((t: any) => ({
        ...t,
        project_name: projectMap.get(t.project_id) || 'Projet inconnu'
      })));

      // 4. Préparer les tâches récentes avec noms de projets
      const tasksWithProjects: TaskItem[] = executionTasks.slice(0, 5).map((task: any) => ({
        id: task.id,
        task_name: task.task_name || 'Tâche sans nom',
        project_name: projectMap.get(task.project_id) || 'Projet inconnu',
        status: task.status,
        deadline: task.deadline,
        priority: 'medium' as const, // Priorité par défaut
        progress: task.status === 'validated' ? 100 : 
                 task.status === 'submitted' ? 90 :
                 task.status === 'in_progress' ? 50 : 0
      }));

      setRecentTasks(tasksWithProjects);

      // Les activités récentes sont maintenant gérées par le hook useRecentActivities

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      if (!silent) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les statistiques",
          variant: "destructive",
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user?.id, supabase, fetchData, toast]);

  // Refs pour stabiliser les callbacks sans recréer la subscription
  const loadStatsRef = useRef(loadStats);
  useEffect(() => {
    loadStatsRef.current = loadStats;
  }, [loadStats]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSilentReload = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      loadStatsRef.current({ silent: true });
    }, 600);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    loadStats();

    // S'abonner aux changements (tâches + appartenance aux projets)
    const channel = supabase
      .channel(`intervenant-dashboard-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_assignments' },
        scheduleSilentReload
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'membre', filter: `user_id=eq.${user.id}` },
        scheduleSilentReload
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Fonctions utilitaires
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'in_progress':
        return 'bg-gray-100 text-black border-gray-200';
      case 'submitted':
        return 'bg-blue-600 text-white border-blue-600';
      case 'validated':
        return 'bg-black text-white border-black';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'Assignée';
      case 'in_progress':
        return 'En cours';
      case 'submitted':
        return 'Soumise';
      case 'validated':
        return 'Validée';
      case 'rejected':
        return 'Rejetée';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
      return { text: `En retard de ${Math.abs(diffInDays)} jour(s)`, color: 'text-red-600' };
    } else if (diffInDays === 0) {
      return { text: 'Aujourd\'hui', color: 'text-orange-600' };
    } else if (diffInDays === 1) {
      return { text: 'Demain', color: 'text-orange-600' };
    } else if (diffInDays <= 7) {
      return { text: `Dans ${diffInDays} jours`, color: 'text-yellow-600' };
    } else {
      return { text: date.toLocaleDateString('fr-FR'), color: 'text-gray-600' };
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
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
      <div className="max-w-7xl mx-auto space-y-8">
        {/* En-tête */}
        <motion.div variants={itemVariants} className="flex justify-between items-end border-b border-border pb-6">
          <div>
            <p className="text-lg text-muted-foreground mb-1">
              Bonjour{userProfile ? ` ${userProfile.first_name} ${userProfile.last_name}` : ''} 👋
            </p>
            <h1 className="text-4xl font-black text-foreground tracking-tight">
              {dashboardTranslations.title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsSettingsOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings2 className="h-4 w-4" />
              Personnaliser
            </Button>
          </div>
        </motion.div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <motion.div variants={itemVariants}>
            <Card
              className="border shadow-xl bg-card rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 cursor-pointer"
              onClick={() => navigate('/dashboard/tasks')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mes Tâches</CardTitle>
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <ClipboardCheck className="h-5 w-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-4xl font-black text-foreground">{stats.totalTasks}</div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant="secondary">
                    {stats.inProgressTasks} {dashboardTranslations.stats.inProgress}
                  </Badge>
                  <Badge className="bg-blue-500 text-white hover:bg-blue-600">
                    {stats.validatedTasks} {dashboardTranslations.stats.validated}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card
              className="border shadow-xl bg-card rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 cursor-pointer"
              onClick={() => navigate('/dashboard/intervenant/projets')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Projets</CardTitle>
                <div className="p-2 bg-muted rounded-lg">
                  <Briefcase className="h-5 w-5 text-foreground" />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-4xl font-black text-foreground">{stats.totalProjects}</div>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  {stats.activeProjects} projets actifs
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border shadow-xl bg-card rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Performance</CardTitle>
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-4xl font-black text-foreground">{stats.completionRate}%</div>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  {dashboardTranslations.stats.successRate}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border shadow-xl bg-card rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Alertes</CardTitle>
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-4xl font-black text-red-500">{stats.overdueTasks}</div>
                <p className="text-sm text-red-500 mt-2 font-bold">
                  {dashboardTranslations.stats.overdueTasks}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card 
              className="border shadow-xl bg-card rounded-2xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 cursor-pointer"
              onClick={() => navigate('/dashboard/mes-signatures')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Signatures</CardTitle>
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <PenTool className="h-5 w-5 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-4xl font-black text-foreground">
                  {pendingDocsLoading ? '-' : pendingDocsCount}
                </div>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  {pendingDocsCount === 0 ? 'Aucun document en attente' : 
                   pendingDocsCount === 1 ? '1 document à signer' : 
                   `${pendingDocsCount} documents à signer`}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quotas du Tenant */}
        {tenant && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                {tenant.name} - Quotas
              </h2>
              <Badge variant="outline" className="capitalize">
                {tenant.plan}
              </Badge>
            </div>
            <TenantQuotaDisplay />
          </motion.div>
        )}

        {/* Vue Personnalisée ou Vue par Onglets */}
        {preferences.useCustomView ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {preferences.showPriorityTasks && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <PriorityTasks tasks={allTasks} />
                </motion.div>
              )}
              {preferences.showCalendar && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <DeadlineCalendar tasks={allTasks} />
                </motion.div>
              )}
            </div>
            
            {preferences.showRecentActivities && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card className="border shadow-2xl bg-card rounded-3xl overflow-hidden">
                  <CardHeader className="border-b pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl font-black text-foreground">
                      <div className="p-2 bg-primary rounded-lg">
                        <Clock className="h-6 w-6 text-primary-foreground" />
                      </div>
                      {dashboardTranslations.recentActivities.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-8">
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
                              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className="flex-shrink-0 mt-1">
                                <ActivityIcon type={activity.iconType} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                                <p className="text-sm text-muted-foreground">{activity.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(activity.timestamp)}</p>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Activity className="h-12 w-12 mx-auto mb-4 text-muted" />
                          <p>{dashboardTranslations.recentActivities.noActivities}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        ) : (
          <Tabs defaultValue="tasks" className="space-y-8">
            <motion.div variants={itemVariants}>
              <TabsList className="flex w-full bg-muted p-1 rounded-xl">
                <TabsTrigger value="tasks" className="flex-1 py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-bold transition-all">
                  {dashboardTranslations.recentTasks.title}
                </TabsTrigger>
                <TabsTrigger value="activities" className="flex-1 py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-bold transition-all">
                  {dashboardTranslations.recentActivities.title}
                </TabsTrigger>
              </TabsList>
            </motion.div>

            {/* Tâches récentes */}
            <TabsContent value="tasks" className="space-y-6">
              <motion.div variants={itemVariants}>
                <Card className="border shadow-2xl bg-card rounded-3xl overflow-hidden">
                  <CardHeader className="border-b pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl font-black text-foreground">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <ClipboardCheck className="h-6 w-6 text-white" />
                      </div>
                      {dashboardTranslations.recentTasks.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground font-medium text-base">
                      {dashboardTranslations.recentTasks.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-8">
                    <div className="grid grid-cols-1 gap-4">
                      {recentTasks.length > 0 ? (
                        <AnimatePresence mode="popLayout">
                          {recentTasks.map((task) => {
                            const deadline = formatDeadline(task.deadline);
                            return (
                              <motion.div 
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={task.id} 
                                className="flex items-center justify-between p-6 rounded-2xl border hover:border-blue-500 hover:shadow-xl transition-all group bg-accent/50 cursor-pointer"
                                onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-3">
                                    <h3 className="text-lg font-bold text-foreground group-hover:text-blue-500 transition-colors truncate">{task.task_name}</h3>
                                    <Badge variant="outline" className={`${getStatusColor(task.status)} font-bold px-3 py-1 rounded-full`}>
                                      {getStatusLabel(task.status)}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                                      {task.project_name}
                                    </span>
                                    <span className={`flex items-center gap-1.5 ${deadline.color}`}>
                                      <Clock className="h-4 w-4" />
                                      {deadline.text}
                                    </span>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="rounded-full hover:bg-blue-600 hover:text-white transition-all ml-4"
                                >
                                  <TrendingUp className="h-5 w-5" />
                                </Button>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      ) : (
                        <div className="text-center py-16 text-muted-foreground">
                          <ClipboardCheck className="h-20 w-20 mx-auto mb-6 text-muted" />
                          <p className="text-xl font-medium">{dashboardTranslations.recentTasks.noTasks}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Activités récentes */}
            <TabsContent value="activities" className="space-y-6">
              <motion.div variants={itemVariants}>
                <Card className="border shadow-2xl bg-card rounded-3xl overflow-hidden">
                  <CardHeader className="border-b pb-6">
                    <CardTitle className="flex items-center gap-3 text-2xl font-black text-foreground">
                      <div className="p-2 bg-primary rounded-lg">
                        <Clock className="h-6 w-6 text-primary-foreground" />
                      </div>
                      {dashboardTranslations.recentActivities.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground font-medium text-base">
                      {dashboardTranslations.recentActivities.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-8">
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
                              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className="flex-shrink-0 mt-1">
                                <ActivityIcon type={activity.iconType} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                                <p className="text-sm text-muted-foreground">{activity.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(activity.timestamp)}</p>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Activity className="h-12 w-12 mx-auto mb-4 text-muted" />
                          <p>{dashboardTranslations.recentActivities.noActivities}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        )}

        {/* Dialogue de Personnalisation */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
            <div className="bg-primary p-8 text-primary-foreground">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                  <Settings2 className="h-6 w-6 text-blue-500" />
                  Personnalisation
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/70 font-medium">
                  Configurez votre espace de travail selon vos besoins
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-accent hover:bg-accent/80 transition-colors group">
                  <div className="space-y-1">
                    <Label className="text-base font-bold text-foreground flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-blue-500" />
                      Vue Widget (Personnalisée)
                    </Label>
                    <p className="text-sm text-muted-foreground font-medium">Utiliser des widgets au lieu des onglets classiques</p>
                  </div>
                  <Switch 
                    checked={preferences.useCustomView} 
                    onCheckedChange={(checked) => savePreferences({...preferences, useCustomView: checked})}
                  />
                </div>

                <AnimatePresence>
                  {preferences.useCustomView && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-4 border-t"
                    >
                      <h4 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-4">Widgets Actifs</h4>
                      
                      <div className="flex items-center justify-between p-3 rounded-xl border">
                        <Label className="text-sm font-bold flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-red-500" />
                          Tâches Prioritaires
                        </Label>
                        <Switch 
                          checked={preferences.showPriorityTasks} 
                          onCheckedChange={(checked) => savePreferences({...preferences, showPriorityTasks: checked})}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border">
                        <Label className="text-sm font-bold flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-blue-500" />
                          Calendrier des Échéances
                        </Label>
                        <Switch 
                          checked={preferences.showCalendar} 
                          onCheckedChange={(checked) => savePreferences({...preferences, showCalendar: checked})}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border">
                        <Label className="text-sm font-bold flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          Activités Récentes
                        </Label>
                        <Switch 
                          checked={preferences.showRecentActivities} 
                          onCheckedChange={(checked) => savePreferences({...preferences, showRecentActivities: checked})}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <DialogFooter className="p-8 bg-accent">
              <Button onClick={() => setIsSettingsOpen(false)} className="w-full font-bold py-6 rounded-2xl transition-all">
                Enregistrer les préférences
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
};

const statusColors = {
  assigned: '#3b82f6',
  in_progress: '#111827',
  submitted: '#f97316',
  validated: '#22c55e',
  rejected: '#ef4444'
} as const;

function IntervenantKpiCharts({ allTasks, validationTasks }: { allTasks: any[]; validationTasks: any[] }) {
  const now = useMemo(() => new Date(), []);

  const execOverdue = useMemo(() => {
    return (allTasks || []).filter((t: any) => {
      const d = t.deadline ? new Date(t.deadline) : null;
      return !!d && !isNaN(d.getTime()) && d < now && t.status !== 'validated';
    }).length;
  }, [allTasks, now]);

  const valOverdue = useMemo(() => {
    return (validationTasks || []).filter((t: any) => {
      const d = t.validation_deadline ? new Date(t.validation_deadline) : null;
      return !!d && !isNaN(d.getTime()) && d < now && t.status !== 'validated';
    }).length;
  }, [validationTasks, now]);

  const execCompletionRate = useMemo(() => {
    const total = (allTasks || []).length;
    if (!total) return 0;
    const done = (allTasks || []).filter((t: any) => t.status === 'validated').length;
    return Math.round((done / total) * 100);
  }, [allTasks]);

  const valCompletionRate = useMemo(() => {
    const total = (validationTasks || []).length;
    if (!total) return 0;
    const done = (validationTasks || []).filter((t: any) => t.status === 'validated').length;
    return Math.round((done / total) * 100);
  }, [validationTasks]);

  const execStatusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of allTasks || []) {
      const s = t.status || 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: (statusColors as any)[name] || '#6b7280' }))
      .filter(d => d.value > 0);
  }, [allTasks]);

  const perfBarData = useMemo(() => {
    return [
      { name: 'Exécution', completion: execCompletionRate, overdue: execOverdue },
      { name: 'Validation', completion: valCompletionRate, overdue: valOverdue }
    ];
  }, [execCompletionRate, execOverdue, valCompletionRate, valOverdue]);

  const hasAnyData = (allTasks || []).length > 0 || (validationTasks || []).length > 0;
  if (!hasAnyData) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="border shadow-2xl bg-card rounded-3xl overflow-hidden">
        <CardHeader className="border-b pb-6">
          <CardTitle className="text-xl font-black text-foreground">Répartition (tâches d'exécution)</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">Statuts des tâches où vous êtes exécuteur</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-80">
            {execStatusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={execStatusPieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={2}>
                    {execStatusPieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Aucune donnée</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-2xl bg-card rounded-3xl overflow-hidden">
        <CardHeader className="border-b pb-6">
          <CardTitle className="text-xl font-black text-foreground">Performance</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">Complétion et retards (exécution / validation)</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perfBarData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="completion" name="Complétion (%)" fill="#0f766e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="overdue" name="Retards" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default IntervenantDashboard;