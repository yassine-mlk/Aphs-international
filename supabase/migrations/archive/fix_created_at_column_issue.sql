-- =========================================
-- SCRIPT DE CORRECTION POUR LA COLONNE CREATED_AT MANQUANTE
-- À exécuter dans Supabase SQL Editor
-- =========================================

-- =========================================
-- 1. AJOUT DE LA COLONNE CREATED_AT À VIDEO_MEETINGS
-- =========================================

-- Vérifier et ajouter la colonne created_at à video_meetings
DO $$ 
BEGIN
    -- Ajouter created_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meetings' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE video_meetings ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Colonne created_at ajoutée à video_meetings';
    ELSE
        RAISE NOTICE 'Colonne created_at existe déjà dans video_meetings';
    END IF;
    
    -- Ajouter updated_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meetings' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE video_meetings ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Colonne updated_at ajoutée à video_meetings';
    ELSE
        RAISE NOTICE 'Colonne updated_at existe déjà dans video_meetings';
    END IF;
    
    -- Ajouter ended_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meetings' AND column_name = 'ended_at'
    ) THEN
        ALTER TABLE video_meetings ADD COLUMN ended_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Colonne ended_at ajoutée à video_meetings';
    ELSE
        RAISE NOTICE 'Colonne ended_at existe déjà dans video_meetings';
    END IF;
    
    -- Ajouter recording_available si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meetings' AND column_name = 'recording_available'
    ) THEN
        ALTER TABLE video_meetings ADD COLUMN recording_available BOOLEAN DEFAULT false;
        RAISE NOTICE 'Colonne recording_available ajoutée à video_meetings';
    ELSE
        RAISE NOTICE 'Colonne recording_available existe déjà dans video_meetings';
    END IF;
    
    -- Ajouter project_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meetings' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE video_meetings ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
        RAISE NOTICE 'Colonne project_id ajoutée à video_meetings';
    ELSE
        RAISE NOTICE 'Colonne project_id existe déjà dans video_meetings';
    END IF;
    
    -- Ajouter deleted_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meetings' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE video_meetings ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Colonne deleted_at ajoutée à video_meetings';
    ELSE
        RAISE NOTICE 'Colonne deleted_at existe déjà dans video_meetings';
    END IF;
END $$;

-- =========================================
-- 2. AJOUT DES COLONNES MANQUANTES À VIDEO_MEETING_PARTICIPANTS
-- =========================================

DO $$ 
BEGIN
    -- Ajouter left_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meeting_participants' AND column_name = 'left_at'
    ) THEN
        ALTER TABLE video_meeting_participants ADD COLUMN left_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Colonne left_at ajoutée à video_meeting_participants';
    ELSE
        RAISE NOTICE 'Colonne left_at existe déjà dans video_meeting_participants';
    END IF;
    
    -- Ajouter created_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meeting_participants' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE video_meeting_participants ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Colonne created_at ajoutée à video_meeting_participants';
    ELSE
        RAISE NOTICE 'Colonne created_at existe déjà dans video_meeting_participants';
    END IF;
END $$;

-- =========================================
-- 3. AJOUT DES COLONNES MANQUANTES À VIDEO_MEETING_REQUESTS
-- =========================================

DO $$ 
BEGIN
    -- Ajouter created_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meeting_requests' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE video_meeting_requests ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Colonne created_at ajoutée à video_meeting_requests';
    ELSE
        RAISE NOTICE 'Colonne created_at existe déjà dans video_meeting_requests';
    END IF;
    
    -- Ajouter updated_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meeting_requests' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE video_meeting_requests ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Colonne updated_at ajoutée à video_meeting_requests';
    ELSE
        RAISE NOTICE 'Colonne updated_at existe déjà dans video_meeting_requests';
    END IF;
    
    -- Ajouter project_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meeting_requests' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE video_meeting_requests ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
        RAISE NOTICE 'Colonne project_id ajoutée à video_meeting_requests';
    ELSE
        RAISE NOTICE 'Colonne project_id existe déjà dans video_meeting_requests';
    END IF;
END $$;

-- =========================================
-- 4. CRÉATION DES INDEX MANQUANTS
-- =========================================

-- Index pour video_meetings
CREATE INDEX IF NOT EXISTS idx_video_meetings_created_at ON video_meetings(created_at);
CREATE INDEX IF NOT EXISTS idx_video_meetings_created_by ON video_meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_video_meetings_status ON video_meetings(status);
CREATE INDEX IF NOT EXISTS idx_video_meetings_project_id ON video_meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_video_meetings_deleted_at ON video_meetings(deleted_at);

-- Index pour video_meeting_participants
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_created_at ON video_meeting_participants(created_at);

-- Index pour video_meeting_requests
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_created_at ON video_meeting_requests(created_at);

-- =========================================
-- 5. RECRÉATION DE LA VUE MEETING_DETAILS
-- =========================================

-- Supprimer et recréer la vue meeting_details
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
    COUNT(mp.id) as participant_count,
    COUNT(mr.id) as recording_count
FROM video_meetings m
LEFT JOIN projects p ON m.project_id = p.id
LEFT JOIN video_meeting_participants mp ON m.id = mp.meeting_id
LEFT JOIN meeting_recordings mr ON m.id = mr.meeting_id AND mr.status = 'completed'
WHERE COALESCE(m.deleted_at, '1900-01-01'::timestamp) = '1900-01-01'::timestamp
GROUP BY m.id, p.name;

-- =========================================
-- 6. TRIGGER POUR MISE À JOUR AUTOMATIQUE DE UPDATED_AT
-- =========================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour video_meetings
DROP TRIGGER IF EXISTS trigger_update_video_meetings_updated_at ON video_meetings;
CREATE TRIGGER trigger_update_video_meetings_updated_at
    BEFORE UPDATE ON video_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour video_meeting_requests
DROP TRIGGER IF EXISTS trigger_update_video_meeting_requests_updated_at ON video_meeting_requests;
CREATE TRIGGER trigger_update_video_meeting_requests_updated_at
    BEFORE UPDATE ON video_meeting_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- 7. METTRE À JOUR LES VALEURS NULL POUR CREATED_AT
-- =========================================

-- Mettre à jour les enregistrements existants sans created_at
UPDATE video_meetings 
SET created_at = NOW() 
WHERE created_at IS NULL;

UPDATE video_meeting_participants 
SET created_at = NOW() 
WHERE created_at IS NULL;

UPDATE video_meeting_requests 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- =========================================
-- SCRIPT TERMINÉ AVEC SUCCÈS
-- =========================================

-- Ce script a ajouté toutes les colonnes manquantes nécessaires :
-- ✅ created_at, updated_at, ended_at, recording_available, project_id, deleted_at à video_meetings
-- ✅ left_at, created_at à video_meeting_participants  
-- ✅ created_at, updated_at, project_id à video_meeting_requests
-- ✅ Index pour optimiser les performances
-- ✅ Vue meeting_details recréée avec gestion des NULL
-- ✅ Triggers pour mise à jour automatique
-- ✅ Mise à jour des valeurs NULL existantes 