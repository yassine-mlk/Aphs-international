import { useCallback } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useToast } from '@/components/ui/use-toast';

// Type pour les rôles disponibles dans l'application
export type UserRole = 'admin' | 'intervenant' | 'owner';

// Liste des spécialités d'intervenants disponibles
export const SPECIALTIES = [
  'MOA Maître d\'ouvrage',
  'AMO Assistant maîtrise d\'ouvrage',
  'Géomètre',
  'MOE Maître d\'oeuvre',
  'Commission de sécurité',
  'Monuments historiques',
  'Elus locaux',
  'Futurs usagers',
  'Gestionnaire',
  'Programmiste',
  'Architectes',
  'Membres du Jury',
  'Bureau de contrôle',
  'Bureau d\'étude de sol',
  'Bureau d\'étude structure',
  'Bureau d\'étude thermique',
  'Bureau d\'étude acoustique',
  'Bureau d\'étude électricité',
  'Bureau d\'étude plomberie, chauffage, ventilation, climatisation',
  'Bureau d\'étude VRD voirie, réseaux divers',
  'Architecte d\'intérieur',
  'COORDINATEUR OPC',
  'COORDINATEUR SPS',
  'COORDINATEUR SSI'
];

// Type pour les paramètres utilisateur
export interface UserSettings {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  theme: 'light' | 'dark';
  language: 'fr' | 'en' | 'es' | 'ar';
  notifications: {
    email: boolean;
    push: boolean;
    messages: boolean;
    updates: boolean;
  };
  specialty?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Company {
  id: string;
  name: string;
  pays?: string;
  secteur?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

// Types pour les groupes de travail
export interface WorkGroup {
  id: string;
  name: string;
  description?: string;
  status: 'actif' | 'inactif';
  last_activity: string;
  upcoming_meeting?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkGroupMember {
  id: string;
  workgroup_id: string;
  user_id: string;
  role: string;
  added_at: string;
  // Suppression des champs joints qui ne sont plus utilisés
}

export interface WorkGroupProject {
  id: string;
  workgroup_id: string;
  project_name: string;
  added_at: string;
}

// Type pour les intervenants
export interface Intervenant {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  role: string;
  specialty?: string;
  company?: string;
  status: 'active' | 'inactive';
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
          query = query.filter(filter.column, filter.operator, filter.value);
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

      return data as T[];
    } catch (error) {
      console.error(`Erreur lors de la récupération des données depuis ${tableName}:`, error);
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

      return result as T;
    } catch (error) {
      console.error(`Erreur lors de l'insertion dans ${tableName}:`, error);
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
        query = query.eq('id', data.id);
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

      return result as T;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour dans ${tableName}:`, error);
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
      console.error(`Erreur lors de la suppression dans ${tableName}:`, error);
      toast({
        title: "Erreur",
        description: `Impossible de supprimer les données dans ${tableName}`,
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  /**
   * Récupère les paramètres d'un utilisateur
   */
  const getUserSettings = useCallback(async (userId: string): Promise<UserSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Si l'erreur est "not found", c'est que les paramètres n'existent pas encore
        if (error.code === 'PGRST116') {
          // Créer des paramètres par défaut
          const defaultSettings: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'> = {
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
          };

          const { data: newSettings, error: insertError } = await supabase
            .from('user_settings')
            .insert({ id: userId, ...defaultSettings })
            .select('*')
            .single();

          if (insertError) throw insertError;
          return newSettings as UserSettings;
        }
        throw error;
      }

      return data as UserSettings;
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres utilisateur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos paramètres",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  /**
   * Met à jour les paramètres d'un utilisateur
   */
  const updateUserSettings = useCallback(async (
    userId: string, 
    settings: Partial<UserSettings>
  ): Promise<UserSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update(settings)
        .eq('id', userId)
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

      return data as UserSettings;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres:', error);
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
      console.error('Erreur lors de la mise à jour du mot de passe:', error);
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
   */
  const adminCreateUser = useCallback(async (
    email: string,
    password: string,
    role: UserRole = 'intervenant',
    additionalData: Record<string, any> = {}
  ): Promise<{ success: boolean; userId?: string; error?: Error }> => {
    try {
      if (!supabaseAdmin) {
        throw new Error("L'API d'administration n'est pas disponible. Contactez votre administrateur système.");
      }

      // Utiliser directement le client admin
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { 
          role, 
          ...additionalData 
        },
      });

      if (error) throw error;
      
      if (data && data.user) {
        // Création d'un profil utilisateur dans la table profiles
        try {
          console.log('Tentative de création du profil pour:', data.user.id);
          
          // Utiliser la fonction RPC create_user_profile_v2
          const { error: rpcError } = await supabaseAdmin.rpc('create_user_profile_v2', {
            p_user_id: data.user.id,
            p_role: role,
            p_first_name: additionalData.first_name || null,
            p_last_name: additionalData.last_name || null,
            p_specialty: additionalData.specialty || null,
            p_email: data.user.email || null
          });
          
          if (rpcError) {
            console.error('Erreur lors de la création du profil via RPC:', rpcError);
            
            // Si la fonction RPC n'est pas disponible, essayer une méthode plus simple
            console.log('Tentative alternative de création du profil...');
            
            // Tentative avec insertion directe simplifiée
            try {
              // Insertion minimale sans colonnes qui pourraient ne pas exister
              const { error: insertError } = await supabaseAdmin
                .from('profiles')
                .insert({
                  user_id: data.user.id,
                  role: role
                });
                
              if (insertError) {
                console.error('Erreur insertion minimale:', insertError);
                
                // Dernière tentative: essayer de récupérer la structure de la table
                const { data: tableInfo, error: tableError } = await supabaseAdmin
                  .from('profiles')
                  .select('*')
                  .limit(1);
                
                if (!tableError && tableInfo && tableInfo.length > 0) {
                  const columnNames = Object.keys(tableInfo[0]);
                  console.log('Colonnes disponibles:', columnNames);
                  
                  // Construire un objet d'insertion avec seulement les colonnes existantes
                  const insertData: Record<string, any> = {};
                  
                  if (columnNames.includes('user_id')) insertData.user_id = data.user.id;
                  if (columnNames.includes('role')) insertData.role = role;
                  if (columnNames.includes('first_name')) insertData.first_name = additionalData.first_name;
                  if (columnNames.includes('last_name')) insertData.last_name = additionalData.last_name;
                  
                  // Dernière tentative d'insertion
                  const { error: finalError } = await supabaseAdmin
                    .from('profiles')
                    .insert(insertData);
                  
                  if (finalError) {
                    console.error('Erreur dernière tentative:', finalError);
                  } else {
                    console.log('Profil créé avec succès via méthode de dernier recours');
                  }
                }
              } else {
                console.log('Profil créé avec succès via insertion minimale');
              }
            } catch (altError) {
              console.error('Exception lors de la tentative alternative:', altError);
            }
          } else {
            console.log('Profil créé avec succès via RPC');
          }
        } catch (profileError) {
          console.error('Exception lors de la création du profil:', profileError);
        }

        toast({
          title: "Succès",
          description: `L'utilisateur ${role} a été créé avec succès`,
        });

        return { success: true, userId: data.user.id };
      }

