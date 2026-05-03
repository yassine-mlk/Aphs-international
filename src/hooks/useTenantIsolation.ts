import { useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook pour gérer l'isolation des données par tenant
 * Toutes les requêtes sont automatiquement filtrées par tenant_id
 */
export function useTenantIsolation() {
  const { tenant, usage } = useTenant();
  const { status } = useAuth();

  const tenantId = tenant?.id;

  /**
   * Vérifie si le quota permet de créer un nouveau projet
   */
  const canCreateProject = useCallback((): boolean => {
    if (!tenant) return false;
    return usage.projects.used < usage.projects.limit;
  }, [tenant, usage.projects]);

  /**
   * Vérifie si le quota permet d'ajouter un nouvel intervenant
   */
  const canAddIntervenant = useCallback((): boolean => {
    if (!tenant) return false;
    return usage.intervenants.used < usage.intervenants.limit;
  }, [tenant, usage.intervenants]);

  /**
   * Vérifie si le quota de stockage permet un upload
   */
  const canUploadFile = useCallback((fileSizeBytes: number): boolean => {
    if (!tenant) return false;
    const newTotal = usage.storage.usedBytes + fileSizeBytes;
    return newTotal <= usage.storage.limitBytes;
  }, [tenant, usage.storage]);

  /**
   * Récupère les projets du tenant courant
   */
  const getProjects = useCallback(async () => {
    if (status !== 'authenticated' || !tenantId) return [];
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }, [tenantId]);

  /**
   * Crée un projet (avec vérification quota)
   */
  const createProject = useCallback(async (projectData: any) => {
    if (status !== 'authenticated' || !tenantId) throw new Error('No tenant selected or not authenticated');
    if (!canCreateProject()) throw new Error('Quota projets atteint');

    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...projectData,
        tenant_id: tenantId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, [tenantId, canCreateProject, status]);

  /**
   * Récupère les intervenants/membres du tenant courant
   */
  const getIntervenants = useCallback(async () => {
    if (status !== 'authenticated' || !tenantId) return { membres: [], tenantMembers: [] };
    
    // Combine membre table et tenant_members
    const [{ data: membres }, { data: tenantMembres }] = await Promise.all([
      supabase.from('membre').select('*').eq('tenant_id', tenantId),
      supabase.from('tenant_members').select('*, profiles:user_id(*)').eq('tenant_id', tenantId)
    ]);

    return {
      membres: membres || [],
      tenantMembers: tenantMembres || []
    };
  }, [tenantId, status]);

  /**
   * Ajoute un intervenant (avec vérification quota)
   */
  const addIntervenant = useCallback(async (intervenantData: any) => {
    if (status !== 'authenticated' || !tenantId) throw new Error('No tenant selected or not authenticated');
    if (!canAddIntervenant()) throw new Error('Quota intervenants atteint');

    const { data, error } = await supabase
      .from('membre')
      .insert({
        ...intervenantData,
        tenant_id: tenantId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, [tenantId, canAddIntervenant, status]);

  /**
   * Récupère les tâches du tenant courant via la vue
   */
  const getTasks = useCallback(async () => {
    if (status !== 'authenticated' || !tenantId) return [];
    
    const { data, error } = await supabase
      .from('task_assignments_view')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }, [tenantId, status]);

  /**
   * Crée une tâche (via la table tasks)
   */
  const createTask = useCallback(async (taskData: any) => {
    if (status !== 'authenticated' || !tenantId) throw new Error('No tenant selected or not authenticated');

    // On s'assure que le project_id est fourni
    if (!taskData.project_id) throw new Error('project_id is required');

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, [tenantId, status]);

  return {
    tenantId,
    tenant,
    usage,
    canCreateProject,
    canAddIntervenant,
    canUploadFile,
    getProjects,
    createProject,
    getIntervenants,
    addIntervenant,
    getTasks,
    createTask
  };
}
