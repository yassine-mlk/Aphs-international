-- =========================================
-- DIAGNOSTIC COMPLET DE LA STRUCTURE DE BASE DE DONNÉES
-- À exécuter dans Supabase SQL Editor pour identifier tous les problèmes
-- =========================================

-- =========================================
-- 1. VÉRIFICATION DE L'EXISTENCE DES TABLES
-- =========================================

SELECT 'VÉRIFICATION DES TABLES' as section;

SELECT 
    'video_meetings' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meetings' AND table_schema = 'public') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meetings' AND table_schema = 'public') 
        THEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'video_meetings' AND table_schema = 'public')::text || ' colonnes'
        ELSE 'N/A'
    END as details
UNION ALL
SELECT 
    'video_meeting_participants' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meeting_participants' AND table_schema = 'public') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meeting_participants' AND table_schema = 'public') 
        THEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'video_meeting_participants' AND table_schema = 'public')::text || ' colonnes'
        ELSE 'N/A'
    END as details
UNION ALL
SELECT 
    'video_meeting_requests' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meeting_requests' AND table_schema = 'public') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meeting_requests' AND table_schema = 'public') 
        THEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'video_meeting_requests' AND table_schema = 'public')::text || ' colonnes'
        ELSE 'N/A'
    END as details
UNION ALL
SELECT 
    'video_meeting_request_participants' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meeting_request_participants' AND table_schema = 'public') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meeting_request_participants' AND table_schema = 'public') 
        THEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'video_meeting_request_participants' AND table_schema = 'public')::text || ' colonnes'
        ELSE 'N/A'
    END as details
UNION ALL
SELECT 
    'meeting_recordings' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_recordings' AND table_schema = 'public') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_recordings' AND table_schema = 'public') 
        THEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'meeting_recordings' AND table_schema = 'public')::text || ' colonnes'
        ELSE 'N/A'
    END as details;

-- =========================================
-- 2. STRUCTURE DÉTAILLÉE DE VIDEO_MEETINGS
-- =========================================

SELECT 'STRUCTURE DE VIDEO_MEETINGS' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'video_meetings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =========================================
-- 3. STRUCTURE DÉTAILLÉE DE VIDEO_MEETING_PARTICIPANTS
-- =========================================

SELECT 'STRUCTURE DE VIDEO_MEETING_PARTICIPANTS' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'video_meeting_participants' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =========================================
-- 4. STRUCTURE DÉTAILLÉE DE VIDEO_MEETING_REQUESTS
-- =========================================

SELECT 'STRUCTURE DE VIDEO_MEETING_REQUESTS' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'video_meeting_requests' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =========================================
-- 5. STRUCTURE DÉTAILLÉE DE MEETING_RECORDINGS
-- =========================================

SELECT 'STRUCTURE DE MEETING_RECORDINGS' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'meeting_recordings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =========================================
-- 6. VÉRIFICATION DES COLONNES CRITIQUES
-- =========================================

SELECT 'VÉRIFICATION DES COLONNES CRITIQUES' as section;

SELECT 
    table_name || '.' || column_name as column_check,
    'EXISTS' as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('video_meetings', 'video_meeting_participants', 'video_meeting_requests', 'meeting_recordings')
  AND column_name IN ('id', 'meeting_id', 'created_at', 'user_id', 'request_id')
ORDER BY table_name, column_name;

-- =========================================
-- 7. VÉRIFICATION DES CONTRAINTES ET RÉFÉRENCES
-- =========================================

SELECT 'CONTRAINTES ET RÉFÉRENCES' as section;

SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public' 
  AND tc.table_name IN ('video_meetings', 'video_meeting_participants', 'video_meeting_requests', 'meeting_recordings')
ORDER BY tc.table_name, tc.constraint_type;

-- =========================================
-- 8. VÉRIFICATION DES VUES
-- =========================================

SELECT 'VÉRIFICATION DES VUES' as section;

SELECT 
    table_name as view_name,
    'EXISTS' as status
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('meeting_details', 'meeting_request_details');

-- =========================================
-- 9. VÉRIFICATION DES FONCTIONS RPC
-- =========================================

SELECT 'FONCTIONS RPC' as section;

SELECT 
    proname as function_name,
    'EXISTS' as status
FROM pg_proc 
WHERE proname IN (
    'add_meeting_participant',
    'delete_meeting',
    'start_meeting_recording',
    'end_meeting_recording',
    'get_meeting_recordings'
);

-- =========================================
-- 10. VÉRIFICATION DES INDEX
-- =========================================

SELECT 'INDEX' as section;

SELECT 
    indexname as index_name,
    tablename,
    'EXISTS' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('video_meetings', 'video_meeting_participants', 'video_meeting_requests', 'meeting_recordings')
ORDER BY tablename;

-- =========================================
-- 11. RÉSUMÉ DES PROBLÈMES POTENTIELS
-- =========================================

SELECT 'RÉSUMÉ DES PROBLÈMES POTENTIELS' as section;

-- Vérifier les tables manquantes
SELECT 
    'TABLE MANQUANTE: ' || table_name as issue
FROM (
    VALUES 
        ('video_meetings'),
        ('video_meeting_participants'),
        ('video_meeting_requests'),
        ('video_meeting_request_participants'),
        ('meeting_recordings')
) AS required_tables(table_name)
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE information_schema.tables.table_name = required_tables.table_name 
      AND table_schema = 'public'
)

UNION ALL

-- Vérifier les colonnes manquantes critiques
SELECT 
    'COLONNE MANQUANTE: ' || table_column as issue
FROM (
    VALUES 
        ('video_meetings.id'),
        ('video_meetings.created_at'),
        ('video_meeting_participants.id'),
        ('video_meeting_participants.meeting_id'),
        ('video_meeting_participants.user_id'),
        ('video_meeting_requests.id'),
        ('video_meeting_requests.created_at'),
        ('meeting_recordings.id'),
        ('meeting_recordings.meeting_id')
) AS required_columns(table_column)
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name || '.' || column_name = required_columns.table_column
); 