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

// Interface for project type
interface Project {
  id: string;
  name: string;
  description: string;
  start_date: string;
  image_url?: string;
  created_at: string;
}

const ProjectsEn: React.FC = () => {
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
  
  // Load projects when page loads
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch projects from Supabase
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchData<Project>('projects', {
        columns: '*',
        order: { column: 'created_at', ascending: false }
      });
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Unable to load projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter projects based on search
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Open create dialog
  const handleCreateProject = () => {
    setIsCreateDialogOpen(true);
  };

  // Submit new project
  const handleSubmitNewProject = async () => {
    // Validate required fields
    if (!newProject.name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    if (!newProject.description.trim()) {
      toast({
        title: "Error",
        description: "Project description is required",
        variant: "destructive",
      });
      return;
    }

    if (!newProject.start_date) {
      toast({
        title: "Error",
        description: "Start date is required",
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
          title: "Success",
          description: "Project created successfully",
        });
        setIsCreateDialogOpen(false);
        // Reset form
        setNewProject({
          name: '',
          description: '',
          start_date: format(new Date(), 'yyyy-MM-dd'),
          image_url: ''
        });
        // Reload projects
        fetchProjects();
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Unable to create project",
        variant: "destructive",
      });
    }
  };

  // Prepare to edit a project
  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsEditDialogOpen(true);
  };

  // Submit project edits
  const handleSubmitEditProject = async () => {
    if (!selectedProject) return;
    
    // Validate required fields
    if (!selectedProject.name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProject.description.trim()) {
      toast({
        title: "Error",
        description: "Project description is required",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProject.start_date) {
      toast({
        title: "Error",
        description: "Start date is required",
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
          title: "Success",
          description: "Project updated successfully",
        });
        setIsEditDialogOpen(false);
        setSelectedProject(null);
        // Reload projects
        fetchProjects();
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Error",
        description: "Unable to update project",
        variant: "destructive",
      });
    }
  };

  // Prepare to delete a project
  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteDialogOpen(true);
  };

  // Confirm project deletion
  const confirmDeleteProject = async () => {
    if (!selectedProject) return;
    
    try {
      const success = await deleteData('projects', selectedProject.id);
      
      if (success) {
        toast({
          title: "Success",
          description: "Project deleted successfully",
        });
        setIsDeleteDialogOpen(false);
        setSelectedProject(null);
        // Reload projects
        fetchProjects();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Unable to delete project",
        variant: "destructive",
      });
    }
  };

  // View project details
  const handleViewProjectDetails = (project: Project) => {
    navigate(`/dashboard/projets/${project.id}/en`);
  };

  // Handle dropdown actions
  const handleDropdownAction = (e: React.MouseEvent, callback: Function) => {
    e.stopPropagation();
    callback();
  };

  return (
    <div className="space-y-6">
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <ProjectsLanguageSelector currentLanguage="en" />
        </div>
        
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search projects..."
              className="pl-8 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button onClick={handleCreateProject}>
            <Plus className="mr-2 h-4 w-4" /> New
          </Button>
        </div>
      </div>
      
      {/* Projects grid */}
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
                        e.currentTarget.src = 'https://placehold.co/600x400?text=Image+unavailable';
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
                      Start date: {new Date(project.start_date).toLocaleDateString('en-US')}
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
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={(e) => handleDropdownAction(e, () => handleDeleteProject(project))}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[525px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Create new project</DialogTitle>
            <DialogDescription>
              Fill in the details for your new project
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project name *</Label>
                <Input 
                  id="name" 
                  placeholder="Enter project name" 
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea 
                  id="description" 
                  placeholder="Enter detailed project description..." 
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  className="min-h-[120px] max-h-[300px] resize-none"
                  required
                />
                <p className="text-xs text-gray-500">
                  Describe the objectives, context and specifics of the project
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start date *</Label>
                <Input 
                  id="start_date" 
                  type="date"
                  value={newProject.start_date}
                  onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="image_url">Image URL (optional)</Label>
                <Input 
                  id="image_url" 
                  placeholder="Enter image URL" 
                  value={newProject.image_url}
                  onChange={(e) => setNewProject({...newProject, image_url: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitNewProject}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>
              Update the details of your project
            </DialogDescription>
          </DialogHeader>
          
          {selectedProject && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Project name</Label>
                <Input 
                  id="edit-name" 
                  placeholder="Enter project name" 
                  value={selectedProject.name}
                  onChange={(e) => setSelectedProject({...selectedProject, name: e.target.value})}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea 
                  id="edit-description" 
                  placeholder="Enter project description" 
                  value={selectedProject.description}
                  onChange={(e) => setSelectedProject({...selectedProject, description: e.target.value})}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-start_date">Start date</Label>
                <Input 
                  id="edit-start_date" 
                  type="date"
                  value={selectedProject.start_date.substring(0, 10)}
                  onChange={(e) => setSelectedProject({...selectedProject, start_date: e.target.value})}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-image_url">Image URL (optional)</Label>
                <Input 
                  id="edit-image_url" 
                  placeholder="Enter image URL" 
                  value={selectedProject.image_url || ''}
                  onChange={(e) => setSelectedProject({...selectedProject, image_url: e.target.value})}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitEditProject}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project 
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectsEn; 