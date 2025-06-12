import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, Briefcase, Users, MessageSquare, Video, Activity, CheckCircle, AlertCircle, TrendingUp, Timer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Settings, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useIntervenantStats } from '@/hooks/useIntervenantStats';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Déterminer si l'utilisateur est un administrateur
  const isAdmin = user?.user_metadata?.role === 'admin' || 
                 user?.email === 'admin@aphs.com' || 
                 JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin';

  // Hooks conditionnels selon le rôle
  const adminData = useDashboardStats();
  const intervenantData = useIntervenantStats();

  // Fonction pour naviguer vers une autre page
  const handleNavigate = (path: string) => {
    navigate(path);
  };

  // Fonction pour formater l'heure de dernière mise à jour
  const formatLastUpdate = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Fonction pour obtenir l'icône d'activité
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_created':
        return <Briefcase className="h-4 w-4 text-blue-500" />;
      case 'project_completed':
        return <Briefcase className="h-4 w-4 text-green-500" />;
      case 'task_assigned':
        return <ClipboardCheck className="h-4 w-4 text-orange-500" />;
      case 'task_completed':
      case 'task_validated':
        return <ClipboardCheck className="h-4 w-4 text-green-500" />;
      case 'user_joined':
      case 'project_joined':
        return <Users className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // Rendu conditionnel selon le rôle
  if (isAdmin) {
    return <AdminDashboard data={adminData} navigate={handleNavigate} formatLastUpdate={formatLastUpdate} getActivityIcon={getActivityIcon} />;
  } else {
    return <IntervenantDashboard data={intervenantData} navigate={handleNavigate} getActivityIcon={getActivityIcon} />;
  }
};

// Composant Dashboard pour les administrateurs
const AdminDashboard: React.FC<{
  data: any;
  navigate: (path: string) => void;
  formatLastUpdate: (date: Date) => string;
  getActivityIcon: (type: string) => JSX.Element;
}> = ({ data, navigate, formatLastUpdate, getActivityIcon }) => {
  const { stats, events, chartData, recentActivities, loading, error, lastUpdate, refetch } = data;

  // Si les stats sont en cours de chargement, afficher un loader
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="text-gray-600">Chargement des statistiques...</p>
      </div>
    );
  }

  // Si une erreur s'est produite
  if (error) {
    return (
      <div className="text-center py-12 space-y-4">
        <h3 className="text-lg font-medium mb-4">{error}</h3>
        <div className="space-x-2">
          <Button onClick={refetch} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            Recharger la page
          </Button>
        </div>
      </div>
    );
  }

  // Si les stats n'ont pas pu être chargées
  if (!stats) {
    return (
      <div className="text-center py-12 space-y-4">
        <h3 className="text-lg font-medium mb-4">Aucune donnée disponible</h3>
        <Button onClick={refetch} variant="default">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-1">
              Dernière mise à jour : {formatLastUpdate(lastUpdate)}
            </p>
          )}
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Statistiques Projets */}
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Projets</CardTitle>
            <Briefcase className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeProjects} actifs, {stats.completedProjects} terminés
            </p>
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => navigate('/dashboard/projets')}
              >
                Voir tous les projets
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Statistiques Intervenants */}
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Intervenants</CardTitle>
            <Users className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIntervenants}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeIntervenants} actifs
            </p>
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => navigate('/dashboard/intervenants')}
              >
                Gérer les intervenants
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Statistiques Tâches */}
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Tâches</CardTitle>
            <ClipboardCheck className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTasks} terminées, {stats.pendingTasks} en attente
              {stats.overdueTasks > 0 && (
                <span className="text-red-600 font-medium">
                  , {stats.overdueTasks} en retard
                </span>
              )}
            </p>
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => navigate('/dashboard/tasks')}
              >
                Voir les tâches
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section "Mes actions" */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Accès rapide aux principales fonctionnalités d'administration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => navigate('/dashboard/projets')}
            >
              <Briefcase className="h-6 w-6" />
              <span>Projets</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => navigate('/dashboard/tasks')}
            >
              <ClipboardCheck className="h-6 w-6" />
              <span>Tâches</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => navigate('/dashboard/intervenants')}
            >
              <Users className="h-6 w-6" />
              <span>Intervenants</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => navigate('/dashboard/messages')}
            >
              <MessageSquare className="h-6 w-6" />
              <span>Messages</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => navigate('/dashboard/entreprises')}
            >
              <Briefcase className="h-6 w-6" />
              <span>Entreprises</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => navigate('/dashboard/groupes')}
            >
              <Users className="h-6 w-6" />
              <span>Groupes</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => navigate('/dashboard/video')}
            >
              <Video className="h-6 w-6" />
              <span>Visioconférence</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => navigate('/dashboard/parametres')}
            >
              <Settings className="h-6 w-6" />
              <span>Paramètres</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Composant Dashboard pour les intervenants
