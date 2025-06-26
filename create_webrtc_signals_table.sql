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

CREATE INDEX IF NOT EXISTS idx_webrtc_signals_created_at 
ON webrtc_signals(created_at);

-- RLS (Row Level Security)
ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir les signaux qui leur sont destinés
CREATE POLICY "Users can view signals sent to them" ON webrtc_signals
    FOR SELECT USING (auth.uid() = to_user_id);

-- Politique pour permettre aux utilisateurs d'envoyer des signaux
CREATE POLICY "Users can send signals" ON webrtc_signals
    FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Politique pour permettre aux utilisateurs de supprimer les signaux qu'ils ont traités
CREATE POLICY "Users can delete processed signals" ON webrtc_signals
    FOR DELETE USING (auth.uid() = to_user_id);

-- Fonction pour nettoyer automatiquement les vieux signaux (plus de 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_signals()
RETURNS void AS $$
BEGIN
    DELETE FROM webrtc_signals 
    WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE webrtc_signals IS 'Table pour gérer les signaux WebRTC entre participants des réunions'; 