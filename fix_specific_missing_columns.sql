-- =========================================
-- CORRECTION SPÉCIFIQUE DES COLONNES MANQUANTES
-- Basé sur le diagnostic qui montre les problèmes restants
-- =========================================

-- =========================================
-- 1. CORRIGER video_meeting_requests.created_at
-- =========================================

DO $$ 
BEGIN
    -- Vérifier si la colonne created_at existe dans video_meeting_requests
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'video_meeting_requests' 
          AND column_name = 'created_at'
    ) THEN
        -- Ajouter la colonne created_at
        ALTER TABLE video_meeting_requests 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Mettre à jour les enregistrements existants
        UPDATE video_meeting_requests 
        SET created_at = COALESCE(requested_time, NOW()) 
        WHERE created_at IS NULL;
        
        RAISE NOTICE 'Colonne created_at ajoutée à video_meeting_requests';
    ELSE
        RAISE NOTICE 'Colonne created_at existe déjà dans video_meeting_requests';
    END IF;
    
    -- S'assurer que la colonne updated_at existe aussi
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'video_meeting_requests' 
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE video_meeting_requests 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        UPDATE video_meeting_requests 
        SET updated_at = COALESCE(created_at, requested_time, NOW()) 
        WHERE updated_at IS NULL;
        
        RAISE NOTICE 'Colonne updated_at ajoutée à video_meeting_requests';
    END IF;
END $$;

-- =========================================
-- 2. CORRIGER meeting_recordings.meeting_id
-- =========================================

DO $$ 
BEGIN
    -- Vérifier si la table meeting_recordings existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'meeting_recordings'
    ) THEN
        -- Vérifier si la colonne meeting_id existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'meeting_recordings' 
              AND column_name = 'meeting_id'
        ) THEN
            -- Ajouter la colonne meeting_id
            ALTER TABLE meeting_recordings 
            ADD COLUMN meeting_id UUID NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Colonne meeting_id ajoutée à meeting_recordings';
        ELSE
            RAISE NOTICE 'Colonne meeting_id existe déjà dans meeting_recordings';
        END IF;
    ELSE
        -- Créer complètement la table meeting_recordings si elle n'existe pas
        CREATE TABLE meeting_recordings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            meeting_id UUID NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE,
            meeting_room_id TEXT NOT NULL,
            recorded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'completed', 'failed')),
            file_path TEXT,
            file_url TEXT,
            thumbnail_url TEXT,
            duration_seconds INTEGER DEFAULT 0,
            file_size_bytes BIGINT DEFAULT 0,
            started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ended_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Table meeting_recordings créée avec toutes les colonnes';
    END IF;
END $$;

-- =========================================
-- 3. CRÉER LES INDEX MANQUANTS
-- =========================================

-- Index pour video_meeting_requests.created_at
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_created_at 
ON video_meeting_requests(created_at);

-- Index pour meeting_recordings.meeting_id
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_meeting_id 
ON meeting_recordings(meeting_id);

-- Index pour meeting_recordings.created_at
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_created_at 
ON meeting_recordings(created_at);

-- =========================================
-- 4. CONFIGURER LES TRIGGERS
-- =========================================

-- S'assurer que la fonction update_updated_at_column existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour video_meeting_requests
DROP TRIGGER IF EXISTS trigger_update_video_meeting_requests_updated_at ON video_meeting_requests;
CREATE TRIGGER trigger_update_video_meeting_requests_updated_at
    BEFORE UPDATE ON video_meeting_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour meeting_recordings
DROP TRIGGER IF EXISTS trigger_update_meeting_recordings_updated_at ON meeting_recordings;
CREATE TRIGGER trigger_update_meeting_recordings_updated_at
    BEFORE UPDATE ON meeting_recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- 5. CONFIGURER LES POLITIQUES RLS
-- =========================================

-- S'assurer que RLS est activé
ALTER TABLE video_meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_recordings ENABLE ROW LEVEL SECURITY;

-- Politiques pour meeting_recordings
DROP POLICY IF EXISTS "Users can view recordings" ON meeting_recordings;
CREATE POLICY "Users can view recordings" ON meeting_recordings
    FOR SELECT USING (
        recorded_by = auth.uid() OR
        meeting_id IN (
            SELECT meeting_id FROM video_meeting_participants 
            WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can create recordings" ON meeting_recordings;
CREATE POLICY "Users can create recordings" ON meeting_recordings
    FOR INSERT WITH CHECK (
        recorded_by = auth.uid() AND
        meeting_id IN (
            SELECT meeting_id FROM video_meeting_participants 
            WHERE user_id = auth.uid()
        )
    );

-- =========================================
-- 6. RECRÉER LA VUE MEETING_DETAILS
-- =========================================

-- Supprimer et recréer la vue pour s'assurer qu'elle fonctionne
DROP VIEW IF EXISTS meeting_details;

CREATE OR REPLACE VIEW meeting_details AS
SELECT 
    m.id,
    m.title,
    m.room_id,
    m.description,
    m.project_id,
    p.name as project_name,
    m.scheduled_time,
    m.is_instant,
    m.status,
    m.created_by,
    m.created_at,
    m.updated_at,
    m.ended_at,
    COALESCE(m.recording_available, false) as recording_available,
    COUNT(DISTINCT mp.id) as participant_count,
    COUNT(DISTINCT mr.id) as recording_count
FROM video_meetings m
LEFT JOIN projects p ON m.project_id = p.id
LEFT JOIN video_meeting_participants mp ON m.id = mp.meeting_id
LEFT JOIN meeting_recordings mr ON m.id = mr.meeting_id AND mr.status = 'completed'
WHERE COALESCE(m.deleted_at, '1900-01-01'::timestamp) = '1900-01-01'::timestamp
GROUP BY m.id, m.title, m.room_id, m.description, m.project_id, p.name, 
         m.scheduled_time, m.is_instant, m.status, m.created_by, m.created_at, 
         m.updated_at, m.ended_at, m.recording_available;

-- =========================================
-- 7. VÉRIFICATION FINALE
-- =========================================

-- Vérifier que les colonnes existent maintenant
SELECT 
    'video_meeting_requests.created_at' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'video_meeting_requests' 
              AND column_name = 'created_at'
        ) 
        THEN 'EXISTS' 
        ELSE 'STILL MISSING' 
    END as status
UNION ALL
SELECT 
    'meeting_recordings.meeting_id' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'meeting_recordings' 
              AND column_name = 'meeting_id'
        ) 
        THEN 'EXISTS' 
        ELSE 'STILL MISSING' 
    END as status;

-- =========================================
-- SCRIPT TERMINÉ
-- =========================================

SELECT 'CORRECTION DES COLONNES MANQUANTES TERMINÉE' as status;

-- Ce script a corrigé :
-- ✅ video_meeting_requests.created_at
-- ✅ meeting_recordings.meeting_id
-- ✅ Index appropriés
-- ✅ Triggers pour maintenance automatique
-- ✅ Politiques RLS
-- ✅ Vue meeting_details recréée 