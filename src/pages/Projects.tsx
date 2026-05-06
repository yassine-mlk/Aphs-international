import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, MoreHorizontal, Users, BarChart3, Clock as ClockIcon, 
  Loader2, Trash2, ChevronDown, ChevronRight, Pencil, Check, X, 
  FileText, Save, ArrowLeft, ArrowRight, Layers, Target, Circle, 
  CheckCircle2, AlertTriangle, PlusCircle, ChevronUp 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useProjects } from '@/hooks/useProjects';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import { useNavigate } from 'react-router-dom';
import ImageUpload from '@/components/ImageUpload';
import { Project, ProjectFormData, PROJECT_STATUSES } from '../types/project';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectListSkeleton } from '@/components/Skeletons';
import { ProjectStructureManager } from '@/components/project/ProjectStructureManager';

interface CustomStructureItem {
  phase_id: 'conception' | 'realisation';
  section_id: string;
  subsection_id: string | null;
  is_deleted: boolean;
  project_id: string;
}

interface TenantSection { id: string; title: string; phase: string; order_index: number; items: TenantItem[]; }
interface TenantItem   { id: string; section_id: string; title: string; order_index: number; tasks: TenantTask[]; }
interface TenantTask   { id: string; item_id: string; title: string; order_index: number; info_sheet?: string; }

type ProjectStatItem = {
  memberCount: number;
  taskProgress: number;
  totalTasks: number;
  tasksAssigned: number;
  tasksSubmitted: number;
  tasksValidated: number;
  tasksRejected: number;
};

