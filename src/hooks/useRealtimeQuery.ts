import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface RealtimeQueryOptions {
  table: string;
  query: () => Promise<any>;
  filter?: string;    // ex: "project_id=eq.xxx"
  events?: ('INSERT' | 'UPDATE' | 'DELETE')[];
}

/**
 * Hook réutilisable pour exécuter une requête et s'abonner aux changements Realtime
 */
export function useRealtimeQuery({
  table,
  query,
  filter,
  events = ['INSERT', 'UPDATE', 'DELETE'],
}: RealtimeQueryOptions) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await query();
      setData(result);
      setError(null);
    } catch (err) {
      console.error(`Erreur lors du fetch Realtime (${table}):`, err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [query, table]);

  useEffect(() => {
    // Premier chargement
    fetchData();

    // S'abonner aux changements Realtime
    const channel = supabase
      .channel(`realtime_${table}_${filter ?? 'all'}_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', {
        event: '*', // On écoute tous les événements pour simplifier, on pourrait filtrer avec events
        schema: 'public',
        table: table,
        filter: filter,
      }, () => {
        // Rafraîchir les données à chaque changement
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
