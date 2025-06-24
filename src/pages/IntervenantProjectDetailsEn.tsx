import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  ArrowLeft, 
  Calendar, 
  Info, 
  Layers, 
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Users,
  Eye,
  Download,
  FileText,
  Circle,
  CheckCircle2
} from "lucide-react";
import { useSupabase } from "../hooks/useSupabase";
import { useAuth } from "../contexts/AuthContext";
import { projectStructure, realizationStructure } from "../data/project-structure";
import { projectStructureTranslations } from "../data/project-structure-translations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Types
interface Project {
  id: string;
  name: string;
  description: string;
  start_date: string;
  image_url?: string;
  created_at: string;
  status?: string;
}

interface TaskAssignment {
  id?: string;
  project_id: string;
  phase_id: string; // "conception" or "realization"
  section_id: string; // "A", "B", "C", etc.
  subsection_id: string; // "A1", "A2", "B1", etc.
  task_name: string;
  assigned_to: string; // ID of the specialist
  deadline: string;
  validation_deadline: string;
  validators: string[]; // IDs of validator specialists
  file_extension: string;
  comment?: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'validated' | 'rejected';
  created_at?: string;
  updated_at?: string;
  file_url?: string;
  validation_comment?: string;
  submitted_at?: string;
  validated_at?: string;
  validated_by?: string;
}

interface Intervenant {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  specialty?: string;
}

// Interface for information sheets
interface TaskInfoSheet {
  id: string;
  phase_id: string;
  section_id: string;
  subsection_id: string;
  task_name: string;
  info_sheet: string;
  language: string; // 'fr', 'en', 'es', 'ar'
  created_at: string;
  updated_at: string;
}

