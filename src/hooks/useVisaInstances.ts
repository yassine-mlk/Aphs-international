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
      let circuitIdsForProject: string[] = [];
      
      // Si un projet est spécifié, récupérer d'abord les circuits de ce projet
      if (projectId) {
        const { data: projectCircuits } = await supabase
          .from('visa_circuits')
          .select('id')
          .eq('project_id', projectId);
        
        circuitIdsForProject = projectCircuits?.map(c => c.id) || [];
        
        // Si pas de circuits pour ce projet, retourner vide
        if (circuitIdsForProject.length === 0) {
          setInstances([]);
          setLoading(false);
          return;
        }
      }
      
      // Requête instances
      let query = supabase
        .from('visa_instances')
        .select('*');
      
      // Filtrer par circuits du projet si spécifié
      if (projectId && circuitIdsForProject.length > 0) {
        query = query.in('circuit_id', circuitIdsForProject);
      }
      
      const { data: instancesData, error: instancesError } = await query
        .order('created_at', { ascending: false });
      
      if (instancesError) throw instancesError;
      
      // Récupérer les infos des circuits et projets séparément
      const circuitIds = [...new Set(instancesData?.map(i => i.circuit_id) || [])];
      const submissionIds = [...new Set(instancesData?.map(i => i.submission_id).filter(Boolean) || [])];
      const emitterIds = [...new Set(instancesData?.map(i => i.emitted_by).filter(Boolean) || [])];
      
      // Fetch circuits (avec project_id pour enrichir)
      const { data: circuitsData } = await supabase
        .from('visa_circuits')
        .select('id, name, project_id')
        .in('id', circuitIds);
      
      // Récupérer les IDs de projets depuis les circuits
      const projectIds = [...new Set(circuitsData?.map(c => c.project_id) || [])];
      
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
        const circuit = circuitsMap.get(instance.circuit_id) as { name: string; project_id: string } | undefined;
        const project = circuit ? projectsMap.get(circuit.project_id) as { name: string } | undefined : undefined;
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
