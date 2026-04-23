import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [memberRolesByProjectId, setMemberRolesByProjectId] = useState<Record<string, string>>({});

  const t = translations[language as keyof typeof translations].projects;

  // Charger les projets auxquels l'intervenant est assigné
  const loadProjects = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!user?.id) {
      return;
    }

    if (!silent) setLoading(true);
    try {
      // Récupérer les projets dont l'utilisateur est membre
      const memberData = await fetchData<ProjectMember>('membre', {
        columns: '*',
        filters: [{ column: 'user_id', operator: 'eq', value: user.id }]
      });

      if (memberData && memberData.length > 0) {
        const rolesMap: Record<string, string> = {};
        for (const m of memberData) {
          if (m.project_id) rolesMap[m.project_id] = m.role;
        }
        setMemberRolesByProjectId(rolesMap);

        const projectIds = memberData
          .map(member => member.project_id)
          .filter(id => id && typeof id === 'string' && id.trim() !== '');

        if (projectIds.length === 0) {
          setProjects([]);
          setTaskStats({});
          if (!silent) setLoading(false);
          return;
        }

        const { data: projectsData, error } = await supabase
          .from('projects')
          .select('*')
          .in('id', projectIds);

        if (error) throw error;

        if (projectsData) {
          setProjects(projectsData);

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
        setProjects([]);
        setTaskStats({});
        setMemberRolesByProjectId({});
      }
    } catch (error) {
      if (!silent) {
        toast({
          title: "Erreur",
          description: "Impossible de charger vos projets",
          variant: "destructive",
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user?.id, fetchData, supabase, toast]);

  // Ref pour stabiliser sans recréer la subscription
  const loadProjectsRef = useRef(loadProjects);
  useEffect(() => {
    loadProjectsRef.current = loadProjects;
  }, [loadProjects]);

  const projectsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSilentReload = useCallback(() => {
    if (projectsTimerRef.current) clearTimeout(projectsTimerRef.current);
    projectsTimerRef.current = setTimeout(() => {
      loadProjectsRef.current({ silent: true });
    }, 600);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    loadProjects();

    const channel = supabase
      .channel(`intervenant-projects-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'membre', filter: `user_id=eq.${user.id}` }, scheduleSilentReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, scheduleSilentReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, scheduleSilentReload)
      .subscribe();

    return () => {
      if (projectsTimerRef.current) clearTimeout(projectsTimerRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Filtrer les projets selon la recherche
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ouvrir les détails d'un projet
  const handleViewProject = (projectId: string) => {
    const role = memberRolesByProjectId[projectId];
    if (role === 'viewer') {
      toast({
        title: "Accès limité",
        description: "Votre accès aux détails de ce projet est désactivé. Contactez un administrateur.",
        variant: "destructive",
      });
      return;
    }
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aps-teal"></div>
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
            const stats = taskStats[project.id] || { total: 0, completed: 0 };
            const progress = getProgress(project.id);

            return (
              <Card key={project.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-bold text-gray-800 line-clamp-2">
                      {project.name}
                    </CardTitle>
                    <div className="flex justify-between items-start">
                      <Badge className={getStatusColor(project.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(project.status)}
                          {getStatusLabel(project.status)}
                        </span>
                      </Badge>

                      {memberRolesByProjectId[project.id] === 'viewer' && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                          Accès limité
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Image du projet */}
                  {project.image_url && (
                    <div className="mb-4 rounded overflow-hidden">
                      <img
                        src={project.image_url}
                        alt={project.name}
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          const fallbackText = language === 'en' ? 'Image+unavailable' :
                            language === 'es' ? 'Imagen+no+disponible' :
                              language === 'ar' ? 'الصورة+غير+متوفرة' :
                                'Image+indisponible';
                          e.currentTarget.src = `https://placehold.co/600x400?text=${fallbackText}`;
                        }}
                      />
                    </div>
                  )}

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
                          className="bg-aps-teal h-2 rounded-full transition-all duration-300"
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
                      className="text-aps-teal border-aps-teal hover:bg-aps-teal hover:text-white"
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