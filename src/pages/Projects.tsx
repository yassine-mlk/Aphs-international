import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, Users, BarChart3 } from 'lucide-react';
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
import ProjectsLanguageSelector from '@/components/ProjectsLanguageSelector';
import ImageUpload from '@/components/ImageUpload';
import { Project, ProjectFormData, PROJECT_STATUSES } from '../types/project';

const Projects: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { fetchData, insertData, updateData, deleteData } = useSupabase();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectStats, setProjectStats] = useState<{[projectId: string]: {memberCount: number, taskProgress: number}}>({});
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
    status: 'active'
  });
  
  // Charger les projets au chargement de la page
  useEffect(() => {
    fetchProjects();
  }, []);

  // Récupérer les projets depuis Supabase
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchData<Project>('projects', {
        columns: '*',
        order: { column: 'created_at', ascending: false }
      });
      setProjects(data);
      
      // Récupérer les statistiques pour chaque projet
      await fetchProjectStats(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des projets:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les projets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les statistiques des projets (membres et progression)
  const fetchProjectStats = async (projectList: Project[]) => {
    const stats: {[projectId: string]: {memberCount: number, taskProgress: number}} = {};
    
    for (const project of projectList) {
      try {
        // Récupérer le nombre de membres
        const members = await fetchData<any>('membre', {
          columns: 'id',
          filters: [{ column: 'project_id', operator: 'eq', value: project.id }]
        });
        
        // Récupérer les tâches et leur progression
        const tasks = await fetchData<any>('task_assignments', {
          columns: 'status',
          filters: [{ column: 'project_id', operator: 'eq', value: project.id }]
        });
        
        const memberCount = members ? members.length : 0;
        const totalTasks = tasks ? tasks.length : 0;
        const completedTasks = tasks ? tasks.filter((task: any) => task.status === 'validated').length : 0;
        const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        stats[project.id] = {
          memberCount,
          taskProgress
        };
      } catch (error) {
        console.error(`Erreur lors de la récupération des stats pour le projet ${project.id}:`, error);
        stats[project.id] = { memberCount: 0, taskProgress: 0 };
      }
    }
    
    setProjectStats(stats);
  };

  // Filtrer les projets selon la recherche
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Ouvrir la boîte de dialogue de création
  const handleCreateProject = () => {
    setIsCreateDialogOpen(true);
  };

  // Soumettre le nouveau projet
  const handleSubmitNewProject = async () => {
    // Validation des champs obligatoires
    if (!newProject.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du projet est obligatoire",
        variant: "destructive",
      });
      return;
    }

    if (!newProject.description.trim()) {
      toast({
        title: "Erreur",
        description: "La description du projet est obligatoire",
        variant: "destructive",
      });
      return;
    }

    if (!newProject.start_date) {
      toast({
        title: "Erreur",
        description: "La date de début est obligatoire",
        variant: "destructive",
      });
      return;
    }

    // Validation que la date de fin est après la date de début
    if (newProject.end_date && newProject.end_date < newProject.start_date) {
      toast({
        title: "Erreur",
        description: "La date de fin doit être postérieure à la date de début",
        variant: "destructive",
      });
      return;
    }

    // Validation des champs de base uniquement

    try {
      // Préparer les données en convertissant les chaînes vides en null pour les champs UUID
      const projectData = {
        ...newProject,
        company_id: newProject.company_id || null,
        end_date: newProject.end_date || null,
        created_by: user?.id || null,
        created_at: new Date().toISOString()
      };
      
      const result = await insertData<Project>('projects', projectData);
      
      if (result) {
        toast({
          title: "Succès",
          description: "Projet créé avec succès",
        });
        setIsCreateDialogOpen(false);
        // Réinitialiser le formulaire
        setNewProject({
          name: '',
          description: '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          image_url: '',
          company_id: '',
          status: 'active'
        });
        // Recharger les projets
        fetchProjects();
      }
    } catch (error) {
      console.error('Erreur lors de la création du projet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le projet",
        variant: "destructive",
      });
    }
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
      console.error('Erreur lors de la mise à jour du projet:', error);
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
      const success = await deleteData('projects', selectedProject.id);
      
      if (success) {
        toast({
          title: "Succès",
          description: "Projet supprimé avec succès",
        });
        setIsDeleteDialogOpen(false);
        setSelectedProject(null);
        // Recharger les projets
        fetchProjects();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le projet",
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Projets</h1>
          <ProjectsLanguageSelector currentLanguage="fr" />
          <p className="text-muted-foreground">
            Gérez et suivez tous vos projets
          </p>
        </div>
        <Button className="bg-aphs-teal hover:bg-aphs-navy" onClick={handleCreateProject}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau Projet
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Rechercher un projet..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map(project => {
            const stats = projectStats[project.id] || { memberCount: 0, taskProgress: 0 };
            
            return (
              <Card key={project.id} className="border-0 shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewProjectDetails(project)}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg">{project.name}</h3>
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
                    <div className="mb-4 rounded overflow-hidden">
                      <img 
                        src={project.image_url} 
                        alt={project.name} 
                        className="w-full h-40 object-cover"
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
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-aphs-teal h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${stats.taskProgress}%` }}
                        ></div>
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
                    <div className="text-xs text-gray-500">
                      Début: {new Date(project.start_date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-end py-3 px-6 border-t bg-gray-50">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
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
            );
          })}
        </div>
      )}

      {!loading && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">Aucun projet trouvé</h3>
          <p className="text-gray-500">Aucun projet ne correspond à votre recherche.</p>
        </div>
      )}

      {/* Boîte de dialogue pour ajouter un nouveau projet */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Créer un nouveau projet</DialogTitle>
            <DialogDescription>
              Remplissez le formulaire ci-dessous pour créer un nouveau projet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="name">Nom du projet<span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  placeholder="Nom du projet"
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
                  className="min-h-[120px] max-h-[300px] resize-none"
                  required
                />
                <p className="text-xs text-gray-500">
                  Décrivez les objectifs, le contexte et les spécificités du projet
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="start_date">Date de début<span className="text-red-500">*</span></Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newProject.start_date}
                    onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="end_date">Date de fin</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newProject.end_date || ''}
                    onChange={(e) => setNewProject({...newProject, end_date: e.target.value || undefined})}
                    min={newProject.start_date}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="status">Statut</Label>
                <select
                  id="status"
                  value={newProject.status}
                  onChange={(e) => setNewProject({...newProject, status: e.target.value as Project['status']})}
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
                currentImageUrl={newProject.image_url}
                onImageUploaded={(imageUrl) => setNewProject({...newProject, image_url: imageUrl})}
                onImageRemoved={() => setNewProject({...newProject, image_url: ''})}
                bucketName="project-images"
                folderPath="projects"
                maxSizeMB={5}
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitNewProject}>Créer</Button>
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
    </div>
  );
};

export default Projects;
