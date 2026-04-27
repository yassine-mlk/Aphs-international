import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Layers, ChevronRight, User, ExternalLink, Loader2, Plus, Trash2, X, ChevronUp, ChevronDown, FileCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface StructureSectionInput {
  id: string;
  title: string;
  items: { 
    id: string; 
    title: string; 
    tasks: { id: string; title: string; order_index: number }[] 
  }[];
}

interface TaskAssignment {
  id: string;
  phase_id: string;
  section_id: string;
  subsection_id: string;
  task_name: string;
  status: string;
  assigned_to: string[];
  validators: string[];
}

interface ProjectStructureTabProps {
  conceptionStructure: StructureSectionInput[];
  realizationStructure: StructureSectionInput[];
  projectId: string;
  isAdmin?: boolean;
}

interface Intervenant {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  specialty?: string;
}

interface FullTaskAssignment extends TaskAssignment {
  project_id: string;
  deadline: string;
  validation_deadline: string;
  start_date?: string;
  end_date?: string;
  file_extension: string;
  comment?: string;
  created_at?: string;
  updated_at?: string;
}

const FILE_EXTENSIONS = [
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'doc', label: 'Word (.doc)' },
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'xls', label: 'Excel (.xls)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'jpg', label: 'Image JPEG (.jpg, .jpeg)' },
  { value: 'png', label: 'Image PNG (.png)' },
  { value: 'zip', label: 'Archive ZIP (.zip)' },
  { value: 'dwg', label: 'AutoCAD (.dwg)' },
  { value: 'other', label: 'Autre' }
];

const STATUS_LABELS: Record<string, string> = {
  assigned:   'Assignée',
  in_progress:'En cours',
  submitted:  'Soumise',
  validated:  'Validée',
  rejected:   'Rejetée',
  finalized:  'Finalisée',
};

const STATUS_COLORS: Record<string, string> = {
  assigned:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress:'bg-blue-100 text-blue-800 border-blue-200',
  submitted:  'bg-orange-100 text-orange-800 border-orange-200',
  validated:  'bg-green-100 text-green-800 border-green-200',
  rejected:   'bg-red-100 text-red-800 border-red-200',
  finalized:  'bg-purple-100 text-purple-800 border-purple-200',
};

