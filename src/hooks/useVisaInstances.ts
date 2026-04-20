import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { VisaInstance, VisaStep, TaskSubmission } from '@/types/visa';

interface EnrichedInstance extends VisaInstance {
  project_name: string;
  circuit_name: string;
  file_name: string;
  emitted_by_name?: string;
  steps: VisaStep[];
  submissions?: TaskSubmission[];
}

export const useVisaInstances = (projectId?: string) => {
  const [instances, setInstances] = useState<EnrichedInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInstances = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Construire la requête de base
      let query = supabase
        .from('visa_instances')
        .select(`
          *,
          project:projects(name),
          circuit:visa_circuits(name),
          submission:task_submissions(file_name, submitted_by, submitted_at),
          emitter:profiles(first_name, last_name)
        `);
      
      // Filtrer par projet si spécifié
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data: instancesData, error: instancesError } = await query
        .order('created_at', { ascending: false });
      
      if (instancesError) throw instancesError;
      
      // Récupérer les étapes pour chaque instance
      const instanceIds = instancesData?.map(i => i.id) || [];
      
      let stepsData: VisaStep[] = [];
      if (instanceIds.length > 0) {
        const { data: steps, error: stepsError } = await supabase
          .from('visa_steps')
          .select(`
            *,
            validator:profiles(first_name, last_name)
          `)
          .in('instance_id', instanceIds)
          .order('order_index', { ascending: true });
        
        if (!stepsError && steps) {
          stepsData = steps.map(s => ({
            ...s,
            validator_name: s.validator ? `${s.validator.first_name} ${s.validator.last_name}` : undefined
          }));
        }
      }
      
      // Enrichir les données
      const enriched: EnrichedInstance[] = (instancesData || []).map(instance => ({
        ...instance,
        project_name: instance.project?.name || 'Projet inconnu',
        circuit_name: instance.circuit?.name || 'Circuit inconnu',
        file_name: instance.submission?.file_name || 'Document sans nom',
        emitted_by_name: instance.emitter 
          ? `${instance.emitter.first_name} ${instance.emitter.last_name}`
          : undefined,
        steps: stepsData.filter(s => s.instance_id === instance.id),
      }));
      
      setInstances(enriched);
    } catch (err) {
      console.error('Erreur fetch visa instances:', err);
      setError('Impossible de charger les instances de validation');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  return {
    instances,
    loading,
    error,
    refresh: fetchInstances,
  };
};

export default useVisaInstances;
