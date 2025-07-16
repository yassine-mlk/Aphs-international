import React, { useState, useEffect } from 'react';
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

  Activity,
  RefreshCw
} from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import { useRecentActivities, type RecentActivity } from '@/hooks/useRecentActivities';
import { ActivityIcon } from '@/components/ActivityIcon';

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



const IntervenantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchData, supabase } = useSupabase();
  const { user } = useAuth();
  const { language } = useLanguage();

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
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Utiliser le hook pour les activités récentes
  const { activities: recentActivities, loading: activitiesLoading } = useRecentActivities();

  // Déterminer le rôle de l'utilisateur pour l'affichage
  const userRole = user?.user_metadata?.role || JSON.parse(localStorage.getItem('user') || '{}')?.role;
  const isMaitreOuvrage = userRole === 'maitre_ouvrage';
  
  // Obtenir les traductions appropriées
  const t = translations[language as keyof typeof translations];
  const dashboardTranslations = isMaitreOuvrage ? t.dashboard.masterOwner : t.dashboard.specialist;


  // Charger les statistiques
  const loadStats = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        console.log('Aucun utilisateur connecté');
        setLoading(false);
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

      // 2. Récupérer toutes les tâches assignées à l'utilisateur
      const tasks = await fetchData('task_assignments', {
        columns: 'id, task_name, status, deadline, project_id',
        filters: [{ column: 'assigned_to', operator: 'eq', value: user.id }]
      }) || [];

      console.log('Tâches récupérées:', tasks);

      // 3. Calculer les statistiques
      const now = new Date();
      const newStats: IntervenantStats = {
        totalTasks: tasks.length,
        assignedTasks: tasks.filter((t: any) => t.status === 'assigned').length,
        inProgressTasks: tasks.filter((t: any) => t.status === 'in_progress').length,
        completedTasks: tasks.filter((t: any) => t.status === 'submitted').length,
        validatedTasks: tasks.filter((t: any) => t.status === 'validated').length,
        overdueTasks: tasks.filter((t: any) => 
          t.deadline && 
          new Date(t.deadline) < now && 
          t.status !== 'validated'
        ).length,
        completionRate: tasks.length > 0 ? Math.round((tasks.filter((t: any) => t.status === 'validated').length / tasks.length) * 100) : 0,
        totalProjects: projects.length,
        activeProjects: projects.filter((p: any) => p.status === 'active' || p.status === 'in_progress').length
      };

      console.log('Statistiques calculées:', newStats);
      setStats(newStats);

      // 4. Préparer les tâches récentes avec noms de projets
      const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));
      const tasksWithProjects: TaskItem[] = tasks.slice(0, 5).map((task: any) => ({
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
      setLastUpdate(new Date());

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
    if (user?.id) {
      loadStats();
    }
  }, [user?.id]);

  // Fonctions utilitaires
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} min`;
    } else if (diffInMinutes < 1440) {
      return `Il y a ${Math.floor(diffInMinutes / 60)} h`;
    } else {
      return `Il y a ${Math.floor(diffInMinutes / 1440)} j`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'submitted':
        return 'bg-purple-100 text-purple-800';
      case 'validated':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {dashboardTranslations.title}
            </h1>
            <p className="text-gray-600 mt-1">
              Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
            </p>
          </div>
          <Button onClick={loadStats} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            {dashboardTranslations.refresh}
          </Button>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Mes Tâches</CardTitle>
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalTasks}</div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {stats.inProgressTasks} {dashboardTranslations.stats.inProgress}
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {stats.validatedTasks} {dashboardTranslations.stats.validated}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Projets</CardTitle>
              <Briefcase className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
              <p className="text-sm text-gray-600 mt-1">
                {stats.activeProjects} projets actifs
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Performance</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.completionRate}%</div>
              <p className="text-sm text-gray-600 mt-1">
                {dashboardTranslations.stats.successRate}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Alertes</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.overdueTasks}</div>
              <p className="text-sm text-red-600 mt-1">
                {dashboardTranslations.stats.overdueTasks}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Onglets avec contenu */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">{dashboardTranslations.recentTasks.title}</TabsTrigger>
            <TabsTrigger value="activities">{dashboardTranslations.recentActivities.title}</TabsTrigger>
          </TabsList>

          {/* Tâches récentes */}
          <TabsContent value="tasks" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-blue-600" />
                  {dashboardTranslations.recentTasks.title}
                </CardTitle>
                <CardDescription>
                  {dashboardTranslations.recentTasks.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTasks.length > 0 ? recentTasks.map((task) => {
                    const deadline = formatDeadline(task.deadline);
                    return (
                      <div key={task.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-gray-900 truncate">{task.task_name}</h3>
                            <Badge variant="secondary" className={getStatusColor(task.status)}>
                              {getStatusLabel(task.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{task.project_name}</p>
                          <p className={`text-xs ${deadline.color} mt-1`}>
                            <Clock className="inline h-3 w-3 mr-1" />
                            {deadline.text}
                          </p>
                        </div>

                      </div>
                    );
                  }) : (
                    <div className="text-center py-8 text-gray-500">
                      <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>{dashboardTranslations.recentTasks.noTasks}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activités récentes */}
          <TabsContent value="activities" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  {dashboardTranslations.recentActivities.title}
                </CardTitle>
                <CardDescription>
                  {dashboardTranslations.recentActivities.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activitiesLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">{dashboardTranslations.loading}</p>
                    </div>
                  ) : recentActivities.length > 0 ? (
                    recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0 mt-1">
                          <ActivityIcon type={activity.iconType} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-500">{activity.description}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>{dashboardTranslations.recentActivities.noActivities}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default IntervenantDashboard; 