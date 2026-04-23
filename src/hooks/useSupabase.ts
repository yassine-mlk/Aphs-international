import { useCallback } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { UserRole, SPECIALTIES, Profile } from '../types/profile';
import { Company } from '../types/company';
import { Workgroup as WorkGroup, WorkgroupMember as WorkGroupMember } from '../types/workgroup';

export { SPECIALTIES };
export type { UserRole, Company, WorkGroup, WorkGroupMember };

// Type pour les paramètres utilisateur (pour compatibilité)
export interface UserSettings extends Partial<Profile> {
  notifications: {
    email: boolean;
    push: boolean;
    messages: boolean;
    updates: boolean;
  };
}

// Interface pour les groupes de travail (version étendue pour certains hooks)
export interface WorkGroupProject {
  id: string;
  workgroup_id: string;
  project_name: string;
  added_at: string;
}

// Type pour les intervenants (pour compatibilité)
export interface Intervenant extends Partial<Profile> {
  joinDate: string;
  joinDateRaw: Date;
}

export function useSupabase() {
  const { toast } = useToast();

  /**
   * Récupère les données d'une table
   */
  const fetchData = useCallback(async <T>(
    tableName: string, 
    options?: {
      columns?: string,
      filters?: { column: string; operator: string; value: any }[];
      order?: { column: string; ascending?: boolean };
      limit?: number;
      range?: [number, number];
      timeout?: number;
    }
  ): Promise<T[]> => {
    try {
      const timeout = options?.timeout || 5000;
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout for ${tableName} after ${timeout}ms`));
        }, timeout);
      });
      
      let query = supabase
        .from(tableName)
        .select(options?.columns || '*');

      if (options?.filters) {
        options.filters.forEach(filter => {
          // Traitement spécial pour le filtre 'in'
          if (filter.operator === 'in') {
            // S'assurer que la valeur est un tableau non vide
            if (Array.isArray(filter.value) && filter.value.length > 0) {
              // Utiliser .filter avec le format explicite (val1,val2) pour forcer les parenthèses si nécessaire
              const formattedValue = `(${filter.value.join(',')})`;
              query = query.filter(filter.column, 'in', formattedValue);
            } else if (typeof filter.value === 'string' && filter.value.startsWith('(') && filter.value.endsWith(')')) {
              // Gérer le cas où la valeur est déjà formatée comme "(id1,id2,id3)"
              query = query.filter(filter.column, 'in', filter.value);
            } else if (typeof filter.value === 'string') {
              // Gérer le cas où la valeur est une chaîne séparée par des virgules sans parenthèses
              const formattedValue = `(${filter.value})`;
              query = query.filter(filter.column, 'in', formattedValue);
            } else {
            }
          } else {
            // Traitement normal pour les autres opérateurs
            query = query.filter(filter.column, filter.operator, filter.value);
          }
        });
      }

      if (options?.order) {
        query = query.order(options.order.column, {
          ascending: options.order.ascending ?? true
        });
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.range) {
        query = query.range(options.range[0], options.range[1]);
      }

      const result = await Promise.race([
        query,
        timeoutPromise
      ]) as {data: T[], error: any} | null;
      
      if (!result) {
        throw new Error('Request timed out');
      }

      const { data, error } = result;

      if (error) {
        throw error;
      }

      // Special handling for profiles table to map user_id to id
      if (tableName === 'profiles' && data) {
        return data.map((item: any) => ({
          ...item,
          id: item.user_id // Map user_id to id for consistency with Profile interface
        })) as T[];
      }

      return data as T[];
    } catch (error) {
      toast({
        title: "Erreur de chargement",
        description: `Impossible de charger les données depuis ${tableName}`,
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  /**
   * Insère une nouvelle ligne dans une table
   */
  const insertData = useCallback(async <T>(
    tableName: string, 
    data: Partial<T>
  ): Promise<T | null> => {
    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(data)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: "Données ajoutées avec succès",
      });

      // Special handling for profiles table to map user_id to id
      if (tableName === 'profiles' && result) {
        return {
          ...result,
          id: result.user_id // Map user_id to id for consistency with Profile interface
        } as T;
      }

      return result as T;
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible d'ajouter les données dans ${tableName}`,
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  /**
   * Met à jour une ligne dans une table
   */
  const updateData = useCallback(async <T>(
    tableName: string, 
    data: Partial<T> & { id: string },
    filters?: { column: string; operator: string; value: any }[]
  ): Promise<T | null> => {
    try {
      let query = supabase
        .from(tableName)
        .update(data);
      
      if (filters && filters.length > 0) {
        filters.forEach(filter => {
          query = query.filter(filter.column, filter.operator, filter.value);
        });
      } else if (data.id) {
        // Special handling for profiles table - use user_id instead of id
        if (tableName === 'profiles') {
          query = query.eq('user_id', data.id);
        } else {
          query = query.eq('id', data.id);
        }
      } else {
        throw new Error('Neither id nor filters provided for update operation');
      }
      
      const { data: result, error } = await query.select('*').single();

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: "Données mises à jour avec succès",
      });

      // Special handling for profiles table to map user_id to id
      if (tableName === 'profiles' && result) {
        return {
          ...result,
          id: result.user_id // Map user_id to id for consistency with Profile interface
        } as T;
      }

      return result as T;
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour les données dans ${tableName}`,
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  /**
   * Supprime une ligne d'une table
   */
  const deleteData = useCallback(async (
    tableName: string, 
    id: string | number,
    idColumn: string = 'id'
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq(idColumn, id);

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: "Données supprimées avec succès",
      });

      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible de supprimer les données dans ${tableName}`,
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  /**
   * Récupère les paramètres d'un utilisateur depuis la table profiles
   */
  const getUserSettings = useCallback(async (userId: string): Promise<UserSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profil non trouvé, retourner des paramètres par défaut
          return {
            id: userId,
            first_name: '',
            last_name: '',
            phone: '',
            bio: '',
            theme: 'light',
            language: 'fr',
            notifications: {
              email: true,
              push: true,
              messages: false,
              updates: true
            }
          } as UserSettings;
        }
        throw error;
      }

      // Convertir les données du profil en format UserSettings
      return {
        id: data.user_id,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        avatar_url: data.avatar_url || '',
        bio: data.bio || '',
        theme: data.theme || 'light',
        language: data.language || 'fr',
        specialty: data.specialty,
        notifications: {
          email: data.email_notifications ?? true,
          push: data.push_notifications ?? true,
          messages: data.message_notifications ?? false,
          updates: data.update_notifications ?? true
        },
        created_at: data.created_at,
        updated_at: data.updated_at
      } as UserSettings;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger vos paramètres",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  /**
   * Met à jour les paramètres d'un utilisateur dans la table profiles
   */
  const updateUserSettings = useCallback(async (
    userId: string, 
    settings: Partial<UserSettings>
  ): Promise<UserSettings | null> => {
    try {
      // Mapper les champs UserSettings vers les champs profiles
      const profileUpdate: Partial<Profile> = {};
      if (settings.first_name !== undefined) profileUpdate.first_name = settings.first_name;
      if (settings.last_name !== undefined) profileUpdate.last_name = settings.last_name;
      if (settings.phone !== undefined) profileUpdate.phone = settings.phone;
      if (settings.avatar_url !== undefined) profileUpdate.avatar_url = settings.avatar_url;
      if (settings.bio !== undefined) profileUpdate.bio = settings.bio;
      if (settings.specialty !== undefined) profileUpdate.specialty = settings.specialty;
      if (settings.theme !== undefined) profileUpdate.theme = settings.theme as any; // Cast for compatibility
      if (settings.language !== undefined) profileUpdate.language = settings.language as any; // Cast for compatibility

      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) throw error;

      // Si la langue est mise à jour, sauvegarder aussi dans localStorage
      if (settings.language) {
        localStorage.setItem('preferredLanguage', settings.language);
      }

      toast({
        title: "Paramètres mis à jour",
        description: "Vos paramètres ont été enregistrés avec succès",
      });

      // Reconvertir en format UserSettings
      return {
        id: data.user_id,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        avatar_url: data.avatar_url || '',
        bio: data.bio || '',
        theme: data.theme || 'light',
        language: settings.language || 'fr',
        specialty: data.specialty,
        notifications: {
          email: true,
          push: true,
          messages: false,
          updates: true
        },
        created_at: data.created_at,
        updated_at: data.updated_at
      } as UserSettings;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour vos paramètres",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  /**
   * Met à jour le mot de passe d'un utilisateur
   */
  const updateUserPassword = useCallback(async (
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> => {
    try {
      // D'abord vérifier le mot de passe actuel
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        toast({
          title: "Erreur",
          description: "Mot de passe actuel incorrect",
          variant: "destructive",
        });
        return false;
      }

      // Mise à jour du mot de passe
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Votre mot de passe a été mis à jour avec succès",
      });

      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre mot de passe",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  /**
   * Crée un nouvel utilisateur avec un rôle spécifique (par l'administrateur)
   * VERSION CORRIGÉE avec création manuelle du profil
   */
  const adminCreateUser = useCallback(async (
    email: string,
    password: string,
    role: UserRole = 'intervenant',
    additionalData: Record<string, any> = {}
  ): Promise<{ success: boolean; userId?: string; error?: Error }> => {
    try {
      if (!supabaseAdmin) {
        throw new Error("VITE_SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local");
      }


      // 1. Créer l'utilisateur auth
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { 
          role, 
          ...additionalData 
        },
      });

      if (error) {
        throw error;
      }
      
      if (data && data.user) {

        // 2. Créer manuellement le profil (contournement du trigger)
        try {
          
              // Utiliser tenant_id fourni ou le récupérer depuis l'admin connecté
          let tenantId: string | null = additionalData.tenant_id || null;
          if (!tenantId) {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
              const { data: adminProfile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('user_id', currentUser.id)
                .maybeSingle();
              tenantId = adminProfile?.tenant_id || null;
            }
          }

          // Vérifier le quota d'intervenants
          if (tenantId && role !== 'admin') {
            const { data: tenantData } = await supabase
              .from('tenants')
              .select('max_intervenants')
              .eq('id', tenantId)
              .maybeSingle();

            const { count: currentCount } = await supabase
              .from('profiles')
              .select('user_id', { count: 'exact', head: true })
              .eq('tenant_id', tenantId)
              .neq('role', 'admin')
              .neq('is_super_admin', true);

            const maxIntervenants = tenantData?.max_intervenants ?? null;
            if (maxIntervenants !== null && (currentCount ?? 0) >= maxIntervenants) {
              // Supprimer l'utilisateur auth qu'on vient de créer
              await supabaseAdmin!.auth.admin.deleteUser(data.user.id);
              toast({
                title: "Quota atteint",
                description: "Vous avez atteint votre limite de création d'intervenant. Veuillez contacter le support.",
                variant: "destructive",
              });
              return { success: false, error: new Error(`Quota d'intervenants atteint (${maxIntervenants})`) };
            }
          }

          // Valider company_id - doit être un UUID valide ou null
          let validCompanyId: string | null = null;
          if (additionalData.company_id && 
              additionalData.company_id !== 'independant' && 
              additionalData.company_id !== '' &&
              typeof additionalData.company_id === 'string' &&
              additionalData.company_id.length === 36) {
            validCompanyId = additionalData.company_id;
          }
          
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              user_id: data.user.id,
              email: email,
              first_name: additionalData.first_name || '',
              last_name: additionalData.last_name || '',
              role: role,
              specialty: additionalData.specialty || '',
              company: additionalData.company || 'Indépendant',
              company_id: validCompanyId,
              phone: additionalData.phone || '',
              tenant_id: tenantId,
              status: 'active',
              theme: 'light',
              language: 'fr',
              email_notifications: true,
              push_notifications: true,
              message_notifications: true,
              update_notifications: true
            } as any, { onConflict: 'user_id' });

          if (profileError) {
          } else {
          }
        } catch (profileError) {
          // Ne pas échouer complètement
        }

        toast({
          title: "Succès",
          description: `L'utilisateur ${role} a été créé avec succès`,
        });

        return { success: true, userId: data.user.id };
      }

      throw new Error("Échec de la création de l'utilisateur");
    } catch (error) {
      
      let errorMessage = "Impossible de créer l'utilisateur";
      if (error instanceof Error) {
        if (error.message.includes('SERVICE_ROLE_KEY')) {
          errorMessage = "Variables d'environnement manquantes (.env.local)";
        } else if (error.message.includes('User already registered')) {
          errorMessage = "Un utilisateur avec cet email existe déjà";
        } else if (error.message.includes('Database error')) {
          errorMessage = "Erreur de base de données. Le trigger doit être corrigé.";
        }
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: error as Error };
    }
  }, [toast]);

  /**
   * Récupère tous les utilisateurs (pour l'admin uniquement)
   */
  const getUsers = useCallback(async () => {
    try {
      if (!supabaseAdmin) {
        throw new Error("L'API d'administration n'est pas disponible. Contactez votre administrateur système.");
      }

      // Utiliser directement le client admin
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la liste des utilisateurs",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  /**
   * Met à jour un utilisateur existant (par l'administrateur)
   */
  const adminUpdateUser = useCallback(async (
    userId: string,
    userData: {
      email?: string;
      password?: string;
      role?: UserRole;
      first_name?: string;
      last_name?: string;
      specialty?: string;
      [key: string]: any;
    }
  ): Promise<{ success: boolean; error?: Error }> => {
    try {
      if (!supabaseAdmin) {
        throw new Error("L'API d'administration n'est pas disponible. Contactez votre administrateur système.");
      }

      const updates: {
        email?: string;
        password?: string;
        user_metadata?: Record<string, any>;
      } = {};
      
      // Création de l'objet pour mettre à jour les metadata
      if (userData.role || userData.first_name || userData.last_name || userData.specialty) {
        const { data: currentUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        const currentMetadata = currentUser?.user?.user_metadata || {};
        
        updates.user_metadata = {
          ...currentMetadata,
          ...(userData.role && { role: userData.role }),
          ...(userData.first_name && { first_name: userData.first_name }),
          ...(userData.last_name && { last_name: userData.last_name }),
          ...(userData.specialty && { specialty: userData.specialty }),
          ...(userData.first_name && userData.last_name && { name: `${userData.first_name} ${userData.last_name}` })
        };
      }
      
      // Ajout de l'email et/ou mot de passe si fournis
      if (userData.email) updates.email = userData.email;
      if (userData.password) updates.password = userData.password;

      // Mise à jour de l'utilisateur
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        updates
      );

      if (error) throw error;

      // Note: La mise à jour du profil est maintenant gérée par le hook useProfiles.updateProfile()
      // Nous ne mettons à jour ici que les métadonnées auth, le profil sera mis à jour séparément

      toast({
        title: "Succès",
        description: "L'utilisateur a été mis à jour avec succès",
      });

      return { success: true };
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'utilisateur",
        variant: "destructive",
      });
      return { success: false, error: error as Error };
    }
  }, [toast]);

  /**
   * Supprime un utilisateur (par l'administrateur)
   */
  const adminDeleteUser = useCallback(async (
    userId: string
  ): Promise<{ success: boolean; error?: Error }> => {
    try {
      if (!supabaseAdmin) {
        throw new Error("L'API d'administration n'est pas disponible. Contactez votre administrateur système.");
      }

      // Vérifier que l'utilisateur n'est pas un admin
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userData?.user?.user_metadata?.role === 'admin') {
        throw new Error("Impossible de supprimer un administrateur");
      }

      // Nettoyer les données associées dans l'ordre inverse des dépendances

      // 1. Supprimer les participations aux conversations
      try {
        const { error: participationsError } = await supabaseAdmin
          .from('conversation_participants')
          .delete()
          .eq('user_id', userId);
        
        if (participationsError) {
        }
      } catch (error) {
      }

      // 2. Supprimer les lectures de messages
      try {
        const { error: readsError } = await supabaseAdmin
          .from('message_reads')
          .delete()
          .eq('user_id', userId);
        
        if (readsError) {
        }
      } catch (error) {
      }

      // 3. Supprimer les appartenances aux groupes de travail
      try {
        const { error: membershipError } = await supabaseAdmin
          .from('workgroup_members')
          .delete()
          .eq('user_id', userId);
        
        if (membershipError) {
        }
      } catch (error) {
      }

      // 4. Vérifier et supprimer les messages envoyés
      try {
        // Utiliser la fonction SQL pour anonymiser les messages
        const { error: messagesError } = await supabaseAdmin
          .rpc('anonymize_user_messages', { user_id_param: userId });
        
        if (messagesError) {
        }
      } catch (error) {
      }

      // 5. Supprimer le profil utilisateur (nouvelle table profiles)
      try {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('user_id', userId);
        
        if (profileError) {
        }
      } catch (error) {
      }

      // 6. Les paramètres utilisateur sont maintenant dans la table profiles
      // (pas besoin de suppression séparée)

      // Finalement, supprimer l'utilisateur
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (error) throw error;

      toast({
        title: "Succès",
        description: "L'utilisateur a été supprimé avec succès",
      });

      return { success: true };
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
      return { success: false, error: error as Error };
    }
  }, [toast]);

  /**
   * Récupère toutes les entreprises
   */
  const getCompanies = useCallback(async (): Promise<Company[]> => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      
      return data as Company[];
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la liste des entreprises",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  /**
   * Ajoute une nouvelle entreprise
   */
  const addCompany = useCallback(async (
    companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; company?: Company; error?: Error }> => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          ...companyData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: `L'entreprise ${companyData.name} a été créée avec succès`,
      });

      return { success: true, company: data as Company };
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'entreprise",
        variant: "destructive",
      });
      return { success: false, error: error as Error };
    }
  }, [toast]);

  /**
   * Met à jour une entreprise existante
   */
  const updateCompany = useCallback(async (
    id: string,
    companyData: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<{ success: boolean; company?: Company; error?: Error }> => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update({
          ...companyData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: `L'entreprise a été mise à jour avec succès`,
      });

      return { success: true, company: data as Company };
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'entreprise",
        variant: "destructive",
      });
      return { success: false, error: error as Error };
    }
  }, [toast]);

  /**
   * Supprime une entreprise
   */
  const deleteCompany = useCallback(async (
    id: string
  ): Promise<{ success: boolean; error?: Error }> => {
    try {
      // Vérifier d'abord si l'entreprise est utilisée par des projets
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', id);

      if (projectsError) throw projectsError;
      
      if (projects && projects.length > 0) {
        const projectNames = projects.map(p => p.name).join(', ');
        throw new Error(`Impossible de supprimer cette entreprise car elle est utilisée par ${projects.length} projet(s): ${projectNames}. Supprimez d'abord ces projets ou modifiez leur entreprise.`);
      }
      
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "L'entreprise a été supprimée avec succès",
      });

      return { success: true };
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'entreprise",
        variant: "destructive",
      });
      return { success: false, error: error as Error };
    }
  }, [toast, supabase]);

  /**
   * Crée un bucket de stockage s'il n'existe pas déjà
   * NOTE: Cette fonction nécessite des permissions administratives et
   * ne fonctionnera généralement pas avec les restrictions RLS standard.
   * Il est recommandé de créer les buckets manuellement via l'interface Supabase.
   */
  const createStorageBucketIfNotExists = useCallback(async (bucketName: string): Promise<boolean> => {
    try {
      // Vérifier si le bucket existe déjà
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) throw listError;
      
      const bucketExists = buckets.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        // Créer le bucket s'il n'existe pas
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true, // Permet l'accès public aux fichiers
          fileSizeLimit: 2 * 1024 * 1024, // 2MB de limite de taille
        });
        
        if (createError) throw createError;
        
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  /**
   * Récupère tous les groupes de travail
   */
  const getWorkGroups = useCallback(async (): Promise<{ workgroups: WorkGroup[] } | null> => {
    try {
      
      // Vérifier d'abord si la table workgroups existe
      const { error: tableError } = await supabase
        .from('workgroups')
        .select('id')
        .limit(1);
        
      if (tableError) {
        return { workgroups: [] }; // Retourner un tableau vide si la table n'existe pas
      }
      
      const { data, error } = await supabase
        .from('workgroups')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { workgroups: data as WorkGroup[] };
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible de récupérer les groupes de travail: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        variant: "destructive",
      });
      return { workgroups: [] }; // Retourner un tableau vide en cas d'erreur plutôt que null
    }
  }, [toast]);

  /**
   * Crée un nouveau groupe de travail
   */
  const createWorkGroup = useCallback(async (workgroupData: Partial<WorkGroup>): Promise<WorkGroup | null> => {
    try {
      const { data, error } = await supabase
        .from('workgroups')
        .insert(workgroupData)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: "Groupe de travail créé avec succès",
      });

      return data as WorkGroup;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le groupe de travail",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  /**
   * Met à jour un groupe de travail existant
   */
  const updateWorkGroup = useCallback(async (id: string, workgroupData: Partial<WorkGroup>): Promise<WorkGroup | null> => {
    try {
      const { data, error } = await supabase
        .from('workgroups')
        .update({ ...workgroupData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: "Groupe de travail mis à jour avec succès",
      });

      return data as WorkGroup;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le groupe de travail",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  /**
   * Supprime un groupe de travail
   */
  const deleteWorkGroup = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('workgroups')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: "Groupe de travail supprimé avec succès",
      });

      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le groupe de travail",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  /**
   * Récupère les membres d'un groupe de travail
   */
  const getWorkGroupMembers = useCallback(async (workgroupId: string): Promise<WorkGroupMember[]> => {
    try {
      // Requête simplifiée sans jointure
      const { data, error } = await supabase
        .from('workgroup_members')
        .select('*')
        .eq('workgroup_id', workgroupId);

      if (error) {
        throw error;
      }

      return data as WorkGroupMember[];
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les membres du groupe",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  /**
   * Ajoute des membres à un groupe de travail
   */
  const addMembersToWorkGroup = useCallback(async (workgroupId: string, userIds: string[]): Promise<boolean> => {
    try {

      // Insérer directement chaque membre dans workgroup_members
      const membersToInsert = userIds.map(userId => ({
        workgroup_id: workgroupId,
        user_id: userId,
        role: 'member',
        joined_at: new Date().toISOString(),
        status: 'active'
      }));

      const { data, error } = await supabase
        .from('workgroup_members')
        .insert(membersToInsert)
        .select('*');

      if (error) {
        throw error;
      }


      toast({
        title: "Succès",
        description: `${userIds.length} membre(s) ajouté(s) au groupe de travail`,
      });

      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les membres au groupe",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  /**
   * Supprime un membre d'un groupe de travail
   */
  const removeMemberFromWorkGroup = useCallback(async (memberId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('workgroup_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: "Membre retiré du groupe de travail",
      });

      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de retirer le membre du groupe",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  /**
   * Récupère les projets d'un groupe de travail
   */
  const getWorkGroupProjects = useCallback(async (workgroupId: string): Promise<WorkGroupProject[]> => {
    try {
      const { data, error } = await supabase
        .from('workgroup_projects')
        .select('*')
        .eq('workgroup_id', workgroupId);

      if (error) {
        throw error;
      }

      return data as WorkGroupProject[];
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les projets du groupe",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  /**
   * Ajoute un projet à un groupe de travail
   */
  const addProjectToWorkGroup = useCallback(async (workgroupId: string, projectName: string): Promise<WorkGroupProject | null> => {
    try {
      const { data, error } = await supabase
        .from('workgroup_projects')
        .insert({
          workgroup_id: workgroupId,
          project_name: projectName
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: "Projet ajouté au groupe de travail",
      });

      return data as WorkGroupProject;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le projet au groupe",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  /**
   * Supprime un projet d'un groupe de travail
   */
  const removeProjectFromWorkGroup = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('workgroup_projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: "Projet retiré du groupe de travail",
      });

      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de retirer le projet du groupe",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  /**
   * Télécharge un fichier dans le stockage Supabase
   */
  const uploadFile = useCallback(async (
    bucketName: string,
    filePath: string,
    file: File
  ) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
      return { data: null, error };
    }
  }, [toast]);

  /**
   * Obtient l'URL publique d'un fichier
   */
  const getFileUrl = useCallback(async (
    bucketName: string,
    filePath: string
  ): Promise<string> => {
    try {
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer l'URL du fichier",
        variant: "destructive",
      });
      return '';
    }
  }, [toast]);

  return {
    fetchData,
    insertData,
    updateData,
    deleteData,
    getUserSettings,
    updateUserSettings,
    updateUserPassword,
    adminCreateUser,
    adminUpdateUser,
    adminDeleteUser,
    getUsers,
    getCompanies,
    addCompany,
    updateCompany,
    deleteCompany,
    createStorageBucketIfNotExists,
    getWorkGroups,
    createWorkGroup,
    updateWorkGroup,
    deleteWorkGroup,
    getWorkGroupMembers,
    addMembersToWorkGroup,
    removeMemberFromWorkGroup,
    getWorkGroupProjects,
    addProjectToWorkGroup,
    removeProjectFromWorkGroup,
    uploadFile,
    getFileUrl,
    supabase
  };
} 