      throw new Error("Échec de la création de l'utilisateur");
    } catch (error) {
      console.error('Erreur lors de la création d\'un utilisateur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'utilisateur",
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
      console.error('Erreur lors de la récupération des utilisateurs:', error);
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

      const updates: any = {};
      
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

      // Mise à jour du profil utilisateur si nécessaire
      if (userData.role || userData.first_name || userData.last_name || userData.specialty || userData.email) {
        try {
          const profileUpdates: any = {};
          if (userData.role) profileUpdates.role = userData.role;
          if (userData.first_name) profileUpdates.first_name = userData.first_name;
          if (userData.last_name) profileUpdates.last_name = userData.last_name;
          if (userData.specialty) profileUpdates.specialty = userData.specialty;
          if (userData.email) profileUpdates.email = userData.email;
          
          profileUpdates.updated_at = new Date().toISOString();
          
          await supabaseAdmin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', userId);
        } catch (profileError) {
          console.error('Erreur lors de la mise à jour du profil:', profileError);
        }
      }

      toast({
        title: "Succès",
        description: "L'utilisateur a été mis à jour avec succès",
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
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
      console.log(`Suppression des données associées pour l'utilisateur ${userId}...`);

      // 1. Supprimer les participations aux conversations
      try {
        console.log("1. Suppression des participations aux conversations...");
        const { error: participationsError } = await supabaseAdmin
          .from('conversation_participants')
          .delete()
          .eq('user_id', userId);
        
        if (participationsError) {
          console.warn("Erreur lors de la suppression des participations:", participationsError);
        }
      } catch (error) {
        console.warn("Exception lors de la suppression des participations:", error);
      }

      // 2. Supprimer les lectures de messages
      try {
        console.log("2. Suppression des lectures de messages...");
        const { error: readsError } = await supabaseAdmin
          .from('message_reads')
          .delete()
          .eq('user_id', userId);
        
        if (readsError) {
          console.warn("Erreur lors de la suppression des lectures de messages:", readsError);
        }
      } catch (error) {
        console.warn("Exception lors de la suppression des lectures de messages:", error);
      }

      // 3. Supprimer les appartenances aux groupes de travail
      try {
        console.log("3. Suppression des appartenances aux groupes de travail...");
        const { error: membershipError } = await supabaseAdmin
          .from('workgroup_members')
          .delete()
          .eq('user_id', userId);
        
        if (membershipError) {
          console.warn("Erreur lors de la suppression des appartenances aux groupes:", membershipError);
        }
      } catch (error) {
        console.warn("Exception lors de la suppression des appartenances aux groupes:", error);
      }

      // 4. Vérifier et supprimer les messages envoyés
      try {
        console.log("4. Anonymisation des messages envoyés...");
        // Utiliser la fonction SQL pour anonymiser les messages
        const { error: messagesError } = await supabaseAdmin
          .rpc('anonymize_user_messages', { user_id_param: userId });
        
        if (messagesError) {
          console.warn("Erreur lors de l'anonymisation des messages:", messagesError);
        }
      } catch (error) {
        console.warn("Exception lors du traitement des messages:", error);
      }

      // 5. Supprimer le profil utilisateur
      try {
        console.log("5. Suppression du profil utilisateur...");
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('user_id', userId);
        
        if (profileError) {
          console.warn("Erreur lors de la suppression du profil:", profileError);
        }
      } catch (error) {
        console.warn("Exception lors de la suppression du profil:", error);
      }

      // 6. Supprimer les paramètres utilisateur
      try {
        console.log("6. Suppression des paramètres utilisateur...");
        const { error: settingsError } = await supabaseAdmin
          .from('user_settings')
          .delete()
          .eq('id', userId);
        
        if (settingsError) {
          console.warn("Erreur lors de la suppression des paramètres:", settingsError);
        }
      } catch (error) {
        console.warn("Exception lors de la suppression des paramètres:", error);
      }

      // Finalement, supprimer l'utilisateur
      console.log("7. Suppression de l'utilisateur dans auth.users...");
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (error) throw error;

      toast({
        title: "Succès",
        description: "L'utilisateur a été supprimé avec succès",
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
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
      console.error('Erreur lors de la récupération des entreprises:', error);
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
      console.error('Erreur lors de la création de l\'entreprise:', error);
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
      console.error('Erreur lors de la mise à jour de l\'entreprise:', error);
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
      // Vérifier d'abord si l'entreprise est utilisée par des intervenants
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', id);

      if (usersError) throw usersError;
      
      if (users && users.length > 0) {
        throw new Error(`Impossible de supprimer cette entreprise car elle est utilisée par ${users.length} intervenant(s).`);
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
      console.error('Erreur lors de la suppression de l\'entreprise:', error);
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
        
        console.log(`Bucket de stockage "${bucketName}" créé avec succès`);
      }
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la création du bucket "${bucketName}":`, error);
      return false;
    }
  }, []);

  /**
   * Récupère tous les groupes de travail
   */
  const getWorkGroups = useCallback(async (): Promise<{ workgroups: WorkGroup[] } | null> => {
    try {
      console.log('Début de récupération des groupes de travail');
      
      // Vérifier d'abord si la table workgroups existe
      const { error: tableError } = await supabase
        .from('workgroups')
        .select('id')
        .limit(1);
        
      if (tableError) {
        console.error('Erreur de vérification de la table workgroups:', tableError);
        return { workgroups: [] }; // Retourner un tableau vide si la table n'existe pas
      }
      
      const { data, error } = await supabase
        .from('workgroups')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erreur Supabase lors de la récupération des groupes:', error);
        throw error;
      }

      console.log(`${data?.length || 0} groupes de travail récupérés`);
      return { workgroups: data as WorkGroup[] };
    } catch (error) {
      console.error('Erreur détaillée lors de la récupération des groupes de travail:', error);
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
      console.error('Erreur lors de la création du groupe de travail:', error);
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
      console.error('Erreur lors de la mise à jour du groupe de travail:', error);
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
      console.error('Erreur lors de la suppression du groupe de travail:', error);
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
      console.error(`Erreur lors de la récupération des membres du groupe ${workgroupId}:`, error);
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
      // Utilisation de la fonction RPC définie dans le SQL
      const { data, error } = await supabase
        .rpc('add_members_to_workgroup', { 
          p_workgroup_id: workgroupId, 
          p_user_ids: userIds 
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: "Membres ajoutés au groupe de travail",
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'ajout des membres au groupe:', error);
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
      console.error('Erreur lors du retrait du membre du groupe:', error);
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
      console.error(`Erreur lors de la récupération des projets du groupe ${workgroupId}:`, error);
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
      console.error('Erreur lors de l\'ajout du projet au groupe:', error);
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
      console.error('Erreur lors du retrait du projet du groupe:', error);
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
      console.error(`Erreur lors du téléchargement du fichier vers ${bucketName}:`, error);
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
      console.error(`Erreur lors de la récupération de l'URL du fichier depuis ${bucketName}:`, error);
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