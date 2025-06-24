-- Table pour stocker les métadonnées des enregistrements
CREATE TABLE IF NOT EXISTS meeting_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES video_meetings(id) ON DELETE CASCADE,
  meeting_room_id TEXT NOT NULL,
  recorded_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'completed', 'failed')),
  file_path TEXT,
  file_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_meeting_id ON meeting_recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_room_id ON meeting_recordings(meeting_room_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_recorded_by ON meeting_recordings(recorded_by);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_status ON meeting_recordings(status);

-- Activer RLS
ALTER TABLE meeting_recordings ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent voir leurs propres enregistrements
DROP POLICY IF EXISTS "Users can view their own recordings" ON meeting_recordings;
CREATE POLICY "Users can view their own recordings" ON meeting_recordings
  FOR SELECT USING (
    recorded_by = auth.uid() OR
    meeting_id IN (
      SELECT meeting_id FROM video_meeting_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Politique pour que les admins puissent voir tous les enregistrements
DROP POLICY IF EXISTS "Admins can view all recordings" ON meeting_recordings;
CREATE POLICY "Admins can view all recordings" ON meeting_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Politique pour créer des enregistrements
DROP POLICY IF EXISTS "Users can create recordings" ON meeting_recordings;
CREATE POLICY "Users can create recordings" ON meeting_recordings
  FOR INSERT WITH CHECK (
    recorded_by = auth.uid() AND (
      -- L'utilisateur est participant de la réunion ou créateur
      meeting_id IN (
        SELECT meeting_id FROM video_meeting_participants 
        WHERE user_id = auth.uid()
      ) OR
      meeting_id IN (
        SELECT id FROM video_meetings 
        WHERE created_by = auth.uid()
      )
    )
  );

-- Politique pour mettre à jour ses propres enregistrements
DROP POLICY IF EXISTS "Users can update their own recordings" ON meeting_recordings;
CREATE POLICY "Users can update their own recordings" ON meeting_recordings
  FOR UPDATE USING (
    recorded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Créer le bucket de stockage pour les enregistrements si il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-recordings', 'meeting-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Politique de stockage : les utilisateurs peuvent uploader leurs enregistrements
DROP POLICY IF EXISTS "Users can upload recordings" ON storage.objects;
CREATE POLICY "Users can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'meeting-recordings' 
    AND auth.uid() IS NOT NULL
  );

-- Politique de stockage : les utilisateurs peuvent voir leurs enregistrements
DROP POLICY IF EXISTS "Users can view their recordings" ON storage.objects;
CREATE POLICY "Users can view their recordings" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'meeting-recordings' 
    AND (
      auth.uid() IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.role = 'admin'
      )
    )
  );

-- Corriger les politiques pour video_meeting_request_participants
DROP POLICY IF EXISTS "Système peut gérer les participants des demandes" ON video_meeting_request_participants;
DROP POLICY IF EXISTS "Users can insert request participants" ON video_meeting_request_participants;
CREATE POLICY "Users can insert request participants" ON video_meeting_request_participants
  FOR INSERT WITH CHECK (
    request_id IN (
      SELECT id FROM video_meeting_requests 
      WHERE requested_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage request participants" ON video_meeting_request_participants;
CREATE POLICY "Admins can manage request participants" ON video_meeting_request_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Fonction pour nettoyer les anciens enregistrements (optionnel)
CREATE OR REPLACE FUNCTION cleanup_old_recordings()
RETURNS void AS $$
BEGIN
  -- Supprimer les enregistrements de plus de 90 jours
  DELETE FROM meeting_recordings 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_meeting_recordings_updated_at ON meeting_recordings;
CREATE TRIGGER update_meeting_recordings_updated_at
  BEFORE UPDATE ON meeting_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 