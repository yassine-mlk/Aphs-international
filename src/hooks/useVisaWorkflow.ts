import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useToast } from '@/components/ui/use-toast';
import { VisaInstance, VisaStep, OpinionType, VisaStatus } from '@/types/visa';

export function useVisaWorkflow() {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Démarrer un circuit de visa
  const startVisa = useCallback(async (
    submissionId: string,
    circuitId: string,
    emittedBy: string,
    emittedByRole: string
  ): Promise<{ success: boolean; instanceId?: string; error?: string }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-visa', {
        body: {
          submission_id: submissionId,
          circuit_id: circuitId,
          emitted_by: emittedBy,
          emitted_by_role: emittedByRole,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erreur inconnue');

      toast({ title: 'Succès', description: 'Circuit de visa démarré' });
      return { success: true, instanceId: data.instance_id };
    } catch (err) {
      console.error('Erreur startVisa:', err);
      toast({ title: 'Erreur', description: 'Impossible de démarrer le visa', variant: 'destructive' });
      return { success: false, error: (err as Error).message };
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  // Soumettre un avis + visa
  const submitOpinion = useCallback(async (
    stepId: string,
    opinion: OpinionType,
    visaStatus: VisaStatus,
    comments: string,
    actorId: string,
    actorRole: string
  ): Promise<{ success: boolean; action?: string; message?: string; error?: string }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-opinion', {
        body: {
          step_id: stepId,
          opinion,
          visa_status: visaStatus,
          comments,
          actor_id: actorId,
          actor_role: actorRole,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erreur inconnue');

      const statusLabels: Record<string, string> = {
        completed: 'Document validé',
        completed_with_obs: 'Validé avec observations',
        next_step: 'Passé à l\'étape suivante',
        next_step_with_obs: 'Passé avec observations',
        returned: 'Document refusé - retour à l\'émetteur',
      };

      toast({
        title: statusLabels[data.action] || 'Opinion enregistrée',
        description: data.message,
      });

      return {
        success: true,
        action: data.action,
        message: data.message,
      };
    } catch (err) {
      console.error('Erreur submitOpinion:', err);
      toast({ title: 'Erreur', description: 'Impossible de soumettre l\'avis', variant: 'destructive' });
      return { success: false, error: (err as Error).message };
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  // Resoumettre après VAR
  const resubmitDocument = useCallback(async (
    instanceId: string,
    newFileUrl: string,
    newFileName: string,
    submittedBy: string
  ): Promise<{ success: boolean; newInstanceId?: string; versionIndex?: string; error?: string }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('resubmit-document', {
        body: {
          instance_id: instanceId,
          new_file_url: newFileUrl,
          new_file_name: newFileName,
          submitted_by: submittedBy,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erreur inconnue');

      toast({
        title: 'Succès',
        description: `Document resoumis - Version ${data.version_index}`,
      });

      return {
        success: true,
        newInstanceId: data.new_instance_id,
        versionIndex: data.version_index,
      };
    } catch (err) {
      console.error('Erreur resubmitDocument:', err);
      toast({ title: 'Erreur', description: 'Impossible de resoumettre', variant: 'destructive' });
      return { success: false, error: (err as Error).message };
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  return {
    loading,
    startVisa,
    submitOpinion,
    resubmitDocument,
  };
}
