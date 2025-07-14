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

export const useProjectStructure = (projectId: string) => {
  const { supabase, fetchData } = useSupabase();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [customStructures, setCustomStructures] = useState<CustomStructureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [customProjectStructure, setCustomProjectStructure] = useState(projectStructure);
  const [customRealizationStructure, setCustomRealizationStructure] = useState(realizationStructure);

  // Charger les structures personnalisées depuis la base de données
  const loadCustomStructures = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      
      console.log('Chargement des structures personnalisées pour le projet:', projectId);
      
      const { data, error } = await supabase
        .from('custom_project_structures')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', true);

      if (error) {
        console.error('Erreur lors du chargement des structures personnalisées:', error);
        // Si c'est une erreur de permission, utiliser la structure par défaut
        if (error.code === '42501' || error.code === '42P01') {
          console.log('Utilisation de la structure par défaut en raison des permissions');
          setCustomStructures([]);
          applyCustomizations([]);
        }
        return;
      }

      console.log('Structures personnalisées chargées:', data);
      setCustomStructures(data || []);
      
      // Appliquer les suppressions aux structures
      applyCustomizations(data || []);
      
    } catch (error) {
      console.error('Erreur lors du chargement des structures personnalisées:', error);
      // En cas d'erreur, utiliser la structure par défaut
      setCustomStructures([]);
      applyCustomizations([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

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