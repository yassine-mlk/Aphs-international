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
  CheckCircle2,
  ClipboardCheck
} from "lucide-react";
import { useSupabase } from "../hooks/useSupabase";
import { useAuth } from "../contexts/AuthContext";
import { useProjectStructure } from "../hooks/useProjectStructure";
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

// Interface pour les fiches informatives
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

  // États pour les détails de tâche
  const [isTaskDetailsDialogOpen, setIsTaskDetailsDialogOpen] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<TaskAssignment | null>(null);

  // États pour les fiches informatives
  const [taskInfoSheets, setTaskInfoSheets] = useState<{[key: string]: TaskInfoSheet}>({});
  const [loadingInfoSheets, setLoadingInfoSheets] = useState<{[key: string]: boolean}>({});
  const [expandedInfoSheets, setExpandedInfoSheets] = useState<{[key: string]: boolean}>({});
  
  // États pour la navigation progressive de la structure
  const [expandedSeccións, setExpandedSeccións] = useState<{[key: string]: boolean}>({});
  const [expandedSubsections, setExpandedSubsections] = useState<{[key: string]: boolean}>({});

  // Hook pour la structure personnalisée du projet
  const {
    customProjectStructure,
    customRealizationStructure,
    loading: structureLoading
  } = useProjectStructure(id || '');

  // Get translations
  const translations = projectStructureTranslations.es;

  // Vérifier l'accès au projet
  useEffect(() => {
    const checkProjectAccess = async () => {
      if (!id || !user) return;
      
      setLoadingMembership(true);
      try {
        // Pour les intervenants, permettre l'accès à tous les projets car c'est en lectura únicamente
        // Vérifier d'abord si l'utilisateur est membre du projet
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
          // Si pas membre, vérifier s'il a des tareas assignées dans ce projet
          const taskData = await fetchData<any>('task_assignments', {
            columns: '*',
            filters: [
              { column: 'project_id', operator: 'eq', value: id },
              { column: 'assigned_to', operator: 'eq', value: user.id }
            ]
          });
          
          if (taskData && taskData.length > 0) {
            setIsMember(true); // Permettre l'accès s'il a des tareas assignées
          } else {
            // Pour les intervenants, permettre l'accès en lectura únicamente même sans assignation
            setIsMember(true);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'accès:', error);
        // En cas d'erreur, permettre l'accès pour les intervenants (lectura únicamente)
        setIsMember(true);
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

  // Charger les assignations de tareas
  useEffect(() => {
    const fetchTaskAssignments = async () => {
      if (!id || !isMember) return;
      
      setLoadingTasks(true);
      try {
        // Récupérer TOUTES les tareas du projet (pas seulement celles assignées à l'utilisateur)
        const data = await fetchData<TaskAssignment>('task_assignments', {
          columns: '*',
          filters: [{ column: 'project_id', operator: 'eq', value: id }]
        });
        
        if (data) {
          setTaskAssignments(data);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des tareas:', error);
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

  // Calculer le nombre total de tareas disponibles dans la structure du projet
  const getTotalAvailableTasks = () => {
    let total = 0;
    
    // Compter les tareas de conception
    projectStructure.forEach(section => {
      section.items.forEach(item => {
        total += item.tasks.length;
      });
    });
    
    // Compter les tareas de réalisation
    realizationStructure.forEach(section => {
      section.items.forEach(item => {
        total += item.tasks.length;
      });
    });
    
    return total;
  };

  // Calculer le pourcentage d'avancement corrigé
  const getProjectProgress = () => {
    const totalTasks = getTotalAvailableTasks();
    const validatedTasks = taskAssignments.filter(t => t.status === 'validated').length;
    
    if (totalTasks === 0) return 0;
    return Math.round((validatedTasks / totalTasks) * 100);
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
      case 'validated': return 'Validado';
      case 'submitted': return 'Enviado';
      case 'in_progress': return 'En Progreso';
      case 'assigned': return 'Asignado';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  };

  // Retourner à la liste des projets
  const handleBackToProjects = () => {
    navigate('/dashboard/intervenant/projets');
  };

  // Fonction pour ouvrir les détails d'une tâche
  const handleViewTaskDetails = (assignment: TaskAssignment) => {
    setSelectedTaskDetails(assignment);
    setIsTaskDetailsDialogOpen(true);
  };

  // Fonction pour basculer l'affichage d'une fiche informative
  // Fonctions pour la navigation progressive
  const toggleSección = (phase: string, sectionId: string) => {
    const key = `${phase}-${sectionId}`;
    setExpandedSeccións(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleSubsection = (phase: string, sectionId: string, subsectionId: string) => {
    const key = `${phase}-${sectionId}-${subsectionId}`;
    setExpandedSubsections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Trouver l'assignation d'une tâche
  const getTaskAssignment = (phase: string, sectionId: string, subsectionId: string, taskName: string) => {
    return taskAssignments.find(
      assignment => 
        assignment.phase_id === phase &&
        assignment.section_id === sectionId &&
        assignment.subsection_id === subsectionId &&
        assignment.task_name === taskName
    );
  };

  const toggleInfoSheet = async (phase: string, section: string, subsection: string, taskName: string) => {
    const key = `${phase}-${section}-${subsection}-${taskName}`;
    
    // Si déjà étendu, le fermer
    if (expandedInfoSheets[key]) {
      setExpandedInfoSheets(prev => ({ ...prev, [key]: false }));
      return;
    }

    // Si pas encore chargé, charger la fiche
    if (!taskInfoSheets[key]) {
      setLoadingInfoSheets(prev => ({ ...prev, [key]: true }));
      try {
        // Essayer de récupérer la fiche en français d'abord
        const infoSheetData = await fetchData<TaskInfoSheet>('task_info_sheets', {
          columns: '*',
          filters: [
            { column: 'phase_id', operator: 'eq', value: phase },
            { column: 'section_id', operator: 'eq', value: section },
            { column: 'subsection_id', operator: 'eq', value: subsection },
            { column: 'task_name', operator: 'eq', value: taskName },
            { column: 'language', operator: 'eq', value: 'es' }
          ]
        });

        if (infoSheetData && infoSheetData.length > 0) {
          setTaskInfoSheets(prev => ({ ...prev, [key]: infoSheetData[0] }));
          setExpandedInfoSheets(prev => ({ ...prev, [key]: true }));
        } else {
          toast({
            title: "Information",
            description: "Aucune fiche informative disponible pour cette tâche",
            variant: "default",
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la fiche informative:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger la fiche informative",
          variant: "destructive",
        });
      } finally {
        setLoadingInfoSheets(prev => ({ ...prev, [key]: false }));
      }
    } else {
      // Si déjà chargé, juste l'ouvrir
      setExpandedInfoSheets(prev => ({ ...prev, [key]: true }));
    }
  };

  // Fonction pour ouvrir un fichier uploadé
  const handleOpenFile = (fileUrl: string, fileName: string) => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  // Fonction pour télécharger un fichier
  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'fichier';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    }
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
              Consulta de detalles del proyecto (lectura únicamente)
            </p>
          </div>
        </div>
      </div>

      {/* Onglets du projet */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-gray-100 mb-6">
          <TabsTrigger value="info" className="data-[state=active]:bg-white">
            <Info className="h-4 w-4 mr-2" />
            Información
          </TabsTrigger>
          <TabsTrigger value="structure" className="data-[state=active]:bg-white">
            <Layers className="h-4 w-4 mr-2" />
            Estructura
          </TabsTrigger>
        </TabsList>

        {/* Onglet Información */}
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
                            {getProjectProgress()}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-aphs-teal h-2 rounded-full transition-all duration-300" 
                            style={{ 
                              width: `${getProjectProgress()}%` 
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {taskAssignments.filter(t => t.status === 'validated').length} / {getTotalAvailableTasks()} tareas validadas
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vista general de las tareas du projet */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Vista general de las tareas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Tareas asignadas */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-blue-100 text-blue-800">
                          {taskAssignments.filter(t => t.status === 'assigned').length}
                        </Badge>
                        <span className="text-sm font-medium">Assignées</span>
                      </div>
                      <p className="text-xs text-gray-500">Tareas pendientes de inicio</p>
                    </div>

                    {/* Tareas en curso */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-yellow-100 text-yellow-800">
                          {taskAssignments.filter(t => t.status === 'in_progress').length}
                        </Badge>
                        <span className="text-sm font-medium">En cours</span>
                      </div>
                      <p className="text-xs text-gray-500">Tareas en proceso de realización</p>
                    </div>

                    {/* Tareas enviadas */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-purple-100 text-purple-800">
                          {taskAssignments.filter(t => t.status === 'submitted').length}
                        </Badge>
                        <span className="text-sm font-medium">Soumises</span>
                      </div>
                      <p className="text-xs text-gray-500">En attente de validation</p>
                    </div>

                    {/* Tareas validadas */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-100 text-green-800">
                          {taskAssignments.filter(t => t.status === 'validated').length}
                        </Badge>
                        <span className="text-sm font-medium">Validées</span>
                      </div>
                      <p className="text-xs text-gray-500">Tareas completadas y validadas</p>
                    </div>

                    {/* Tareas rechazadas */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-red-100 text-red-800">
                          {taskAssignments.filter(t => t.status === 'rejected').length}
                        </Badge>
                        <span className="text-sm font-medium">Rejetées</span>
                      </div>
                      <p className="text-xs text-gray-500">Tareas que requieren correcciones</p>
                    </div>

                    {/* Fichiers uploadés */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-indigo-100 text-indigo-800">
                          {taskAssignments.filter(t => t.file_url).length}
                        </Badge>
                        <span className="text-sm font-medium">Fichiers</span>
                      </div>
                      <p className="text-xs text-gray-500">Documentos uploadés</p>
                    </div>
                  </div>
                </div>

                {/* Liste détaillée de toutes les tareas */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Lista detallada de tareas</h4>
                  <div className="space-y-3">
                    {loadingTasks ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
                      </div>
                    ) : taskAssignments.length > 0 ? (
                      taskAssignments.map((task) => (
                        <div key={task.id} className="bg-white rounded-lg p-4 shadow-sm border">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 mb-1">{task.task_name}</h5>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>Phase: {task.phase_id === 'conception' ? 'Conception' : 'Réalisation'}</span>
                                <span>Sección: {task.section_id}</span>
                                <span>Sous-section: {task.subsection_id}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(task.status)}>
                                {getStatusIcon(task.status)}
                                <span className="ml-1">{getStatusLabel(task.status)}</span>
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Asignado a:</span>
                              <span className="ml-2 font-medium">{getIntervenantName(task.assigned_to)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Plazo:</span>
                              <span className="ml-2 font-medium">
                                {task.deadline ? new Date(task.deadline).toLocaleDateString('es-ES') : 'No definido'}
                              </span>
                            </div>
                            {task.submitted_at && (
                              <div>
                                <span className="text-gray-600">Enviado el:</span>
                                <span className="ml-2 font-medium">
                                  {new Date(task.submitted_at).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                            )}
                            {task.validated_at && (
                              <div>
                                <span className="text-gray-600">Validado el:</span>
                                <span className="ml-2 font-medium">
                                  {new Date(task.validated_at).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                            )}
                            {task.validated_by && (
                              <div>
                                <span className="text-gray-600">Validado por:</span>
                                <span className="ml-2 font-medium">
                                  {getIntervenantName(task.validated_by)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Actions pour les fichiers */}
                          {task.file_url && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Documentoo:</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenFile(task.file_url!, task.task_name)}
                                  className="h-6 px-2"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadFile(task.file_url!, task.task_name)}
                                  className="h-6 px-2"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Descargar
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Commentaires */}
                          {task.comment && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <span className="text-sm text-gray-600">Comentario:</span>
                              <p className="text-sm text-gray-800 mt-1">{task.comment}</p>
                            </div>
                          )}

                          {/* Commentaires de validation */}
                          {task.validation_comment && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <span className="text-sm text-gray-600">Comentario de validación:</span>
                              <p className="text-sm text-gray-800 mt-1">{task.validation_comment}</p>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No hay tareas asignadas a este proyecto</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <Label className="text-lg font-medium">Fecha de inicio</Label>
                    <div className="flex items-center gap-2 text-gray-700 mt-2">
                      <div className="bg-gray-100 p-2 rounded">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <span className="text-base">
                        {new Date(project.start_date).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-lg font-medium">Fecha de creación</Label>
                    <div className="flex items-center gap-2 text-gray-700 mt-2">
                      <div className="bg-gray-100 p-2 rounded">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <span className="text-base">
                        {new Date(project.created_at).toLocaleDateString('es-ES', {
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

        {/* Onglet Estructura */}
        <TabsContent value="structure" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Estructura du Projet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {/* Fase de concepción */}
                <AccordionItem value="conception">
                  <AccordionTrigger>{translations.conception}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {customProjectStructure.map((section) => {
                        const sectionKey = section.id as keyof typeof translations.sections;
                        const sectionTranslation = translations.sections[sectionKey];
                        const sectionExpansionKey = `conception-${section.id}`;
                        const isSecciónExpanded = expandedSeccións[sectionExpansionKey];
                        
                        return (
                          <div key={section.id} className="border border-gray-200 rounded-lg">
                            {/* En-tête de section avec bouton d'expansion */}
                            <button
                              onClick={() => toggleSección('conception', section.id)}
                              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                            >
                              <h4 className="font-semibold text-gray-800">
                                Sección {section.id}: {sectionTranslation?.title || section.title}
                              </h4>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {section.items.length} pasos
                              </Badge>
                            </button>
                            
                            {/* Contenu de la section (pasos) */}
                            {isSecciónExpanded && (
                              <div className="border-t border-gray-200 p-4 space-y-3">
                                {section.items.map((subsection) => {
                                  const subsectionKey = subsection.id as keyof typeof sectionTranslation.items;
                                  const subsectionTranslation = sectionTranslation?.items?.[subsectionKey];
                                  const subsectionExpansionKey = `conception-${section.id}-${subsection.id}`;
                                  const isSubsectionExpanded = expandedSubsections[subsectionExpansionKey];
                                  
                                  return (
                                    <div key={subsection.id} className="border border-gray-100 rounded-md ml-4">
                                      {/* En-tête de sous-section avec bouton d'expansion */}
                                      <button
                                        onClick={() => toggleSubsection('conception', section.id, subsection.id)}
                                        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-25 transition-colors"
                                      >
                                        <h5 className="font-medium text-gray-700">
                                          Paso {subsection.id}: {subsectionTranslation?.title || subsection.title}
                                        </h5>
                                        <Badge variant="outline" className="bg-green-50 text-green-700">
                                          {subsection.tasks.length} tareas
                                        </Badge>
                                      </button>
                                      
                                      {/* Contenu de la sous-section (tareas) */}
                                      {isSubsectionExpanded && (
                                        <div className="border-t border-gray-100 p-3 space-y-2">
                                          {subsection.tasks.map((task, index) => {
                                            const translatedTask = subsectionTranslation?.tasks?.[index] || task;
                                            const taskAssignment = getTaskAssignment('conception', section.id, subsection.id, task);
                                            const key = `conception-${section.id}-${subsection.id}-${task}`;
                                            const isExpanded = expandedInfoSheets[key];
                                            const isLoading = loadingInfoSheets[key];
                                            const infoSheet = taskInfoSheets[key];
                                            
                                            return (
                                              <div key={index} className="border border-gray-50 rounded">
                                                <div className="p-3 bg-gray-25">
                                                  <div className="flex items-start justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-800 flex-1">
                                                      {translatedTask}
                                                    </span>
                                                    <div className="flex items-center gap-2 ml-3">
                                                      {taskAssignment && (
                                                        <>
                                                          <Badge className={getStatusColor(taskAssignment.status)}>
                                                            {getStatusIcon(taskAssignment.status)}
                                                            <span className="ml-1">{getStatusLabel(taskAssignment.status)}</span>
                                                          </Badge>
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleViewTaskDetails(taskAssignment)}
                                                            className="h-6 px-2"
                                                            title="Ver les détails de la tâche"
                                                          >
                                                            <Eye className="h-3 w-3" />
                                                          </Button>
                                                          {taskAssignment.file_url && (
                                                            <Button
                                                              variant="ghost"
                                                              size="sm"
                                                              onClick={() => handleDownloadFile(taskAssignment.file_url, taskAssignment.task_name)}
                                                              className="h-6 px-2"
                                                              title="Descargar le document"
                                                            >
                                                              <Download className="h-3 w-3" />
                                                            </Button>
                                                          )}
                                                          {taskAssignment.file_url && (
                                                            <Button
                                                              variant="ghost"
                                                              size="sm"
                                                              onClick={() => handleDownloadFile(taskAssignment.file_url, taskAssignment.task_name)}
                                                              className="h-6 px-2"
                                                            >
                                                              <Download className="h-3 w-3" />
                                                            </Button>
                                                          )}
                                                        </>
                                                      )}
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleInfoSheet('conception', section.id, subsection.id, task)}
                                                        disabled={isLoading}
                                                        className="h-6 px-2"
                                                      >
                                                        {isLoading ? (
                                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-aphs-teal"></div>
                                                        ) : (
                                                          <FileText className="h-3 w-3" />
                                                        )}
                                                      </Button>
                                                    </div>
                                                  </div>
                                                  
                                                  {/* Información sur l'assignation */}
                                                  {taskAssignment && (
                                                    <div className="text-xs text-gray-600 flex items-center gap-2">
                                                      <User className="h-3 w-3" />
                                                      <span>Asignado a: {getIntervenantName(taskAssignment.assigned_to)}</span>
                                                      {taskAssignment.deadline && (
                                                        <>
                                                          <Calendar className="h-3 w-3 ml-2" />
                                                          <span>Plazo: {new Date(taskAssignment.deadline).toLocaleDateString('es-ES')}</span>
                                                        </>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                                
                                                {/* Fiche informative */}
                                                {isExpanded && infoSheet && (
                                                  <div className="p-3 bg-gradient-to-r from-aphs-teal/5 to-aphs-navy/5 border-t border-l-4 border-l-aphs-teal">
                                                    <div className="flex items-center gap-2 mb-2">
                                                      <Badge variant="outline" className="bg-aphs-teal bg-opacity-10 text-aphs-teal border-aphs-teal text-xs">
                                                        Documento de référence
                                                      </Badge>
                                                      <Badge variant="outline" className="bg-blue-500 bg-opacity-10 text-blue-600 border-blue-500 text-xs">
                                                        Instructions détaillées
                                                      </Badge>
                                                    </div>
                                                    <div className="prose prose-sm max-w-none">
                                                      <div className="whitespace-pre-line text-xs text-gray-700 leading-relaxed">
                                                        {infoSheet.info_sheet}
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Fase de realización */}
                <AccordionItem value="realisation">
                  <AccordionTrigger>{translations.realization}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {customRealizationStructure.map((section) => {
                        const sectionKey = section.id as keyof typeof translations.sections;
                        const sectionTranslation = translations.sections[sectionKey];
                        const sectionExpansionKey = `realisation-${section.id}`;
                        const isSecciónExpanded = expandedSeccións[sectionExpansionKey];
                        
                        return (
                          <div key={section.id} className="border border-gray-200 rounded-lg">
                            {/* En-tête de section avec bouton d'expansion */}
                            <button
                              onClick={() => toggleSección('realisation', section.id)}
                              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                            >
                              <h4 className="font-semibold text-gray-800">
                                Sección {section.id}: {sectionTranslation?.title || section.title}
                              </h4>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                {section.items.length} pasos
                              </Badge>
                            </button>
                            
                            {/* Contenu de la section (pasos) */}
                            {isSecciónExpanded && (
                              <div className="border-t border-gray-200 p-4 space-y-3">
                                {section.items.map((subsection) => {
                                  const subsectionKey = subsection.id as keyof typeof sectionTranslation.items;
                                  const subsectionTranslation = sectionTranslation?.items?.[subsectionKey];
                                  const subsectionExpansionKey = `realisation-${section.id}-${subsection.id}`;
                                  const isSubsectionExpanded = expandedSubsections[subsectionExpansionKey];
                                  
                                  return (
                                    <div key={subsection.id} className="border border-gray-100 rounded-md ml-4">
                                      {/* En-tête de sous-section avec bouton d'expansion */}
                                      <button
                                        onClick={() => toggleSubsection('realisation', section.id, subsection.id)}
                                        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-25 transition-colors"
                                      >
                                        <h5 className="font-medium text-gray-700">
                                          Paso {subsection.id}: {subsectionTranslation?.title || subsection.title}
                                        </h5>
                                        <Badge variant="outline" className="bg-green-50 text-green-700">
                                          {subsection.tasks.length} tareas
                                        </Badge>
                                      </button>
                                      
                                      {/* Contenu de la sous-section (tareas) */}
                                      {isSubsectionExpanded && (
                                        <div className="border-t border-gray-100 p-3 space-y-2">
                                          {subsection.tasks.map((task, index) => {
                                            const translatedTask = subsectionTranslation?.tasks?.[index] || task;
                                            const taskAssignment = getTaskAssignment('realisation', section.id, subsection.id, task);
                                            const key = `realisation-${section.id}-${subsection.id}-${task}`;
                                            const isExpanded = expandedInfoSheets[key];
                                            const isLoading = loadingInfoSheets[key];
                                            const infoSheet = taskInfoSheets[key];
                                            
                                            return (
                                              <div key={index} className="border border-gray-50 rounded">
                                                <div className="p-3 bg-gray-25">
                                                  <div className="flex items-start justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-800 flex-1">
                                                      {translatedTask}
                                                    </span>
                                                    <div className="flex items-center gap-2 ml-3">
                                                      {taskAssignment && (
                                                        <>
                                                          <Badge className={getStatusColor(taskAssignment.status)}>
                                                            {getStatusIcon(taskAssignment.status)}
                                                            <span className="ml-1">{getStatusLabel(taskAssignment.status)}</span>
                                                          </Badge>
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleViewTaskDetails(taskAssignment)}
                                                            className="h-6 px-2"
                                                            title="Ver les détails de la tâche"
                                                          >
                                                            <Eye className="h-3 w-3" />
                                                          </Button>
                                                          {taskAssignment.file_url && (
                                                            <Button
                                                              variant="ghost"
                                                              size="sm"
                                                              onClick={() => handleDownloadFile(taskAssignment.file_url, taskAssignment.task_name)}
                                                              className="h-6 px-2"
                                                              title="Descargar le document"
                                                            >
                                                              <Download className="h-3 w-3" />
                                                            </Button>
                                                          )}
                                                          {taskAssignment.file_url && (
                                                            <Button
                                                              variant="ghost"
                                                              size="sm"
                                                              onClick={() => handleDownloadFile(taskAssignment.file_url, taskAssignment.task_name)}
                                                              className="h-6 px-2"
                                                            >
                                                              <Download className="h-3 w-3" />
                                                            </Button>
                                                          )}
                                                        </>
                                                      )}
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleInfoSheet('realisation', section.id, subsection.id, task)}
                                                        disabled={isLoading}
                                                        className="h-6 px-2"
                                                      >
                                                        {isLoading ? (
                                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-aphs-teal"></div>
                                                        ) : (
                                                          <FileText className="h-3 w-3" />
                                                        )}
                                                      </Button>
                                                    </div>
                                                  </div>
                                                  
                                                  {/* Información sur l'assignation */}
                                                  {taskAssignment && (
                                                    <div className="text-xs text-gray-600 flex items-center gap-2">
                                                      <User className="h-3 w-3" />
                                                      <span>Asignado a: {getIntervenantName(taskAssignment.assigned_to)}</span>
                                                      {taskAssignment.deadline && (
                                                        <>
                                                          <Calendar className="h-3 w-3 ml-2" />
                                                          <span>Plazo: {new Date(taskAssignment.deadline).toLocaleDateString('es-ES')}</span>
                                                        </>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                                
                                                {/* Fiche informative */}
                                                {isExpanded && infoSheet && (
                                                  <div className="p-3 bg-gradient-to-r from-aphs-teal/5 to-aphs-navy/5 border-t border-l-4 border-l-aphs-teal">
                                                    <div className="flex items-center gap-2 mb-2">
                                                      <Badge variant="outline" className="bg-aphs-teal bg-opacity-10 text-aphs-teal border-aphs-teal text-xs">
                                                        Documento de référence
                                                      </Badge>
                                                      <Badge variant="outline" className="bg-blue-500 bg-opacity-10 text-blue-600 border-blue-500 text-xs">
                                                        Instructions détaillées
                                                      </Badge>
                                                    </div>
                                                    <div className="prose prose-sm max-w-none">
                                                      <div className="whitespace-pre-line text-xs text-gray-700 leading-relaxed">
                                                        {infoSheet.info_sheet}
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo para mostrar detalles de tareas */}
      <Dialog open={isTaskDetailsDialogOpen} onOpenChange={setIsTaskDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Détails de la tâche</DialogTitle>
          </DialogHeader>
          {selectedTaskDetails && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <h4 className="text-lg font-semibold">{selectedTaskDetails.task_name}</h4>
                  <Badge className={`${getStatusColor(selectedTaskDetails.status)}`}>
                    {getStatusIcon(selectedTaskDetails.status)}
                    <span className="ml-1">{getStatusLabel(selectedTaskDetails.status)}</span>
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Asignado a</Label>
                    <p className="text-sm text-gray-700">
                      {getIntervenantName(selectedTaskDetails.assigned_to)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Fecha límite</Label>
                    <p className="text-sm text-gray-700">
                      {new Date(selectedTaskDetails.deadline).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Validación antes del</Label>
                    <p className="text-sm text-gray-700">
                      {new Date(selectedTaskDetails.validation_deadline).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Formato de archivo</Label>
                    <p className="text-sm text-gray-700">
                      {selectedTaskDetails.file_extension.toUpperCase()}
                    </p>
                  </div>
                </div>

                {selectedTaskDetails.validators && selectedTaskDetails.validators.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Validadores</Label>
                    <ul className="text-sm text-gray-700 mt-1">
                      {selectedTaskDetails.validators.map((validatorId, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {getIntervenantName(validatorId)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTaskDetails.submitted_at && (
                  <div>
                    <Label className="text-sm font-medium">Enviado el</Label>
                    <p className="text-sm text-gray-700">
                      {new Date(selectedTaskDetails.submitted_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                )}

                {selectedTaskDetails.validated_at && (
                  <div>
                    <Label className="text-sm font-medium">Validado el</Label>
                    <p className="text-sm text-gray-700">
                      {new Date(selectedTaskDetails.validated_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                )}

                {selectedTaskDetails.validated_by && (
                  <div>
                    <Label className="text-sm font-medium">Validado por</Label>
                    <p className="text-sm text-gray-700">
                      {getIntervenantName(selectedTaskDetails.validated_by)}
                    </p>
                  </div>
                )}

                {selectedTaskDetails.comment && (
                  <div>
                    <Label className="text-sm font-medium">Commentaire</Label>
                    <p className="text-sm text-gray-700">
                      {selectedTaskDetails.comment}
                    </p>
                  </div>
                )}

                {selectedTaskDetails.file_url && (
                  <div>
                    <Label className="text-sm font-medium">Documento</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenFile(selectedTaskDetails.file_url, selectedTaskDetails.task_name)}
                      className="mt-2"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver le document
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadFile(selectedTaskDetails.file_url, selectedTaskDetails.task_name)}
                      className="mt-2 ml-2"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar le document
                    </Button>
                  </div>
                )}

                {selectedTaskDetails.validation_comment && (
                  <div>
                    <Label className="text-sm font-medium">Comentario de validación</Label>
                    <p className="text-sm text-gray-700">
                      {selectedTaskDetails.validation_comment}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setIsTaskDetailsDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
};

export default IntervenantProjectDetails; 