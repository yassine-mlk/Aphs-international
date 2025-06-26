-- Table pour gérer la présence des participants en temps réel
CREATE TABLE IF NOT EXISTS meeting_participants_presence (
    room_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_meeting_participants_presence_room_id 
ON meeting_participants_presence(room_id);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_presence_last_seen 
ON meeting_participants_presence(last_seen);

-- RLS (Row Level Security)
ALTER TABLE meeting_participants_presence ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir tous les participants d'une room
CREATE POLICY "Users can view all participants in a room" ON meeting_participants_presence
    FOR SELECT USING (true);

-- Politique pour permettre aux utilisateurs de gérer leur propre présence
CREATE POLICY "Users can manage their own presence" ON meeting_participants_presence
    FOR ALL USING (auth.uid() = user_id);

-- Politique pour permettre l'insertion de nouvelles présences
CREATE POLICY "Users can insert their own presence" ON meeting_participants_presence
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fonction pour nettoyer automatiquement les présences anciennes
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
    DELETE FROM meeting_participants_presence 
    WHERE last_seen < NOW() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Scheduler pour nettoyer automatiquement (si pg_cron est disponible)
-- SELECT cron.schedule('cleanup-presence', '*/2 * * * *', 'SELECT cleanup_old_presence();');

COMMENT ON TABLE meeting_participants_presence IS 'Table pour gérer la présence des participants dans les réunions en temps réel'; 