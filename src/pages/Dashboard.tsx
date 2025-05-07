import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, Briefcase, Users, MessageSquare, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Settings } from 'lucide-react';

// Interface pour les statistiques du tableau de bord
interface DashboardStats {
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

// Données d'exemple pour le graphique
const chartData = [
  { mois: 'Jan', projets: 4 },
  { mois: 'Fév', projets: 7 },
  { mois: 'Mar', projets: 5 },
  { mois: 'Avr', projets: 9 },
  { mois: 'Mai', projets: 6 },
  { mois: 'Juin', projets: 8 },
  { mois: 'Juil', projets: 11 },
];

// Événements à venir pour le calendrier
const upcomingEvents = [
  { id: 1, title: 'Réunion équipe projet Alpha', date: '2025-05-05 10:00', type: 'meeting' },
  { id: 2, title: 'Livraison phase 1 - Projet Beta', date: '2025-05-08 09:00', type: 'deadline' },
  { id: 3, title: 'Formation nouveaux intervenants', date: '2025-05-12 14:30', type: 'training' },
  { id: 4, title: 'Appel client Entreprise XYZ', date: '2025-05-04 16:00', type: 'call' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Déterminer si l'utilisateur est un administrateur
  const isAdmin = user?.user_metadata?.role === 'admin' || 
                 user?.email === 'admin@aphs.com' || 
                 JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin';

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      // Simuler un chargement des statistiques du tableau de bord
      setTimeout(() => {
        setStats({
          totalProjects: 24,
          activeProjects: 12,
          completedProjects: 8,
          pendingProjects: 4,
          totalIntervenants: 48,
          activeIntervenants: 32,
          totalTasks: 156,
          completedTasks: 98,
          pendingTasks: 42,
          overdueTasks: 16
        });
        setLoading(false);
      }, 1000);
    };

    fetchDashboardStats();
  }, []);

  // Fonction pour naviguer vers une autre page
  const handleNavigate = (path: string) => {
    navigate(path);
  };

  // Si les stats sont en cours de chargement, afficher un loader
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Si les stats n'ont pas pu être chargées
  if (!stats) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-4">Impossible de charger les statistiques du tableau de bord</h3>
        <Button onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
      
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
              {stats.completedTasks} terminées, {stats.pendingTasks} en attente, {stats.overdueTasks} en retard
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

      {/* Autres sections du tableau de bord... */}
      
      {/* Section "Mes actions" */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-md md:col-span-2">
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
    </div>
  );
};

// Composant pour les cartes statistiques
const StatCard: React.FC<{
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
}> = ({ title, value, description, icon, trend, trendValue }) => {
  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <div className="flex items-baseline mt-1">
              <h3 className="text-3xl font-bold">{value}</h3>
              {trendValue && (
                <span className={`ml-2 text-xs font-medium rounded-full px-1.5 py-0.5 ${
                  trend === 'up' ? 'bg-green-100 text-green-800' : 
                  trend === 'down' ? 'bg-red-100 text-red-800' : 
                  'bg-gray-100 text-gray-800'
                }`}>
                  {trendValue}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <div className="bg-gray-100 rounded-full p-3">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
