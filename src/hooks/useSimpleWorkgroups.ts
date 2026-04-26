import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Types ultra-simples
export interface SimpleWorkgroup {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  created_at: string;
  creator_email: string;
  member_count: number;
}

export interface SimpleWorkgroupMember {
  id: string;
  workgroup_id: string;
  user_id: string;
  joined_at: string;
  group_name: string;
  user_email: string;
}

export const useSimpleWorkgroups = () => {
  const { status } = useAuth();
  const [workgroups, setWorkgroups] = useState<SimpleWorkgroup[]>([]);
  const [members, setMembers] = useState<SimpleWorkgroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les groupes
  const loadWorkgroups = useCallback(async () => {
    if (status !== 'authenticated') return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workgroups_simple')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkgroups(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [status]);

  // Charger les membres
  const loadMembers = useCallback(async () => {
    if (status !== 'authenticated') return;
    try {
      const { data, error } = await supabase
        .from('workgroup_members_simple')
        .select('*');

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
    }
  }, [status]);

  // Créer un groupe
  const createGroup = useCallback(async (name: string, description?: string) => {
    if (status !== 'authenticated') throw new Error('Non authentifié');
    setError(null);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Pas connecté');

      const { data, error } = await supabase.rpc('create_simple_workgroup', {
        group_name: name,
        creator_user_id: user.user.id,
        group_description: description
      });

      if (error) throw error;
      
      await loadWorkgroups();
      await loadMembers();
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création');
      throw err;
    }
  }, [status, loadWorkgroups, loadMembers]);

  // Ajouter un membre
  const addMember = useCallback(async (groupId: string, userId: string) => {
    if (status !== 'authenticated') return;
    setError(null);
    try {
      const { data, error } = await supabase.rpc('add_user_to_workgroup', {
        group_id: groupId,
        user_id: userId
      });

      if (error) throw error;
      if (!data) throw new Error('Échec ajout membre');
      
      await loadMembers();
      await loadWorkgroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur ajout');
      throw err;
    }
  }, [status, loadMembers, loadWorkgroups]);

  // Retirer un membre
  const removeMember = useCallback(async (groupId: string, userId: string) => {
    if (status !== 'authenticated') return;
    setError(null);
    try {
      const { data, error } = await supabase.rpc('remove_user_from_workgroup', {
        group_id: groupId,
        user_id: userId
      });

      if (error) throw error;
      if (!data) throw new Error('Échec retrait membre');
      
      await loadMembers();
      await loadWorkgroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur retrait');
      throw err;
    }
  }, [status, loadMembers, loadWorkgroups]);

  // Supprimer un groupe
  const deleteGroup = useCallback(async (groupId: string) => {
    if (status !== 'authenticated') return;
    setError(null);
    try {
      // 1. D'abord supprimer la conversation associée au workgroup si elle existe
      const { data: convData } = await supabase
        .from('conversations')
        .select('id')
        .eq('workgroup_id', groupId)
        .eq('type', 'workgroup')
        .maybeSingle();

      if (convData) {
        await supabase
          .from('conversations')
          .delete()
          .eq('id', convData.id);
      }

      // 2. Supprimer le workgroup
      const { error } = await supabase
        .from('workgroups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      
      await loadWorkgroups();
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression');
      throw err;
    }
  }, [status, loadWorkgroups, loadMembers]);

  // Obtenir les membres d'un groupe
  const getGroupMembers = useCallback((groupId: string) => {
    return members.filter(m => m.workgroup_id === groupId);
  }, [members]);

  // Charger au démarrage
  useEffect(() => {
    if (status === 'authenticated') {
      loadWorkgroups();
      loadMembers();
    }
  }, [status, loadWorkgroups, loadMembers]);

  return {
    workgroups,
    members,
    loading,
    error,
    createGroup,
    addMember,
    removeMember,
    deleteGroup,
    getGroupMembers,
    reload: () => {
      loadWorkgroups();
      loadMembers();
    }
  };
}; 