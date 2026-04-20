import { useCallback, useState } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

// Types simplifiés pour les groupes de travail
export interface WorkGroupWithMessaging {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  created_by: string;
  created_at: string;
  updated_at: string;
  members: WorkGroupMember[];
  projects: WorkGroupProject[]; // Gardé pour compatibilité mais sera vide
  conversation?: WorkGroupConversation;
  unreadCount?: number;
}

export interface WorkGroupMember {
  id: string;
  workgroup_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    role: string;
    specialty?: string;
    company?: string;
  };
}

export interface WorkGroupProject {
  id: string;
  workgroup_id: string;
  project_name: string;
  created_at: string;
}

export interface WorkGroupConversation {
  id: string;
  type: 'workgroup';
  name?: string;
  workgroup_id: string;
  created_at: string;
  updated_at: string;
  lastMessage?: {
    id: string;
    content: string;
    sender_name: string;
    created_at: string;
  };
}

// Interface pour les utilisateurs disponibles (depuis profiles)
export interface AvailableUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  name: string;
  role: string;
  specialty?: string;
  status: string;
}

export function useWorkGroups() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(false);

  // Récupérer les utilisateurs disponibles directement depuis profiles (filtrés par tenant)
  const getAvailableUsers = useCallback(async (): Promise<AvailableUser[]> => {
    try {
      if (!user?.id) return [];

      // Récupérer le tenant_id de l'utilisateur connecté
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let query = supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, role, specialty, status')
        .eq('status', 'active')
        .neq('role', 'admin')
        .neq('is_super_admin', true);

      if (myProfile?.tenant_id) {
        query = query.eq('tenant_id', myProfile.tenant_id);
      }

      const { data: profilesData, error } = await query;

      if (error) {
        console.error('❌ Erreur profiles:', error);
        throw error;
      }

      const availableUsers: AvailableUser[] = (profilesData || []).map(profile => ({
        id: profile.user_id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        name: profile.first_name && profile.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile.email,
        role: profile.role,
        specialty: profile.specialty || '',
        status: profile.status
      }));

      return availableUsers;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', error);
      return [];
    }
  }, [supabase, user?.id]);

  // Récupérer tous les groupes de travail (version simple)
  const getWorkGroupsWithMessaging = useCallback(async (): Promise<WorkGroupWithMessaging[]> => {
    if (!user) return [];
    
    try {
      setLoading(true);
      
      console.log('🔍 Récupération des workgroups pour user:', user.id);
      
      // Utiliser la nouvelle fonction RPC simplifiée
      const { data: workgroupsData, error: workgroupsError } = await supabase
        .rpc('get_user_workgroups_simple', { p_user_id: user.id });

      if (workgroupsError) {
        console.error('❌ Erreur workgroups RPC:', workgroupsError);
        throw workgroupsError;
      }

      if (!workgroupsData || workgroupsData.length === 0) {
        console.log('📭 Aucun workgroup trouvé');
        return [];
      }

      console.log('📊 Workgroups trouvés:', workgroupsData.length);

      // Pour chaque groupe, récupérer les membres avec leurs profils
      const workgroupsWithDetails = await Promise.all(
        workgroupsData.map(async (wg: any) => {
          console.log(`🔍 Traitement du groupe "${wg.workgroup_name}" (ID: ${wg.workgroup_id})`);
          
          // Récupérer les membres
          const { data: membersData, error: membersError } = await supabase
            .from('workgroup_members')
            .select('id, workgroup_id, user_id, role, joined_at')
            .eq('workgroup_id', wg.workgroup_id);

          if (membersError) {
            console.error('❌ Erreur membres:', membersError);
          }

          console.log(`👥 Membres trouvés pour "${wg.workgroup_name}":`, membersData?.length || 0);

          // Pour chaque membre, récupérer son profil
          const members: WorkGroupMember[] = [];
          if (membersData && membersData.length > 0) {
            for (const member of membersData) {
              // Récupérer le profil de cet utilisateur
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('user_id, first_name, last_name, email, specialty, company, role')
                .eq('user_id', member.user_id)
                .single();

              if (profileError) {
                console.warn(`⚠️ Pas de profil trouvé pour user_id: ${member.user_id}`, profileError);
              }

              console.log(`👤 Membre ${member.user_id}:`, profileData ? 
                `${profileData.first_name} ${profileData.last_name}` : 'PROFIL MANQUANT');

              members.push({
                id: member.id,
                workgroup_id: member.workgroup_id,
                user_id: member.user_id,
                role: member.role,
                joined_at: member.joined_at,
                user: profileData ? {
                  id: profileData.user_id,
                  email: profileData.email,
                  first_name: profileData.first_name,
                  last_name: profileData.last_name,
                  name: profileData.first_name && profileData.last_name 
                    ? `${profileData.first_name} ${profileData.last_name}`
                    : profileData.email,
                  role: profileData.role,
                  specialty: profileData.specialty,
                  company: profileData.company
                } : undefined
              });
            }
          }

          return {
            id: wg.workgroup_id,
            name: wg.workgroup_name,
            description: wg.workgroup_description,
            status: wg.workgroup_status,
            created_by: wg.created_by || '',
            created_at: wg.workgroup_created_at,
            updated_at: wg.workgroup_updated_at,
            members,
            projects: [], // Pas de projets dans la version simple
            conversation: undefined, // Pas de conversation pour l'instant
            unreadCount: 0
          };
        })
      );

      console.log('✅ Workgroups avec détails formatés:', workgroupsWithDetails.length);
      return workgroupsWithDetails;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des groupes de travail:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Créer un groupe de travail (version corrigée)
  const createWorkGroupWithMessaging = useCallback(async (
    workgroupData: {
      name: string;
      description?: string;
      status?: 'active' | 'inactive';
      memberIds?: string[];
    }
  ): Promise<WorkGroupWithMessaging | null> => {
    if (!user) return null;
    
    try {
      setLoading(true);

      console.log('🚀 Début création workgroup:', {
        name: workgroupData.name,
        creator: user.id,
        memberIds: workgroupData.memberIds,
        memberCount: workgroupData.memberIds?.length || 0
      });

      // Log simple des IDs membres (sans validation pour éviter les problèmes de permissions)
      if (workgroupData.memberIds && workgroupData.memberIds.length > 0) {
        console.log('👥 IDs membres à ajouter:', workgroupData.memberIds);
      }

      // Créer le groupe de travail avec la fonction RPC
      const { data: workgroupId, error: workgroupError } = await supabase
        .rpc('create_workgroup_simple', {
          p_name: workgroupData.name,
          p_description: workgroupData.description || '',
          p_creator_id: user.id,
          p_status: workgroupData.status || 'active'
        });

      if (workgroupError) {
        console.error('❌ Erreur création workgroup:', workgroupError);
        throw workgroupError;
      }

      console.log('✅ Workgroup créé avec ID:', workgroupId);

      // Ajouter des membres si spécifiés
      if (workgroupData.memberIds && workgroupData.memberIds.length > 0) {
        console.log('👥 Ajout de', workgroupData.memberIds.length, 'membres...');
        console.log('🔧 Appel add_members_to_workgroup avec:', {
          p_workgroup_id: workgroupId,
          p_user_ids: workgroupData.memberIds,
          user_ids_array: workgroupData.memberIds.map(id => `'${id}'`).join(', ')
        });
        
        const { data: addResult, error: membersError } = await supabase
          .rpc('add_members_to_workgroup', {
            p_workgroup_id: workgroupId,
            p_user_ids: workgroupData.memberIds
          });

        console.log('📋 Résultat add_members_to_workgroup:', { addResult, membersError });

        if (membersError) {
          console.error('❌ Erreur lors de l\'ajout des membres:', membersError);
          toast({
            title: "Attention",
            description: "Groupe créé mais erreur lors de l'ajout des membres",
            variant: "destructive",
          });
        } else if (addResult && addResult.length > 0) {
          const result = addResult[0];
          console.log('✅ Résultat détaillé add_members:', {
            success: result.success,
            added_count: result.added_count,
            skipped_count: result.skipped_count,
            message: result.error_message
          });
          
          if (!result.success) {
            console.error('❌ La fonction a échoué:', result.error_message);
            toast({
              title: "Attention",
              description: `Erreur ajout membres: ${result.error_message}`,
              variant: "destructive",
            });
          } else if (result.added_count === 0) {
            console.warn('⚠️ Aucun membre ajouté:', result.error_message);
            toast({
              title: "Information",
              description: "Groupe créé mais aucun membre ajouté",
            });
          } else {
            console.log(`✅ ${result.added_count} membres ajoutés avec succès!`);
            toast({
              title: "Succès",
              description: `Groupe créé avec ${result.added_count} membre(s)`,
            });
          }
        }
      } else {
        console.log('⚠️ Aucun membre à ajouter');
        toast({
          title: "Succès",
          description: "Groupe de travail créé avec succès",
        });
      }

      // Retourner le groupe créé (simplifié)
      return {
        id: workgroupId,
        name: workgroupData.name,
        description: workgroupData.description,
        status: workgroupData.status || 'active',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        members: [],
        projects: [],
        conversation: undefined,
        unreadCount: 0
      };
    } catch (error) {
      console.error('❌ Erreur lors de la création du groupe:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le groupe de travail",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Mettre à jour un groupe de travail
  const updateWorkGroup = useCallback(async (
    workgroupId: string,
    updateData: {
      name?: string;
      description?: string;
      status?: 'active' | 'inactive';
    }
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('workgroups')
        .update(updateData)
        .eq('id', workgroupId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Groupe de travail mis à jour",
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le groupe",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  // Supprimer un groupe de travail
  const deleteWorkGroup = useCallback(async (workgroupId: string): Promise<boolean> => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('workgroups')
        .delete()
        .eq('id', workgroupId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le groupe",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  // Ajouter des membres à un groupe (corrigé)
  const addMembersToWorkGroup = useCallback(async (
    workgroupId: string,
    userIds: string[]
  ): Promise<boolean> => {
    try {
      setLoading(true);

      console.log('👥 Ajout membres avec IDs:', userIds);

      const { data: result, error } = await supabase
        .rpc('add_members_to_workgroup', {
          p_workgroup_id: workgroupId,
          p_user_ids: userIds
        });

      if (error) throw error;

      console.log('📋 Résultat ajout membres:', result);

      toast({
        title: "Succès",
        description: "Membres ajoutés au groupe",
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'ajout des membres:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les membres",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  // Supprimer un membre d'un groupe
  const removeMemberFromWorkGroup = useCallback(async (
    memberId: string
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const { error } = await supabase
        .rpc('remove_member_from_workgroup', {
          p_member_id: memberId
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du membre:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le membre",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  // Ajouter un projet à un groupe (placeholder)
  const addProjectToWorkGroup = useCallback(async (
    workgroupId: string,
    projectName: string
  ): Promise<boolean> => {
    // TODO: Implémenter quand les projets seront supportés
    console.log('addProjectToWorkGroup not implemented yet');
    return false;
  }, []);

  // Supprimer un projet d'un groupe (placeholder)
  const removeProjectFromWorkGroup = useCallback(async (
    projectId: string
  ): Promise<boolean> => {
    // TODO: Implémenter quand les projets seront supportés
    console.log('removeProjectFromWorkGroup not implemented yet');
    return false;
  }, []);

  return {
    getWorkGroupsWithMessaging,
    createWorkGroupWithMessaging,
    updateWorkGroup,
    deleteWorkGroup,
    addMembersToWorkGroup,
    removeMemberFromWorkGroup,
    addProjectToWorkGroup,
    removeProjectFromWorkGroup,
    getAvailableUsers, // Nouvelle fonction pour récupérer les utilisateurs
    loading
  };
} 