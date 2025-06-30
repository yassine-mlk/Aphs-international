import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { 
  Briefcase, 
  Calendar, 
  Search, 
  Eye, 
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  User
} from "lucide-react";
import { useSupabase } from "../hooks/useSupabase";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

// Types
interface Project {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date?: string;
  status: string;
  created_at: string;
  image_url?: string;
}

interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  added_at: string;
  project?: Project;
}

interface TaskAssignment {
  id: string;
  project_id: string;
  assigned_to: string;
  status: string;
}

const IntervenantProjects: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchData } = useSupabase();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskStats, setTaskStats] = useState<{[projectId: string]: {total: number, completed: number}}>({});

  const t = translations[language as keyof typeof translations].projects;

  // Charger les projets auxquels l'intervenant est assigné
  useEffect(() => {
    const fetchUserProjects = async () => {
      if (!user) {
        console.log('Aucun utilisateur connecté');
        return;
      }
      
      console.log('Récupération des projets pour l\'utilisateur:', user.id);
      setLoading(true);
      try {
        // Récupérer les projets dont l'utilisateur est membre
        const memberData = await fetchData<ProjectMember>('membre', {
          columns: '*',
          filters: [{ column: 'user_id', operator: 'eq', value: user.id }]
        });
        
        console.log('Données membres récupérées:', memberData);
        
        if (memberData && memberData.length > 0) {
          // Récupérer les détails des projets
          const projectIds = memberData
            .map(member => member.project_id)
            .filter(id => id && typeof id === 'string' && id.trim() !== ''); // Filtrer les IDs valides
          
          console.log('IDs des projets à récupérer:', projectIds);
          
          if (projectIds.length === 0) {
            console.log('Aucun ID de projet valide trouvé');
            setProjects([]);
            setTaskStats({});
            return;
          }
          
          // Utiliser une requête directe Supabase au lieu du helper générique pour le filtre 'in'
          const { data: projectsData, error } = await supabase
            .from('projects')
            .select('*')
            .in('id', projectIds);
          
          if (error) {
            console.error('Erreur lors de la récupération des données depuis projects:', error);
            throw error;
          }
          
          console.log('Projets récupérés:', projectsData);
        
          if (projectsData) {
            setProjects(projectsData);
            
            // Calculer les statistiques des tâches pour chaque projet
            const stats: {[projectId: string]: {total: number, completed: number}} = {};
            for (const project of projectsData) {
              const tasks = await fetchData<TaskAssignment>('task_assignments', {
                columns: 'id,status',
                filters: [{ column: 'project_id', operator: 'eq', value: project.id }]
              });
              
              if (tasks) {
                stats[project.id] = {
                  total: tasks.length,
                  completed: tasks.filter(task => task.status === 'validated').length
                };
              }
            }
            setTaskStats(stats);
          }
        } else {
          console.log('Aucun projet trouvé pour cet utilisateur');
          setProjects([]);
          setTaskStats({});
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des projets:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger vos projets",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProjects();
  }, [user, fetchData, toast]);

  // Filtrer les projets selon la recherche
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ouvrir les détails d'un projet
  const handleViewProject = (projectId: string) => {
    navigate(`/dashboard/intervenant/projets/${projectId}`);
  };

  // Obtenir la couleur du badge de statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtenir l'icône du statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'paused': return <AlertCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Obtenir le libellé du statut
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t.status.active;
      case 'completed': return t.status.completed;
      case 'paused': return t.status.paused;
      case 'cancelled': return t.status.cancelled;
      default: return status;
    }
  };

  // Calculer le pourcentage de progression
  const getProgress = (projectId: string) => {
    const stats = taskStats[projectId];
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground">
            {t.subtitle}
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          <User className="h-4 w-4 mr-1" />
          {t.specialistMode}
        </Badge>
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder={t.search.placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredProjects.length} {t.search.results}
        </div>
      </div>

      {/* Liste des projets */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? t.empty.noResults : t.empty.noProjects}
          </h3>
          <p className="text-gray-500">
            {searchQuery ? t.empty.noResultsDesc : t.empty.noProjectsDesc}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const progress = getProgress(project.id);
            const stats = taskStats[project.id] || { total: 0, completed: 0 };
            
            return (
              <Card key={project.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-bold text-gray-800 line-clamp-2">
                      {project.name}
                    </CardTitle>
                    <Badge className={`ml-2 text-xs ${getStatusColor(project.status)}`}>
                      {getStatusIcon(project.status)}
                      <span className="ml-1">{getStatusLabel(project.status)}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {project.description}
                  </p>
                  
                  {/* Informations du projet */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      {t.card.startDate}: {new Date(project.start_date).toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'ar' ? 'ar-SA' : 'en-US')}
                    </div>
                    
                    {/* Progression des tâches */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t.card.progress}</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-aphs-teal h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>{stats.completed} / {stats.total} {t.card.tasksCompleted}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center text-xs text-gray-500">
                      <Users className="h-3 w-3 mr-1" />
                      {t.card.member}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewProject(project.id)}
                      className="text-aphs-teal border-aphs-teal hover:bg-aphs-teal hover:text-white"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {t.card.view}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IntervenantProjects; 