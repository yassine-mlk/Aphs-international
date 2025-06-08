import React, { useState, useEffect } from 'react';
import { useProjects } from '../hooks/useProjects';
import { Project, ProjectFormData } from '../types/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Calendar } from 'lucide-react';

// Exemple d'utilisation du hook useProjects
const ProjectsExample: React.FC = () => {
  const {
    loading,
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    searchProjects
  } = useProjects();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Formulaire pour nouveau projet
  const [newProjectForm, setNewProjectForm] = useState<ProjectFormData>({
    name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    image_url: '',
    company_id: '',
    status: 'active'
  });

  // Charger les projets au montage du composant
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const projectsData = await getProjects();
    setProjects(projectsData);
  };

  // Gérer la recherche
  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      const searchResults = await searchProjects(term);
      setProjects(searchResults);
    } else {
      loadProjects();
    }
  };

  // Créer un nouveau projet
  const handleCreateProject = async () => {
    // Dans un vrai projet, vous obtiendriez l'ID utilisateur depuis le contexte d'authentification
    const currentUserId = 'user-uuid-here'; // À remplacer par l'ID réel de l'utilisateur connecté
    
    const result = await createProject(newProjectForm, currentUserId);
    if (result) {
      setIsCreateDialogOpen(false);
      setNewProjectForm({
        name: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        image_url: '',
        company_id: '',
        status: 'active'
      });
      loadProjects();
    }
  };

  // Mettre à jour un projet
  const handleUpdateProject = async () => {
    if (!selectedProject) return;
    
    const result = await updateProject(selectedProject.id, {
      name: selectedProject.name,
      description: selectedProject.description,
      start_date: selectedProject.start_date,
      end_date: selectedProject.end_date,
      image_url: selectedProject.image_url,
      company_id: selectedProject.company_id,
      status: selectedProject.status
    });
    
    if (result) {
      setIsEditDialogOpen(false);
      setSelectedProject(null);
      loadProjects();
    }
  };

  // Supprimer un projet
  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      const success = await deleteProject(projectId);
      if (success) {
        loadProjects();
      }
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête avec recherche et bouton d'ajout */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Projets</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Rechercher des projets..."
              className="pl-8 w-64"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau projet
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Grille des projets */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  {project.name}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedProject(project);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.image_url && (
                  <img
                    src={project.image_url}
                    alt={project.name}
                    className="w-full h-32 object-cover rounded mb-4"
                  />
                )}
                <p className="text-gray-600 mb-4">{project.description}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>Début: {new Date(project.start_date).toLocaleDateString()}</span>
                </div>
                {project.end_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>Fin: {new Date(project.end_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    project.status === 'active' ? 'bg-green-100 text-green-800' :
                    project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    project.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {project.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de création */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Créer un nouveau projet</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom du projet</Label>
              <Input
                id="name"
                value={newProjectForm.name}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newProjectForm.description}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="start_date">Date de début</Label>
              <Input
                id="start_date"
                type="date"
                value={newProjectForm.start_date}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, start_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end_date">Date de fin (optionnelle)</Label>
              <Input
                id="end_date"
                type="date"
                value={newProjectForm.end_date}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, end_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image_url">URL de l'image</Label>
              <Input
                id="image_url"
                value={newProjectForm.image_url}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, image_url: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={newProjectForm.status} onValueChange={(value: any) => setNewProjectForm({ ...newProjectForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="paused">En pause</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateProject}>
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Modifier le projet</DialogTitle>
          </DialogHeader>
          {selectedProject && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nom du projet</Label>
                <Input
                  id="edit-name"
                  value={selectedProject.name}
                  onChange={(e) => setSelectedProject({ ...selectedProject, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={selectedProject.description}
                  onChange={(e) => setSelectedProject({ ...selectedProject, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-start_date">Date de début</Label>
                <Input
                  id="edit-start_date"
                  type="date"
                  value={selectedProject.start_date.split('T')[0]}
                  onChange={(e) => setSelectedProject({ ...selectedProject, start_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-end_date">Date de fin</Label>
                <Input
                  id="edit-end_date"
                  type="date"
                  value={selectedProject.end_date?.split('T')[0] || ''}
                  onChange={(e) => setSelectedProject({ ...selectedProject, end_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-image_url">URL de l'image</Label>
                <Input
                  id="edit-image_url"
                  value={selectedProject.image_url || ''}
                  onChange={(e) => setSelectedProject({ ...selectedProject, image_url: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Statut</Label>
                <Select value={selectedProject.status} onValueChange={(value: any) => setSelectedProject({ ...selectedProject, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="paused">En pause</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateProject}>
              Sauvegarder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsExample; 