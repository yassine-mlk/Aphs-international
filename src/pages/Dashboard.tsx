import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, Briefcase, Users, MessageSquare, Video, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Settings, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDashboardStats } from '@/hooks/useDashboardStats';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, events, chartData, recentActivities, loading, error, lastUpdate, refetch } = useDashboardStats();

  // Déterminer si l'utilisateur est un administrateur
  const isAdmin = user?.user_metadata?.role === 'admin' || 
                 user?.email === 'admin@aphs.com' || 
                 JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin';

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
        return <ClipboardCheck className="h-4 w-4 text-green-500" />;
      case 'user_joined':
        return <Users className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

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
        {/* Statistiques Projets - Visible uniquement aux administrateurs */}
        {isAdmin && (
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
                  onClick={() => handleNavigate('/dashboard/projets')}
                >
                  Voir tous les projets
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Statistiques Intervenants - Visible uniquement aux administrateurs */}
        {isAdmin && (
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
                  onClick={() => handleNavigate('/dashboard/intervenants')}
                >
                  Gérer les intervenants
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Statistiques Tâches - Visible à tous les utilisateurs */}
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
                onClick={() => handleNavigate('/dashboard/tasks')}
              >
                Voir mes tâches
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicateurs de performance - Visible uniquement aux administrateurs */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Taux de complétion</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                  </p>
                </div>
                <ClipboardCheck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Projets actifs</p>
                  <p className="text-2xl font-bold text-green-900">{stats.activeProjects}</p>
                </div>
                <Briefcase className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Intervenants actifs</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.activeIntervenants}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-gradient-to-r from-red-50 to-red-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Tâches en retard</p>
                  <p className="text-2xl font-bold text-red-900">{stats.overdueTasks}</p>
                </div>
                <Clock className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Graphique et activités récentes - Visible uniquement aux administrateurs */}
      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Graphique des tâches accomplies par mois */}
          <Card className="border-0 shadow-md lg:col-span-2">
            <CardHeader>
              <CardTitle>Accomplissement des tâches par mois</CardTitle>
              <CardDescription>
                Nombre de tâches terminées par mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => `Mois: ${label}`}
                      formatter={(value) => [`${value}`, 'Tâches terminées']}
                    />
                    <Bar dataKey="projets" fill="#10b981" name="Tâches terminées" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Activités récentes - Admin */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Activités récentes</CardTitle>
              <CardDescription>
                Dernières activités sur la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length > 0 ? (
                  recentActivities.slice(0, 4).map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {activity.description}
                        </p>
                        {activity.project_name && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {activity.project_name}
                          </Badge>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Aucune activité récente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activités récentes pour tous les utilisateurs - Visible à tous */}
      {!isAdmin && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Activités récentes</CardTitle>
            <CardDescription>
              Dernières activités sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {activity.project_name && `Projet: ${activity.project_name}`}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucune activité récente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Événements à venir - Maintenant affiché seulement pour les admins dans une section séparée */}
      {isAdmin && events.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Événements à venir</CardTitle>
            <CardDescription>
              Prochaines échéances et réunions importantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {event.type === 'meeting' && <Calendar className="h-5 w-5 text-blue-500" />}
                    {event.type === 'deadline' && <Clock className="h-5 w-5 text-red-500" />}
                    {event.type === 'training' && <Users className="h-5 w-5 text-green-500" />}
                    {event.type === 'call' && <Video className="h-5 w-5 text-purple-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {event.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(event.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section "Mes actions" */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Mes actions</CardTitle>
          <CardDescription>
            Accès rapide aux principales fonctionnalités
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {/* Bouton Projets - Visible uniquement aux administrateurs */}
            {isAdmin && (
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
                onClick={() => handleNavigate('/dashboard/projets')}
              >
                <Briefcase className="h-6 w-6" />
                <span>Projets</span>
              </Button>
            )}
            
            {/* Bouton Tâches - Visible à tous les utilisateurs */}
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => handleNavigate('/dashboard/tasks')}
            >
              <ClipboardCheck className="h-6 w-6" />
              <span>Mes tâches</span>
            </Button>
            
            {/* Bouton Intervenants - Visible uniquement aux administrateurs */}
            {isAdmin && (
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
                onClick={() => handleNavigate('/dashboard/intervenants')}
              >
                <Users className="h-6 w-6" />
                <span>Intervenants</span>
              </Button>
            )}
            
            {/* Bouton Messages - Visible à tous les utilisateurs */}
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => handleNavigate('/dashboard/messages')}
            >
              <MessageSquare className="h-6 w-6" />
              <span>Messages</span>
            </Button>
            
            {/* Bouton Visioconférence - Visible à tous les utilisateurs */}
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => handleNavigate('/dashboard/video')}
            >
              <Video className="h-6 w-6" />
              <span>Visioconférence</span>
            </Button>
            
            {/* Bouton Paramètres - Visible à tous les utilisateurs */}
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50"
              onClick={() => handleNavigate('/dashboard/parametres')}
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

export default Dashboard;
