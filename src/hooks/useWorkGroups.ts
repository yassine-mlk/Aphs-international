import { useCallback, useState, useEffect } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
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
  const { user, status } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [workGroups, setWorkGroups] = useState<WorkGroupWithMessaging[]>([]);

  // Récupérer tous les groupes de travail (version simple)
  const fetchWorkGroups = useCallback(async () => {
    if (status !== 'authenticated' || !user) return;
    
    try {
      setLoading(true);
      
      const rpcParams: { p_user_id: string; p_tenant_id?: string } = { p_user_id: user.id };
      if (tenant?.id) rpcParams.p_tenant_id = tenant.id;
      const { data: workgroupsData, error: workgroupsError } = await supabase
        .rpc('get_user_workgroups_simple', rpcParams);
      console.log("get_user_workgroups_simple response:", JSON.stringify(workgroupsData), workgroupsError);

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
  }, [status, user, supabase, tenant?.id]);

  // Charger les groupes au montage
  useEffect(() => {
    if (status === 'authenticated') {
      fetchWorkGroups();
    }
  }, [fetchWorkGroups, status]);

  // Récupérer les utilisateurs disponibles (filtrés par tenant)
  const getAvailableUsers = useCallback(async (): Promise<AvailableUser[]> => {
    try {
      if (status !== 'authenticated' || !user?.id || !tenant?.id) return [];

      // Récupérer les membres actifs du tenant, hors admins
      const { data: members, error: membersError } = await supabase
        .from('tenant_members')
        .select('user_id, role')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .neq('role', 'admin');

      if (membersError || !members || members.length === 0) return [];

      const memberIds = members.map(m => m.user_id);

      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, specialty, status')
        .in('user_id', memberIds)
        .eq('status', 'active');

      if (error) throw error;

      // Fusionner les rôles depuis tenant_members
      const roleMap = new Map(members.map(m => [m.user_id, m.role]));

      const availableUsers: AvailableUser[] = (profilesData || []).map(profile => ({
        id: profile.user_id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        name: profile.first_name && profile.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile.email,
        role: roleMap.get(profile.user_id) || 'intervenant',
        specialty: profile.specialty || '',
        status: profile.status
      }));

      return availableUsers;
      
    } catch (error) {
      console.error('Error in getAvailableUsers:', error);
      return [];
    }
  }, [status, supabase, user?.id, tenant?.id]);

  // Créer un groupe de travail (version corrigée)
  const createWorkGroup = useCallback(async (
    name: string,
    description?: string,
    initialMemberIds: string[] = []
  ): Promise<string | null> => {
    if (status !== 'authenticated' || !user) return null;
    
    try {
      setLoading(true);

      const { data: workgroupId, error: workgroupError } = await supabase
        .rpc('create_workgroup_simple', {
          p_name: name,
          p_description: description || '',
          p_creator_id: user.id
        });

      if (workgroupError) {
        console.error("create_workgroup_simple RPC error:", workgroupError);
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
      console.error("createWorkGroup caught error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le groupe de travail",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [status, user, supabase, toast, fetchWorkGroups]);

  // Mettre à jour un groupe de travail
  const updateWorkGroup = useCallback(async (
    workgroupId: string,
    updateData: {
      name?: string;
      description?: string;
      status?: 'active' | 'inactive';
    }
  ): Promise<boolean> => {
    if (status !== 'authenticated') return false;
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
  }, [status, supabase, toast, fetchWorkGroups]);

  // Supprimer un groupe de travail
  const deleteWorkGroup = useCallback(async (workgroupId: string): Promise<boolean> => {
    if (status !== 'authenticated') return false;
    try {
      setLoading(true);

      const { error } = await supabase
        .rpc('delete_workgroup', { p_workgroup_id: workgroupId });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Groupe de travail supprimé",
      });

      await fetchWorkGroups();
      return true;
    } catch (error) {
      console.error("deleteWorkGroup error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le groupe",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [status, supabase, toast, fetchWorkGroups]);

  // Ajouter des membres à un groupe (corrigé)
  const addMembersToWorkGroup = useCallback(async (
    workgroupId: string,
    userIds: string[]
  ): Promise<boolean> => {
    if (status !== 'authenticated') return false;
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
  }, [status, supabase, toast, fetchWorkGroups]);

  // Supprimer un membre d'un groupe
  const removeMemberFromWorkGroup = useCallback(async (
    memberId: string
  ): Promise<boolean> => {
    if (status !== 'authenticated') return false;
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
  }, [status, supabase, toast, fetchWorkGroups]);

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
