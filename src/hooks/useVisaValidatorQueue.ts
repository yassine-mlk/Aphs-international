import { useState, useCallback, useEffect } from 'react';
import { useSupabase } from './useSupabase';
import { useToast } from '@/components/ui/use-toast';
import { VisaValidatorQueue, VisaStep } from '@/types/visa';

export function useVisaValidatorQueue(validatorId: string | null) {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [queue, setQueue] = useState<VisaValidatorQueue[]>([]);
  const [loading, setLoading] = useState(false);

  // Récupérer la file d'attente du validateur
  const fetchQueue = useCallback(async () => {
    if (!validatorId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visa_validator_queue')
        .select('*')
        .eq('validator_user_id', validatorId)
        .order('deadline_at', { ascending: true });

      if (error) throw error;
      setQueue(data || []);
    } catch (err) {
      console.error('Erreur fetchQueue:', err);
      toast({ title: 'Erreur', description: 'Impossible de charger la file', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [validatorId, supabase, toast]);

  // Récupérer les détails d'un step
  const getStepDetails = useCallback(async (stepId: string): Promise<{ step: VisaStep | null; instance: any | null }> => {
    try {
      const { data: step, error: stepError } = await supabase
        .from('visa_steps')
        .select('*, instance:visa_instances(*, circuit:visa_circuits(*), submission:task_submissions(*))')
        .eq('id', stepId)
        .single();

      if (stepError) throw stepError;
      return { step, instance: step?.instance || null };
    } catch (err) {
      console.error('Erreur getStepDetails:', err);
      return { step: null, instance: null };
    }
  }, [supabase]);

  // Marquer comme vu
  const markAsViewed = useCallback(async (stepId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('visa_steps')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', stepId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Erreur markAsViewed:', err);
      return false;
    }
  }, [supabase]);

  // Souscription temps réel
  useEffect(() => {
    if (!validatorId) return;

    fetchQueue();

    const subscription = supabase
      .channel('visa_steps_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visa_steps',
          filter: `validator_user_id=eq.${validatorId}`,
        },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [validatorId, supabase, fetchQueue]);

  return {
    queue,
    loading,
    fetchQueue,
    getStepDetails,
    markAsViewed,
  };
}
