import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/use-toast';
import { projectStructure, realizationStructure } from '../data/project-structure';

// Types pour les structures personnalisées
interface CustomStructureItem {
  phase_id: string;
  section_id: string;
  subsection_id: string | null;
  is_deleted: boolean;
  deleted_by: string | null;
  deleted_at: string | null;
}

interface ProjectSection {
  id: string;
  title: string;
  items: ProjectSubsection[];
}

interface ProjectSubsection {
  id: string;
  title: string;
  tasks: string[];
}

// ── Caches module-level ──
const tenantStructureCache: Record<string, { conception: ProjectSection[]; realisation: ProjectSection[] }> = {};
const projectTenantCache: Record<string, string | null> = {};

export const invalidateTenantStructureCache = (tenantId?: string) => {
  if (tenantId) {
    delete tenantStructureCache[tenantId];
  } else {
    Object.keys(tenantStructureCache).forEach(k => delete tenantStructureCache[k]);
  }
};

export const useProjectStructure = (projectId: string) => {
  const { supabase, fetchData } = useSupabase();
  const { user, status } = useAuth();
  const { toast } = useToast();
  
  const [customStructures, setCustomStructures] = useState<CustomStructureItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Initialiser avec des tableaux vides - on ne charge que le snapshot du projet
  const [customProjectStructure, setCustomProjectStructure] = useState<ProjectSection[]>([]);
  const [customRealizationStructure, setCustomRealizationStructure] = useState<ProjectSection[]>([]);

  // ── Charger la structure tenant en 3 requêtes plates (toutes phases confondues) ──
  const loadTenantStructure = useCallback(async (tenantId: string): Promise<{ hasTenantStructure: boolean }> => {
    if (status !== 'authenticated') return { hasTenantStructure: false };
    // Cache hit
    if (tenantStructureCache[tenantId]) {
      const cached = tenantStructureCache[tenantId];
      if (cached.conception.length > 0) setCustomProjectStructure(cached.conception);
      if (cached.realisation.length > 0) setCustomRealizationStructure(cached.realisation);
      return { hasTenantStructure: cached.conception.length > 0 || cached.realisation.length > 0 };
    }

    // 1. Toutes les sections du tenant (les deux phases d'un coup)
    const { data: allSections } = await supabase
      .from('tenant_project_sections')
      .select('id, title, phase, order_index')
      .eq('tenant_id', tenantId)
      .order('order_index');

    if (!allSections || allSections.length === 0) return { hasTenantStructure: false };

    const sectionIds = allSections.map((s: any) => s.id);

    // 2. Tous les items des sections
    const { data: allItems } = await supabase
      .from('tenant_project_items')
      .select('id, title, section_id, order_index')
      .in('section_id', sectionIds)
      .order('order_index');

    // 3. Toutes les tasks des items
    const itemIds = (allItems || []).map((i: any) => i.id);
    let allTasks: any[] = [];
    if (itemIds.length > 0) {
      const { data: tasksData } = await supabase
        .from('tenant_project_tasks')
        .select('title, item_id, order_index')
        .in('item_id', itemIds)
        .order('order_index');
      allTasks = tasksData || [];
    }

    // Assembler par phase en JS (pas de requête supplémentaire)
    const buildPhase = (phase: 'conception' | 'realisation'): ProjectSection[] => {
      const sections = allSections
        .filter((s: any) => s.phase === phase)
        .sort((a: any, b: any) => a.order_index - b.order_index);

      return sections.map((sec: any) => {
        const items = (allItems || [])
          .filter((i: any) => i.section_id === sec.id)
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((item: any) => ({
            id: item.id,
            title: item.title,
            tasks: allTasks
              .filter((t: any) => t.item_id === item.id)
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((t: any) => t.title),
          }));
        return { id: sec.id, title: sec.title, items };
      });
    };

    const conception = buildPhase('conception');
    const realisation = buildPhase('realisation');

    if (conception.length > 0 || realisation.length > 0) {
      tenantStructureCache[tenantId] = { conception, realisation };
      if (conception.length > 0) setCustomProjectStructure(conception);
      if (realisation.length > 0) setCustomRealizationStructure(realisation);
      return { hasTenantStructure: true };
    }
    return { hasTenantStructure: false };
  }, [supabase]);

  // ── Charger la structure snapshot du projet (figée à la création) ──
  const loadSnapshotStructure = useCallback(async (): Promise<boolean> => {
    if (status !== 'authenticated') return false;
    try {
      const { data: sections, error } = await supabase
        .from('project_sections_snapshot')
        .select('id, title, phase, order_index')
        .eq('project_id', projectId)
        .order('order_index');

      if (error || !sections || sections.length === 0) return false;

      const sectionIds = sections.map((s: any) => s.id);
      const { data: items } = await supabase
        .from('project_items_snapshot')
        .select('id, title, section_id, order_index')
        .in('section_id', sectionIds)
        .order('order_index');

      const itemIds = (items || []).map((i: any) => i.id);
      let tasks: any[] = [];
      if (itemIds.length > 0) {
        const { data: t } = await supabase
          .from('project_tasks_snapshot')
          .select('id, title, item_id, order_index, info_sheet')
          .in('item_id', itemIds)
          .order('order_index');
        tasks = t || [];
      }

      const buildPhase = (phase: 'conception' | 'realisation'): ProjectSection[] =>
        sections
          .filter((s: any) => s.phase === phase)
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((sec: any) => ({
            id: sec.id,
            title: sec.title,
            items: (items || [])
              .filter((i: any) => i.section_id === sec.id)
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((item: any) => ({
                id: item.id,
                title: item.title,
                tasks: tasks
                  .filter((t: any) => t.item_id === item.id)
                  .sort((a: any, b: any) => a.order_index - b.order_index)
                  .map((t: any) => t.title),
              })),
          }));

      const conception = buildPhase('conception');
      const realisation = buildPhase('realisation');
      if (conception.length > 0) setCustomProjectStructure(conception);
      if (realisation.length > 0) setCustomRealizationStructure(realisation);
      return conception.length > 0 || realisation.length > 0;
    } catch {
      return false;
    }
  }, [projectId, supabase]);

  // ── Créer un snapshot pour un projet existant sans snapshot ──
  const createSnapshotForExistingProject = useCallback(async (tenantId: string) => {
    if (status !== 'authenticated') return false;
    try {
      // 1. Récupérer la structure tenant actuelle
      const { data: sections } = await supabase
        .from('tenant_project_sections')
        .select('id, title, phase, order_index')
        .eq('tenant_id', tenantId)
        .order('order_index');

      if (!sections || sections.length === 0) return false;

      // 2. Créer les sections snapshot
      const sectionIdMap = new Map<string, string>(); // old_id -> new_id
      for (const sec of sections) {
        const { data: newSec } = await supabase
          .from('project_sections_snapshot')
          .insert({
            project_id: projectId,
            title: sec.title,
            phase: sec.phase,
            order_index: sec.order_index,
            tenant_section_id: sec.id
          })
          .select('id')
          .single();
        if (newSec) sectionIdMap.set(sec.id, newSec.id);
      }

      // 3. Récupérer et créer les items
      const { data: items } = await supabase
        .from('tenant_project_items')
        .select('id, title, section_id, order_index')
        .in('section_id', sections.map((s: any) => s.id))
        .order('order_index');

      const itemIdMap = new Map<string, string>();
      for (const item of (items || [])) {
        const newSectionId = sectionIdMap.get(item.section_id);
        if (!newSectionId) continue;

        const { data: newItem } = await supabase
          .from('project_items_snapshot')
          .insert({
            project_id: projectId,
            section_id: newSectionId,
            title: item.title,
            order_index: item.order_index,
            tenant_item_id: item.id
          })
          .select('id')
          .single();
        if (newItem) itemIdMap.set(item.id, newItem.id);
      }

      // 4. Récupérer et créer les tasks avec leurs fiches
      const { data: tasks } = await supabase
        .from('tenant_project_tasks')
        .select('id, title, item_id, order_index')
        .in('item_id', (items || []).map((i: any) => i.id))
        .order('order_index');

      // Récupérer les fiches informatives
      const { data: infoSheets } = await supabase
        .from('tenant_task_info_sheets')
        .select('tenant_task_id, info_sheet')
        .in('tenant_task_id', (tasks || []).map((t: any) => t.id));

      const infoSheetMap = new Map((infoSheets || []).map((is: any) => [is.tenant_task_id, is.info_sheet]));

      for (const task of (tasks || [])) {
        const newItemId = itemIdMap.get(task.item_id);
        if (!newItemId) continue;

        await supabase
          .from('project_tasks_snapshot')
          .insert({
            project_id: projectId,
            item_id: newItemId,
            title: task.title,
            order_index: task.order_index,
            tenant_task_id: task.id,
            info_sheet: infoSheetMap.get(task.id) || ''
          });
      }

      return true;
    } catch (e) {
      return false;
    }
  }, [projectId, supabase]);

  // ── Charger la structure du projet (snapshot figé uniquement) ──
  const loadCustomStructures = useCallback(async () => {
    if (status !== 'authenticated' || !user?.id || !projectId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);

      // 1. Charger le snapshot du projet
      const hasSnapshot = await loadSnapshotStructure();
      
      if (hasSnapshot) {
        setLoading(false);
        return;
      }

      // 2. PAS DE SNAPSHOT : Créer un snapshot pour ce projet existant
      const { data: projectRow } = await supabase
        .from('projects')
        .select('tenant_id')
        .eq('id', projectId)
        .maybeSingle();
      
      if (projectRow?.tenant_id) {
        const snapshotCreated = await createSnapshotForExistingProject(projectRow.tenant_id);
        if (snapshotCreated) {
          // Recharger avec le nouveau snapshot
          const hasNewSnapshot = await loadSnapshotStructure();
          if (hasNewSnapshot) {
            setLoading(false);
            return;
          }
        }
      }

      // 3. Si vraiment rien ne marche, structure vide
      setCustomProjectStructure([]);
      setCustomRealizationStructure([]);
      
    } catch (error) {
      setCustomProjectStructure([]);
      setCustomRealizationStructure([]);
    } finally {
      setLoading(false);
    }
  }, [status, user?.id, projectId, supabase, loadSnapshotStructure, createSnapshotForExistingProject]);

  // Appliquer les personnalisations (suppressions) aux structures
  const applyCustomizations = useCallback((deletions: CustomStructureItem[]) => {
    // Appliquer aux structures de conception
    const filteredConceptionStructure = projectStructure.map(section => {
      // Vérifier si la section complète est supprimée
      const isSectionDeleted = deletions.some(
        del => del.phase_id === 'conception' && 
               del.section_id === section.id && 
               del.subsection_id === null
      );
      
      if (isSectionDeleted) {
        return null; // Section supprimée
      }
      
      // Filtrer les sous-sections supprimées
      const filteredItems = section.items.filter(item => {
        const isSubsectionDeleted = deletions.some(
          del => del.phase_id === 'conception' && 
                 del.section_id === section.id && 
                 del.subsection_id === item.id
        );
        return !isSubsectionDeleted;
      });
      
      return {
        ...section,
        items: filteredItems
      };
    }).filter(section => section !== null) as ProjectSection[];

    // Appliquer aux structures de réalisation
    const filteredRealizationStructure = realizationStructure.map(section => {
      // Vérifier si la section complète est supprimée
      const isSectionDeleted = deletions.some(
        del => del.phase_id === 'realisation' && 
               del.section_id === section.id && 
               del.subsection_id === null
      );
      
      if (isSectionDeleted) {
        return null; // Section supprimée
      }
      
      // Filtrer les sous-sections supprimées
      const filteredItems = section.items.filter(item => {
        const isSubsectionDeleted = deletions.some(
          del => del.phase_id === 'realisation' && 
                 del.section_id === section.id && 
                 del.subsection_id === item.id
        );
        return !isSubsectionDeleted;
      });
      
      return {
        ...section,
        items: filteredItems
      };
    }).filter(section => section !== null) as ProjectSection[];

    setCustomProjectStructure(filteredConceptionStructure);
    setCustomRealizationStructure(filteredRealizationStructure);
  }, []);

  // Supprimer une section complète
  const deleteSection = useCallback(async (sectionId: string, phase: 'conception' | 'realisation') => {
    if (status !== 'authenticated' || !user || !projectId) return false;

    try {
      
      const { data, error } = await supabase
        .rpc('delete_project_section', {
          p_project_id: projectId,
          p_phase_id: phase,
          p_section_id: sectionId,
          p_deleted_by: user.id
        });

      if (error) {
        
        // Gérer les erreurs spécifiques
        if (error.code === '42501') {
          toast({
            title: "Erreur de permissions",
            description: "Vous n'avez pas les permissions nécessaires pour supprimer cette section",
            variant: "destructive",
          });
        } else if (error.code === '42P01') {
          toast({
            title: "Erreur de configuration",
            description: "La fonction de suppression n'est pas encore configurée",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur",
            description: "Impossible de supprimer la section",
            variant: "destructive",
          });
        }
        return false;
      }

      
      // Recharger les structures
      await loadCustomStructures();

      toast({
        title: "Succès",
        description: `Section ${sectionId} supprimée avec succès`,
      });

      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la section",
        variant: "destructive",
      });
      return false;
    }
  }, [user, projectId, supabase, loadCustomStructures, toast]);

  // Supprimer une sous-section
  const deleteSubsection = useCallback(async (
    sectionId: string, 
    subsectionId: string, 
    phase: 'conception' | 'realisation'
  ) => {
    if (!user || !projectId) return false;

    try {
      const { data, error } = await supabase
        .rpc('delete_project_subsection', {
          p_project_id: projectId,
          p_phase_id: phase,
          p_section_id: sectionId,
          p_subsection_id: subsectionId,
          p_deleted_by: user.id
        });

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer la sous-section",
          variant: "destructive",
        });
        return false;
      }

      // Recharger les structures
      await loadCustomStructures();

      toast({
        title: "Succès",
        description: `Sous-section ${subsectionId} supprimée avec succès`,
      });

      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la sous-section",
        variant: "destructive",
      });
      return false;
    }
  }, [user, projectId, supabase, loadCustomStructures, toast]);

  // Restaurer une section ou sous-section supprimée
  const restoreStructure = useCallback(async (
    sectionId: string, 
    phase: 'conception' | 'realisation',
    subsectionId?: string
  ) => {
    if (!projectId) return false;

    try {
      const { data, error } = await supabase
        .rpc('restore_project_structure', {
          p_project_id: projectId,
          p_phase_id: phase,
          p_section_id: sectionId,
          p_subsection_id: subsectionId || null
        });

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de restaurer l'élément",
          variant: "destructive",
        });
        return false;
      }

      // Recharger les structures
      await loadCustomStructures();

      toast({
        title: "Succès",
        description: "Élément restauré avec succès",
      });

      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de restaurer l'élément",
        variant: "destructive",
      });
      return false;
    }
  }, [projectId, supabase, loadCustomStructures, toast]);

  // Vérifier si un élément est supprimé
  const isDeleted = useCallback((
    sectionId: string, 
    phase: 'conception' | 'realisation', 
    subsectionId?: string
  ) => {
    return customStructures.some(
      item => item.phase_id === phase && 
               item.section_id === sectionId && 
               (subsectionId ? item.subsection_id === subsectionId : item.subsection_id === null)
    );
  }, [customStructures]);

  // Charger les structures au montage du composant
  useEffect(() => {
    loadCustomStructures();
  }, [loadCustomStructures]);

  return {
    customProjectStructure,
    customRealizationStructure,
    loading,
    deleteSection,
    deleteSubsection,
    restoreStructure,
    isDeleted,
    refreshStructures: loadCustomStructures
  };
}; 
