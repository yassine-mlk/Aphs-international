import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSupabase } from './useSupabase';
import {
  Company,
  CreateCompanyData,
  UpdateCompanyData,
  CompanyFilters,
  CompanySortOptions,
  CompanyStats,
  validateCompanyData
} from '../types/company';

export function useCompanies() {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const { toast } = useToast();
  const { fetchData, insertData, updateData, deleteData, supabase } = useSupabase();

  // Récupérer toutes les entreprises
  const getCompanies = useCallback(async (filters?: CompanyFilters, sort?: CompanySortOptions): Promise<Company[]> => {
    setLoading(true);
    try {
      const queryFilters = [];
      
      // Ajouter les filtres si fournis
      if (filters?.name) {
        queryFilters.push({ column: 'name', operator: 'ilike', value: `%${filters.name}%` });
      }
      if (filters?.pays) {
        queryFilters.push({ column: 'pays', operator: 'ilike', value: `%${filters.pays}%` });
      }
      if (filters?.secteur) {
        queryFilters.push({ column: 'secteur', operator: 'ilike', value: `%${filters.secteur}%` });
      }

      const companies = await fetchData<Company>('companies', {
        filters: queryFilters,
        order: sort ? { column: sort.field, ascending: sort.order === 'asc' } : { column: 'name', ascending: true }
      });

      setCompanies(companies);
      return companies;
    } catch (error) {
      console.error('Erreur lors de la récupération des entreprises:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la liste des entreprises",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchData, toast]);

  // Rechercher des entreprises par terme général
  const searchCompanies = useCallback(async (searchTerm: string): Promise<Company[]> => {
    if (!searchTerm.trim()) {
      return getCompanies();
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,pays.ilike.%${searchTerm}%,secteur.ilike.%${searchTerm}%`)
        .order('name');

      if (error) throw error;

      const results = data as Company[];
      setCompanies(results);
      return results;
    } catch (error) {
      console.error('Erreur lors de la recherche d\'entreprises:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la recherche",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase, toast, getCompanies]);

  // Récupérer une entreprise par ID
  const getCompanyById = useCallback(async (id: string): Promise<Company | null> => {
    setLoading(true);
    try {
      const companies = await fetchData<Company>('companies', {
        filters: [{ column: 'id', operator: 'eq', value: id }]
      });

      return companies.length > 0 ? companies[0] : null;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'entreprise:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer l'entreprise",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchData, toast]);

  // Créer une nouvelle entreprise
  const createCompany = useCallback(async (companyData: CreateCompanyData): Promise<Company | null> => {
    // Validation des données
    const validationErrors = validateCompanyData(companyData);
    if (validationErrors.length > 0) {
      toast({
        title: "Erreur de validation",
        description: validationErrors[0].message,
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      const newCompany = await insertData<Company>('companies', companyData);

      if (newCompany) {
        toast({
          title: "Succès",
          description: `L'entreprise ${companyData.name} a été créée avec succès`,
        });

        // Mettre à jour la liste locale
        setCompanies(prev => [newCompany, ...prev]);
      }

      return newCompany;
    } catch (error) {
      console.error('Erreur lors de la création de l\'entreprise:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'entreprise",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [insertData, toast]);

  // Mettre à jour une entreprise
  const updateCompany = useCallback(async (id: string, updateData: UpdateCompanyData): Promise<Company | null> => {
    // Validation des données si des champs obligatoires sont modifiés
    if (updateData.name !== undefined) {
      const validationErrors = validateCompanyData({ ...updateData, name: updateData.name || '' });
      if (validationErrors.length > 0) {
        toast({
          title: "Erreur de validation",
          description: validationErrors[0].message,
          variant: "destructive",
        });
        return null;
      }
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      const updatedCompany = data as Company;

      if (updatedCompany) {
        toast({
          title: "Succès",
          description: "L'entreprise a été mise à jour avec succès",
        });

        // Mettre à jour la liste locale
        setCompanies(prev => prev.map(company => 
          company.id === id ? updatedCompany : company
        ));
      }

      return updatedCompany;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'entreprise:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'entreprise",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [updateData, toast]);

  // Supprimer une entreprise
  const deleteCompany = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      // Vérifier d'abord si l'entreprise est utilisée par des profils
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('company_id', id);

      if (profilesError) throw profilesError;

      if (profiles && profiles.length > 0) {
        const profileNames = profiles.map(p => `${p.first_name} ${p.last_name}`).join(', ');
        toast({
          title: "Impossible de supprimer",
          description: `Cette entreprise est utilisée par ${profiles.length} profil(s): ${profileNames}. Modifiez d'abord ces profils.`,
          variant: "destructive",
        });
        return false;
      }

      // Vérifier aussi si l'entreprise est utilisée par des projets (si la table existe)
      try {
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id, name')
          .eq('company_id', id);

        if (!projectsError && projects && projects.length > 0) {
          const projectNames = projects.map(p => p.name).join(', ');
          toast({
            title: "Impossible de supprimer",
            description: `Cette entreprise est utilisée par ${projects.length} projet(s): ${projectNames}. Modifiez d'abord ces projets.`,
            variant: "destructive",
          });
          return false;
        }
      } catch (error) {
        // Si la table projects n'existe pas, continuer
        console.log('Table projects non trouvée, suppression autorisée');
      }

      const success = await deleteData('companies', id);

      if (success) {
        toast({
          title: "Succès",
          description: "L'entreprise a été supprimée avec succès",
        });

        // Mettre à jour la liste locale
        setCompanies(prev => prev.filter(company => company.id !== id));
      }

      return success;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'entreprise:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'entreprise",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [deleteData, supabase, toast]);

  // Récupérer les statistiques des entreprises
  const getCompanyStats = useCallback(async (): Promise<CompanyStats | null> => {
    setLoading(true);
    try {
      const allCompanies = await fetchData<Company>('companies', {
        order: { column: 'created_at', ascending: false }
      });

      const stats: CompanyStats = {
        totalCompanies: allCompanies.length,
        companiesByCountry: {},
        companiesBySector: {},
        recentCompanies: allCompanies.slice(0, 5)
      };

      // Calculer les statistiques par pays
      allCompanies.forEach(company => {
        const country = company.pays || 'Non spécifié';
        stats.companiesByCountry[country] = (stats.companiesByCountry[country] || 0) + 1;
      });

      // Calculer les statistiques par secteur
      allCompanies.forEach(company => {
        const sector = company.secteur || 'Non spécifié';
        stats.companiesBySector[sector] = (stats.companiesBySector[sector] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les statistiques",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchData, toast]);

  // Récupérer les entreprises d'un pays spécifique
  const getCompaniesByCountry = useCallback(async (country: string): Promise<Company[]> => {
    return getCompanies({ pays: country });
  }, [getCompanies]);

  // Récupérer les entreprises d'un secteur spécifique
  const getCompaniesBySector = useCallback(async (sector: string): Promise<Company[]> => {
    return getCompanies({ secteur: sector });
  }, [getCompanies]);

  // Uploader un logo d'entreprise
  const uploadCompanyLogo = useCallback(async (file: File, companyId?: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${companyId || 'new'}.${fileExt}`;
      const filePath = `company-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('companies')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('companies')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Erreur lors de l\'upload du logo:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader le logo",
        variant: "destructive",
      });
      return null;
    }
  }, [supabase, toast]);

  return {
    // État
    loading,
    companies,

    // Actions CRUD
    getCompanies,
    searchCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany,

    // Actions spécialisées
    getCompanyStats,
    getCompaniesByCountry,
    getCompaniesBySector,
    uploadCompanyLogo,

    // Utilitaires
    setCompanies
  };
} 