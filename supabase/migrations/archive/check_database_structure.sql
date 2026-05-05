-- =========================================
-- SCRIPT DE DIAGNOSTIC DE LA STRUCTURE DE BASE DE DONNÉES
-- À exécuter dans Supabase SQL Editor pour diagnostiquer les problèmes
-- =========================================

-- =========================================
-- 1. VÉRIFICATION DE L'EXISTENCE DES TABLES
-- =========================================

SELECT 
    'video_meetings' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meetings') 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status
UNION ALL
SELECT 
    'video_meeting_participants' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meeting_participants') 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status
UNION ALL
SELECT 
    'video_meeting_requests' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meeting_requests') 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status
UNION ALL
SELECT 
    'video_meeting_request_participants' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meeting_request_participants') 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status
UNION ALL
SELECT 
    'meeting_recordings' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_recordings') 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status;

-- =========================================
-- 2. VÉRIFICATION DES COLONNES IMPORTANTES
-- =========================================

-- Colonnes de video_meetings
SELECT 
    'video_meetings.created_at' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'video_meetings' AND column_name = 'created_at'
        ) 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status
UNION ALL
SELECT 
    'video_meetings.updated_at' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'video_meetings' AND column_name = 'updated_at'
        ) 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status
UNION ALL
SELECT 
    'video_meetings.project_id' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'video_meetings' AND column_name = 'project_id'
        ) 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status
UNION ALL
SELECT 
    'video_meetings.recording_available' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'video_meetings' AND column_name = 'recording_available'
        ) 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status
UNION ALL
SELECT 
    'video_meetings.deleted_at' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'video_meetings' AND column_name = 'deleted_at'
        ) 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status
UNION ALL
SELECT 
    'video_meeting_participants.left_at' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'video_meeting_participants' AND column_name = 'left_at'
        ) 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status
UNION ALL
SELECT 
    'video_meeting_requests.created_at' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'video_meeting_requests' AND column_name = 'created_at'
        ) 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status
UNION ALL
SELECT 
    'video_meeting_requests.project_id' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'video_meeting_requests' AND column_name = 'project_id'
        ) 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status;

-- =========================================
-- 3. VÉRIFICATION DES VUES
-- =========================================

SELECT 
    'meeting_details' as view_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'meeting_details') 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status
UNION ALL
SELECT 
    'meeting_request_details' as view_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'meeting_request_details') 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status;

-- =========================================
-- 4. VÉRIFICATION DES INDEX CRITIQUES
-- =========================================

SELECT 
    'idx_video_meetings_created_at' as index_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_video_meetings_created_at'
        ) 
        THEN 'Existe' 
        ELSE 'MANQUANT' 
    END as status
UNION ALL
SELECT 
    'idx_video_meeting_requests_created_at' as index_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_video_meeting_requests_created_at'
        ) 
        THEN 'Existe' 
        ELSE 'MANQUANT' 
    END as status;

-- =========================================
-- 5. VÉRIFICATION DES FONCTIONS RPC
-- =========================================

SELECT 
    'add_meeting_participant' as function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'add_meeting_participant'
        ) 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status
UNION ALL
SELECT 
    'delete_meeting' as function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'delete_meeting'
        ) 
        THEN 'Existe' 
        ELSE 'MANQUANTE' 
    END as status;

-- =========================================
-- 6. VÉRIFICATION DES TRIGGERS
-- =========================================

SELECT 
    trigger_name,
    event_object_table,
    'Existe' as status
FROM information_schema.triggers 
WHERE trigger_name LIKE '%video_meeting%' 
   OR trigger_name LIKE '%meeting_recording%';

-- =========================================
-- 7. STRUCTURE DÉTAILLÉE DES TABLES EXISTANTES
-- =========================================

-- Structure de video_meetings si elle existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'video_meetings'
ORDER BY ordinal_position;

-- Structure de video_meeting_requests si elle existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'video_meeting_requests'
ORDER BY ordinal_position; 