const Projects: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const { deleteData, updateData } = useSupabase();
  const { createProject } = useProjects();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [maxProjects, setMaxProjects] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStatItem>>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState<ProjectFormData>({
    name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0], // Date d'aujourd'hui par défaut
    end_date: '',
    image_url: '',
    company_id: '',
    status: 'active',
    show_info_sheets: true
  });

  // États pour le formulaire multi-étapes et l'édition de structure
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [newlyCreatedProjectId, setNewlyCreatedProjectId] = useState<string | null>(null);
  
  // Charger tenant_id de l'admin connecté
  useEffect(() => {
    if (status !== 'authenticated' || !user?.id) return;
    supabase
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        if (!profile?.tenant_id) return;
        setTenantId(profile.tenant_id);
        supabase
          .from('tenants')
          .select('max_projects')
          .eq('id', profile.tenant_id)
          .maybeSingle()
          .then(({ data: tenant }) => {
            if (tenant?.max_projects) setMaxProjects(tenant.max_projects);
          });
      });
  }, [user?.id, status]);

  // Charger les projets au chargement de la page
  useEffect(() => {
    if (status === 'authenticated' && user?.id) fetchProjects();
  }, [tenantId, user?.id, status]);

  // Récupérer les projets depuis Supabase
  const fetchProjects = async () => {
    if (status !== 'authenticated') return;
    setLoading(true);
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProjects(data || []);
      
      // Récupérer les statistiques pour chaque projet
      await fetchProjectStats(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les projets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les statistiques des projets (membres et progression) - VERSION OPTIMISÉE
  const fetchProjectStats = async (projectList: Project[]) => {
    if (!projectList || projectList.length === 0) {
      setProjectStats({});
      return;
    }

    const projectIds = projectList.map(p => p.id);
    const stats: Record<string, ProjectStatItem> = {};

    try {
      // Récupérer TOUTES les données en parallèle par batch de 100 projets
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < projectIds.length; i += batchSize) {
        batches.push(projectIds.slice(i, i + batchSize));
      }

      // Accumulateurs pour tous les projets
      const allMembers: any[] = [];
      const allDeletions: CustomStructureItem[] = [];
      const allTasks: any[] = [];
      const allSnapshotTasks: any[] = [];

      // Traiter chaque batch
      for (const batch of batches) {
        const [membersBatch, deletionsBatch, tasksBatch, snapshotTasksBatch] = await Promise.all([
          // Membres pour ce batch
          supabase
            .from('membre')
            .select('id, project_id')
            .in('project_id', batch)
            .then(({ data }) => data || []),
          
          // Suppressions pour ce batch (ancien système)
          supabase
            .from('custom_project_structures')
            .select('phase_id, section_id, subsection_id, is_deleted, project_id')
            .in('project_id', batch)
            .eq('is_deleted', true)
            .then(({ data }) => data || []),
          
          // Tâches pour ce batch
          supabase
            .from('task_assignments_view')
            .select('status, project_id')
            .in('project_id', batch)
            .then(({ data }) => data || []),

          // Tâches snapshot (structure figée) pour ce batch
          supabase
            .from('project_tasks_snapshot')
            .select('id, project_id')
            .in('project_id', batch)
            .then(({ data }) => data || [])
        ]);

        allMembers.push(...membersBatch);
        allDeletions.push(...deletionsBatch);
        allTasks.push(...tasksBatch);
        allSnapshotTasks.push(...snapshotTasksBatch);
      }

      // Grouper les données par projet_id
      const membersByProject = allMembers.reduce((acc, m) => {
        acc[m.project_id] = (acc[m.project_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const deletionsByProject = allDeletions.reduce((acc, d) => {
        if (!acc[d.project_id]) acc[d.project_id] = [];
        acc[d.project_id].push(d);
        return acc;
      }, {} as Record<string, CustomStructureItem[]>);

      const tasksByProject = allTasks.reduce((acc, t) => {
        if (!acc[t.project_id]) acc[t.project_id] = [];
        acc[t.project_id].push(t);
        return acc;
      }, {} as Record<string, any[]>);

      // Compter les tâches snapshot par projet (structure figée)
      const snapshotTasksByProject = allSnapshotTasks.reduce((acc, t) => {
        acc[t.project_id] = (acc[t.project_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculer les stats pour chaque projet
      for (const project of projectList) {
        const members = membersByProject[project.id] || 0;
        const tasks = tasksByProject[project.id] || [];

        const tasksAssigned = tasks.filter((t: any) => t.status === 'assigned' || t.status === 'open').length;
        const tasksSubmitted = tasks.filter((t: any) => t.status === 'submitted' || t.status === 'in_review').length;
        const tasksValidated = tasks.filter((t: any) => ['validated', 'approved', 'vso', 'vao', 'closed'].includes(t.status)).length;
        const tasksRejected = tasks.filter((t: any) => ['rejected', 'var'].includes(t.status)).length;

        // Nombre total de tâches = tâches dans le snapshot (structure figée)
        let totalTasks = snapshotTasksByProject[project.id] || 0;
        
        // Fallback: si pas de snapshot, utiliser les tâches assignées comme approximation
        if (totalTasks === 0) {
          totalTasks = tasks.length;
        }

        const taskProgress = totalTasks > 0 ? Math.round((tasksValidated / totalTasks) * 100) : 0;

        stats[project.id] = {
          memberCount: members,
          taskProgress,
          totalTasks,
          tasksAssigned,
          tasksSubmitted,
          tasksValidated,
          tasksRejected
        };
      }

      setProjectStats(stats);
    } catch (error) {
      // Fallback: stats vides
      for (const project of projectList) {
        stats[project.id] = {
          memberCount: 0,
          taskProgress: 0,
          totalTasks: 0,
          tasksAssigned: 0,
          tasksSubmitted: 0,
          tasksValidated: 0,
          tasksRejected: 0
        };
      }
      setProjectStats(stats);
    }
  };

  // Filtrer les projets selon la recherche
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Ouvrir la boîte de dialogue de création
  const handleCreateProject = () => {
    setCreateStep(1);
    setNewProject({
      name: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      image_url: '',
      company_id: '',
      status: 'active',
      show_info_sheets: true
    });
    setCustomStructure([]);
    setIsCreateDialogOpen(true);
  };

  // Passer à l'étape suivante (Structure) - Crée le projet en base
  const handleNextStep = async () => {
    if (!newProject.name.trim() || !newProject.description.trim() || !newProject.start_date) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    if (newProject.end_date && newProject.end_date < newProject.start_date) {
      toast({
        title: "Erreur",
        description: "La date de fin doit être postérieure à la date de début",
        variant: "destructive",
      });
      return;
    }

    try {
      // Vérifier le quota de projets
      if (tenantId && maxProjects !== null) {
        const { count } = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId);
        if ((count ?? 0) >= maxProjects) {
          toast({
            title: "Quota atteint",
            description: "Vous avez atteint votre limite de création de projets. Veuillez contacter le support.",
            variant: "destructive",
          });
          return;
        }
      }

      // Préparer les données en convertissant les chaînes vides en null pour les champs UUID
      const projectData = {
        ...newProject,
        company_id: newProject.company_id || null,
        end_date: null, // Toujours null lors de la création initiale comme demandé
        tenant_id: tenantId || null,
        status: 'active' as const
      };
      
      // Utiliser createProject qui crée aussi le snapshot de structure (avec structure par défaut)
      const result = await createProject(projectData, user?.id || '', undefined);
      
      if (result) {
        setNewlyCreatedProjectId(result.id);
        setCreateStep(2);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le projet",
        variant: "destructive",
      });
    }
  };

  // Terminer la création (le projet est déjà sauvegardé)
  const handleFinishCreation = () => {
    setIsCreateDialogOpen(false);
    // Réinitialiser le formulaire
    setNewProject({
      name: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      image_url: '',
      company_id: '',
      status: 'active',
      show_info_sheets: true
    });
    setCreateStep(1);
    setNewlyCreatedProjectId(null);
    // Recharger les projets
    fetchProjects();
  };

  // Préparer la modification d'un projet
  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsEditDialogOpen(true);
  };

  // Soumettre les modifications d'un projet
  const handleSubmitEditProject = async () => {
    if (!selectedProject) return;
    
    // Validation des champs obligatoires
    if (!selectedProject.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du projet est obligatoire",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProject.description.trim()) {
      toast({
        title: "Erreur",
        description: "La description du projet est obligatoire",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProject.start_date) {
      toast({
        title: "Erreur",
        description: "La date de début est obligatoire",
        variant: "destructive",
      });
      return;
    }

    // Validation que la date de fin est après la date de début
    if (selectedProject.end_date && selectedProject.end_date < selectedProject.start_date) {
      toast({
        title: "Erreur",
        description: "La date de fin doit être postérieure à la date de début",
        variant: "destructive",
      });
      return;
    }

    // Validation terminée
    
    try {
      const result = await updateData<Project>('projects', selectedProject);
      
      if (result) {
        toast({
          title: "Succès",
          description: "Projet mis à jour avec succès",
        });
        setIsEditDialogOpen(false);
        setSelectedProject(null);
        // Recharger les projets
        fetchProjects();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le projet",
        variant: "destructive",
      });
    }
  };

  // Préparer la suppression d'un projet
  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteDialogOpen(true);
  };

  // Confirmer la suppression d'un projet
  const confirmDeleteProject = async () => {
    if (!selectedProject) return;
    
    try {
      // 1. Nettoyer les données liées au projet (cascade manuelle pour ce qui n'est pas géré par le DB)
      // Note: Les tâches (standard_tasks, workflow_tasks), documents et snapshots 
      // sont automatiquement supprimés via ON DELETE CASCADE dans la base de données.
      
      // Suppression des membres du projet
      await deleteData('membre', selectedProject.id, 'project_id');
      
      // 2. Supprimer le projet lui-même
      // On utilise directement supabase.from('projects') pour plus de clarté
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', selectedProject.id);
      
      if (!deleteError) {
        toast({
          title: "Succès",
          description: "Projet et toutes ses données associées supprimés avec succès",
        });
        setIsDeleteDialogOpen(false);
        setSelectedProject(null);
        // Recharger les projets
        fetchProjects();
      } else {
        throw deleteError;
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du projet:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le projet ou ses données",
        variant: "destructive",
      });
    }
  };

  // Naviguer vers la page de détails du projet
  const handleViewProjectDetails = (project: Project) => {
    navigate(`/dashboard/projets/${project.id}`);
  };

  // Prévenir le clic de l'événement pour les actions du menu déroulant
  const handleDropdownAction = (e: React.MouseEvent, callback: Function) => {
    e.stopPropagation();
    callback();
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Projets</h1>
            <p className="text-muted-foreground">
              Gérez et suivez tous vos projets
            </p>
          </div>
          <Button className="bg-aps-teal hover:bg-aps-navy transition-all active:scale-95" onClick={handleCreateProject}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau Projet
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Rechercher un projet..."
              className="pl-8 focus-visible:ring-aps-teal"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <ProjectListSkeleton />
        ) : (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredProjects.map(project => {
              const stats = projectStats[project.id] || {
                memberCount: 0,
                taskProgress: 0,
                totalTasks: 0,
                tasksAssigned: 0,
                tasksSubmitted: 0,
                tasksValidated: 0,
                tasksRejected: 0
              };
              
              return (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, scale: 0.95 },
                    visible: { opacity: 1, scale: 1 }
                  }}
                  key={project.id}
                >
                  <Card 
                    className="border-0 shadow-md overflow-hidden hover:shadow-xl transition-all cursor-pointer group" 
                    onClick={() => handleViewProjectDetails(project)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg group-hover:text-aps-teal transition-colors">{project.name}</h3>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            project.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                            project.status === 'completed' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            project.status === 'paused' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-red-100 text-red-800 border-red-200'
                          }`}
                        >
                          {project.status === 'active' ? 'Actif' :
                           project.status === 'completed' ? 'Terminé' :
                           project.status === 'paused' ? 'En pause' :
                           project.status === 'cancelled' ? 'Annulé' : project.status}
                        </Badge>
                      </div>
                      
                      {project.image_url && (
                        <div className="mb-4 rounded-xl overflow-hidden aspect-video">
                          <img 
                            src={project.image_url} 
                            alt={project.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              e.currentTarget.src = 'https://placehold.co/600x400?text=Image+indisponible';
                            }}
                          />
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>
                      
                      {/* Statistiques du projet */}
                      <div className="space-y-3">
                        {/* Progression des tâches */}
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <div className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3 text-gray-500" />
                              <span className="text-gray-600">Progression</span>
                            </div>
                            <span className="font-medium">{stats.taskProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.taskProgress}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="bg-aps-teal h-full rounded-full"
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                              Total: {stats.totalTasks}
                            </Badge>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              En attente exécution: {stats.tasksAssigned}
                            </Badge>
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              En attente validation: {stats.tasksSubmitted}
                            </Badge>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Complètes: {stats.tasksValidated}
                            </Badge>
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              À revoir: {stats.tasksRejected}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Nombre d'intervenants */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-600">Intervenants</span>
                          </div>
                          <span className="font-medium">{stats.memberCount}</span>
                        </div>
                        
                        {/* Date de début */}
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          Début: {new Date(project.start_date).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="flex justify-end py-3 px-6 border-t bg-gray-50/50">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-200" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Plus d'options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleDropdownAction(e, () => handleEditProject(project))}>
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => handleDropdownAction(e, () => handleDeleteProject(project))}
                            className="text-red-600"
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {!loading && filteredProjects.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Aucun projet trouvé</h3>
            <p className="text-gray-500">Aucun projet ne correspond à votre recherche.</p>
          </div>
        )}
      </motion.div>

      {/* Boîte de dialogue pour ajouter un nouveau projet */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className={`${createStep === 1 ? 'sm:max-w-[540px]' : 'sm:max-w-[900px]'} max-h-[90vh] flex flex-col transition-all duration-300`}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {createStep === 1 ? 'Créer un nouveau projet' : 'Personnaliser la structure du projet'}
            </DialogTitle>
            <DialogDescription>
              {createStep === 1 
                ? 'Remplissez les informations de base du projet.' 
                : 'Modifiez la structure (étapes, sous-étapes et tâches) pour ce projet spécifique avant sa création.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-1">
            {createStep === 1 ? (
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="name">Nom du projet<span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    placeholder="Ex: Construction Villa ABC"
                    className="focus-visible:ring-aps-teal"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="description">Description<span className="text-red-500">*</span></Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    placeholder="Description détaillée du projet..."
                    className="min-h-[120px] max-h-[200px] resize-none focus-visible:ring-aps-teal"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="start_date">Date de début<span className="text-red-500">*</span></Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newProject.start_date}
                    onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
                    className="focus-visible:ring-aps-teal"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label>Image du projet</Label>
                  <ImageUpload
                    currentImageUrl={newProject.image_url}
                    onImageUploaded={(imageUrl) => setNewProject({...newProject, image_url: imageUrl})}
                    onImageRemoved={() => setNewProject({...newProject, image_url: ''})}
                    bucketName="project-images"
                    folderPath="projects"
                    maxSizeMB={5}
                  />
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-6">
                {newlyCreatedProjectId ? (
                  <ProjectStructureManager projectId={newlyCreatedProjectId} tenantId={tenantId} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-aps-teal" />
                    <p className="text-sm text-muted-foreground italic font-medium">Création du projet...</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2">
            {createStep === 1 ? (
              <>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleNextStep} className="bg-aps-teal hover:bg-aps-navy">
                  Suivant <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleFinishCreation} className="bg-aps-teal hover:bg-aps-navy ml-auto">
                  Terminer
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Boîte de dialogue pour modifier un projet */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Modifier le projet</DialogTitle>
            <DialogDescription>
              Modifiez les informations du projet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="edit-name">Nom du projet<span className="text-red-500">*</span></Label>
                <Input
                  id="edit-name"
                  value={selectedProject?.name || ''}
                  onChange={(e) => setSelectedProject(prev => prev ? {...prev, name: e.target.value} : null)}
                  placeholder="Nom du projet"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="edit-description">Description<span className="text-red-500">*</span></Label>
                <Textarea
                  id="edit-description"
                  value={selectedProject?.description || ''}
                  onChange={(e) => setSelectedProject(prev => prev ? {...prev, description: e.target.value} : null)}
                  placeholder="Description détaillée du projet..."
                  className="min-h-[120px] max-h-[300px] resize-none"
                  required
                />
                <p className="text-xs text-gray-500">
                  Décrivez les objectifs, le contexte et les spécificités du projet
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="edit-start_date">Date de début<span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-start_date"
                    type="date"
                    value={selectedProject?.start_date || ''}
                    onChange={(e) => setSelectedProject(prev => prev ? {...prev, start_date: e.target.value} : null)}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="edit-end_date">Date de fin</Label>
                  <Input
                    id="edit-end_date"
                    type="date"
                    value={selectedProject?.end_date || ''}
                    onChange={(e) => setSelectedProject(prev => prev ? {...prev, end_date: e.target.value || undefined} : null)}
                    min={selectedProject?.start_date}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="edit-status">Statut</Label>
                <select
                  id="edit-status"
                  value={selectedProject?.status || 'active'}
                  onChange={(e) => setSelectedProject(prev => prev ? {...prev, status: e.target.value as Project['status']} : null)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {PROJECT_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <ImageUpload
                currentImageUrl={selectedProject?.image_url || ''}
                onImageUploaded={(imageUrl) => setSelectedProject(prev => prev ? {...prev, image_url: imageUrl} : null)}
                onImageRemoved={() => setSelectedProject(prev => prev ? {...prev, image_url: ''} : null)}
                bucketName="project-images"
                folderPath="projects"
                maxSizeMB={5}
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitEditProject}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Boîte de dialogue pour confirmer la suppression */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce projet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le projet sera définitivement supprimé de la base de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Projects;
