import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import type { 
  Tenant, 
  TenantMember, 
  TenantUsage, 
  TenantContextType,
  CreateTenantData 
} from '@/types/tenant';
import { getPlanDefaults } from '@/types/tenant';

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// Hook séparé pour les fonctions Super Admin
export function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user?.id) {
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setIsSuperAdmin(data?.is_super_admin || false);
      } catch (error) {
        console.error('Error checking super admin:', error);
        setIsSuperAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSuperAdmin();
  }, [user?.id]);

  // Fonctions Super Admin
  const createTenant = useCallback(async (data: CreateTenantData): Promise<Tenant | null> => {
    try {
      // 1. Calculer les limites
      const planDefaults = getPlanDefaults(data.plan);
      const maxProjects = data.plan === 'custom' ? (data.maxProjects || 10) : planDefaults.maxProjects;
      const maxIntervenants = data.plan === 'custom' ? (data.maxIntervenants || 20) : planDefaults.maxIntervenants;
      const maxStorageGb = data.plan === 'custom' ? (data.maxStorageGb || 50) : planDefaults.maxStorageGb;

      const insertData = {
        name: data.name,
        slug: data.slug,
        owner_email: data.ownerEmail,
        owner_user_id: null,
        plan: data.plan,
        max_projects: maxProjects,
        max_intervenants: maxIntervenants,
        max_storage_gb: maxStorageGb,
        status: 'trial',
        trial_ends_at: new Date(Date.now() + (data.trialDays || 14) * 24 * 60 * 60 * 1000).toISOString()
      };
      
      console.log('Creating tenant with data:', insertData);

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert(insertData)
        .select()
        .single();

      if (tenantError) {
        console.error('Tenant creation error:', tenantError);
        throw tenantError;
      }

      // 2. Créer le profil de l'admin (sans user_id pour l'instant - sera lié à l'inscription)
      // Note: Le vrai user_id sera créé quand l'admin s'inscrira via la page de login
      // Pour l'instant, on crée un placeholder qui sera mis à jour
      
      toast({
        title: "Tenant créé",
        description: `Le compte ${data.name} a été créé. L'admin doit s'inscrire avec ${data.ownerEmail}`,
      });

      return {
        id: tenantData.id,
        name: tenantData.name,
        slug: tenantData.slug,
        ownerEmail: tenantData.owner_email,
        ownerUserId: null,
        plan: tenantData.plan,
        maxProjects: tenantData.max_projects,
        maxIntervenants: tenantData.max_intervenants,
        maxStorageGb: tenantData.max_storage_gb,
        currentProjectsCount: 0,
        currentIntervenantsCount: 0,
        currentStorageUsedBytes: 0,
        status: tenantData.status,
        trialEndsAt: tenantData.trial_ends_at,
        subscriptionStartsAt: tenantData.subscription_starts_at,
        subscriptionEndsAt: tenantData.subscription_ends_at,
        createdAt: tenantData.created_at,
        updatedAt: tenantData.updated_at,
        settings: tenantData.settings || {}
      };

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le tenant",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  const getAllTenants = useCallback(async (): Promise<Tenant[]> => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        ownerEmail: t.owner_email,
        ownerUserId: t.owner_user_id,
        plan: t.plan,
        maxProjects: t.max_projects,
        maxIntervenants: t.max_intervenants,
        maxStorageGb: t.max_storage_gb,
        currentProjectsCount: t.current_projects_count || 0,
        currentIntervenantsCount: t.current_intervenants_count || 0,
        currentStorageUsedBytes: t.current_storage_used_bytes || 0,
        status: t.status,
        trialEndsAt: t.trial_ends_at,
        subscriptionStartsAt: t.subscription_starts_at,
        subscriptionEndsAt: t.subscription_ends_at,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        settings: t.settings || {},
        billingEmail: t.billing_email,
        billingAddress: t.billing_address,
        taxId: t.tax_id
      }));
    } catch (error) {
      console.error('Error fetching tenants:', error);
      return [];
    }
  }, []);

  const updateTenantLimits = useCallback(async (
    tenantId: string, 
    limits: { maxProjects?: number; maxIntervenants?: number; maxStorageGb?: number }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          max_projects: limits.maxProjects,
          max_intervenants: limits.maxIntervenants,
          max_storage_gb: limits.maxStorageGb,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (error) throw error;

      toast({
        title: "Limites mises à jour",
        description: "Les quotas ont été modifiés avec succès.",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const suspendTenant = useCallback(async (tenantId: string, reason?: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          status: 'suspended',
          updated_at: new Date().toISOString(),
          settings: { suspension_reason: reason }
        })
        .eq('id', tenantId);

      if (error) throw error;

      toast({
        title: "Tenant suspendu",
        description: "L'accès a été suspendu.",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const activateTenant = useCallback(async (tenantId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (error) throw error;

      toast({
        title: "Tenant activé",
        description: "L'accès a été réactivé.",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Associer un utilisateur existant à un tenant
  const associateUserToTenant = useCallback(async (
    tenantId: string,
    userId: string,
    role: string = 'intervenant'
  ): Promise<boolean> => {
    try {
      // 1. Créer le membership
      const { error: memberError } = await supabase
        .from('tenant_members')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          role: role,
          status: 'active'
        });

      if (memberError) throw memberError;

      // 2. Mettre à jour le profil avec le tenant_id ET le role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          tenant_id: tenantId,
          role: role  // ← AJOUTÉ: Mettre à jour le role aussi !
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // 3. Si c'est un admin, mettre à jour le owner_user_id du tenant
      if (role === 'admin') {
        const { error: tenantError } = await supabase
          .from('tenants')
          .update({ owner_user_id: userId })
          .eq('id', tenantId);

        if (tenantError) throw tenantError;
      }

      toast({
        title: "Utilisateur associé",
        description: "L'utilisateur a été lié au tenant avec succès.",
      });

      return true;

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'associer l'utilisateur",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Retirer un utilisateur d'un tenant (sans supprimer le compte)
  const removeUserFromTenant = useCallback(async (
    tenantId: string,
    userId: string
  ): Promise<boolean> => {
    try {
      // 1. Supprimer le membership
      const { error: memberError } = await supabase
        .from('tenant_members')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      if (memberError) {
        console.error('Member delete error:', memberError);
        throw memberError;
      }

      // 2. Retirer tenant_id du profil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ tenant_id: null })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      toast({
        title: "Utilisateur retiré",
        description: "L'utilisateur a été retiré du tenant.",
      });

      return true;

    } catch (error: any) {
      console.error('Remove user error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer l'utilisateur",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Supprimer complètement un utilisateur (compte + données)
  const deleteUser = useCallback(async (
    userId: string
  ): Promise<boolean> => {
    try {
      // Note: La suppression de auth.users nécessite une Edge Function ou Admin API
      // Pour l'instant, on supprime les données locales et on marque comme supprimé
      
      // 1. Supprimer de tous les tenants
      const { error: memberError } = await supabase
        .from('tenant_members')
        .delete()
        .eq('user_id', userId);

      if (memberError) throw memberError;

      // 2. Marquer le profil comme supprimé
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          status: 'deleted',
          email: `deleted-${userId}@deleted.com`,
          tenant_id: null 
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // 3. Désactiver dans auth.users (via RPC si disponible)
      // Note: nécessite une fonction Supabase Edge pour vraiment supprimer
      
      toast({
        title: "Utilisateur supprimé",
        description: "Le compte a été désactivé et les données nettoyées.",
      });

      return true;

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'utilisateur",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  return {
    isSuperAdmin,
    isLoading,
    createTenant,
    getAllTenants,
    updateTenantLimits,
    suspendTenant,
    activateTenant,
    associateUserToTenant,
    removeUserFromTenant,
    deleteUser
  };
}

// Provider principal
export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [member, setMember] = useState<TenantMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculer l'usage
  const [usage, setUsage] = useState<TenantUsage>({
    projects: { used: 0, limit: 0, percentage: 0 },
    intervenants: { used: 0, limit: 0, percentage: 0 },
    storage: { usedBytes: 0, limitBytes: 0, usedGb: 0, limitGb: 0, percentage: 0 }
  });

  const updateUsage = useCallback((t: Tenant | null) => {
    if (!t) return;
    
    setUsage({
      projects: {
        used: t.currentProjectsCount,
        limit: t.maxProjects,
        percentage: Math.min(Math.round((t.currentProjectsCount / t.maxProjects) * 100), 100)
      },
      intervenants: {
        used: t.currentIntervenantsCount,
        limit: t.maxIntervenants,
        percentage: Math.min(Math.round((t.currentIntervenantsCount / t.maxIntervenants) * 100), 100)
      },
      storage: {
        usedBytes: t.currentStorageUsedBytes,
        limitBytes: t.maxStorageGb * 1024 * 1024 * 1024,
        usedGb: Math.round(t.currentStorageUsedBytes / (1024 * 1024 * 1024) * 100) / 100,
        limitGb: t.maxStorageGb,
        percentage: Math.min(Math.round((t.currentStorageUsedBytes / (t.maxStorageGb * 1024 * 1024 * 1024)) * 100), 100)
      }
    });
  }, []);

  // Charger le tenant courant
  useEffect(() => {
    const loadTenant = async () => {
      if (!user?.id) {
        setTenant(null);
        setMember(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Récupérer les memberships de l'utilisateur
        const { data: memberships, error: membershipError } = await supabase
          .from('tenant_members')
          .select(`
            *,
            tenant:tenants(*)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('joined_at', { ascending: false });

        if (membershipError) throw membershipError;

        if (!memberships || memberships.length === 0) {
          // Vérifier si c'est un super admin
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_super_admin')
            .eq('user_id', user.id)
            .single();

          if (profile?.is_super_admin) {
            setTenant(null);
            setMember(null);
          } else {
            setError('Vous n\'êtes membre d\'aucun tenant. Contactez votre administrateur.');
          }
          setIsLoading(false);
          return;
        }

        // Sélectionner le premier tenant actif
        const activeMembership = memberships[0];
        const tenantData = activeMembership.tenant;

        const loadedTenant: Tenant = {
          id: tenantData.id,
          name: tenantData.name,
          slug: tenantData.slug,
          ownerEmail: tenantData.owner_email,
          ownerUserId: tenantData.owner_user_id,
          plan: tenantData.plan,
          maxProjects: tenantData.max_projects,
          maxIntervenants: tenantData.max_intervenants,
          maxStorageGb: tenantData.max_storage_gb,
          currentProjectsCount: tenantData.current_projects_count || 0,
          currentIntervenantsCount: tenantData.current_intervenants_count || 0,
          currentStorageUsedBytes: tenantData.current_storage_used_bytes || 0,
          status: tenantData.status,
          trialEndsAt: tenantData.trial_ends_at,
          subscriptionStartsAt: tenantData.subscription_starts_at,
          subscriptionEndsAt: tenantData.subscription_ends_at,
          createdAt: tenantData.created_at,
          updatedAt: tenantData.updated_at,
          settings: tenantData.settings || {}
        };

        const loadedMember: TenantMember = {
          id: activeMembership.id,
          tenantId: activeMembership.tenant_id,
          userId: activeMembership.user_id,
          role: activeMembership.role,
          invitedBy: activeMembership.invited_by,
          invitedAt: activeMembership.invited_at,
          joinedAt: activeMembership.joined_at,
          status: activeMembership.status,
          createdAt: activeMembership.created_at,
          updatedAt: activeMembership.updated_at
        };

        setTenant(loadedTenant);
        setMember(loadedMember);
        updateUsage(loadedTenant);

      } catch (err: any) {
        console.error('Error loading tenant:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadTenant();
  }, [user?.id, updateUsage]);

  // Fonctions de vérification des quotas
  const canAddProject = useCallback(() => {
    if (!tenant) return false;
    return tenant.currentProjectsCount < tenant.maxProjects;
  }, [tenant]);

  const canAddIntervenant = useCallback(() => {
    if (!tenant) return false;
    return tenant.currentIntervenantsCount < tenant.maxIntervenants;
  }, [tenant]);

  const canUploadFile = useCallback((sizeBytes: number) => {
    if (!tenant) return false;
    const newTotal = tenant.currentStorageUsedBytes + sizeBytes;
    return newTotal <= tenant.maxStorageGb * 1024 * 1024 * 1024;
  }, [tenant]);

  const getRemainingStorage = useCallback(() => {
    if (!tenant) return 0;
    return tenant.maxStorageGb * 1024 * 1024 * 1024 - tenant.currentStorageUsedBytes;
  }, [tenant]);

  // Rafraîchir l'usage
  const refreshUsage = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenant.id)
        .single();

      if (error) throw error;

      if (data) {
        const updatedTenant: Tenant = {
          ...tenant,
          currentProjectsCount: data.current_projects_count || 0,
          currentIntervenantsCount: data.current_intervenants_count || 0,
          currentStorageUsedBytes: data.current_storage_used_bytes || 0
        };
        updateUsage(updatedTenant);
      }
    } catch (err) {
      console.error('Error refreshing usage:', err);
    }
  }, [tenant?.id, updateUsage]);

  // Changer de tenant (si l'utilisateur a plusieurs memberships)
  const switchTenant = useCallback(async (tenantId: string) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data: membership, error } = await supabase
        .from('tenant_members')
        .select(`
          *,
          tenant:tenants(*)
        `)
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      if (!membership) throw new Error('Membership not found');

      const tenantData = membership.tenant;

      setTenant({
        id: tenantData.id,
        name: tenantData.name,
        slug: tenantData.slug,
        ownerEmail: tenantData.owner_email,
        ownerUserId: tenantData.owner_user_id,
        plan: tenantData.plan,
        maxProjects: tenantData.max_projects,
        maxIntervenants: tenantData.max_intervenants,
        maxStorageGb: tenantData.max_storage_gb,
        currentProjectsCount: tenantData.current_projects_count || 0,
        currentIntervenantsCount: tenantData.current_intervenants_count || 0,
        currentStorageUsedBytes: tenantData.current_storage_used_bytes || 0,
        status: tenantData.status,
        trialEndsAt: tenantData.trial_ends_at,
        subscriptionStartsAt: tenantData.subscription_starts_at,
        subscriptionEndsAt: tenantData.subscription_ends_at,
        createdAt: tenantData.created_at,
        updatedAt: tenantData.updated_at,
        settings: tenantData.settings || {}
      });

      setMember({
        id: membership.id,
        tenantId: membership.tenant_id,
        userId: membership.user_id,
        role: membership.role,
        invitedBy: membership.invited_by,
        invitedAt: membership.invited_at,
        joinedAt: membership.joined_at,
        status: membership.status,
        createdAt: membership.created_at,
        updatedAt: membership.updated_at
      });

      toast({
        title: "Tenant changé",
        description: `Vous êtes maintenant sur ${tenantData.name}`,
      });

    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  const refreshTenant = useCallback(async () => {
    if (!tenant?.id) return;
    await switchTenant(tenant.id);
  }, [tenant?.id, switchTenant]);

  const value: TenantContextType = {
    tenant,
    member,
    isLoading,
    error,
    usage,
    refreshUsage,
    canAddProject,
    canAddIntervenant,
    canUploadFile,
    getRemainingStorage,
    switchTenant,
    refreshTenant
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};
