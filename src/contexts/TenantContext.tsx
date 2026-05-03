import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import type { 
  Tenant, 
  TenantPlan,
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
  const { user, status } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (status !== 'authenticated' || !user?.id) {
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('user_id', user.id)
          .maybeSingle();  // ← maybeSingle au lieu de single

        if (error && error.code !== 'PGRST116') {
        }
        setIsSuperAdmin(data?.is_super_admin || false);
      } catch (error) {
        setIsSuperAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSuperAdmin();
  }, [status, user?.id]);

  // Fonctions Super Admin

  // Supprimer complètement un tenant et TOUTES ses données
  const deleteTenant = useCallback(async (tenantId: string, deleteUsers: boolean = false): Promise<boolean> => {
    try {
      toast({
        title: "Suppression en cours...",
        description: "Cette opération peut prendre quelques secondes.",
      });

      // 1. Récupérer les IDs des utilisateurs du tenant
      const { data: members } = await supabase
        .from('tenant_members')
        .select('user_id')
        .eq('tenant_id', tenantId);

      const userIds = members?.map(m => m.user_id) || [];

      // 2. Supprimer toutes les données dans l'ordre (enfants d'abord)
      
      // Supprimer les messages
      await supabase.from('messages').delete().eq('tenant_id', tenantId);
      
      // Supprimer les conversations
      await supabase.from('conversations').delete().eq('tenant_id', tenantId);
      
      // Supprimer les réunions vidéo
      await supabase.from('video_meetings').delete().eq('tenant_id', tenantId);
      
      // Supprimer les notifications
      await supabase.from('notifications').delete().eq('tenant_id', tenantId);
      
      // Supprimer les tâches
      await supabase.from('standard_tasks').delete().eq('tenant_id', tenantId);
      await supabase.from('workflow_tasks').delete().eq('tenant_id', tenantId);
      
      // Supprimer les projets
      await supabase.from('projects').delete().eq('tenant_id', tenantId);
      
      // Supprimer les entreprises
      await supabase.from('companies').delete().eq('tenant_id', tenantId);
      
      // Supprimer les membres/intervenants
      await supabase.from('membre').delete().eq('tenant_id', tenantId);
      
      // Supprimer les membres du tenant
      await supabase.from('tenant_members').delete().eq('tenant_id', tenantId);

      // 3. Mettre à jour les profils (retirer tenant_id)
      if (userIds.length > 0) {
        await supabase
          .from('profiles')
          .update({ tenant_id: null })
          .in('user_id', userIds);

        // 4. Optionnellement supprimer les utilisateurs complètement
        if (deleteUsers) {
          for (const userId of userIds) {
            // Supprimer le profil
            await supabase.from('profiles').delete().eq('user_id', userId);
            // Essayer de supprimer de auth
            try {
              await supabase.rpc('delete_auth_user', { user_id: userId });
            } catch (e) {
            }
          }
        }
      }

      // 5. Supprimer le tenant
      const { error } = await supabase.from('tenants').delete().eq('id', tenantId);
      if (error) throw error;

      toast({
        title: "Tenant supprimé",
        description: deleteUsers 
          ? "Le tenant, tous ses projets, intervenants et utilisateurs ont été supprimés."
          : "Le tenant et toutes ses données ont été supprimés. Les utilisateurs ont été détachés.",
      });

      return true;

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le tenant",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const createTenant = useCallback(async (data: CreateTenantData): Promise<Tenant | null> => {
    try {
      // 1. Calculer les limites
      const planDefaults = getPlanDefaults(data.plan);
      const maxProjects = data.plan === 'custom' ? (data.maxProjects || 10) : planDefaults.maxProjects;
      const maxIntervenants = data.plan === 'custom' ? (data.maxIntervenants || 20) : planDefaults.maxIntervenants;
      const maxStorageGb = data.plan === 'custom' ? (data.maxStorageGb || 50) : planDefaults.maxStorageGb;

      // 2. Créer l'admin dans Auth via la fonction SQL (email auto-confirmé)
      let userId: string;
      
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('create_tenant_admin_user', {
            p_email: data.ownerEmail,
            p_password: data.ownerPassword,
            p_first_name: data.ownerFirstName,
            p_last_name: data.ownerLastName
          });

        if (rpcError) throw rpcError;
        if (!rpcData?.success) throw new Error(rpcData?.error || 'Échec de la création utilisateur');
        
        userId = rpcData.userId;
        
      } catch (authErr: any) {
        throw new Error(`Erreur création admin: ${authErr.message}`);
      }

      // 3. Créer le tenant avec owner_user_id
      const insertData = {
        name: data.name,
        slug: data.slug,
        owner_email: data.ownerEmail,
        owner_user_id: userId,  // ← Maintenant on a l'ID !
        plan: data.plan,
        max_projects: maxProjects,
        max_intervenants: maxIntervenants,
        max_storage_gb: maxStorageGb,
        status: 'trial',
        trial_ends_at: new Date(Date.now() + (data.trialDays || 14) * 24 * 60 * 60 * 1000).toISOString()
      };
      

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert(insertData)
        .select()
        .single();

      if (tenantError) {
        throw tenantError;
      }

      // 4. Mettre à jour le profil de l'admin (déjà créé par la Edge Function)
      //    On upsert pour ajouter tenant_id maintenant qu'on a l'ID du tenant
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          email: data.ownerEmail,
          first_name: data.ownerFirstName,
          last_name: data.ownerLastName,
          role: 'admin',
          tenant_id: tenantData.id,
          is_super_admin: false,
          status: 'active'
        }, { onConflict: 'user_id' });

      if (profileError) {
        // Non bloquant, on continue
      }

      // 5. Ajouter comme membre du tenant
      const { error: memberError } = await supabase
        .from('tenant_members')
        .insert({
          tenant_id: tenantData.id,
          user_id: userId,
          role: 'admin',
          status: 'active',
          joined_at: new Date().toISOString()
        });

      if (memberError) {
        // Non bloquant si duplicate
      }
      
      toast({
        title: "Client créé avec succès",
        description: `${data.name} créé. L'admin ${data.ownerEmail} peut se connecter immédiatement.`,
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

      // Compter les intervenants et projets réels par tenant
      const tenantIds = (data || []).map(t => t.id);

      const [profilesRes, projectsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('tenant_id, role')
          .in('tenant_id', tenantIds)
          .neq('role', 'admin')
          .neq('is_super_admin', true),
        supabase
          .from('projects')
          .select('tenant_id')
          .in('tenant_id', tenantIds)
      ]);

      // Construire les maps de comptage
      const intervenantCountMap: Record<string, number> = {};
      const projectCountMap: Record<string, number> = {};

      (profilesRes.data || []).forEach(p => {
        if (p.tenant_id) intervenantCountMap[p.tenant_id] = (intervenantCountMap[p.tenant_id] || 0) + 1;
      });
      (projectsRes.data || []).forEach(p => {
        if (p.tenant_id) projectCountMap[p.tenant_id] = (projectCountMap[p.tenant_id] || 0) + 1;
      });

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
        currentProjectsCount: projectCountMap[t.id] || 0,
        currentIntervenantsCount: intervenantCountMap[t.id] || 0,
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

  const updateTenantPlan = useCallback(async (
    tenantId: string, 
    plan: TenantPlan
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          plan,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (error) throw error;

      toast({
        title: "Plan mis à jour",
        description: `Le plan a été passé à ${plan}. Les limites ont été synchronisées.`,
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
        throw memberError;
      }

      // 2. Retirer tenant_id du profil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ tenant_id: null })
        .eq('user_id', userId);

      if (profileError) {
        throw profileError;
      }

      toast({
        title: "Utilisateur retiré",
        description: "L'utilisateur a été retiré du tenant.",
      });

      return true;

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer l'utilisateur",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Créer un administrateur de tenant directement (avec création auth)
  const createTenantAdmin = useCallback(async (
    tenantId: string,
    userData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }
  ): Promise<{ userId: string | null; error: string | null }> => {
    try {
      // 0. Vérifier si l'utilisateur existe déjà dans profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id, email')
        .eq('email', userData.email)
        .maybeSingle();

      if (existingProfile) {
        // L'utilisateur existe dans profiles - on l'associe juste au tenant
        
        const userId = existingProfile.user_id;

        // Mettre à jour le profil
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            tenant_id: tenantId,
            role: 'admin'
          })
          .eq('user_id', userId);

        if (profileError) throw profileError;

        // Ajouter comme membre (ignorer si déjà membre)
        const { error: memberError } = await supabase
          .from('tenant_members')
          .insert({
            tenant_id: tenantId,
            user_id: userId,
            role: 'admin',
            status: 'active',
            joined_at: new Date().toISOString()
          });

        if (memberError && !memberError.message.includes('duplicate')) throw memberError;

        // Mettre à jour le tenant
        await supabase
          .from('tenants')
          .update({ owner_user_id: userId })
          .eq('id', tenantId);

        toast({
          title: "Administrateur associé",
          description: `${userData.email} existe déjà et est maintenant admin de ce tenant.`,
        });

        return { userId, error: null };
      }

      // 1. Essayer de créer l'utilisateur dans Auth
      let userId: string;
      
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              first_name: userData.firstName,
              last_name: userData.lastName,
              role: 'admin'
            }
          }
        });

        if (authError) {
          // Si l'utilisateur existe déjà dans auth
          if (authError.status === 409 || authError.message?.includes('already registered')) {
            // Récupérer l'UUID depuis auth.users via la liste des users
            const { data: authUsers } = await (supabase as any).auth.admin.listUsers();
            const existingUser = (authUsers?.users as any[] | undefined)?.find(u => u?.email === userData.email);
            
            if (existingUser) {
              userId = existingUser.id;
            } else {
              throw new Error('Email déjà utilisé mais utilisateur introuvable. Utilisez "Associer un utilisateur existant".');
            }
          } else {
            throw authError;
          }
        } else if (authData.user) {
          userId = authData.user.id;
        } else {
          throw new Error('Échec de la création utilisateur');
        }
      } catch (authErr: any) {
        // Fallback: demander à l'utilisateur d'utiliser l'association
        throw new Error(`Cet email existe déjà. Utilisez "Associer un utilisateur existant" et entrez l'email: ${userData.email}`);
      }

      // 2. Créer ou mettre à jour le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: 'admin',
          tenant_id: tenantId,
          is_super_admin: false,
          status: 'active'
        }, { onConflict: 'user_id' });

      if (profileError) throw profileError;

      // 3. Ajouter comme membre du tenant
      const { error: memberError } = await supabase
        .from('tenant_members')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          role: 'admin',
          status: 'active',
          joined_at: new Date().toISOString()
        });

      if (memberError && !memberError.message.includes('duplicate')) throw memberError;

      // 4. Mettre à jour le tenant
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({ owner_user_id: userId })
        .eq('id', tenantId);

      if (tenantError) throw tenantError;

      toast({
        title: "Administrateur créé",
        description: `${userData.email} est maintenant admin du tenant.`,
      });

      return { userId, error: null };

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'administrateur",
        variant: "destructive"
      });
      return { userId: null, error: error.message };
    }
  }, [toast]);

  // Supprimer complètement un utilisateur (compte + données + projets)
  const deleteUser = useCallback(async (
    userId: string,
    tenantId?: string
  ): Promise<boolean> => {
    try {
      // Si tenantId fourni, supprimer les projets et données du tenant associés à cet utilisateur
      if (tenantId) {
        // Supprimer les tâches assignées à cet utilisateur dans ce tenant
        await supabase
          .from('standard_task_assignments')
          .delete()
          .eq('user_id', userId);

        await supabase
          .from('workflow_task_assignments')
          .delete()
          .eq('user_id', userId);

        // Supprimer les projets créés par cet utilisateur dans ce tenant
        // Note: On pourrait aussi transférer les projets à un autre admin
        await supabase
          .from('projects')
          .delete()
          .eq('tenant_id', tenantId)
          .eq('created_by', userId);
      }

      // 1. Supprimer de tous les tenants
      await supabase
        .from('tenant_members')
        .delete()
        .eq('user_id', userId);

      // 2. Supprimer le profil (pas juste marquer)
      await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      // 3. Supprimer de auth.users (nécessite une Edge Function)
      // Pour l'instant, on appelle une fonction RPC si disponible
      try {
        await supabase.rpc('delete_auth_user', { user_id: userId });
      } catch (e) {
      }

      toast({
        title: "Utilisateur supprimé",
        description: "Le compte et toutes ses données ont été supprimés.",
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
    deleteTenant,
    getAllTenants,
    updateTenantLimits,
    updateTenantPlan,
    suspendTenant,
    activateTenant,
    associateUserToTenant,
    removeUserFromTenant,
    deleteUser,
    createTenantAdmin
  };
}

// Provider principal
export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, status } = useAuth();
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
      if (status !== 'authenticated' || !user?.id) {
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
          // 1. Essayer de charger via profiles.tenant_id si aucun membership explicite trouvé
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id, is_super_admin')
            .eq('user_id', user.id)
            .single();

          if (profile?.tenant_id) {
            // Recharger le tenant via cet ID
            const { data: tenantData, error: tenantError } = await supabase
              .from('tenants')
              .select('*')
              .eq('id', profile.tenant_id)
              .single();

            if (!tenantError && tenantData) {
              const loadedTenant: Tenant = {
                id: tenantData.id,
                name: tenantData.name,
                slug: tenantData.slug,
                ownerEmail: tenantData.owner_email,
                ownerUserId: tenantData.owner_user_id,
                plan: tenantData.plan,
                plan_limits: tenantData.plan_limits,
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

              setTenant(loadedTenant);
              updateUsage(loadedTenant);
              setIsLoading(false);
              return;
            }
          }

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
          plan_limits: tenantData.plan_limits,
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
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadTenant();
  }, [status, user?.id, toast, updateUsage]);

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
