-- =========================================
-- CONFIGURATION REALTIME POUR VIDÉOCONFÉRENCE
-- Script à exécuter dans Supabase SQL Editor
-- =========================================

-- 1. Vérifier que Realtime est activé (informations)
-- Dans l'interface Supabase, aller à Settings > API > Realtime
-- S'assurer que Realtime est activé

-- 2. Configurer les politiques pour Realtime
-- (Pas nécessaire pour les channels broadcast/presence)

-- 3. Créer une table pour les logs de réunion (optionnel)
CREATE TABLE IF NOT EXISTS video_meeting_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES video_meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    event_type TEXT NOT NULL, -- 'join', 'leave', 'signal', 'error'
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_video_meeting_logs_meeting_id ON video_meeting_logs(meeting_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_logs_created_at ON video_meeting_logs(created_at);

-- Fonction pour logger les événements de réunion
CREATE OR REPLACE FUNCTION log_meeting_event(
    p_meeting_id UUID,
    p_user_id UUID,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO video_meeting_logs (meeting_id, user_id, event_type, event_data)
    VALUES (p_meeting_id, p_user_id, p_event_type, p_event_data);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Politique RLS pour les logs (optionnel)
ALTER TABLE video_meeting_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Utilisateurs peuvent voir leurs logs" 
ON video_meeting_logs FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- =========================================
-- NOTES IMPORTANTES
-- =========================================

/*
POUR ACTIVER REALTIME DANS SUPABASE :

1. Aller dans Supabase Dashboard > Settings > API
2. Dans la section "Realtime", s'assurer que :
   - Realtime est activé
   - Les channels sont autorisés

3. Les channels video-room-* utilisent :
   - broadcast: pour les signaux WebRTC et messages chat
   - presence: pour tracker les participants

4. Aucune table n'est nécessaire pour Realtime channels
   Les données transitent en temps réel sans stockage

5. Les channels se nettoient automatiquement quand
   tous les participants partent

6. Debugging :
   - Vérifier les logs Realtime dans Supabase Dashboard
   - Utiliser les logs console dans le navigateur
   - Tester avec plusieurs onglets/navigateurs
*/

-- Nettoyer les anciens logs (à exécuter périodiquement)
CREATE OR REPLACE FUNCTION cleanup_old_meeting_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Supprimer les logs de plus de 30 jours
    DELETE FROM video_meeting_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer un job pour nettoyer automatiquement (si pg_cron est disponible)
-- SELECT cron.schedule('cleanup-meeting-logs', '0 2 * * *', 'SELECT cleanup_old_meeting_logs();');

-- =========================================
-- TESTS DE VALIDATION
-- =========================================

-- Test de logging
-- SELECT log_meeting_event(
--     'example-meeting-id'::UUID,
--     auth.uid(),
--     'test',
--     '{"message": "Test successful"}'::JSONB
-- );

-- Test de lecture des logs
-- SELECT * FROM video_meeting_logs WHERE user_id = auth.uid() LIMIT 5; 