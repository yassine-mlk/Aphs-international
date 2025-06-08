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

// Interface para el tipo de proyecto
interface Project {
  id: string;
  name: string;
  description: string;
  start_date: string;
  image_url?: string;
  created_at: string;
}

const ProjectsEs: React.FC = () => {
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
  
  // Cargar proyectos cuando se carga la página
  useEffect(() => {
    fetchProjects();
  }, []);

  // Obtener proyectos desde Supabase
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchData<Project>('projects', {
        columns: '*',
        order: { column: 'created_at', ascending: false }
      });
      setProjects(data);
    } catch (error) {
      console.error('Error al cargar los proyectos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los proyectos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar proyectos según la búsqueda
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Abrir el diálogo de creación
  const handleCreateProject = () => {
    setIsCreateDialogOpen(true);
  };

  // Enviar nuevo proyecto
  const handleSubmitNewProject = async () => {
    // Validación de campos obligatorios
    if (!newProject.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del proyecto es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!newProject.description.trim()) {
      toast({
        title: "Error",
        description: "La descripción del proyecto es obligatoria",
        variant: "destructive",
      });
      return;
    }

    if (!newProject.start_date) {
      toast({
        title: "Error",
        description: "La fecha de inicio es obligatoria",
        variant: "destructive",
      });
      return;
    }

    try {
      // Exclure image_url car cette colonne n'existe pas dans la table projects
      const { image_url, ...projectData } = newProject;
      const result = await insertData<Project>('projects', {
        ...projectData,
        created_at: new Date().toISOString()
      });
      
      if (result) {
        toast({
          title: "Éxito",
          description: "Proyecto creado correctamente",
        });
        setIsCreateDialogOpen(false);
        // Reiniciar formulario
        setNewProject({
          name: '',
          description: '',
          start_date: format(new Date(), 'yyyy-MM-dd'),
          image_url: ''
        });
        // Recargar proyectos
        fetchProjects();
      }
    } catch (error) {
      console.error('Error al crear el proyecto:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el proyecto",
        variant: "destructive",
      });
    }
  };

  // Preparar para editar un proyecto
  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsEditDialogOpen(true);
  };

  // Enviar ediciones del proyecto
  const handleSubmitEditProject = async () => {
    if (!selectedProject) return;
    
    // Validación de campos obligatorios
    if (!selectedProject.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del proyecto es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProject.description.trim()) {
      toast({
        title: "Error",
        description: "La descripción del proyecto es obligatoria",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProject.start_date) {
      toast({
        title: "Error",
        description: "La fecha de inicio es obligatoria",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Exclure image_url car cette colonne n'existe pas dans la table projects
      const { image_url, ...projectData } = selectedProject;
      const result = await updateData<Project>('projects', projectData);
      
      if (result) {
        toast({
          title: "Éxito",
          description: "Proyecto actualizado correctamente",
        });
        setIsEditDialogOpen(false);
        setSelectedProject(null);
        // Recargar proyectos
        fetchProjects();
      }
    } catch (error) {
      console.error('Error al actualizar el proyecto:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el proyecto",
        variant: "destructive",
      });
    }
  };

  // Preparar para eliminar un proyecto
  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteDialogOpen(true);
  };

  // Confirmar eliminación del proyecto
  const confirmDeleteProject = async () => {
    if (!selectedProject) return;
    
    try {
      const success = await deleteData('projects', selectedProject.id);
      
      if (success) {
        toast({
          title: "Éxito",
          description: "Proyecto eliminado correctamente",
        });
        setIsDeleteDialogOpen(false);
        setSelectedProject(null);
        // Recargar proyectos
        fetchProjects();
      }
    } catch (error) {
      console.error('Error al eliminar el proyecto:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto",
        variant: "destructive",
      });
    }
  };

  // Ver detalles del proyecto
  const handleViewProjectDetails = (project: Project) => {
    navigate(`/dashboard/projets/${project.id}/es`);
  };

  // Manejar acciones del menú desplegable
  const handleDropdownAction = (e: React.MouseEvent, callback: Function) => {
    e.stopPropagation();
    callback();
  };

  return (
    <div className="space-y-6">
      {/* Encabezado con búsqueda y botón de añadir */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Proyectos</h1>
          <ProjectsLanguageSelector currentLanguage="es" />
        </div>
        
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar proyectos..."
              className="pl-8 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button onClick={handleCreateProject}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo
          </Button>
        </div>
      </div>
      
      {/* Cuadrícula de proyectos */}
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
                        e.currentTarget.src = 'https://placehold.co/600x400?text=Imagen+no+disponible';
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
                      Fecha de inicio: {new Date(project.start_date).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <div className="flex justify-end w-full">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleDropdownAction(e, () => handleEditProject(project))}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={(e) => handleDropdownAction(e, () => handleDeleteProject(project))}
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Diálogo de Crear Proyecto */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Crear nuevo proyecto</DialogTitle>
            <DialogDescription>
              Complete los detalles para su nuevo proyecto
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre del proyecto</Label>
              <Input 
                id="name" 
                placeholder="Ingrese nombre del proyecto" 
                value={newProject.name}
                onChange={(e) => setNewProject({...newProject, name: e.target.value})}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea 
                id="description" 
                placeholder="Ingrese descripción del proyecto" 
                value={newProject.description}
                onChange={(e) => setNewProject({...newProject, description: e.target.value})}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="start_date">Fecha de inicio</Label>
              <Input 
                id="start_date" 
                type="date"
                value={newProject.start_date}
                onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="image_url">URL de imagen (opcional)</Label>
              <Input 
                id="image_url" 
                placeholder="Ingrese URL de imagen" 
                value={newProject.image_url}
                onChange={(e) => setNewProject({...newProject, image_url: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitNewProject}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Editar Proyecto */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Editar proyecto</DialogTitle>
            <DialogDescription>
              Actualice los detalles de su proyecto
            </DialogDescription>
          </DialogHeader>
          
          {selectedProject && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nombre del proyecto</Label>
                <Input 
                  id="edit-name" 
                  placeholder="Ingrese nombre del proyecto" 
                  value={selectedProject.name}
                  onChange={(e) => setSelectedProject({...selectedProject, name: e.target.value})}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea 
                  id="edit-description" 
                  placeholder="Ingrese descripción del proyecto" 
                  value={selectedProject.description}
                  onChange={(e) => setSelectedProject({...selectedProject, description: e.target.value})}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-start_date">Fecha de inicio</Label>
                <Input 
                  id="edit-start_date" 
                  type="date"
                  value={selectedProject.start_date.substring(0, 10)}
                  onChange={(e) => setSelectedProject({...selectedProject, start_date: e.target.value})}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-image_url">URL de imagen (opcional)</Label>
                <Input 
                  id="edit-image_url" 
                  placeholder="Ingrese URL de imagen" 
                  value={selectedProject.image_url || ''}
                  onChange={(e) => setSelectedProject({...selectedProject, image_url: e.target.value})}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitEditProject}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Confirmación de Eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Eliminará permanentemente el proyecto
              y todos los datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectsEs; 