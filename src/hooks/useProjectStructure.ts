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
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [customStructures, setCustomStructures] = useState<CustomStructureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [customProjectStructure, setCustomProjectStructure] = useState(projectStructure);
  const [customRealizationStructure, setCustomRealizationStructure] = useState(realizationStructure);

  // ── Charger la structure tenant en 3 requêtes plates (toutes phases confondues) ──
  const loadTenantStructure = useCallback(async (tenantId: string): Promise<{ hasTenantStructure: boolean }> => {
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

  // ── Charger les suppressions projet (ancien système) ──
  const loadCustomStructures = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);

      // 1. Récupérer le tenant_id du projet (avec cache)
      let tenantId: string | null | undefined = projectTenantCache[projectId];
      if (tenantId === undefined) {
        const { data: projectRow } = await supabase
          .from('projects')
          .select('tenant_id')
          .eq('id', projectId)
          .maybeSingle();
        tenantId = projectRow?.tenant_id ?? null;
        projectTenantCache[projectId] = tenantId;
      }

      // 2. Si le tenant a une structure custom, l'utiliser en priorité
      if (tenantId) {
        const { hasTenantStructure } = await loadTenantStructure(tenantId);
        if (hasTenantStructure) {
          setCustomStructures([]);
          setLoading(false);
          return;
        }
      }

      // 3. Fallback : ancien système de suppressions par projet
      const { data, error } = await supabase
        .from('custom_project_structures')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', true);

      if (error) {
        if (error.code === '42501' || error.code === '42P01') {
          setCustomStructures([]);
          applyCustomizations([]);
        }
        return;
      }

      setCustomStructures(data || []);
      applyCustomizations(data || []);
      
    } catch (error) {
      console.error('Erreur lors du chargement des structures:', error);
      setCustomStructures([]);
      applyCustomizations([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase, loadTenantStructure]);

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
    if (!user || !projectId) return false;

    try {
      console.log('Suppression de la section:', { projectId, phase, sectionId, userId: user.id });
      
      const { data, error } = await supabase
        .rpc('delete_project_section', {
          p_project_id: projectId,
          p_phase_id: phase,
          p_section_id: sectionId,
          p_deleted_by: user.id
        });

      if (error) {
        console.error('Erreur lors de la suppression de la section:', error);
        
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

      console.log('Section supprimée avec succès:', data);
      
      // Recharger les structures
      await loadCustomStructures();

      toast({
        title: "Succès",
        description: `Section ${sectionId} supprimée avec succès`,
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de la section:', error);
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
        console.error('Erreur lors de la suppression de la sous-section:', error);
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
      console.error('Erreur lors de la suppression de la sous-section:', error);
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
        console.error('Erreur lors de la restauration:', error);
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
      console.error('Erreur lors de la restauration:', error);
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