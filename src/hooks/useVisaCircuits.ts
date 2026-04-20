import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useToast } from '@/components/ui/use-toast';
import { VisaCircuit, VisaCircuitStep } from '@/types/visa';

export function useVisaCircuits(projectId: string) {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [circuits, setCircuits] = useState<VisaCircuit[]>([]);
  const [loading, setLoading] = useState(false);

  // Récupérer les circuits du projet
  const fetchCircuits = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visa_circuits')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCircuits(data || []);
    } catch (err) {
      console.error('Erreur fetchCircuits:', err);
      toast({ title: 'Erreur', description: 'Impossible de charger les circuits', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase, toast]);

  // Créer un circuit
  const createCircuit = useCallback(async (
    name: string,
    documentType: string,
    steps: VisaCircuitStep[],
    userId: string
  ): Promise<VisaCircuit | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visa_circuits')
        .insert({
          project_id: projectId,
          name,
          document_type: documentType,
          steps: steps as any,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Succès', description: 'Circuit créé' });
      await fetchCircuits();
      return data;
    } catch (err) {
      console.error('Erreur createCircuit:', err);
      toast({ title: 'Erreur', description: 'Impossible de créer le circuit', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase, toast, fetchCircuits]);

  // Mettre à jour un circuit
  const updateCircuit = useCallback(async (
    circuitId: string,
    updates: Partial<VisaCircuit>
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('visa_circuits')
        .update(updates)
        .eq('id', circuitId);

      if (error) throw error;
      toast({ title: 'Succès', description: 'Circuit mis à jour' });
      await fetchCircuits();
      return true;
    } catch (err) {
      console.error('Erreur updateCircuit:', err);
      toast({ title: 'Erreur', description: 'Impossible de modifier le circuit', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, toast, fetchCircuits]);

  // Supprimer (désactiver) un circuit
  const deleteCircuit = useCallback(async (circuitId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('visa_circuits')
        .update({ is_active: false })
        .eq('id', circuitId);

      if (error) throw error;
      toast({ title: 'Succès', description: 'Circuit supprimé' });
      await fetchCircuits();
      return true;
    } catch (err) {
      console.error('Erreur deleteCircuit:', err);
      toast({ title: 'Erreur', description: 'Impossible de supprimer le circuit', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, toast, fetchCircuits]);

  return {
    circuits,
    loading,
    fetchCircuits,
    createCircuit,
    updateCircuit,
    deleteCircuit,
  };
}
