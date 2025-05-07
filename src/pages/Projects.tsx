import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, Calendar } from 'lucide-react';
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
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import ProjectsLanguageSelector from '@/components/ProjectsLanguageSelector';

// Interface pour le type de projet
interface Project {
  id: string;
  name: string;
  description: string;
  start_date: string;
  image_url?: string;
  created_at: string;
}

const Projects: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { fetchData, insertData, updateData, deleteData } = useSupabase();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    image_url: ''
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

    try {
      const result = await insertData<Project>('projects', {
        ...newProject,
        created_at: new Date().toISOString()
      });
      
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
          start_date: format(new Date(), 'yyyy-MM-dd'),
          image_url: ''
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
    
    try {
      const result = await updateData<Project>('projects', selectedProject.id, {
        ...selectedProject
      });
      
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
          {filteredProjects.map(project => (
            <Card key={project.id} className="border-0 shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewProjectDetails(project)}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{project.name}</h3>
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
                
                <p className="text-sm text-gray-500 mb-4">{project.description}</p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="bg-gray-100 p-1 rounded">
                      <Calendar className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="text-gray-600">
                      Date de début: {new Date(project.start_date).toLocaleDateString('fr-FR')}
                    </div>
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
          ))}
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
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Créer un nouveau projet</DialogTitle>
            <DialogDescription>
              Remplissez le formulaire ci-dessous pour créer un nouveau projet.
            </DialogDescription>
          </DialogHeader>
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
                placeholder="Description du projet"
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
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="image_url">Image (optionnelle)</Label>
              <Input
                id="image_url"
                type="url"
                value={newProject.image_url}
                onChange={(e) => setNewProject({...newProject, image_url: e.target.value})}
                placeholder="URL de l'image du projet"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitNewProject}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Boîte de dialogue pour modifier un projet */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Modifier le projet</DialogTitle>
            <DialogDescription>
              Modifiez les informations du projet.
            </DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="edit-name">Nom du projet<span className="text-red-500">*</span></Label>
                <Input
                  id="edit-name"
                  value={selectedProject.name}
                  onChange={(e) => setSelectedProject({...selectedProject, name: e.target.value})}
                  placeholder="Nom du projet"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="edit-description">Description<span className="text-red-500">*</span></Label>
                <Textarea
                  id="edit-description"
                  value={selectedProject.description}
                  onChange={(e) => setSelectedProject({...selectedProject, description: e.target.value})}
                  placeholder="Description du projet"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="edit-start_date">Date de début<span className="text-red-500">*</span></Label>
                <Input
                  id="edit-start_date"
                  type="date"
                  value={selectedProject.start_date.split('T')[0]}
                  onChange={(e) => setSelectedProject({...selectedProject, start_date: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="edit-image_url">Image (optionnelle)</Label>
                <Input
                  id="edit-image_url"
                  type="url"
                  value={selectedProject.image_url || ''}
                  onChange={(e) => setSelectedProject({...selectedProject, image_url: e.target.value})}
                  placeholder="URL de l'image du projet"
                />
                {selectedProject.image_url && (
                  <div className="mt-2 rounded overflow-hidden">
                    <img 
                      src={selectedProject.image_url} 
                      alt={selectedProject.name} 
                      className="w-full h-40 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://placehold.co/600x400?text=Image+indisponible';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
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