const ProjectStructureTab: React.FC<ProjectStructureTabProps> = ({
  conceptionStructure,
  realizationStructure,
  projectId,
  isAdmin = false,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activePhase, setActivePhase] = useState<'conception' | 'realisation'>('conception');
  const [assignments, setAssignments] = useState<FullTaskAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  // Map: "user_id" -> "Prénom Nom"
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  // État pour la gestion de l'assignation de tâches
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [loadingIntervenants, setLoadingIntervenants] = useState(false);
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<{
    phase: 'conception' | 'realisation';
    section: string;
    subsection: string;
    taskName: string;
  } | null>(null);

  const [assignmentForm, setAssignmentForm] = useState<{
    assigned_to: string[];
    deadline: string;
    validation_deadline: string;
    start_date: string;
    end_date: string;
    validators: string[];
    file_extension: string;
    comment: string;
    use_visa_workflow: boolean;
  }>({
    assigned_to: [],
    deadline: '',
    validation_deadline: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    validators: [],
    file_extension: 'pdf',
    comment: '',
    use_visa_workflow: true
  });

  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');

  // État pour la désassignation
  const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false);
  const [taskToUnassign, setTaskToUnassign] = useState<FullTaskAssignment | null>(null);

  // Charger les task_assignments du projet
  useEffect(() => {
    if (!projectId) return;
    setLoadingAssignments(true);
    supabase
      .from('task_assignments')
      .select('*')
      .eq('project_id', projectId)
      .then(async ({ data }) => {
        const list: FullTaskAssignment[] = (data || []) as FullTaskAssignment[];
        setAssignments(list);

        // Collecter tous les user IDs uniques pour résoudre les noms
        const allIds = Array.from(new Set(
          list.flatMap(a => [...(a.assigned_to || []), ...(a.validators || [])])
        ));
        if (allIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', allIds);
          const map: Record<string, string> = {};
          (profiles || []).forEach((p: any) => {
            map[p.user_id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.user_id;
          });
          setUserNames(map);
        }
        setLoadingAssignments(false);
      });
  }, [projectId]);

  // Trouver l'assignment pour une tâche donnée
  const getAssignment = (phase: string, sectionId: string, itemId: string, taskName: string) =>
    assignments.find(
      a => a.phase_id === phase &&
           a.section_id === sectionId &&
           a.subsection_id === itemId &&
           a.task_name === taskName
    ) || null;

  // Charger les membres du projet
  useEffect(() => {
    if (!projectId) return;
    supabase
      .from('membre')
      .select('user_id')
      .eq('project_id', projectId)
      .then(({ data }) => {
        if (data) {
          setProjectMembers(data.map(m => m.user_id));
        }
      });
  }, [projectId]);

  // Charger les intervenants
  const fetchIntervenants = async () => {
    setLoadingIntervenants(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, specialty');

      if (error) throw error;
      setIntervenants(data || []);
    } catch (error) {
    } finally {
      setLoadingIntervenants(false);
    }
  };

  // Filtrer les intervenants pour l'assignation (seulement les membres du projet)
  const filteredIntervenantsForAssignment = useMemo(() => {
    const eligibleIntervenants = intervenants.filter(intervenant =>
      projectMembers.includes(intervenant.user_id)
    );

    if (!assignmentSearchQuery) return eligibleIntervenants;

    return eligibleIntervenants.filter(intervenant =>
      intervenant.first_name.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
      intervenant.last_name.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
      intervenant.email.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
      (intervenant.specialty && intervenant.specialty.toLowerCase().includes(assignmentSearchQuery.toLowerCase()))
    );
  }, [intervenants, assignmentSearchQuery, projectMembers]);

  // Ouvrir le dialogue d'assignation de tâche
  const handleOpenAssignTask = (phase: 'conception' | 'realisation', section: string, subsection: string, taskName: string) => {
    if (!isAdmin) {
      toast({
        title: 'Accès refusé',
        description: 'Seuls les administrateurs peuvent assigner des tâches',
        variant: 'destructive',
      });
      return;
    }

    setSelectedTask({
      phase,
      section,
      subsection,
      taskName
    });

    // Vérifier si la tâche est déjà assignée
    const existingAssignment = getAssignment(phase, section, subsection, taskName);

    if (existingAssignment) {
      // Pré-remplir le formulaire avec l'assignation existante
      setAssignmentForm({
        assigned_to: existingAssignment.assigned_to || [],
        deadline: existingAssignment.deadline ? existingAssignment.deadline.split('T')[0] : '',
        validation_deadline: existingAssignment.validation_deadline ? existingAssignment.validation_deadline.split('T')[0] : '',
        start_date: existingAssignment.start_date ? existingAssignment.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        end_date: existingAssignment.end_date ? existingAssignment.end_date.split('T')[0] : '',
        validators: existingAssignment.validators || [],
        file_extension: existingAssignment.file_extension || 'pdf',
        comment: existingAssignment.comment || '',
        use_visa_workflow: true
      });
    } else {
      // Réinitialiser le formulaire
      setAssignmentForm({
        assigned_to: [],
        deadline: '',
        validation_deadline: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        validators: [],
        file_extension: 'pdf',
        comment: '',
        use_visa_workflow: true
      });
    }

    // Réinitialiser la recherche
    setAssignmentSearchQuery('');

    // Charger les intervenants si ce n'est pas déjà fait
    if (intervenants.length === 0) {
      fetchIntervenants();
    }

    setIsAssignDialogOpen(true);
  };

  // Soumettre l'assignation de tâche
  const handleSubmitAssignment = async () => {
    if (!selectedTask || !projectId) return;

    if (!assignmentForm.assigned_to || assignmentForm.assigned_to.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un intervenant',
        variant: 'destructive',
      });
      return;
    }

    if (!assignmentForm.deadline) {
      toast({
        title: 'Erreur',
        description: 'Veuillez définir une date limite',
        variant: 'destructive',
      });
      return;
    }

    if (!assignmentForm.validation_deadline) {
      toast({
        title: 'Erreur',
        description: 'Veuillez définir une date limite pour la validation',
        variant: 'destructive',
      });
      return;
    }

    if (assignmentForm.validation_deadline < assignmentForm.deadline) {
      toast({
        title: 'Erreur',
        description: 'La date limite de validation ne peut pas être antérieure à la date limite de réalisation',
        variant: 'destructive',
      });
      return;
    }

    if (assignmentForm.start_date && assignmentForm.deadline) {
      if (assignmentForm.deadline < assignmentForm.start_date) {
        toast({
          title: 'Erreur',
          description: 'La date limite ne peut pas être antérieure à la date de début',
          variant: 'destructive',
        });
        return;
      }
    }

    if (assignmentForm.start_date && assignmentForm.end_date) {
      if (assignmentForm.end_date < assignmentForm.start_date) {
        toast({
          title: 'Erreur',
          description: 'La date de fin ne peut pas être antérieure à la date de début',
          variant: 'destructive',
        });
        return;
      }
    }

    if (assignmentForm.validators.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un validateur',
        variant: 'destructive',
      });
      return;
    }

    if (assignmentForm.assigned_to.some(id => assignmentForm.validators.includes(id))) {
      toast({
        title: 'Erreur',
        description: 'Un intervenant assigné ne peut pas être validateur',
        variant: 'destructive',
      });
      return;
    }

    // Vérifier si la tâche est déjà assignée
    const existingAssignment = getAssignment(
      selectedTask.phase,
      selectedTask.section,
      selectedTask.subsection,
      selectedTask.taskName
    );

    try {
      // Utiliser la fonction RPC pour gérer correctement les tableaux UUID
      const { data, error } = await supabase
        .rpc('upsert_task_assignment', {
          p_project_id: projectId,
          p_phase_id: selectedTask.phase,
          p_section_id: selectedTask.section,
          p_subsection_id: selectedTask.subsection,
          p_task_name: selectedTask.taskName,
          p_assigned_to: assignmentForm.assigned_to,
          p_deadline: assignmentForm.deadline,
          p_validation_deadline: assignmentForm.validation_deadline,
          p_validators: assignmentForm.validators,
          p_file_extension: assignmentForm.file_extension,
          p_use_visa_workflow: assignmentForm.use_visa_workflow,
          p_id: existingAssignment?.id || null,
          p_comment: assignmentForm.comment || null,
          p_status: existingAssignment?.status || 'assigned',
          p_start_date: assignmentForm.start_date || null,
          p_end_date: assignmentForm.end_date || null
        });

      if (error) throw error;
      const result = data;

      if (result) {
        toast({
          title: 'Succès',
          description: existingAssignment
            ? "L'assignation a été mise à jour avec succès"
            : 'La tâche a été assignée avec succès',
        });

        // Recharger les assignations
        const { data: updatedAssignments } = await supabase
          .from('task_assignments')
          .select('*')
          .eq('project_id', projectId);

        if (updatedAssignments) {
          setAssignments(updatedAssignments);
          // Mettre à jour les noms des utilisateurs
          const allIds = Array.from(new Set(
            updatedAssignments.flatMap((a: any) => [...(a.assigned_to || []), ...(a.validators || [])])
          ));
          if (allIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, first_name, last_name')
              .in('user_id', allIds);
            const map: Record<string, string> = {};
            (profiles || []).forEach((p: any) => {
              map[p.user_id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.user_id;
            });
            setUserNames(map);
          }
        }

        setIsAssignDialogOpen(false);
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'assigner la tâche',
        variant: 'destructive',
      });
    }
  };

  // Ouvrir la boîte de dialogue de confirmation pour désassigner une tâche
  const handleUnassignTask = (assignment: FullTaskAssignment) => {
    setTaskToUnassign(assignment);
    setIsUnassignDialogOpen(true);
  };

  // Désassigner une tâche
  const confirmUnassignTask = async () => {
    if (!taskToUnassign) return;

    try {
      const { error } = await supabase
        .from('task_assignments')
        .delete()
        .eq('id', taskToUnassign.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'La tâche a été désassignée avec succès',
      });

      // Mettre à jour la liste des assignations en retirant celle qui a été supprimée
      setAssignments(prev => prev.filter(t => t.id !== taskToUnassign.id));
      setIsUnassignDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de désassigner la tâche',
        variant: 'destructive',
      });
    }
  };

  const currentStructure = activePhase === 'conception' ? conceptionStructure : realizationStructure;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Assignement des tâches
            </h2>
            <div className="flex items-center gap-3">
              {loadingAssignments && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Tabs value={activePhase} onValueChange={v => setActivePhase(v as 'conception' | 'realisation')}>
                <TabsList>
                  <TabsTrigger value="conception">Phase Conception</TabsTrigger>
                  <TabsTrigger value="realisation">Phase Réalisation</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {currentStructure.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucune structure définie pour cette phase.
            </div>
          ) : (
            <Accordion type="multiple" className="w-full space-y-3">
              {currentStructure.map((section, si) => {
                const sectionLabel = String.fromCharCode(65 + si);
                // Compter les tâches assignées dans cette section
                const assignedCount = section.items.reduce((acc, item) =>
                  acc + item.tasks.filter(t => getAssignment(activePhase, section.id, item.id, t.title)).length, 0);
                const totalTasks = section.items.reduce((acc, item) => acc + item.tasks.length, 0);

                return (
                  <AccordionItem
                    key={section.id}
                    value={section.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-700 min-w-[1.5rem]">{sectionLabel}</span>
                        <span className="font-medium text-left">{section.title}</span>
                        <Badge variant="outline" className="ml-auto mr-2 text-xs">
                          {assignedCount}/{totalTasks} assignée{totalTasks > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="p-0">
                      <Accordion type="multiple" className="w-full">
                        {section.items.map((item, ii) => {
                          const itemLabel = `${sectionLabel}${ii + 1}`;
                          const itemAssigned = item.tasks.filter(t => getAssignment(activePhase, section.id, item.id, t.title)).length;

                          return (
                            <AccordionItem
                              key={item.id}
                              value={item.id}
                              className="border-t border-gray-100 last:border-b-0"
                            >
                              <AccordionTrigger className="px-6 py-2.5 hover:bg-gray-50/70 text-sm">
                                <div className="flex items-center gap-2">
                                  <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
                                  <span className="font-medium text-gray-600 min-w-[2.5rem]">{itemLabel}</span>
                                  <span className="text-left">{item.title}</span>
                                  <span className="ml-2 text-xs text-gray-400">
                                    {item.tasks.length} tâche{item.tasks.length > 1 ? 's' : ''}
                                    {itemAssigned > 0 && ` · ${itemAssigned} assignée${itemAssigned > 1 ? 's' : ''}`}
                                  </span>
                                </div>
                              </AccordionTrigger>

                              <AccordionContent className="px-6 pb-3 pt-1">
                                <div className="space-y-2">
                                  {item.tasks.map((task, ti) => {
                                    const assignment = getAssignment(activePhase, section.id, item.id, task.title);
                                    return (
                                      <div
                                        key={ti}
                                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="text-xs text-gray-400 shrink-0">{itemLabel}.{ti + 1}</span>
                                          <span className="text-sm truncate">{task.title}</span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          {assignment ? (
                                            <>
                                              {/* Statut */}
                                              <Badge className={`text-xs border ${STATUS_COLORS[assignment.status] || 'bg-gray-100 text-gray-700'}`}>
                                                {STATUS_LABELS[assignment.status] || assignment.status}
                                              </Badge>
                                              {/* Assignés */}
                                              {assignment.assigned_to?.length > 0 && (
                                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                                  <User className="h-3 w-3" />
                                                  {assignment.assigned_to.slice(0, 2).map(uid => userNames[uid] || '…').join(', ')}
                                                  {assignment.assigned_to.length > 2 && ` +${assignment.assigned_to.length - 2}`}
                                                </span>
                                              )}
                                              {/* Lien vers TaskDetails */}
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-xs gap-1"
                                                onClick={() => navigate(`/dashboard/tasks/${assignment.id}`)}
                                              >
                                                <ExternalLink className="h-3 w-3" />
                                                Voir
                                              </Button>
                                              {isAdmin && (
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                                                  onClick={() => handleUnassignTask(assignment as FullTaskAssignment)}
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              )}
                                            </>
                                          ) : (
                                            isAdmin ? (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-xs gap-1"
                                                onClick={() => handleOpenAssignTask(activePhase, section.id, item.id, task.title)}
                                              >
                                                <Plus className="h-3 w-3" />
                                                Assigner
                                              </Button>
                                            ) : (
                                              <span className="text-xs text-gray-400 italic">Non assignée</span>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'assignation de tâche */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTask && getAssignment(selectedTask.phase, selectedTask.section, selectedTask.subsection, selectedTask.taskName)
                ? 'Modifier l\'assignation'
                : 'Assigner une tâche'}
            </DialogTitle>
            <DialogDescription>
              {selectedTask && (
                <span className="text-sm text-gray-500">
                  {selectedTask.taskName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Sélection des intervenants */}
            <div className="space-y-2">
              <Label>Intervenants assignés *</Label>
              <div className="border rounded-lg p-3 space-y-3">
                <Input
                  placeholder="Rechercher un intervenant..."
                  value={assignmentSearchQuery}
                  onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                  className="mb-2"
                />
                {loadingIntervenants ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredIntervenantsForAssignment.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">
                    {intervenants.length === 0
                      ? 'Aucun intervenant disponible'
                      : 'Aucun membre du projet ne correspond à votre recherche'}
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredIntervenantsForAssignment.map((intervenant) => (
                      <label
                        key={intervenant.user_id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={assignmentForm.assigned_to.includes(intervenant.user_id)}
                          onCheckedChange={(checked) => {
                            // Single selection for executor (always)
                            if (checked) {
                              setAssignmentForm(prev => ({
                                ...prev,
                                assigned_to: [intervenant.user_id]
                              }));
                            } else {
                              setAssignmentForm(prev => ({
                                ...prev,
                                assigned_to: []
                              }));
                            }
                          }}
                        />
                        <span className="text-sm flex-1">
                          {intervenant.first_name} {intervenant.last_name}
                          {intervenant.specialty && (
                            <span className="text-gray-500 text-xs ml-1">({intervenant.specialty})</span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400">{intervenant.email}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {assignmentForm.assigned_to.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {assignmentForm.assigned_to.map(userId => {
                    const intervenant = intervenants.find(i => i.user_id === userId);
                    return intervenant ? (
                      <Badge key={userId} variant="secondary" className="gap-1">
                        {intervenant.first_name} {intervenant.last_name}
                        <button
                          onClick={() => setAssignmentForm(prev => ({
                            ...prev,
                            assigned_to: prev.assigned_to.filter(id => id !== userId)
                          }))}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Dates de début et fin */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Date de début *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={assignmentForm.start_date}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Date de fin prévue *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={assignmentForm.end_date}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Date limite */}
            <div className="space-y-2">
              <Label htmlFor="deadline">Date limite de réalisation *</Label>
              <Input
                id="deadline"
                type="date"
                value={assignmentForm.deadline}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>

            {/* Date limite de validation */}
            <div className="space-y-2">
              <Label htmlFor="validation_deadline">Date limite de validation *</Label>
              <Input
                id="validation_deadline"
                type="date"
                value={assignmentForm.validation_deadline}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, validation_deadline: e.target.value }))}
              />
            </div>

            {/* Sélection des validateurs */}
            <div className="space-y-2">
              <Label>Validateurs *</Label>
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-xs text-gray-500">
                  Les validateurs ne peuvent pas être parmi les intervenants assignés
                </p>
                {loadingIntervenants ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredIntervenantsForAssignment.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Aucun intervenant disponible
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredIntervenantsForAssignment
                      .filter(i => !assignmentForm.assigned_to.includes(i.user_id))
                      .map((intervenant) => (
                        <label
                          key={intervenant.user_id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <Checkbox
                            checked={assignmentForm.validators.includes(intervenant.user_id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                // If workflow is checked: multiple validators allowed
                                // If workflow is unchecked: single validator only
                                if (assignmentForm.use_visa_workflow) {
                                  setAssignmentForm(prev => ({
                                    ...prev,
                                    validators: [...prev.validators, intervenant.user_id]
                                  }));
                                } else {
                                  setAssignmentForm(prev => ({
                                    ...prev,
                                    validators: [intervenant.user_id]
                                  }));
                                }
                              } else {
                                setAssignmentForm(prev => ({
                                  ...prev,
                                  validators: prev.validators.filter(id => id !== intervenant.user_id)
                                }));
                              }
                            }}
                          />
                          <span className="text-sm flex-1">
                            {intervenant.first_name} {intervenant.last_name}
                          </span>
                        </label>
                      ))}
                  </div>
                )}
              </div>
              {/* Ordre des validateurs avec réordonnement */}
              {assignmentForm.validators.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-medium text-blue-700">Ordre de validation (du premier au dernier) :</Label>
                  <div className="space-y-2">
                    {assignmentForm.validators.map((userId, index) => {
                      const intervenant = intervenants.find(i => i.user_id === userId);
                      if (!intervenant) return null;
                      return (
                        <div 
                          key={userId} 
                          className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200"
                        >
                          <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          <span className="flex-1 text-sm font-medium">
                            {intervenant.first_name} {intervenant.last_name}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                if (index === 0) return;
                                setAssignmentForm(prev => {
                                  const newValidators = [...prev.validators];
                                  [newValidators[index], newValidators[index - 1]] = [newValidators[index - 1], newValidators[index]];
                                  return { ...prev, validators: newValidators };
                                });
                              }}
                              disabled={index === 0}
                              className="p-1 hover:bg-blue-200 rounded disabled:opacity-30 transition-colors"
                              title="Monter"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (index === assignmentForm.validators.length - 1) return;
                                setAssignmentForm(prev => {
                                  const newValidators = [...prev.validators];
                                  [newValidators[index], newValidators[index + 1]] = [newValidators[index + 1], newValidators[index]];
                                  return { ...prev, validators: newValidators };
                                });
                              }}
                              disabled={index === assignmentForm.validators.length - 1}
                              className="p-1 hover:bg-blue-200 rounded disabled:opacity-30 transition-colors"
                              title="Descendre"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setAssignmentForm(prev => ({
                                ...prev,
                                validators: prev.validators.filter(id => id !== userId)
                              }))}
                              className="p-1 hover:bg-red-100 text-red-600 rounded ml-1 transition-colors"
                              title="Retirer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-blue-600">
                    Utilisez les flèches pour modifier l'ordre de validation. Le premier validateur examine le document en premier.
                  </p>
                </div>
              )}
            </div>

            {/* Workflow VISA Toggle */}
            <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                  <Label htmlFor="use_visa_workflow" className="font-medium text-blue-900 cursor-pointer">
                    Workflow VISA
                  </Label>
                </div>
                <Checkbox
                  id="use_visa_workflow"
                  checked={assignmentForm.use_visa_workflow}
                  onCheckedChange={(checked) => 
                    setAssignmentForm(prev => ({ ...prev, use_visa_workflow: checked as boolean }))
                  }
                />
              </div>
              <p className="text-sm text-blue-700">
                {assignmentForm.use_visa_workflow 
                  ? "✓ Activé : Les validateurs devront donner un avis formel (Favorable, Défavorable, Suspendu ou Hors Mission) avec commentaire obligatoire. Chaque version est conservée."
                  : "⚪ Désactivé : Validation simple sans circuit de visa formel."
                }
              </p>
            </div>

            {/* Extension de fichier */}
            <div className="space-y-2">
              <Label htmlFor="file_extension">Type de fichier attendu *</Label>
              <Select
                value={assignmentForm.file_extension}
                onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, file_extension: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_EXTENSIONS.map(ext => (
                    <SelectItem key={ext.value} value={ext.value}>{ext.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Commentaire */}
            <div className="space-y-2">
              <Label htmlFor="comment">Commentaire (optionnel)</Label>
              <Textarea
                id="comment"
                placeholder="Instructions ou informations complémentaires..."
                value={assignmentForm.comment}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, comment: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitAssignment}>
              {selectedTask && getAssignment(selectedTask.phase, selectedTask.section, selectedTask.subsection, selectedTask.taskName)
                ? 'Mettre à jour'
                : 'Assigner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation pour désassigner */}
      <AlertDialog open={isUnassignDialogOpen} onOpenChange={setIsUnassignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désassigner cette tâche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera l'assignation de la tâche "{taskToUnassign?.task_name}".
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsUnassignDialogOpen(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnassignTask}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Désassigner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectStructureTab;
