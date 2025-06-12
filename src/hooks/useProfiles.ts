import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { 
  Profile, 
  ProfileFormData, 
  ProfileUpdateData, 
  ProfileFilters, 
  ProfileSortOptions,
  IntervenantFormData,
  getRoleFromSpecialty 
} from '../types/profile';
import { useToast } from '@/components/ui/use-toast';

export function useProfiles() {
  const { fetchData, insertData, updateData, deleteData, adminCreateUser } = useSupabase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Récupérer tous les profils avec filtres et tri optionnels
  const getProfiles = useCallback(async (
    filters?: ProfileFilters,
    sort?: ProfileSortOptions
  ): Promise<Profile[]> => {
    setLoading(true);
    try {
      const queryFilters = [];
      
      if (filters?.role) {
        queryFilters.push({ column: 'role', operator: 'eq', value: filters.role });
      }
      
      if (filters?.status) {
        queryFilters.push({ column: 'status', operator: 'eq', value: filters.status });
      }
      
      if (filters?.specialty) {
        queryFilters.push({ column: 'specialty', operator: 'eq', value: filters.specialty });
      }
      
      if (filters?.company_id) {
        queryFilters.push({ column: 'company_id', operator: 'eq', value: filters.company_id });
      }
      
      if (filters?.language) {
        queryFilters.push({ column: 'language', operator: 'eq', value: filters.language });
      }

      const orderOptions = sort ? {
        column: sort.field,
        ascending: sort.direction === 'asc'
      } : { column: 'created_at', ascending: false };

      const profiles = await fetchData<Profile>('profiles', {
        filters: queryFilters.length > 0 ? queryFilters : undefined,
        order: orderOptions
      });

      return profiles;
    } catch (error) {
      console.error('Erreur lors de la récupération des profils:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les profils",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchData, toast]);

  // Récupérer un profil par son ID (user_id)
  const getProfileById = useCallback(async (id: string): Promise<Profile | null> => {
    try {
      const profiles = await fetchData<Profile>('profiles', {
        filters: [{ column: 'user_id', operator: 'eq', value: id }],
        limit: 1
      });

      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
      return null;
    }
  }, [fetchData, toast]);

  // Récupérer un profil par email
  const getProfileByEmail = useCallback(async (email: string): Promise<Profile | null> => {
    try {
      const profiles = await fetchData<Profile>('profiles', {
        filters: [{ column: 'email', operator: 'eq', value: email }],
        limit: 1
      });

      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil par email:', error);
      return null;
    }
  }, [fetchData]);

  // Récupérer un profil par user_id
  const getProfileByUserId = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const profiles = await fetchData<Profile>('profiles', {
        filters: [{ column: 'user_id', operator: 'eq', value: userId }],
        limit: 1
      });

      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil par user_id:', error);
      return null;
    }
  }, [fetchData]);

  // Créer un nouveau profil simple
  const createProfile = useCallback(async (profileData: ProfileFormData): Promise<Profile | null> => {
    setLoading(true);
    try {
      // Validation des champs obligatoires
      if (!profileData.first_name.trim()) {
        toast({
          title: "Erreur",
          description: "Le prénom est obligatoire",
          variant: "destructive",
        });
        return null;
      }

      if (!profileData.last_name.trim()) {
        toast({
          title: "Erreur",
          description: "Le nom est obligatoire",
          variant: "destructive",
        });
        return null;
      }

      if (!profileData.email.trim()) {
        toast({
          title: "Erreur",
          description: "L'email est obligatoire",
          variant: "destructive",
        });
        return null;
      }

      // Vérifier si l'email existe déjà
      const existingProfile = await getProfileByEmail(profileData.email);
      if (existingProfile) {
        toast({
          title: "Erreur",
          description: "Un profil avec cet email existe déjà",
          variant: "destructive",
        });
        return null;
      }

      const newProfile = await insertData<Profile>('profiles', {
        ...profileData,
        company: profileData.company || 'Indépendant',
        theme: profileData.theme || 'light',
        language: profileData.language || 'fr',
        status: 'active',
        email_notifications: true,
        push_notifications: true,
        message_notifications: true,
        update_notifications: true,
        created_at: new Date().toISOString()
      });

      if (newProfile) {
        toast({
          title: "Succès",
          description: "Profil créé avec succès",
        });
      }

      return newProfile;
    } catch (error) {
      console.error('Erreur lors de la création du profil:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le profil",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [insertData, getProfileByEmail, toast]);

  // Créer un intervenant complet (avec compte auth + profil)
  const createIntervenant = useCallback(async (
    intervenantData: IntervenantFormData
  ): Promise<{ profile: Profile | null; authUser: any | null }> => {
    setLoading(true);
    try {
      // Validation des champs obligatoires
      if (!intervenantData.firstName.trim() || !intervenantData.lastName.trim()) {
        toast({
          title: "Erreur",
          description: "Le prénom et le nom sont obligatoires",
          variant: "destructive",
        });
        return { profile: null, authUser: null };
      }

      if (!intervenantData.email.trim() || !intervenantData.password.trim()) {
        toast({
          title: "Erreur",
          description: "L'email et le mot de passe sont obligatoires",
          variant: "destructive",
        });
        return { profile: null, authUser: null };
      }

      if (!intervenantData.specialty) {
        toast({
          title: "Erreur",
          description: "La spécialité est obligatoire",
          variant: "destructive",
        });
        return { profile: null, authUser: null };
      }

      // Vérifier si l'email existe déjà
      const existingProfile = await getProfileByEmail(intervenantData.email);
      if (existingProfile) {
        toast({
          title: "Erreur",
          description: "Un intervenant avec cet email existe déjà",
          variant: "destructive",
        });
        return { profile: null, authUser: null };
      }

      // Déterminer le rôle selon la spécialité
      const role = intervenantData.role || getRoleFromSpecialty(intervenantData.specialty);

      // 1. Créer le compte auth
      const authResult = await adminCreateUser(
        intervenantData.email,
        intervenantData.password,
        role,
        {
          first_name: intervenantData.firstName,
          last_name: intervenantData.lastName,
          name: `${intervenantData.firstName} ${intervenantData.lastName}`,
          specialty: intervenantData.specialty,
          company: intervenantData.company || 'Indépendant',
          company_id: intervenantData.company_id,
          phone: intervenantData.phone
        }
      );

      if (!authResult.success) {
        throw new Error(authResult.error?.message || 'Erreur lors de la création du compte auth');
      }

      // 2. Créer le profil dans notre table
      const profileData: ProfileFormData = {
        first_name: intervenantData.firstName,
        last_name: intervenantData.lastName,
        email: intervenantData.email,
        phone: intervenantData.phone,
        role: role,
        specialty: intervenantData.specialty,
        company: intervenantData.company || 'Indépendant',
        company_id: intervenantData.company_id
      };

      const profile = await insertData<Profile>('profiles', {
        ...profileData,
        user_id: authResult.userId, // Lier au compte auth créé
        theme: 'light',
        language: 'fr',
        status: 'active',
        email_notifications: true,
        push_notifications: true,
        message_notifications: true,
        update_notifications: true,
        created_at: new Date().toISOString()
      });

      if (profile) {
        toast({
          title: "Succès",
          description: `L'intervenant ${intervenantData.firstName} ${intervenantData.lastName} a été créé avec succès`,
        });
      }

      return { profile, authUser: { id: authResult.userId } };
    } catch (error) {
      console.error('Erreur lors de la création de l\'intervenant:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'intervenant",
        variant: "destructive",
      });
      return { profile: null, authUser: null };
    } finally {
      setLoading(false);
    }
  }, [insertData, getProfileByEmail, adminCreateUser, toast]);

  // Mettre à jour un profil
  const updateProfile = useCallback(async (
    id: string,
    profileData: ProfileUpdateData
  ): Promise<Profile | null> => {
    setLoading(true);
    try {
      // Validation des champs obligatoires s'ils sont fournis
      if (profileData.first_name !== undefined && !profileData.first_name.trim()) {
        toast({
          title: "Erreur",
          description: "Le prénom ne peut pas être vide",
          variant: "destructive",
        });
        return null;
      }

      if (profileData.last_name !== undefined && !profileData.last_name.trim()) {
        toast({
          title: "Erreur",
          description: "Le nom ne peut pas être vide",
          variant: "destructive",
        });
        return null;
      }

      if (profileData.email !== undefined && !profileData.email.trim()) {
        toast({
          title: "Erreur",
          description: "L'email ne peut pas être vide",
          variant: "destructive",
        });
        return null;
      }

      const updatedProfile = await updateData<Profile>('profiles', {
        id,
        ...profileData,
        updated_at: new Date().toISOString()
      }, [{ column: 'user_id', operator: 'eq', value: id }]);

      if (updatedProfile) {
        toast({
          title: "Succès",
          description: "Profil mis à jour avec succès",
        });
      }

      return updatedProfile;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [updateData, toast]);

  // Supprimer un profil
  const deleteProfile = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await deleteData('profiles', id, 'user_id');

      if (success) {
        toast({
          title: "Succès",
          description: "Profil supprimé avec succès",
        });
      }

      return success;
    } catch (error) {
      console.error('Erreur lors de la suppression du profil:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le profil",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [deleteData, toast]);

  // Rechercher des profils par nom ou email
  const searchProfiles = useCallback(async (searchTerm: string): Promise<Profile[]> => {
    try {
      const profiles = await fetchData<Profile>('profiles', {
        order: { column: 'name', ascending: true }
      });

      // Filtrer côté client
      const filteredProfiles = profiles.filter(profile => 
        profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (profile.specialty && profile.specialty.toLowerCase().includes(searchTerm.toLowerCase())) ||
        profile.company.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return filteredProfiles;
    } catch (error) {
      console.error('Erreur lors de la recherche de profils:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher les profils",
        variant: "destructive",
      });
      return [];
    }
  }, [fetchData, toast]);

  // Récupérer les profils par spécialité
  const getProfilesBySpecialty = useCallback(async (specialty: string): Promise<Profile[]> => {
    return getProfiles({ specialty });
  }, [getProfiles]);

  // Récupérer les profils par entreprise
  const getProfilesByCompany = useCallback(async (companyId: string): Promise<Profile[]> => {
    return getProfiles({ company_id: companyId });
  }, [getProfiles]);

  // Récupérer les profils actifs
  const getActiveProfiles = useCallback(async (): Promise<Profile[]> => {
    return getProfiles({ status: 'active' });
  }, [getProfiles]);

  // Récupérer les intervenants (rôle intervenant uniquement)
  const getIntervenants = useCallback(async (): Promise<Profile[]> => {
    return getProfiles({ role: 'intervenant', status: 'active' });
  }, [getProfiles]);

  return {
    loading,
    getProfiles,
    getProfileById,
    getProfileByEmail,
    getProfileByUserId,
    createProfile,
    createIntervenant,
    updateProfile,
    deleteProfile,
    searchProfiles,
    getProfilesBySpecialty,
    getProfilesByCompany,
    getActiveProfiles,
    getIntervenants,
  };
} 