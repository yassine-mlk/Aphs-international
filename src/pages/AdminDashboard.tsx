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
  RefreshCw
} from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRecentActivities, type RecentActivity } from '@/hooks/useRecentActivities';
import { ActivityIcon } from '@/components/ActivityIcon';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalIntervenants: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  unassignedTasks: number;
}



const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchData } = useSupabase();
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalIntervenants: 0,
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    unassignedTasks: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Utiliser le hook pour les activités récentes
  const { activities: recentActivities, loading: activitiesLoading } = useRecentActivities();



  // Charger les statistiques
  const loadStats = async () => {
    setLoading(true);
    try {
      // Charger les projets
      const projects = await fetchData('projects', {
        columns: 'id, name, status'
      }) || [];

      // Charger les intervenants
      const intervenants = await fetchData('profiles', {
        columns: 'user_id, role',
        filters: [{ column: 'role', operator: 'neq', value: 'admin' }]
      }) || [];

      // Charger les tâches depuis task_assignments
      const taskAssignments = await fetchData('task_assignments', {
        columns: 'id, status, deadline, assigned_to'
      }) || [];

      // Debug pour vérifier les données
      console.log('Task assignments chargées:', taskAssignments);
      console.log('Nombre de tâches trouvées:', taskAssignments.length);

      // Calculer les statistiques
      const now = new Date();
      const newStats: DashboardStats = {
        totalProjects: projects.length,
        activeProjects: projects.filter((p: any) => p.status === 'active' || p.status === 'in_progress' || p.status === 'assigned').length,
        completedProjects: projects.filter((p: any) => p.status === 'completed' || p.status === 'finalized').length,
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
        unassignedTasks: taskAssignments.filter((t: any) => !t.assigned_to || t.assigned_to.length === 0).length
      };

      console.log('Statistiques calculées:', newStats);

      setStats(newStats);
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
    loadStats();
  }, []);

  // Fonction pour formater la date
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



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Chargement du tableau de bord...</p>
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
            <h1 className="text-4xl font-black text-black tracking-tight">
              Tableau de Bord
            </h1>
            <p className="text-gray-500 mt-2 font-medium">
              Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
            </p>
          </div>
          <Button 
            onClick={loadStats} 
            variant="outline" 
            className="flex items-center gap-2 border-black text-black hover:bg-black hover:text-white transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-xl bg-white rounded-2xl overflow-hidden">
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
                <Badge variant="secondary" className="bg-black text-white hover:bg-gray-800">
                  {stats.completedProjects} terminés
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white rounded-2xl overflow-hidden">
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

          <Card className="border-0 shadow-xl bg-white rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-50">
              <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tâches</CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-4xl font-black text-black">{stats.totalTasks}</div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-bold">
                  {stats.pendingTasks} en cours
                </Badge>
                <Badge variant="secondary" className="bg-gray-100 text-black font-bold">
                  {stats.completedTasks} validées
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white rounded-2xl overflow-hidden">
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
        </div>

          {/* Activités récentes */}
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
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Chargement des activités...</p>
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
                      <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucune activité récente</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
      </div>
    </div>
  );
};

export default AdminDashboard; 