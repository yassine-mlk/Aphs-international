import { useCallback, useState, useEffect } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

// Types simplifiés pour les groupes de travail
export interface WorkGroupWithMessaging {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  members: WorkGroupMember[];
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
  const [workGroups, setWorkGroups] = useState<WorkGroupWithMessaging[]>([]);

  // Récupérer tous les groupes de travail (version simple)
  const fetchWorkGroups = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Utiliser la nouvelle fonction RPC simplifiée
      const { data: workgroupsData, error: workgroupsError } = await supabase
        .rpc('get_user_workgroups_simple', { p_user_id: user.id });

      if (workgroupsError) {
        throw workgroupsError;
      }

      if (!workgroupsData || workgroupsData.length === 0) {
        setWorkGroups([]);
        return;
      }

      // Pour chaque groupe, récupérer les membres avec leurs profils
      const workgroupsWithDetails = await Promise.all(
        workgroupsData.map(async (wg: any) => {
          // Récupérer les membres
          const { data: membersData, error: membersError } = await supabase
            .from('workgroup_members')
            .select('id, workgroup_id, user_id, role, joined_at')
            .eq('workgroup_id', wg.workgroup_id);

          // Pour chaque membre, récupérer son profil
          const members: WorkGroupMember[] = [];
          if (membersData && membersData.length > 0) {
            for (const member of membersData) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('user_id, first_name, last_name, email, specialty, company, role')
                .eq('user_id', member.user_id)
                .single();

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
            projects: [],
            conversation: undefined,
            unreadCount: 0
          };
        })
      );

      setWorkGroups(workgroupsWithDetails);
    } catch (error) {
      console.error('Error fetching workgroups:', error);
      setWorkGroups([]);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Charger les groupes au montage
  useEffect(() => {
    fetchWorkGroups();
  }, [fetchWorkGroups]);

  // Récupérer les utilisateurs disponibles directement depuis profiles (filtrés par tenant)
  const getAvailableUsers = useCallback(async (): Promise<AvailableUser[]> => {
    try {
      if (!user?.id) return [];

      // Récupérer le tenant_id de l'utilisateur connecté
      const { data: myProfile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !myProfile?.tenant_id) {
        console.error("Impossible de récupérer le tenant_id de l'utilisateur");
        return [];
      }

      // Récupérer uniquement les membres du même tenant, hors admins (comme dans Intervenants.tsx)
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, role, specialty, status')
        .eq('tenant_id', myProfile.tenant_id)
        .eq('status', 'active')
        .neq('role', 'admin')
        .neq('is_super_admin', true);

      if (error) {
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
      console.error('Error in getAvailableUsers:', error);
      return [];
    }
  }, [supabase, user?.id]);

  // Créer un groupe de travail (version corrigée)
  const createWorkGroup = useCallback(async (
    name: string,
    description?: string,
    initialMemberIds: string[] = []
  ): Promise<string | null> => {
    if (!user) return null;
    
    try {
      setLoading(true);

      const { data: workgroupId, error: workgroupError } = await supabase
        .rpc('create_workgroup_simple', {
          p_name: name,
          p_description: description || '',
          p_creator_id: user.id
        });

      if (workgroupError) {
        throw workgroupError;
      }

      // Si des membres initiaux sont fournis, les ajouter
      if (initialMemberIds.length > 0) {
        const { error: membersError } = await supabase
          .rpc('add_members_to_workgroup', {
            p_workgroup_id: workgroupId,
            p_user_ids: initialMemberIds
          });
        
        if (membersError) {
          console.error("Erreur lors de l'ajout des membres initiaux:", membersError);
          // On ne bloque pas la création du groupe si l'ajout des membres échoue
        }
      }

      toast({
        title: "Succès",
        description: "Groupe de travail créé avec succès",
      });

      await fetchWorkGroups();
      return workgroupId;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le groupe de travail",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast, fetchWorkGroups]);

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

      await fetchWorkGroups();
      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le groupe",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, toast, fetchWorkGroups]);

  // Supprimer un groupe de travail
  const deleteWorkGroup = useCallback(async (workgroupId: string): Promise<boolean> => {
    try {
      setLoading(true);

      // 1. D'abord supprimer la conversation associée au workgroup si elle existe
      // pour s'assurer que les messages sont nettoyés (même si le cascade DB devrait le faire)
      const { data: convData } = await supabase
        .from('conversations')
        .select('id')
        .eq('workgroup_id', workgroupId)
        .eq('type', 'workgroup')
        .maybeSingle();

      if (convData) {
        await supabase
          .from('conversations')
          .delete()
          .eq('id', convData.id);
      }

      // 2. Supprimer le workgroup (ceci devrait aussi supprimer les membres via cascade)
      const { error } = await supabase
        .from('workgroups')
        .delete()
        .eq('id', workgroupId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Groupe de travail supprimé ainsi que sa conversation",
      });

      await fetchWorkGroups();
      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le groupe",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, toast, fetchWorkGroups]);

  // Ajouter des membres à un groupe (corrigé)
  const addMembersToWorkGroup = useCallback(async (
    workgroupId: string,
    userIds: string[]
  ): Promise<boolean> => {
    try {
      setLoading(true);

      const { error } = await supabase
        .rpc('add_members_to_workgroup', {
          p_workgroup_id: workgroupId,
          p_user_ids: userIds
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Membres ajoutés au groupe",
      });

      await fetchWorkGroups();
      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les membres",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, toast, fetchWorkGroups]);

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

      await fetchWorkGroups();
      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le membre",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, toast, fetchWorkGroups]);

  return {
    workGroups,
    fetchWorkGroups,
    createWorkGroup,
    updateWorkGroup,
    deleteWorkGroup,
    addMembersToWorkGroup,
    removeMemberFromWorkGroup,
    getAvailableUsers,
    loading
  };
} 