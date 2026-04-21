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
      // Requête simple sans jointures complexes
      let query = supabase
        .from('visa_instances')
        .select('*');
      
      // Filtrer par projet si spécifié
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data: instancesData, error: instancesError } = await query
        .order('created_at', { ascending: false });
      
      if (instancesError) throw instancesError;
      
      // Récupérer les infos des circuits et projets séparément
      const circuitIds = [...new Set(instancesData?.map(i => i.circuit_id) || [])];
      const projectIds = [...new Set(instancesData?.map(i => i.project_id) || [])];
      const submissionIds = [...new Set(instancesData?.map(i => i.submission_id).filter(Boolean) || [])];
      const emitterIds = [...new Set(instancesData?.map(i => i.emitted_by).filter(Boolean) || [])];
      
      // Fetch circuits
      const { data: circuitsData } = await supabase
        .from('visa_circuits')
        .select('id, name')
        .in('id', circuitIds);
      
      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);
      
      // Fetch submissions
      const { data: submissionsData } = await supabase
        .from('task_submissions')
        .select('id, file_name, submitted_by, submitted_at')
        .in('id', submissionIds);
      
      // Fetch emitters (profiles)
      const { data: emittersData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', emitterIds);
      
      // Maps pour lookup rapide
      const circuitsMap = new Map(circuitsData?.map(c => [c.id, c]) || []);
      const projectsMap = new Map(projectsData?.map(p => [p.id, p]) || []);
      const submissionsMap = new Map(submissionsData?.map(s => [s.id, s]) || []);
      const emittersMap = new Map(emittersData?.map(e => [e.id, e]) || []);
      
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
      const enriched: EnrichedInstance[] = (instancesData || []).map(instance => {
        const circuit = circuitsMap.get(instance.circuit_id) as { name: string } | undefined;
        const project = projectsMap.get(instance.project_id) as { name: string } | undefined;
        const submission = instance.submission_id ? submissionsMap.get(instance.submission_id) as { file_name: string } | undefined : null;
        const emitter = instance.emitted_by ? emittersMap.get(instance.emitted_by) as { first_name: string; last_name: string } | undefined : null;
        
        return {
          ...instance,
          project_name: project?.name || 'Projet inconnu',
          circuit_name: circuit?.name || 'Circuit inconnu',
          file_name: submission?.file_name || 'Document sans nom',
          emitted_by_name: emitter 
            ? `${emitter.first_name} ${emitter.last_name}`
            : undefined,
          steps: stepsData.filter(s => s.instance_id === instance.id),
        };
      });
      
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
