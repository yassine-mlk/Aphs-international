import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useToast } from '@/components/ui/use-toast';
import { TaskSubmission, VisaInstance, VisaStep } from '@/types/visa';

export function useTaskSubmissions(assignmentId: string | null) {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [instances, setInstances] = useState<Record<string, VisaInstance>>({});
  const [steps, setSteps] = useState<Record<string, VisaStep[]>>({});
  const [loading, setLoading] = useState(false);

  // Récupérer l'historique des soumissions
  const fetchSubmissions = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('occurrence_number', { ascending: true })
        .order('version_index', { ascending: true });

      if (error) throw error;
      setSubmissions(data || []);

      // Récupérer les instances associées
      const instanceIds = (data || []).filter(s => s.visa_instance_id).map(s => s.visa_instance_id);
      if (instanceIds.length > 0) {
        const { data: instancesData } = await supabase
          .from('visa_instances')
          .select('*, steps:visa_steps(*)')
          .in('id', instanceIds);

        const instancesMap: Record<string, VisaInstance> = {};
        const stepsMap: Record<string, VisaStep[]> = {};

        (instancesData || []).forEach((inst: any) => {
          instancesMap[inst.id] = inst;
          stepsMap[inst.id] = inst.steps || [];
        });

        setInstances(instancesMap);
        setSteps(stepsMap);
      }
    } catch (err) {
      console.error('Erreur fetchSubmissions:', err);
      toast({ title: 'Erreur', description: 'Impossible de charger l\'historique', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [assignmentId, supabase, toast]);

  // Soumettre un fichier (nouvelle version)
  const submitFile = useCallback(async (
    fileUrl: string,
    fileName: string,
    submittedBy: string,
    occurrenceNumber: number = 1,
    periodLabel?: string
  ): Promise<{ success: boolean; submissionId?: string; error?: string }> => {
    if (!assignmentId) return { success: false, error: 'Assignment ID manquant' };

    setLoading(true);
    try {
      // Récupérer la dernière version pour incrémenter
      const { data: lastSub } = await supabase
        .from('task_submissions')
        .select('version_index')
        .eq('assignment_id', assignmentId)
        .eq('occurrence_number', occurrenceNumber)
        .order('version_index', { ascending: false })
        .limit(1)
        .single();

      const lastVersion = lastSub?.version_index || '-1';
      const newVersion = (parseInt(lastVersion) + 1).toString();

      const { data, error } = await supabase
        .from('task_submissions')
        .insert({
          assignment_id: assignmentId,
          occurrence_number: occurrenceNumber,
          period_label: periodLabel,
          version_index: newVersion,
          file_url: fileUrl,
          file_name: fileName,
          submitted_by: submittedBy,
          simple_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Succès', description: `Version ${newVersion} soumise` });
      await fetchSubmissions();
      return { success: true, submissionId: data.id };
    } catch (err) {
      console.error('Erreur submitFile:', err);
      toast({ title: 'Erreur', description: 'Impossible de soumettre', variant: 'destructive' });
      return { success: false, error: (err as Error).message };
    } finally {
      setLoading(false);
    }
  }, [assignmentId, supabase, toast, fetchSubmissions]);

  // Valider une soumission simple (pas de circuit visa)
  const validateSubmission = useCallback(async (
    submissionId: string,
    status: 'validated' | 'refused',
    comments: string,
    validatorId: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('task_submissions')
        .update({
          simple_status: status,
          simple_validated_by: validatorId,
          simple_validated_at: new Date().toISOString(),
          simple_comments: comments,
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: status === 'validated' ? 'Validé' : 'Refusé',
        description: comments || 'Sans commentaire',
      });

      await fetchSubmissions();
      return true;
    } catch (err) {
      console.error('Erreur validateSubmission:', err);
      toast({ title: 'Erreur', description: 'Impossible de valider', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, toast, fetchSubmissions]);

  return {
    submissions,
    instances,
    steps,
    loading,
    fetchSubmissions,
    submitFile,
    validateSubmission,
  };
}