const IntervenantDashboard: React.FC<{
  data: any;
  navigate: (path: string) => void;
  getActivityIcon: (type: string) => JSX.Element;
}> = ({ data, navigate, getActivityIcon }) => {
  const { stats, tasks, recentActivities, projects, loading, error, refetch } = data;

  // Si les stats sont en cours de chargement, afficher un loader
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="text-gray-600">Chargement de vos données...</p>
      </div>
    );
  }

  // Si une erreur s'est produite
  if (error) {
    return (
      <div className="text-center py-12 space-y-4">
        <h3 className="text-lg font-medium mb-4">{error}</h3>
        <div className="space-x-2">
          <Button onClick={refetch} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            Recharger la page
          </Button>
        </div>
      </div>
    );
  }

  // Si les stats n'ont pas pu être chargées
  if (!stats) {
    return (
      <div className="text-center py-12 space-y-4">
        <h3 className="text-lg font-medium mb-4">Aucune donnée disponible</h3>
        <Button onClick={refetch} variant="default">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>
    );
  }

  // Obtenir la couleur du badge de statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'validated': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtenir le libellé du statut
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'validated': return 'Validée';
      case 'rejected': return 'Rejetée';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mon tableau de bord</h1>
          <p className="text-muted-foreground">
            Suivi de vos tâches et projets
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques des tâches */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total tâches</CardTitle>
            <ClipboardCheck className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              Toutes vos tâches
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Taux de réussite</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTasks} / {stats.totalTasks} validées
            </p>
            <div className="mt-2">
              <Progress value={stats.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <Timer className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressTasks}</div>
            <p className="text-xs text-muted-foreground">
              Tâches en cours
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">En retard</CardTitle>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
            <p className="text-xs text-muted-foreground">
              Tâches en retard
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mes tâches récentes */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Mes tâches récentes
            </CardTitle>
            <CardDescription>
              Vos 10 dernières tâches assignées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task: any) => (
                    <div key={task.id} className="border rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{task.task_name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{task.project_name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getStatusColor(task.status)}>
                              {getStatusLabel(task.status)}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Échéance: {new Date(task.deadline).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClipboardCheck className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Aucune tâche assignée</p>
                </div>
              )}
            </ScrollArea>
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => navigate('/dashboard/tasks')}
              >
                Voir toutes mes tâches
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activités récentes */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activités récentes
            </CardTitle>
            <CardDescription>
              Vos dernières activités
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {recentActivities.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3 border-b pb-3 last:border-b-0">
                      <div className="mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{activity.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Aucune activité récente</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Mes projets */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Mes projets ({projects.length})
          </CardTitle>
          <CardDescription>
            Projets dans lesquels vous êtes assigné
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project: any) => (
                <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{project.name}</h4>
                    <Badge variant="outline">
                      {project.status === 'active' ? 'Actif' : project.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progression</span>
                      <span>{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{project.completed_tasks} / {project.total_tasks} tâches</span>
                      <span>Début: {new Date(project.start_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Aucun projet assigné</p>
            </div>
          )}
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => navigate('/dashboard/intervenant/projets')}
            >
              Voir tous mes projets
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions rapides pour intervenants */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Accès rapide à vos principales fonctionnalités
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => navigate('/dashboard/tasks')}
            >
              <ClipboardCheck className="h-6 w-6" />
              <span>Mes tâches</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => navigate('/dashboard/intervenant/projets')}
            >
              <Briefcase className="h-6 w-6" />
              <span>Mes projets</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => navigate('/dashboard/messages')}
            >
              <MessageSquare className="h-6 w-6" />
              <span>Messages</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => navigate('/dashboard/video')}
            >
              <Video className="h-6 w-6" />
              <span>Visioconférence</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