const IntervenantProjectDetailsEn: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchData, getUsers } = useSupabase();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);

  // Check if user is a project member
  const [isMember, setIsMember] = useState(false);
  const [loadingMembership, setLoadingMembership] = useState(true);

  // States for task details
  const [isTaskDetailsDialogOpen, setIsTaskDetailsDialogOpen] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<TaskAssignment | null>(null);

  // States for information sheets
  const [isInfoSheetDialogOpen, setIsInfoSheetDialogOpen] = useState(false);
  const [selectedInfoSheet, setSelectedInfoSheet] = useState<TaskInfoSheet | null>(null);
  const [loadingInfoSheet, setLoadingInfoSheet] = useState(false);

  // Get translations
  const translations = projectStructureTranslations.en;

  // Check project access
  useEffect(() => {
    const checkProjectAccess = async () => {
      if (!id || !user) return;
      
      setLoadingMembership(true);
      try {
        // For specialists, allow access to all projects as it's read-only
        // First check if user is a project member
        const memberData = await fetchData<any>('membre', {
          columns: '*',
          filters: [
            { column: 'project_id', operator: 'eq', value: id },
            { column: 'user_id', operator: 'eq', value: user.id }
          ]
        });
        
        if (memberData && memberData.length > 0) {
          setIsMember(true);
        } else {
          // If not a member, check if they have tasks assigned in this project
          const taskData = await fetchData<any>('task_assignments', {
            columns: '*',
            filters: [
              { column: 'project_id', operator: 'eq', value: id },
              { column: 'assigned_to', operator: 'eq', value: user.id }
            ]
          });
          
          if (taskData && taskData.length > 0) {
            setIsMember(true); // Allow access if they have assigned tasks
          } else {
            // For specialists, allow read-only access even without assignment
            setIsMember(true);
          }
        }
      } catch (error) {
        console.error('Error checking access:', error);
        // In case of error, allow access for specialists (read-only)
        setIsMember(true);
      } finally {
        setLoadingMembership(false);
      }
    };
    
    checkProjectAccess();
  }, [id, user, fetchData, toast, navigate]);

  // Load project details
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!id || !isMember) return;
      
      setLoading(true);
      try {
        const data = await fetchData<Project>('projects', {
          columns: '*',
          filters: [{ column: 'id', operator: 'eq', value: id }]
        });
        
        if (data && data.length > 0) {
          setProject(data[0]);
        } else {
          toast({
            title: "Error",
            description: "Project not found",
            variant: "destructive",
          });
          navigate('/dashboard/intervenant/projets');
        }
      } catch (error) {
        console.error('Error fetching project details:', error);
        toast({
          title: "Error",
          description: "Unable to load project details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjectDetails();
  }, [id, isMember, fetchData, toast, navigate]);

  // Load task assignments
  useEffect(() => {
    const fetchTaskAssignments = async () => {
      if (!id || !isMember) return;
      
      setLoadingTasks(true);
      try {
        const data = await fetchData<TaskAssignment>('task_assignments', {
          columns: '*',
          filters: [{ column: 'project_id', operator: 'eq', value: id }]
        });
        
        if (data) {
          setTaskAssignments(data);
        }
      } catch (error) {
        console.error('Error fetching task assignments:', error);
      } finally {
        setLoadingTasks(false);
      }
    };
    
    fetchTaskAssignments();
  }, [id, isMember, fetchData]);

  // Load specialists
  useEffect(() => {
    const fetchIntervenants = async () => {
      try {
        const userData = await getUsers();
        if (userData && userData.users) {
          const specialists = userData.users
            .filter((user: any) => user.user_metadata?.role !== 'admin')
            .map((user: any) => ({
              id: user.id,
              email: user.email,
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
              role: user.user_metadata?.role || 'specialist',
              specialty: user.user_metadata?.specialty || ''
            }));
          setIntervenants(specialists);
        }
      } catch (error) {
        console.error('Error fetching specialists:', error);
      }
    };
    
    fetchIntervenants();
  }, [getUsers]);

  // Helper functions
  const getIntervenantName = (userId: string) => {
    const specialist = intervenants.find(s => s.id === userId);
    return specialist ? `${specialist.first_name} ${specialist.last_name}` : 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-purple-100 text-purple-800';
      case 'validated': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return <Circle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'submitted': return <CheckCircle2 className="h-4 w-4" />;
      case 'validated': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned': return 'Assigned';
      case 'in_progress': return 'In Progress';
      case 'submitted': return 'Submitted';
      case 'validated': return 'Validated';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const handleBackToProjects = () => {
    navigate('/dashboard/intervenant/projets');
  };

  const handleViewTaskDetails = (assignment: TaskAssignment) => {
    setSelectedTaskDetails(assignment);
    setIsTaskDetailsDialogOpen(true);
  };

  const handleViewInfoSheet = async (phase: string, section: string, subsection: string, taskName: string) => {
    setLoadingInfoSheet(true);
    try {
      const data = await fetchData<TaskInfoSheet>('task_info_sheets', {
        columns: '*',
        filters: [
          { column: 'phase_id', operator: 'eq', value: phase },
          { column: 'section_id', operator: 'eq', value: section },
          { column: 'subsection_id', operator: 'eq', value: subsection },
          { column: 'task_name', operator: 'eq', value: taskName },
          { column: 'language', operator: 'eq', value: 'en' }
        ]
      });
      
      if (data && data.length > 0) {
        setSelectedInfoSheet(data[0]);
        setIsInfoSheetDialogOpen(true);
      } else {
        toast({
          title: "Information",
          description: "No information sheet available for this task",
        });
      }
    } catch (error) {
      console.error('Error fetching information sheet:', error);
      toast({
        title: "Error",
        description: "Unable to load information sheet",
        variant: "destructive",
      });
    } finally {
      setLoadingInfoSheet(false);
    }
  };

  if (loadingMembership) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-4">Access Denied</h3>
        <p className="text-gray-500 mb-4">You don't have access to this project.</p>
        <Button onClick={handleBackToProjects}>Back to Projects</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-4">Project Not Found</h3>
        <Button onClick={handleBackToProjects}>Back to Projects</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleBackToProjects}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">Project Details</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Project Information</TabsTrigger>
          <TabsTrigger value="structure">Project Structure</TabsTrigger>
          <TabsTrigger value="tasks">My Tasks</TabsTrigger>
        </TabsList>

        {/* Project Information Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                General Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Start Date</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(project.start_date).toLocaleDateString('en-US')}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-gray-600 mt-1">{project.status || 'Active'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Structure Tab */}
        <TabsContent value="structure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Project Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {/* Conception Phase */}
                <AccordionItem value="conception">
                  <AccordionTrigger>{translations.conception}</AccordionTrigger>
                  <AccordionContent>
                    {projectStructure.map((section) => {
                      const sectionTranslation = translations.sections[section.id as keyof typeof translations.sections];
                      return (
                        <div key={section.id} className="mb-4">
                          <h4 className="font-medium mb-2">Section {section.id}: {sectionTranslation?.title || section.title}</h4>
                          {section.items.map((subsection) => {
                            const subsectionTranslation = sectionTranslation?.items?.[subsection.id as keyof typeof sectionTranslation.items];
                            return (
                              <div key={subsection.id} className="ml-4 mb-2">
                                <h5 className="text-sm font-medium mb-1">Subsection {subsection.id}: {subsectionTranslation?.title || subsection.title}</h5>
                                <ul className="ml-4 space-y-1">
                                  {subsection.tasks.map((task, index) => {
                                    const translatedTask = subsectionTranslation?.tasks?.[index] || task;
                                    return (
                                      <li key={index} className="text-sm text-gray-600 flex items-center justify-between">
                                        <span>{translatedTask}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleViewInfoSheet('conception', section.id, subsection.id, task)}
                                        >
                                          <FileText className="h-4 w-4" />
                                        </Button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>

                {/* Realization Phase */}
                <AccordionItem value="realization">
                  <AccordionTrigger>{translations.realization}</AccordionTrigger>
                  <AccordionContent>
                    {realizationStructure.map((section) => {
                      const sectionTranslation = translations.sections[section.id as keyof typeof translations.sections];
                      return (
                        <div key={section.id} className="mb-4">
                          <h4 className="font-medium mb-2">Section {section.id}: {sectionTranslation?.title || section.title}</h4>
                          {section.items.map((subsection) => {
                            const subsectionTranslation = sectionTranslation?.items?.[subsection.id as keyof typeof sectionTranslation.items];
                            return (
                              <div key={subsection.id} className="ml-4 mb-2">
                                <h5 className="text-sm font-medium mb-1">Subsection {subsection.id}: {subsectionTranslation?.title || subsection.title}</h5>
                                <ul className="ml-4 space-y-1">
                                  {subsection.tasks.map((task, index) => {
                                    const translatedTask = subsectionTranslation?.tasks?.[index] || task;
                                    return (
                                      <li key={index} className="text-sm text-gray-600 flex items-center justify-between">
                                        <span>{translatedTask}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleViewInfoSheet('realization', section.id, subsection.id, task)}
                                        >
                                          <FileText className="h-4 w-4" />
                                        </Button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                My Assigned Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTasks ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-aphs-teal"></div>
                </div>
              ) : taskAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-500">No tasks assigned</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {taskAssignments.map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{assignment.task_name}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>Phase: {assignment.phase_id}</span>
                            <span>Section: {assignment.section_id}</span>
                            <span>Subsection: {assignment.subsection_id}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>Deadline: {new Date(assignment.deadline).toLocaleDateString('en-US')}</span>
                            <span>Validation: {new Date(assignment.validation_deadline).toLocaleDateString('en-US')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(assignment.status)}>
                            {getStatusIcon(assignment.status)}
                            <span className="ml-1">{getStatusLabel(assignment.status)}</span>
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTaskDetails(assignment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Details Dialog */}
      <Dialog open={isTaskDetailsDialogOpen} onOpenChange={setIsTaskDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTaskDetails && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Task Name</Label>
                <p className="text-sm text-gray-600 mt-1">{selectedTaskDetails.task_name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Phase</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedTaskDetails.phase_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Section</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedTaskDetails.section_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Subsection</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedTaskDetails.subsection_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-gray-600 mt-1">{getStatusLabel(selectedTaskDetails.status)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Deadline</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(selectedTaskDetails.deadline).toLocaleDateString('en-US')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Validation Deadline</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(selectedTaskDetails.validation_deadline).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>
              
              {selectedTaskDetails.comment && (
                <div>
                  <Label className="text-sm font-medium">Comment</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedTaskDetails.comment}</p>
                </div>
              )}
              
              {selectedTaskDetails.file_url && (
                <div>
                  <Label className="text-sm font-medium">File</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <FileText className="h-4 w-4" />
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsTaskDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Information Sheet Dialog */}
      <Dialog open={isInfoSheetDialogOpen} onOpenChange={setIsInfoSheetDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Information Sheet</DialogTitle>
          </DialogHeader>
          {loadingInfoSheet ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-aphs-teal"></div>
            </div>
          ) : selectedInfoSheet ? (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Task</Label>
                <p className="text-sm text-gray-600 mt-1">{selectedInfoSheet.task_name}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Information Sheet</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">{selectedInfoSheet.info_sheet}</pre>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Last updated: {new Date(selectedInfoSheet.updated_at).toLocaleDateString('en-US')}
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No information sheet available</p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsInfoSheetDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntervenantProjectDetailsEn; 