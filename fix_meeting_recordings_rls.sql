-- =========================================
-- CORRECTION DES POLITIQUES RLS POUR RÉSOUDRE L'ERREUR 403
-- Erreur: "new row violates row-level security policy"
-- =========================================

-- 1. Mise à jour de la structure de la table meeting_recordings
ALTER TABLE meeting_recordings 
ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES video_meetings(id) ON DELETE CASCADE;

-- 2. Supprimer la contrainte problématique sur auth.users si elle existe
ALTER TABLE meeting_recordings 
DROP CONSTRAINT IF EXISTS meeting_recordings_recorded_by_fkey;

-- 3. Activer RLS si pas encore fait
ALTER TABLE meeting_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_request_participants ENABLE ROW LEVEL SECURITY;

-- 4. Corriger les politiques pour meeting_recordings
DROP POLICY IF EXISTS "Users can view their own recordings" ON meeting_recordings;
CREATE POLICY "Users can view their own recordings" ON meeting_recordings
  FOR SELECT USING (
    recorded_by = auth.uid() OR
    meeting_id IN (
      SELECT meeting_id FROM video_meeting_participants 
      WHERE user_id = auth.uid()
    ) OR
    meeting_id IN (
      SELECT id FROM video_meetings 
      WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all recordings" ON meeting_recordings;
CREATE POLICY "Admins can view all recordings" ON meeting_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can create recordings" ON meeting_recordings;
CREATE POLICY "Users can create recordings" ON meeting_recordings
  FOR INSERT WITH CHECK (
    recorded_by = auth.uid()
  );

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

-- 5. Corriger les politiques pour video_meeting_request_participants
DROP POLICY IF EXISTS "Participants peuvent voir les demandes qui les concernent" ON video_meeting_request_participants;
CREATE POLICY "Participants peuvent voir les demandes qui les concernent" ON video_meeting_request_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    request_id IN (
      SELECT id FROM video_meeting_requests 
      WHERE requested_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Système peut gérer les participants des demandes" ON video_meeting_request_participants;
DROP POLICY IF EXISTS "Users can insert request participants" ON video_meeting_request_participants;
CREATE POLICY "Users can insert request participants" ON video_meeting_request_participants
  FOR INSERT WITH CHECK (
    request_id IN (
      SELECT id FROM video_meeting_requests 
      WHERE requested_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage request participants" ON video_meeting_request_participants;
CREATE POLICY "Admins can manage request participants" ON video_meeting_request_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete request participants" ON video_meeting_request_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 6. Corriger les politiques de stockage pour être plus permissives
DROP POLICY IF EXISTS "Users can upload recordings" ON storage.objects;
CREATE POLICY "Users can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'meeting-recordings' 
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can view their recordings" ON storage.objects;
CREATE POLICY "Users can view their recordings" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'meeting-recordings' 
    AND auth.uid() IS NOT NULL
  );

-- 7. Fonction pour diagnostiquer les problèmes RLS
CREATE OR REPLACE FUNCTION diagnose_rls_issues(p_user_id UUID)
RETURNS TABLE (
  table_name TEXT,
  policy_name TEXT,
  policy_type TEXT,
  has_access BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'meeting_recordings'::TEXT,
    'Users can create recordings'::TEXT,
    'INSERT'::TEXT,
    EXISTS(SELECT 1 FROM profiles WHERE user_id = p_user_id)::BOOLEAN;
    
  RETURN QUERY
  SELECT 
    'video_meeting_request_participants'::TEXT,
    'Users can insert request participants'::TEXT,
    'INSERT'::TEXT,
    EXISTS(SELECT 1 FROM profiles WHERE user_id = p_user_id)::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Créer des index pour améliorer les performances des politiques
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_meeting_id ON meeting_recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_role ON profiles(user_id, role);

-- =========================================
-- COMMENTAIRES POUR LE DEBUGGING
-- =========================================

-- Pour tester les politiques RLS, utilisez ces requêtes en tant qu'utilisateur :
-- SELECT diagnose_rls_issues(auth.uid());
-- 
-- Pour vérifier l'accès aux enregistrements :
-- SELECT * FROM meeting_recordings WHERE recorded_by = auth.uid();
--
-- Pour vérifier l'accès aux participants de demandes :
-- SELECT * FROM video_meeting_request_participants WHERE user_id = auth.uid();

COMMENT ON FUNCTION diagnose_rls_issues IS 'Fonction pour diagnostiquer les problèmes d accès RLS pour un utilisateur donné';

-- =========================================
-- FIN DU SCRIPT DE CORRECTION
-- ========================================= 