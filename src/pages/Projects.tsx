import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, Users, BarChart3, Clock as ClockIcon, Loader2, Trash2, ChevronDown, ChevronRight, Pencil, Check, X, FileText, Save, ArrowLeft, ArrowRight } from 'lucide-react';
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
import { projectStructure, realizationStructure } from '@/data/project-structure';

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
  const [customStructure, setCustomStructure] = useState<TenantSection[]>([]);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [structurePhase, setStructurePhase] = useState<'conception' | 'realisation'>('conception');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // États pour l'ajout d'éléments
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<'item' | 'task' | 'section' | null>(null);
  const [newValue, setNewValue] = useState('');
  
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

  // Passer à l'étape suivante (Structure)
  const handleNextStep = async () => {
    if (!newProject.name.trim() || !newProject.description.trim() || !newProject.start_date) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setCreateStep(2);
    if (customStructure.length === 0) {
      await loadDefaultStructure();
    }
  };

  // Charger la structure par défaut (du tenant ou hardcoded)
  const loadDefaultStructure = async () => {
    if (!tenantId) return;
    setLoadingStructure(true);
    try {
      // Tenter de charger la structure du tenant
      const { data: sections } = await supabase
        .from('tenant_project_sections')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('order_index');

      if (sections && sections.length > 0) {
        const built: TenantSection[] = await Promise.all(
          sections.map(async (sec: any) => {
            const { data: items } = await supabase
              .from('tenant_project_items')
              .select('*')
              .eq('section_id', sec.id)
              .order('order_index');
            
            const builtItems: TenantItem[] = await Promise.all(
              (items || []).map(async (item: any) => {
                const { data: tasks } = await supabase
                  .from('tenant_project_tasks')
                  .select('*')
                  .eq('item_id', item.id)
                  .order('order_index');
                
                // Charger aussi les fiches informatives
                const taskIds = (tasks || []).map(t => t.id);
                let infoSheetsMap: Record<string, string> = {};
                if (taskIds.length > 0) {
                  const { data: sheets } = await supabase
                    .from('tenant_task_info_sheets')
                    .select('*')
                    .in('tenant_task_id', taskIds);
                  (sheets || []).forEach(s => { infoSheetsMap[s.tenant_task_id] = s.info_sheet; });
                }

                return { 
                  ...item, 
                  tasks: (tasks || []).map(t => ({ ...t, info_sheet: infoSheetsMap[t.id] || '' })) 
                };
              })
            );
            return { ...sec, items: builtItems };
          })
        );
        setCustomStructure(built);
      } else {
        // Si pas de structure tenant, utiliser les défauts hardcodés
        const conception = projectStructure.map((s, si) => ({
          id: `temp-sec-${si}`,
          title: s.title,
          phase: 'conception',
          order_index: si,
          items: s.items.map((it, ii) => ({
            id: `temp-item-${si}-${ii}`,
            section_id: `temp-sec-${si}`,
            title: it.title,
            order_index: ii,
            tasks: it.tasks.map((t, ti) => ({
              id: `temp-task-${si}-${ii}-${ti}`,
              item_id: `temp-item-${si}-${ii}`,
              title: t,
              order_index: ti,
              info_sheet: ''
            }))
          }))
        }));

        const realisation = realizationStructure.map((s, si) => ({
          id: `temp-sec-r-${si}`,
          title: s.title,
          phase: 'realisation',
          order_index: si,
          items: s.items.map((it, ii) => ({
            id: `temp-item-r-${si}-${ii}`,
            section_id: `temp-sec-r-${si}`,
            title: it.title,
            order_index: ii,
            tasks: it.tasks.map((t, ti) => ({
              id: `temp-task-r-${si}-${ii}-${ti}`,
              item_id: `temp-item-r-${si}-${ii}`,
              title: t,
              order_index: ti,
              info_sheet: ''
            }))
          }))
        }));

        setCustomStructure([...conception, ...realisation] as TenantSection[]);
      }
    } catch (error) {
      console.error("Error loading structure:", error);
    } finally {
      setLoadingStructure(false);
    }
  };

  // Fonctions de modification de la structure locale
  const toggleSection = (id: string) =>
    setExpandedSections(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleItem = (id: string) =>
    setExpandedItems(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const addSection = () => {
    if (!newValue.trim()) return;
    const newSection: TenantSection = {
      id: `new-sec-${Date.now()}`,
      title: newValue.trim(),
      phase: structurePhase,
      order_index: customStructure.filter(s => s.phase === structurePhase).length,
      items: []
    };
    setCustomStructure([...customStructure, newSection]);
    setNewValue('');
    setAddingType(null);
  };

  const deleteSection = (id: string) => {
    setCustomStructure(customStructure.filter(s => s.id !== id));
  };

  const addItem = (sectionId: string) => {
    if (!newValue.trim()) return;
    setCustomStructure(customStructure.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          items: [...s.items, {
            id: `new-item-${Date.now()}`,
            section_id: sectionId,
            title: newValue.trim(),
            order_index: s.items.length,
            tasks: []
          }]
        };
      }
      return s;
    }));
    setNewValue('');
    setAddingToId(null);
    setAddingType(null);
  };

  const deleteItem = (sectionId: string, itemId: string) => {
    setCustomStructure(customStructure.map(s => {
      if (s.id === sectionId) {
        return { ...s, items: s.items.filter(i => i.id !== itemId) };
      }
      return s;
    }));
  };

  const addTask = (sectionId: string, itemId: string) => {
    if (!newValue.trim()) return;
    setCustomStructure(customStructure.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          items: s.items.map(i => {
            if (i.id === itemId) {
              return {
                ...i,
                tasks: [...i.tasks, {
                  id: `new-task-${Date.now()}`,
                  item_id: itemId,
                  title: newValue.trim(),
                  order_index: i.tasks.length,
                  info_sheet: ''
                }]
              };
            }
            return i;
          })
        };
      }
      return s;
    }));
    setNewValue('');
    setAddingToId(null);
    setAddingType(null);
  };

  const deleteTask = (sectionId: string, itemId: string, taskId: string) => {
    setCustomStructure(customStructure.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          items: s.items.map(i => {
            if (i.id === itemId) {
              return { ...i, tasks: i.tasks.filter(t => t.id !== taskId) };
            }
            return i;
          })
        };
      }
      return s;
    }));
  };

  const saveEdit = () => {
    if (!editingId || !editValue.trim()) {
      setEditingId(null);
      return;
    }
    setCustomStructure(customStructure.map(s => {
      if (s.id === editingId) return { ...s, title: editValue };
      return {
        ...s,
        items: s.items.map(i => {
          if (i.id === editingId) return { ...i, title: editValue };
          return {
            ...i,
            tasks: i.tasks.map(t => {
              if (t.id === editingId) return { ...t, title: editValue };
              return t;
            })
          };
        })
      };
    }));
    setEditingId(null);
    setEditValue('');
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
      
      // Utiliser createProject qui crée aussi le snapshot de structure (avec customStructure si présente)
      const result = await createProject(projectData, user?.id || '', customStructure);
      
      if (result) {
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
        setCustomStructure([]);
        // Recharger les projets
        fetchProjects();
      }
    } catch (error) {
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
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                    <Button 
                      variant={structurePhase === 'conception' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      onClick={() => setStructurePhase('conception')}
                      className={structurePhase === 'conception' ? 'shadow-sm bg-white' : ''}
                    >
                      Conception
                    </Button>
                    <Button 
                      variant={structurePhase === 'realisation' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      onClick={() => setStructurePhase('realisation')}
                      className={structurePhase === 'realisation' ? 'shadow-sm bg-white' : ''}
                    >
                      Réalisation
                    </Button>
                  </div>
                  <Button size="sm" onClick={() => { setAddingType('section'); setAddingToId(null); setNewValue(''); }}>
                    <Plus className="h-4 w-4 mr-1" /> Ajouter une étape
                  </Button>
                </div>

                {loadingStructure ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-aps-teal" />
                    <p className="text-sm text-muted-foreground">Chargement de la structure par défaut...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customStructure.filter(s => s.phase === structurePhase).map(sec => (
                      <div key={sec.id} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                        {/* Section Header */}
                        <div className="flex items-center gap-2 bg-gray-50/80 px-4 py-3 border-b">
                          <button
                            className="flex items-center gap-2 flex-1 text-left font-bold text-gray-800"
                            onClick={() => toggleSection(sec.id)}
                          >
                            {expandedSections.has(sec.id)
                              ? <ChevronDown className="h-5 w-5 text-aps-teal" />
                              : <ChevronRight className="h-5 w-5 text-aps-teal" />}
                            
                            {editingId === sec.id ? (
                              <Input 
                                value={editValue} 
                                onChange={e => setEditValue(e.target.value)} 
                                className="h-8 text-sm"
                                autoFocus 
                                onClick={e => e.stopPropagation()} 
                                onKeyDown={e => e.key === 'Enter' && saveEdit()} 
                                onBlur={saveEdit}
                              />
                            ) : (
                              <span>{sec.title}</span>
                            )}
                          </button>
                          
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-aps-teal" onClick={() => { setEditingId(sec.id); setEditValue(sec.title); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => deleteSection(sec.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-aps-teal" onClick={() => { setAddingType('item'); setAddingToId(sec.id); setNewValue(''); }}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Items */}
                        {expandedSections.has(sec.id) && (
                          <div className="p-3 space-y-3 bg-white">
                            {sec.items.map(item => (
                              <div key={item.id} className="border rounded-lg overflow-hidden ml-6">
                                <div className="flex items-center gap-2 bg-gray-50/50 px-3 py-2 border-b">
                                  <button className="flex items-center gap-2 flex-1 text-left font-semibold text-sm text-gray-700" onClick={() => toggleItem(item.id)}>
                                    {expandedItems.has(item.id)
                                      ? <ChevronDown className="h-4 w-4 text-aps-teal/70" />
                                      : <ChevronRight className="h-4 w-4 text-aps-teal/70" />}
                                    
                                    {editingId === item.id ? (
                                      <Input 
                                        value={editValue} 
                                        onChange={e => setEditValue(e.target.value)} 
                                        className="h-7 text-xs"
                                        autoFocus 
                                        onClick={e => e.stopPropagation()} 
                                        onKeyDown={e => e.key === 'Enter' && saveEdit()} 
                                        onBlur={saveEdit}
                                      />
                                    ) : (
                                      <span>{item.title}</span>
                                    )}
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-aps-teal" onClick={() => { setEditingId(item.id); setEditValue(item.title); }}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => deleteItem(sec.id, item.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-aps-teal" onClick={() => { setAddingType('task'); setAddingToId(item.id); setNewValue(''); }}>
                                      <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Tasks */}
                                {expandedItems.has(item.id) && (
                                  <div className="p-2 ml-4 space-y-1">
                                    {item.tasks.map(task => (
                                      <div key={task.id} className="flex items-center gap-2 py-1.5 px-3 rounded-md text-sm hover:bg-gray-50 group">
                                        <div className="flex-1 text-gray-600">
                                          {editingId === task.id ? (
                                            <Input 
                                              value={editValue} 
                                              onChange={e => setEditValue(e.target.value)} 
                                              className="h-7 text-xs"
                                              autoFocus 
                                              onKeyDown={e => e.key === 'Enter' && saveEdit()} 
                                              onBlur={saveEdit}
                                            />
                                          ) : (
                                            task.title
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:text-aps-teal" onClick={() => { setEditingId(task.id); setEditValue(task.title); }}>
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:text-red-500" onClick={() => deleteTask(sec.id, item.id, task.id)}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}

                                    {addingType === 'task' && addingToId === item.id && (
                                      <div className="flex items-center gap-2 p-2 bg-aps-teal/5 rounded-md">
                                        <Input 
                                          value={newValue} 
                                          onChange={e => setNewValue(e.target.value)} 
                                          placeholder="Nouvelle tâche..."
                                          className="h-8 text-xs focus-visible:ring-aps-teal"
                                          autoFocus
                                          onKeyDown={e => e.key === 'Enter' && addTask(sec.id, item.id)}
                                        />
                                        <Button size="sm" className="h-8 px-2 bg-aps-teal" onClick={() => addTask(sec.id, item.id)}>
                                          <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setAddingType(null)}>
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}

                            {addingType === 'item' && addingToId === sec.id && (
                              <div className="flex items-center gap-2 p-3 bg-aps-teal/5 rounded-lg ml-6">
                                <Input 
                                  value={newValue} 
                                  onChange={e => setNewValue(e.target.value)} 
                                  placeholder="Nouvelle sous-étape..."
                                  className="h-9 text-sm focus-visible:ring-aps-teal"
                                  autoFocus
                                  onKeyDown={e => e.key === 'Enter' && addItem(sec.id)}
                                />
                                <Button size="sm" className="bg-aps-teal" onClick={() => addItem(sec.id)}>
                                  <Check className="h-4 w-4 mr-1" /> Ajouter
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setAddingType(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {addingType === 'section' && (
                      <div className="flex items-center gap-2 p-4 border-2 border-dashed border-aps-teal/30 bg-aps-teal/5 rounded-xl">
                        <Input 
                          value={newValue} 
                          onChange={e => setNewValue(e.target.value)} 
                          placeholder="Nom de la nouvelle étape..."
                          className="h-10 focus-visible:ring-aps-teal"
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && addSection()}
                        />
                        <Button className="bg-aps-teal" onClick={addSection}>
                          <Check className="h-4 w-4 mr-1" /> Ajouter l'étape
                        </Button>
                        <Button variant="ghost" onClick={() => setAddingType(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
                <Button variant="ghost" onClick={() => setCreateStep(1)} className="mr-auto">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleSubmitNewProject} className="bg-aps-teal hover:bg-aps-navy" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...
                    </>
                  ) : (
                    'Créer le projet'
                  )}
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
