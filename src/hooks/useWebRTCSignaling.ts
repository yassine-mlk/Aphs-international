import { useEffect, useCallback, useRef } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';

interface UseWebRTCSignalingProps {
  roomId: string;
  onSignalReceived?: (data: { signal: any; from: string; to: string }) => void;
}

export function useWebRTCSignaling({ roomId, onSignalReceived }: UseWebRTCSignalingProps) {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<string>(new Date().toISOString());
  
  // Vérifier si la table existe
  const checkTableExists = useCallback(async () => {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('webrtc_signals')
        .select('count(*)')
        .limit(1);

      return !error || !error.message.includes('relation "public.webrtc_signals" does not exist');
    } catch (error) {
      console.error('Error checking webrtc_signals table:', error);
      return false;
    }
  }, [supabase]);

  // Envoyer un signal WebRTC
  const sendSignal = useCallback(async (signal: any, targetUserId: string) => {
    if (!user?.id || !supabase) {
      console.warn('Cannot send signal - no user or supabase');
      return false;
    }

    try {
      console.log(`📡 Sending WebRTC signal to ${targetUserId} via database`);
      
      const { error } = await supabase
        .from('webrtc_signals')
        .insert({
          room_id: roomId,
          from_user_id: user.id,
          to_user_id: targetUserId,
          signal_data: signal,
          signal_type: signal.type || 'unknown'
        });

      if (error) {
        console.error('Error sending signal:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send signal:', error);
      return false;
    }
  }, [roomId, user?.id, supabase]);

  // Récupérer les signaux destinés à cet utilisateur
  const fetchPendingSignals = useCallback(async () => {
    if (!user?.id || !supabase) return;

    try {
      // Récupérer les nouveaux signaux depuis la dernière vérification
      const { data, error } = await supabase
        .from('webrtc_signals')
        .select('*')
        .eq('room_id', roomId)
        .eq('to_user_id', user.id)
        .gt('created_at', lastCheckRef.current)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching signals:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`📡 Received ${data.length} WebRTC signals via database`);
        
        // Traiter chaque signal
        for (const signalRecord of data) {
          if (onSignalReceived) {
            onSignalReceived({
              signal: signalRecord.signal_data,
              from: signalRecord.from_user_id,
              to: signalRecord.to_user_id
            });
          }
        }

        // Mettre à jour le timestamp de la dernière vérification
        if (data.length > 0) {
          lastCheckRef.current = data[data.length - 1].created_at;
        }

        // Supprimer les signaux traités
        const signalIds = data.map(s => s.id);
        await supabase
          .from('webrtc_signals')
          .delete()
          .in('id', signalIds);
      }
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    }
  }, [roomId, user?.id, supabase, onSignalReceived]);

  // Nettoyer les vieux signaux
  const cleanupOldSignals = useCallback(async () => {
    if (!supabase) return;

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await supabase
        .from('webrtc_signals')
        .delete()
        .lt('created_at', fiveMinutesAgo);
    } catch (error) {
      console.error('Failed to cleanup old signals:', error);
    }
  }, [supabase]);

  // Démarrer le polling pour récupérer les signaux
  useEffect(() => {
    if (!user?.id || !supabase) return;

    console.log(`🔌 Starting WebRTC signaling for room: ${roomId}`);

    // Vérifier d'abord si la table existe
    checkTableExists().then((exists) => {
      if (!exists) {
        console.warn('⚠️ webrtc_signals table does not exist - WebRTC signaling disabled');
        console.info(`
📋 To enable WebRTC signaling, create the table in Supabase:

-- Table pour gérer les signaux WebRTC entre participants
CREATE TABLE IF NOT EXISTS webrtc_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id TEXT NOT NULL,
    from_user_id UUID NOT NULL,
    to_user_id UUID NOT NULL,
    signal_data JSONB NOT NULL,
    signal_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_room_id 
ON webrtc_signals(room_id);

CREATE INDEX IF NOT EXISTS idx_webrtc_signals_to_user 
ON webrtc_signals(to_user_id);

ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signals sent to them" ON webrtc_signals
    FOR SELECT USING (auth.uid() = to_user_id);

CREATE POLICY "Users can send signals" ON webrtc_signals
    FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can delete processed signals" ON webrtc_signals
    FOR DELETE USING (auth.uid() = to_user_id);
        `);
        return;
      }

      // Récupération immédiate
      fetchPendingSignals();

      // Polling toutes les 2 secondes pour les nouveaux signaux
      pollingIntervalRef.current = setInterval(() => {
        fetchPendingSignals();
      }, 2000);

      // Nettoyage des vieux signaux toutes les minutes
      const cleanupInterval = setInterval(() => {
        cleanupOldSignals();
      }, 60000);
      
      // Stocker l'interval de cleanup pour pouvoir le nettoyer
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        clearInterval(cleanupInterval);
      };
    });

    // Cleanup général
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [roomId, user?.id, supabase, fetchPendingSignals, cleanupOldSignals, checkTableExists]);

  return {
    sendSignal
  };
} 