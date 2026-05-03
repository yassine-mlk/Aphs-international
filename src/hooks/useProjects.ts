import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { Project, ProjectFormData, ProjectFilters } from '../types/project';
import { useToast } from '@/components/ui/use-toast';

export function useProjects() {
  const { status } = useAuth();
  const { fetchData, insertData, updateData, deleteData, supabase } = useSupabase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Récupérer tous les projets avec filtres optionnels
  const getProjects = useCallback(async (filters?: ProjectFilters): Promise<Project[]> => {
    if (status !== 'authenticated') return [];
    setLoading(true);
    try {
      const queryFilters = [];
      
      if (filters?.status) {
        queryFilters.push({ column: 'status', operator: 'eq', value: filters.status });
      }
      
      if (filters?.company_id) {
        queryFilters.push({ column: 'company_id', operator: 'eq', value: filters.company_id });
      }
      
      if (filters?.start_date_from) {
        queryFilters.push({ column: 'start_date', operator: 'gte', value: filters.start_date_from });
      }
      
      if (filters?.start_date_to) {
        queryFilters.push({ column: 'start_date', operator: 'lte', value: filters.start_date_to });
      }
      
      if (filters?.end_date_from) {
        queryFilters.push({ column: 'end_date', operator: 'gte', value: filters.end_date_from });
      }
      
      if (filters?.end_date_to) {
        queryFilters.push({ column: 'end_date', operator: 'lte', value: filters.end_date_to });
      }

      const projects = await fetchData<Project>('projects', {
        filters: queryFilters.length > 0 ? queryFilters : undefined,
        order: { column: 'created_at', ascending: false }
      });

      return projects;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les projets",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchData, toast]);

  // Récupérer un projet par son ID
  const getProjectById = useCallback(async (id: string): Promise<Project | null> => {
    if (status !== 'authenticated') return null;
    try {
      const projects = await fetchData<Project>('projects', {
        filters: [{ column: 'id', operator: 'eq', value: id }],
        limit: 1
      });

      return projects.length > 0 ? projects[0] : null;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le projet",
        variant: "destructive",
      });
      return null;
    }
  }, [fetchData, toast]);

  // Snapshot la structure tenant + fiches dans les tables projet (version optimisée parallèle)
  const snapshotTenantStructure = async (projectId: string, tenantId: string) => {
    if (status !== 'authenticated') return;
    try {
      // 1. Charger toute la structure tenant en parallèle
      let [{ data: sections, error: secFetchError }, { data: allItems, error: itemFetchError }, { data: allTasks, error: taskFetchError }] = await Promise.all([
        supabase.from('tenant_project_sections').select('*').eq('tenant_id', tenantId).order('order_index'),
        supabase.from('tenant_project_items').select('*').order('order_index'),
        supabase.from('tenant_project_tasks').select('*').order('order_index')
      ]);

      if (secFetchError) throw secFetchError;
      if (itemFetchError) throw itemFetchError;
      if (taskFetchError) throw taskFetchError;

      // SI LE TENANT N'A PAS DE STRUCTURE (Nouveau compte)
      // On va utiliser la structure par défaut (hardcoded)
      if (!sections || sections.length === 0) {
        console.log("Tenant has no structure, using hardcoded defaults...");
        // On importe dynamiquement pour éviter les cycles ou charger inutilement
        const { projectStructure, realizationStructure } = await import('@/data/project-structure');
        
        const defaultStructure: any[] = [
          ...projectStructure.map((s, i) => ({ ...s, phase: 'conception', order_index: i })),
          ...realizationStructure.map((s, i) => ({ ...s, phase: 'realisation', order_index: i }))
        ];
        
        return snapshotCustomStructure(projectId, defaultStructure);
      }

      // Filtrer les items et tâches pour ce tenant
      const sectionIds = sections.map((s: any) => s.id);
      const items = (allItems || []).filter((i: any) => sectionIds.includes(i.section_id));
      const itemIds = items.map((i: any) => i.id);
      const tasks = (allTasks || []).filter((t: any) => itemIds.includes(t.item_id));

      // 2. Charger les fiches informatives
      const taskIds = tasks.map((t: any) => t.id);
      let infoSheets: any[] = [];
      if (taskIds.length > 0) {
        const { data: s, error: sheetError } = await supabase
          .from('tenant_task_info_sheets').select('*').in('tenant_task_id', taskIds);
        if (sheetError) throw sheetError;
        infoSheets = s || [];
      }
      const infoSheetMap: Record<string, string> = {};
      infoSheets.forEach((s: any) => { infoSheetMap[s.tenant_task_id] = s.info_sheet; });

      // 3. Insérer toutes les sections en UNE SEULE REQUÊTE
      const { data: newSections, error: secInsError } = await supabase
        .from('project_sections_snapshot')
        .insert(sections.map((sec: any) => ({
          project_id: projectId,
          title: sec.title,
          phase: sec.phase,
          order_index: sec.order_index,
          tenant_section_id: sec.id
        })))
        .select();

      if (secInsError) throw secInsError;
      if (!newSections || newSections.length === 0) return;

      // Map: old_section_id -> new_section_id
      const sectionIdMap = new Map(newSections.map((s: any) => [s.tenant_section_id, s.id]));

      // 4. Préparer et insérer tous les items en UNE SEULE REQUÊTE
      const itemsToInsert = items
        .filter((item: any) => sectionIdMap.has(item.section_id))
        .map((item: any) => ({
          project_id: projectId,
          section_id: sectionIdMap.get(item.section_id),
          title: item.title,
          order_index: item.order_index,
          tenant_item_id: item.id
        }));

      if (itemsToInsert.length === 0) return;

      const { data: newItems, error: itemInsError } = await supabase
        .from('project_items_snapshot')
        .insert(itemsToInsert)
        .select();

      if (itemInsError) throw itemInsError;
      if (!newItems || newItems.length === 0) return;

      // Map: old_item_id -> new_item_id
      const itemIdMap = new Map(newItems.map((i: any) => [i.tenant_item_id, i.id]));

      // 5. Préparer et insérer toutes les tâches en UNE SEULE REQUÊTE
      const tasksToInsert = tasks
        .filter((task: any) => itemIdMap.has(task.item_id))
        .map((task: any) => ({
          project_id: projectId,
          item_id: itemIdMap.get(task.item_id),
          title: task.title,
          order_index: task.order_index,
          tenant_task_id: task.id,
          info_sheet: infoSheetMap[task.id] || ''
        }));

      if (tasksToInsert.length > 0) {
        const { error: taskInsError } = await supabase.from('project_tasks_snapshot').insert(tasksToInsert);
        if (taskInsError) throw taskInsError;
      }

    } catch (e) {
      console.error("Error snapshotting tenant structure:", e);
      toast({
        title: "Erreur de structure",
        description: "Le projet a été créé mais sa structure n'a pas pu être initialisée correctement.",
        variant: "destructive"
      });
    }
  };

  // Snapshot la structure personnalisée dans les tables projet
  const snapshotCustomStructure = async (projectId: string, customStructure: any[]) => {
    if (status !== 'authenticated') return;
    
    // Helper pour vérifier si un ID est un UUID valide
    const isValidUUID = (id: string) => {
      if (!id || typeof id !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    };

    try {
      // 1. Insérer toutes les sections
      const sectionsToInsert = customStructure.map((sec: any) => ({
        project_id: projectId,
        title: sec.title,
        phase: sec.phase || 'conception', // Fallback au cas où
        order_index: sec.order_index || 0,
        tenant_section_id: isValidUUID(sec.id) ? sec.id : null
      }));

      const { data: newSections, error: secError } = await supabase
        .from('project_sections_snapshot')
        .insert(sectionsToInsert)
        .select();

      if (secError) {
        console.error("Error inserting project sections snapshot:", secError);
        throw secError;
      }
      if (!newSections || newSections.length === 0) return;

      const sectionIdMap = new Map();
      // On utilise l'index pour mapper car l'ordre est conservé par Supabase sur un insert en masse
      newSections.forEach((s: any, idx: number) => {
        if (customStructure[idx]) {
          sectionIdMap.set(customStructure[idx].id, s.id);
        }
      });

      // 2. Préparer les items
      const itemsWithOriginalId: any[] = [];

      customStructure.forEach((sec: any) => {
        const newSectionId = sectionIdMap.get(sec.id);
        if (newSectionId && sec.items) {
          sec.items.forEach((item: any) => {
            itemsWithOriginalId.push({
              itemToInsert: {
                project_id: projectId,
                section_id: newSectionId,
                title: item.title,
                order_index: item.order_index || 0,
                tenant_item_id: isValidUUID(item.id) ? item.id : null
              },
              originalId: item.id
            });
          });
        }
      });

      if (itemsWithOriginalId.length === 0) return;

      const { data: newItems, error: itemError } = await supabase
        .from('project_items_snapshot')
        .insert(itemsWithOriginalId.map(x => x.itemToInsert))
        .select();

      if (itemError) {
        console.error("Error inserting project items snapshot:", itemError);
        throw itemError;
      }
      if (!newItems || newItems.length === 0) return;

      // Créer une map pour retrouver l'ID de l'item original
      const itemIdMap = new Map();
      newItems.forEach((newItem: any, idx: number) => {
        if (itemsWithOriginalId[idx]) {
          itemIdMap.set(itemsWithOriginalId[idx].originalId, newItem.id);
        }
      });

      // 3. Préparer les tâches
      const tasksToInsert: any[] = [];
      customStructure.forEach((sec: any) => {
        if (sec.items) {
          sec.items.forEach((item: any) => {
            const newItemId = itemIdMap.get(item.id);
            if (newItemId && item.tasks) {
              item.tasks.forEach((task: any) => {
                tasksToInsert.push({
                  project_id: projectId,
                  item_id: newItemId,
                  title: task.title,
                  order_index: task.order_index || 0,
                  tenant_task_id: isValidUUID(task.id) ? task.id : null,
                  info_sheet: task.info_sheet || ''
                });
              });
            }
          });
        }
      });

      if (tasksToInsert.length > 0) {
        const { error: taskError } = await supabase.from('project_tasks_snapshot').insert(tasksToInsert);
        if (taskError) {
          console.error("Error inserting project tasks snapshot:", taskError);
          throw taskError;
        }
      }

    } catch (e) {
      console.error("Error snapshotting custom structure:", e);
      toast({
        title: "Erreur de structure",
        description: "Le projet a été créé mais sa structure n'a pas pu être initialisée correctement.",
        variant: "destructive"
      });
      throw e; // Relancer pour que createProject le sache
    }
  };

  // Créer un nouveau projet
  const createProject = useCallback(async (
    projectData: ProjectFormData,
    currentUserId: string,
    customStructure?: any[]
  ): Promise<Project | null> => {
    if (status !== 'authenticated') return null;
    setLoading(true);
    try {
      // Validation des champs obligatoires
      if (!projectData.name.trim()) {
        toast({
          title: "Erreur",
          description: "Le nom du projet est obligatoire",
          variant: "destructive",
        });
        return null;
      }

      if (!projectData.description.trim()) {
        toast({
          title: "Erreur",
          description: "La description du projet est obligatoire",
          variant: "destructive",
        });
        return null;
      }

      if (!projectData.start_date) {
        toast({
          title: "Erreur",
          description: "La date de début est obligatoire",
          variant: "destructive",
        });
        return null;
      }

      const newProject = await insertData<Project>('projects', {
        ...projectData,
        created_by: currentUserId,
        created_at: new Date().toISOString()
      });

      if (newProject) {
        // Snapshot de la structure et fiches tenant vers le projet
        const tenantId = (projectData as any).tenant_id;
        if (customStructure && customStructure.length > 0) {
          // Utiliser la structure personnalisée si fournie
          await snapshotCustomStructure(newProject.id, customStructure);
        } else if (tenantId && newProject.id) {
          // Sinon utiliser la structure par défaut du tenant
          await snapshotTenantStructure(newProject.id, tenantId);
        }
      }

      return newProject;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le projet",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [insertData, toast]);

  // Mettre à jour un projet
  const updateProject = useCallback(async (id: string, projectData: Partial<ProjectFormData>): Promise<Project | null> => {
    if (status !== 'authenticated') return null;
    setLoading(true);
    try {
      // Validation des champs obligatoires s'ils sont fournis
      if (projectData.name !== undefined && !projectData.name.trim()) {
        toast({
          title: "Erreur",
          description: "Le nom du projet ne peut pas être vide",
          variant: "destructive",
        });
        return null;
      }

      if (projectData.description !== undefined && !projectData.description.trim()) {
        toast({
          title: "Erreur",
          description: "La description du projet ne peut pas être vide",
          variant: "destructive",
        });
        return null;
      }

      const updatedProject = await updateData<Project>('projects', {
        id,
        ...projectData,
        updated_at: new Date().toISOString()
      });

      if (updatedProject) {
        toast({
          title: "Succès",
          description: "Projet mis à jour avec succès",
        });
      }

      return updatedProject;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le projet",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [updateData, toast]);

  // Supprimer un projet
  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    if (status !== 'authenticated') return false;
    setLoading(true);
    try {
      const success = await deleteData('projects', id);

      if (success) {
        toast({
          title: "Succès",
          description: "Projet supprimé avec succès",
        });
      }

      return success;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le projet",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [deleteData, toast, supabase]);

  // Récupérer les projets d'une entreprise
  const getProjectsByCompany = useCallback(async (companyId: string): Promise<Project[]> => {
    return getProjects({ company_id: companyId });
  }, [getProjects]);

  // Récupérer les projets créés par un utilisateur
  const getProjectsByUser = useCallback(async (userId: string): Promise<Project[]> => {
    if (status !== 'authenticated') return [];
    try {
      const projects = await fetchData<Project>('projects', {
        filters: [{ column: 'created_by', operator: 'eq', value: userId }],
        order: { column: 'created_at', ascending: false }
      });

      return projects;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les projets de l'utilisateur",
        variant: "destructive",
      });
      return [];
    }
  }, [fetchData, toast]);

  // Rechercher des projets par nom ou description
  const searchProjects = useCallback(async (searchTerm: string): Promise<Project[]> => {
    if (status !== 'authenticated') return [];
    try {
      const projects = await fetchData<Project>('projects', {
        order: { column: 'created_at', ascending: false }
      });

      // Filtrer côté client (car Supabase nécessite des filtres spécifiques pour la recherche textuelle)
      const filteredProjects = projects.filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return filteredProjects;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de rechercher les projets",
        variant: "destructive",
      });
      return [];
    }
  }, [fetchData, toast]);

  return {
    loading,
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    getProjectsByCompany,
    getProjectsByUser,
    searchProjects,
  };
} 
