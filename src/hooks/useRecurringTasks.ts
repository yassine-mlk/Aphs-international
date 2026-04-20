import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useToast } from '@/components/ui/use-toast';
import { RecurringOccurrence } from '@/types/visa';

export function useRecurringTasks(projectId: string) {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [occurrences, setOccurrences] = useState<RecurringOccurrence[]>([]);
  const [loading, setLoading] = useState(false);

  // Récupérer les occurrences d'une tâche
  const fetchOccurrences = useCallback(async (assignmentId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recurring_occurrences')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('occurrence_number', { ascending: true });

      if (error) throw error;
      setOccurrences(data || []);
    } catch (err) {
      console.error('Erreur fetchOccurrences:', err);
      toast({ title: 'Erreur', description: 'Impossible de charger les occurrences', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  // Générer une nouvelle occurrence (bouton "Répéter la tâche")
  const generateNextOccurrence = useCallback(async (
    assignmentId: string,
    deadlineDays: number = 7
  ): Promise<{ success: boolean; occurrenceId?: string; occurrenceNumber?: number; error?: string }> => {
    setLoading(true);
    try {
      // Récupérer le dernier numéro
      const { data: lastOcc } = await supabase
        .from('recurring_occurrences')
        .select('occurrence_number')
        .eq('assignment_id', assignmentId)
        .order('occurrence_number', { ascending: false })
        .limit(1)
        .single();

      const nextNumber = (lastOcc?.occurrence_number || 0) + 1;

      // Calculer les dates
      const periodStart = new Date();
      const periodEnd = new Date(periodStart.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
      const deadlineAt = new Date(periodEnd);

      const { data, error } = await supabase
        .from('recurring_occurrences')
        .insert({
          assignment_id: assignmentId,
          occurrence_number: nextNumber,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          period_label: `S${nextNumber}`,
          status: 'en_attente',
          deadline_at: deadlineAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Succès', description: `Occurrence S${nextNumber} créée` });
      await fetchOccurrences(assignmentId);
      return { success: true, occurrenceId: data.id, occurrenceNumber: nextNumber };
    } catch (err) {
      console.error('Erreur generateNextOccurrence:', err);
      toast({ title: 'Erreur', description: 'Impossible de créer l\'occurrence', variant: 'destructive' });
      return { success: false, error: (err as Error).message };
    } finally {
      setLoading(false);
    }
  }, [supabase, toast, fetchOccurrences]);

  // Marquer une occurrence comme complétée
  const completeOccurrence = useCallback(async (
    occurrenceId: string,
    submissionId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('recurring_occurrences')
        .update({
          status: 'valide',
          submission_id: submissionId,
        })
        .eq('id', occurrenceId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Erreur completeOccurrence:', err);
      return false;
    }
  }, [supabase]);

  return {
    occurrences,
    loading,
    fetchOccurrences,
    generateNextOccurrence,
    completeOccurrence,
  };
}
