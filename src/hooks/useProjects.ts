import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { Project, ProjectFormData, ProjectFilters } from '../types/project';
import { useToast } from '@/components/ui/use-toast';

export function useProjects() {
  const { fetchData, insertData, updateData, deleteData } = useSupabase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Récupérer tous les projets avec filtres optionnels
  const getProjects = useCallback(async (filters?: ProjectFilters): Promise<Project[]> => {
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
      console.error('Erreur lors de la récupération des projets:', error);
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
    try {
      const projects = await fetchData<Project>('projects', {
        filters: [{ column: 'id', operator: 'eq', value: id }],
        limit: 1
      });

      return projects.length > 0 ? projects[0] : null;
    } catch (error) {
      console.error('Erreur lors de la récupération du projet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le projet",
        variant: "destructive",
      });
      return null;
    }
  }, [fetchData, toast]);

  // Créer un nouveau projet
  const createProject = useCallback(async (
    projectData: ProjectFormData,
    currentUserId: string
  ): Promise<Project | null> => {
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
        toast({
          title: "Succès",
          description: "Projet créé avec succès",
        });
      }

      return newProject;
    } catch (error) {
      console.error('Erreur lors de la création du projet:', error);
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
  const updateProject = useCallback(async (
    id: string,
    projectData: Partial<ProjectFormData>
  ): Promise<Project | null> => {
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
      console.error('Erreur lors de la mise à jour du projet:', error);
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
      console.error('Erreur lors de la suppression du projet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le projet",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [deleteData, toast]);

  // Récupérer les projets d'une entreprise
  const getProjectsByCompany = useCallback(async (companyId: string): Promise<Project[]> => {
    return getProjects({ company_id: companyId });
  }, [getProjects]);

  // Récupérer les projets créés par un utilisateur
  const getProjectsByUser = useCallback(async (userId: string): Promise<Project[]> => {
    try {
      const projects = await fetchData<Project>('projects', {
        filters: [{ column: 'created_by', operator: 'eq', value: userId }],
        order: { column: 'created_at', ascending: false }
      });

      return projects;
    } catch (error) {
      console.error('Erreur lors de la récupération des projets de l\'utilisateur:', error);
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
      console.error('Erreur lors de la recherche de projets:', error);
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