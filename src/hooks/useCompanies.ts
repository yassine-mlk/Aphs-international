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
import { Profile } from '../types/profile';

export function useCompanies() {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const { toast } = useToast();
  const { fetchData, insertData, updateData, deleteData, supabase, getUsers } = useSupabase();

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
      if (filters?.specialite) {
        queryFilters.push({ column: 'specialite', operator: 'eq', value: filters.specialite });
      }

      const companies = await fetchData<Company>('companies', {
        filters: queryFilters,
        order: sort ? { column: sort.field, ascending: sort.order === 'asc' } : { column: 'name', ascending: true }
      });

      setCompanies(companies);
      return companies;
    } catch (error) {
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
        .or(`name.ilike.%${searchTerm}%,pays.ilike.%${searchTerm}%,secteur.ilike.%${searchTerm}%,specialite.ilike.%${searchTerm}%`)
        .order('name');

      if (error) throw error;

      const results = data as Company[];
      setCompanies(results);
      return results;
    } catch (error) {
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
        companiesBySpeciality: {},
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

      // Calculer les statistiques par spécialité
      allCompanies.forEach(company => {
        const speciality = company.specialite || company.secteur || 'Non spécifiée';
        stats.companiesBySpeciality[speciality] = (stats.companiesBySpeciality[speciality] || 0) + 1;
      });

      return stats;
    } catch (error) {
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

  // Récupérer les entreprises d'une spécialité spécifique
  const getCompaniesBySpeciality = useCallback(async (speciality: string): Promise<Company[]> => {
    return getCompanies({ specialite: speciality });
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
      toast({
        title: "Erreur",
        description: "Impossible d'uploader le logo",
        variant: "destructive",
      });
      return null;
    }
  }, [supabase, toast]);

  // Récupérer tous les employés d'une entreprise
  const getCompanyEmployees = useCallback(async (companyId: string): Promise<Profile[]> => {
    setLoading(true);
    try {
      // Méthode 1: Essayer d'abord avec la table profiles
      
      let employees = await fetchData<Profile>('profiles', {
        filters: [
          { column: 'company_id', operator: 'eq', value: companyId },
          { column: 'status', operator: 'eq', value: 'active' }
        ],
        order: { column: 'first_name', ascending: true }
      });


      // Méthode 2: Si aucun employé trouvé dans profiles, chercher dans auth.users
      if (!employees || employees.length === 0) {
        
        const userData = await getUsers();
        
        if (userData && userData.users) {
          // Récupérer les détails de l'entreprise pour le nom
          const companies = await getCompanies();
          const selectedCompany = companies.find(c => c.id === companyId);
          const selectedCompanyName = selectedCompany?.name;
          
          
          // Filtrer les utilisateurs par company_id ou company name
          const filteredUsers = userData.users.filter((user: any) => {
            const userCompanyId = user.user_metadata?.company_id;
            const userCompanyName = user.user_metadata?.company;
            
            // Exclure les admins et utilisateurs bannis
            const isAdmin = user.user_metadata?.role === 'admin';
            const isAdminEmail = user.email?.toLowerCase()?.includes('admin@aps');
            
            if (isAdmin || isAdminEmail || user.banned) return false;
            
            // Correspondance par ID ou nom d'entreprise
            const matchesId = userCompanyId === companyId;
            const matchesName = selectedCompanyName && userCompanyName === selectedCompanyName;
            
            if (matchesId || matchesName) {
              return true;
            }
            
            return false;
          });


          // Transformer en format Profile complet
          employees = filteredUsers.map((user: any) => {
            const firstName = user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0] || 'Prénom';
            const lastName = user.user_metadata?.last_name || user.user_metadata?.name?.split(' ').slice(1).join(' ') || 'Nom';
            
            return {
              id: user.id,
              user_id: user.id,
              first_name: firstName,
              last_name: lastName,
              name: `${firstName} ${lastName}`,
              email: user.email || '',
              phone: user.user_metadata?.phone || '',
              role: user.user_metadata?.role || 'intervenant',
              specialty: user.user_metadata?.specialty || '',
              company: user.user_metadata?.company || selectedCompanyName || 'Indépendant',
              company_id: companyId,
              status: user.banned ? 'inactive' : 'active',
              bio: '',
              theme: 'light',
              language: 'fr',
              email_notifications: true,
              push_notifications: true,
              message_notifications: true,
              update_notifications: true,
              created_at: user.created_at,
              updated_at: user.updated_at || user.created_at
            } as Profile;
          });
        }
      }

      const finalEmployees = employees || [];
      
      return finalEmployees;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les employés de cette entreprise",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchData, getUsers, getCompanies, toast]);

  // Récupérer les employés actifs d'une entreprise seulement
  const getActiveCompanyEmployees = useCallback(async (companyId: string): Promise<Profile[]> => {
    const allEmployees = await getCompanyEmployees(companyId);
    return allEmployees.filter(emp => emp.status === 'active');
  }, [getCompanyEmployees]);

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
    getCompaniesBySpeciality,
    uploadCompanyLogo,

    // Utilitaires
    setCompanies,
    getCompanyEmployees,
    getActiveCompanyEmployees
  };
} 