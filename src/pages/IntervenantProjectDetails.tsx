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
  Users
} from "lucide-react";
import { useSupabase } from "../hooks/useSupabase";
import { useAuth } from "../contexts/AuthContext";
import { projectStructure, realisationStructure } from "../utils/projectStructure";

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
  phase_id: string; // "conception" ou "realisation"
  section_id: string; // "A", "B", "C", etc.
  subsection_id: string; // "A1", "A2", "B1", etc.
  task_name: string;
  assigned_to: string; // ID de l'intervenant
  deadline: string;
  validation_deadline: string;
  validators: string[]; // IDs des intervenants validateurs
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

const IntervenantProjectDetails: React.FC = () => {
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

  // Vérifier si l'utilisateur est membre du projet
  const [isMember, setIsMember] = useState(false);
  const [loadingMembership, setLoadingMembership] = useState(true);

  // Vérifier l'accès au projet
  useEffect(() => {
    const checkProjectAccess = async () => {
      if (!id || !user) return;
      
      setLoadingMembership(true);
      try {
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
          toast({
            title: "Accès refusé",
            description: "Vous n'avez pas accès à ce projet",
            variant: "destructive",
          });
          navigate('/dashboard/intervenant/projets');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'accès:', error);
        toast({
          title: "Erreur",
          description: "Impossible de vérifier l'accès au projet",
          variant: "destructive",
        });
        navigate('/dashboard/intervenant/projets');
      } finally {
        setLoadingMembership(false);
      }
    };
    
    checkProjectAccess();
  }, [id, user, fetchData, toast, navigate]);

  // Charger les détails du projet
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
            title: "Erreur",
            description: "Projet non trouvé",
            variant: "destructive",
          });
          navigate('/dashboard/intervenant/projets');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des détails du projet:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les détails du projet",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjectDetails();
  }, [id, isMember, fetchData, navigate, toast]);

  // Charger les assignations de tâches
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
        console.error('Erreur lors de la récupération des tâches:', error);
      } finally {
        setLoadingTasks(false);
      }
    };
    
    fetchTaskAssignments();
  }, [id, isMember, fetchData]);

  // Charger les intervenants
  useEffect(() => {
    const fetchIntervenants = async () => {
      try {
        const userData = await getUsers();
        
        if (userData && userData.users) {
          const formattedUsers = userData.users
            .filter((user: any) => {
              const isAdmin = user.user_metadata?.role === 'admin';
              const isAdminEmail = user.email?.toLowerCase() === 'admin@aphs.fr' || 
                                  user.email?.toLowerCase() === 'admin@aphs.com' || 
                                  user.email?.toLowerCase() === 'admin@aphs';
              return !isAdmin && !isAdminEmail && !user.banned;
            })
            .map((user: any) => ({
              id: user.id,
              email: user.email || '',
              first_name: user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0] || 'Prénom',
              last_name: user.user_metadata?.last_name || user.user_metadata?.name?.split(' ').slice(1).join(' ') || 'Nom',
              role: user.user_metadata?.role || 'intervenant',
              specialty: user.user_metadata?.specialty || 'Non spécifié'
            }));
          
          setIntervenants(formattedUsers);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des intervenants:', error);
      }
    };
    
    fetchIntervenants();
  }, [getUsers]);



  // Obtenir le nom de l'intervenant
  const getIntervenantName = (userId: string) => {
    const intervenant = intervenants.find(i => i.id === userId);
    return intervenant ? `${intervenant.first_name} ${intervenant.last_name}` : 'Inconnu';
  };

  // Obtenir la couleur du badge de statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'bg-green-100 text-green-800 border-green-200';
      case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'assigned': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Obtenir l'icône du statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated': return <CheckCircle className="h-4 w-4" />;
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'assigned': return <AlertCircle className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Obtenir le libellé du statut
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated': return 'Validé';
      case 'submitted': return 'Soumis';
      case 'in_progress': return 'En cours';
      case 'assigned': return 'Assigné';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  // Retourner à la liste des projets
  const handleBackToProjects = () => {
    navigate('/dashboard/intervenant/projets');
  };

  if (loadingMembership || loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">Projet non trouvé</h3>
        <p className="text-gray-500 mb-4">Le projet que vous recherchez n'existe pas ou a été supprimé.</p>
        <Button onClick={handleBackToProjects}>Retour aux projets</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleBackToProjects}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">
              Consultation des détails du projet (lecture seule)
            </p>
          </div>
        </div>
      </div>

      {/* Onglets du projet */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-gray-100 mb-6">
          <TabsTrigger value="info" className="data-[state=active]:bg-white">
            <Info className="h-4 w-4 mr-2" />
            Informations
          </TabsTrigger>
          <TabsTrigger value="structure" className="data-[state=active]:bg-white">
            <Layers className="h-4 w-4 mr-2" />
            Structure
          </TabsTrigger>
        </TabsList>

        {/* Onglet Informations */}
        <TabsContent value="info" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 space-y-6">
              {project.image_url && (
                <div className="mb-4 rounded overflow-hidden">
                  <img 
                    src={project.image_url} 
                    alt={project.name} 
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/600x400?text=Image+indisponible';
                    }}
                  />
                </div>
              )}
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-2">
                  <Label className="text-lg font-medium">Description</Label>
                  <p className="text-gray-700 whitespace-pre-line">{project.description}</p>
                </div>
                
                {/* Statistiques du projet */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Statistiques du projet</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <Label className="text-sm font-medium text-gray-600">Statut</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge 
                          variant="outline" 
                          className={`text-sm ${
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
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <Label className="text-sm font-medium text-gray-600">Taux de completion</Label>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Progression</span>
                          <span className="font-medium text-lg">
                            {taskAssignments.length > 0 
                              ? Math.round((taskAssignments.filter(t => t.status === 'validated').length / taskAssignments.length) * 100)
                              : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-aphs-teal h-2 rounded-full transition-all duration-300" 
                            style={{ 
                              width: `${taskAssignments.length > 0 
                                ? Math.round((taskAssignments.filter(t => t.status === 'validated').length / taskAssignments.length) * 100)
                                : 0}%` 
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {taskAssignments.filter(t => t.status === 'validated').length} / {taskAssignments.length} tâches validées
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <Label className="text-lg font-medium">Date de début</Label>
                    <div className="flex items-center gap-2 text-gray-700 mt-2">
                      <div className="bg-gray-100 p-2 rounded">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <span className="text-base">
                        {new Date(project.start_date).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-lg font-medium">Date de création</Label>
                    <div className="flex items-center gap-2 text-gray-700 mt-2">
                      <div className="bg-gray-100 p-2 rounded">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <span className="text-base">
                        {new Date(project.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Structure */}
        <TabsContent value="structure" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Phase Conception */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-aphs-navy flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Phase Conception
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {projectStructure.map((section) => (
                    <AccordionItem key={section.id} value={section.id}>
                      <AccordionTrigger className="text-base font-medium text-gray-700">
                        {section.id}. {section.title}
                      </AccordionTrigger>
                      <AccordionContent>
                        <Accordion type="single" collapsible className="w-full pl-4">
                          {section.items.map((subsection) => (
                            <AccordionItem key={subsection.id} value={subsection.id}>
                              <AccordionTrigger className="text-sm font-medium text-gray-600">
                                {subsection.id}. {subsection.title}
                              </AccordionTrigger>
                              <AccordionContent>
                                <ul className="space-y-2">
                                  {subsection.tasks.map((taskName, index) => {
                                    const assignment = taskAssignments.find(t => 
                                      t.phase_id === 'conception' && 
                                      t.section_id === section.id && 
                                      t.subsection_id === subsection.id && 
                                      t.task_name === taskName
                                    );
                                    
                                    return (
                                      <li key={index} className="border-l-4 border-gray-200 pl-4">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <h4 className="font-medium text-gray-900 text-sm">{taskName}</h4>
                                              {assignment && (
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(assignment.status)}`}>
                                                  {getStatusIcon(assignment.status)}
                                                  <span className="ml-1">{getStatusLabel(assignment.status)}</span>
                                                </Badge>
                                              )}
                                            </div>
                                            {assignment && (
                                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                  <User className="h-3 w-3" />
                                                  {getIntervenantName(assignment.assigned_to)}
                                                </span>
                                                {assignment.deadline && (
                                                  <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(assignment.deadline).toLocaleDateString('fr-FR')}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                            {!assignment && (
                                              <span className="text-xs text-gray-400">Non assignée</span>
                                            )}
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Phase Réalisation */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-aphs-navy flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Phase Réalisation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {realisationStructure.map((section) => (
                    <AccordionItem key={section.id} value={section.id}>
                      <AccordionTrigger className="text-base font-medium text-gray-700">
                        {section.id}. {section.title}
                      </AccordionTrigger>
                      <AccordionContent>
                        <Accordion type="single" collapsible className="w-full pl-4">
                          {section.items.map((subsection) => (
                            <AccordionItem key={subsection.id} value={subsection.id}>
                              <AccordionTrigger className="text-sm font-medium text-gray-600">
                                {subsection.id}. {subsection.title}
                              </AccordionTrigger>
                              <AccordionContent>
                                <ul className="space-y-2">
                                  {subsection.tasks.map((taskName, index) => {
                                    const assignment = taskAssignments.find(t => 
                                      t.phase_id === 'realisation' && 
                                      t.section_id === section.id && 
                                      t.subsection_id === subsection.id && 
                                      t.task_name === taskName
                                    );
                                    
                                    return (
                                      <li key={index} className="border-l-4 border-gray-200 pl-4">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <h4 className="font-medium text-gray-900 text-sm">{taskName}</h4>
                                              {assignment && (
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(assignment.status)}`}>
                                                  {getStatusIcon(assignment.status)}
                                                  <span className="ml-1">{getStatusLabel(assignment.status)}</span>
                                                </Badge>
                                              )}
                                            </div>
                                            {assignment && (
                                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                  <User className="h-3 w-3" />
                                                  {getIntervenantName(assignment.assigned_to)}
                                                </span>
                                                {assignment.deadline && (
                                                  <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(assignment.deadline).toLocaleDateString('fr-FR')}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                            {!assignment && (
                                              <span className="text-xs text-gray-400">Non assignée</span>
                                            )}
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntervenantProjectDetails; 