-- =========================================
-- SCRIPT DE TEST POUR VÉRIFIER LES CORRECTIONS
-- À exécuter après fix_database_schema_issues.sql
-- =========================================

-- =========================================
-- 1. VÉRIFICATION DES TABLES ET COLONNES
-- =========================================

-- Vérifier que la table notifications existe
SELECT 'notifications table exists' as test_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables 
           WHERE table_name = 'notifications'
       ) THEN '✅ PASS' ELSE '❌ FAIL' END as result;

-- Vérifier que la colonne projects.deadline existe
SELECT 'projects.deadline column exists' as test_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'projects' AND column_name = 'deadline'
       ) THEN '✅ PASS' ELSE '❌ FAIL' END as result;

-- Vérifier que la table task_assignments existe
SELECT 'task_assignments table exists' as test_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables 
           WHERE table_name = 'task_assignments'
       ) THEN '✅ PASS' ELSE '❌ FAIL' END as result;

-- Vérifier que la vue profiles_with_id existe
SELECT 'profiles_with_id view exists' as test_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.views 
           WHERE table_name = 'profiles_with_id'
       ) THEN '✅ PASS' ELSE '❌ FAIL' END as result;

-- =========================================
-- 2. VÉRIFICATION DES FONCTIONS RPC
-- =========================================

-- Vérifier que les fonctions RPC existent
SELECT 'get_task_assignments_with_projects function exists' as test_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.routines 
           WHERE routine_name = 'get_task_assignments_with_projects'
       ) THEN '✅ PASS' ELSE '❌ FAIL' END as result;

SELECT 'get_profiles_with_id function exists' as test_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.routines 
           WHERE routine_name = 'get_profiles_with_id'
       ) THEN '✅ PASS' ELSE '❌ FAIL' END as result;

-- =========================================
-- 3. VÉRIFICATION DES INDEX
-- =========================================

-- Vérifier les index de notifications
SELECT 'notifications indexes exist' as test_name,
       CASE WHEN (
           SELECT COUNT(*) FROM pg_indexes 
           WHERE tablename = 'notifications'
       ) >= 4 THEN '✅ PASS' ELSE '❌ FAIL' END as result;

-- Vérifier l'index de projects.deadline
SELECT 'projects deadline index exists' as test_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_indexes 
           WHERE tablename = 'projects' AND indexname LIKE '%deadline%'
       ) THEN '✅ PASS' ELSE '❌ FAIL' END as result;

-- =========================================
-- 4. TEST DES FONCTIONS RPC
-- =========================================

-- Tester la fonction get_profiles_with_id (limité à 1 résultat pour le test)
SELECT 'get_profiles_with_id function works' as test_name,
       CASE WHEN (
           SELECT COUNT(*) FROM get_profiles_with_id() LIMIT 1
       ) >= 0 THEN '✅ PASS' ELSE '❌ FAIL' END as result;

-- =========================================
-- 5. VÉRIFICATION DES POLITIQUES RLS
-- =========================================

-- Vérifier que RLS est activé sur notifications
SELECT 'notifications RLS enabled' as test_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_tables 
           WHERE tablename = 'notifications' AND rowsecurity = true
       ) THEN '✅ PASS' ELSE '❌ FAIL' END as result;

-- Vérifier les politiques sur notifications
SELECT 'notifications policies exist' as test_name,
       CASE WHEN (
           SELECT COUNT(*) FROM pg_policies 
           WHERE tablename = 'notifications'
       ) >= 3 THEN '✅ PASS' ELSE '❌ FAIL' END as result;

-- =========================================
-- 6. TEST D'INSERTION DE DONNÉES
-- =========================================

-- Tester l'insertion d'une notification (si un utilisateur existe)
DO $$
DECLARE
    test_user_id UUID;
    notification_id UUID;
BEGIN
    -- Trouver un utilisateur de test
    SELECT u.id INTO test_user_id
    FROM auth.users u
    JOIN profiles p ON u.id = p.user_id
    WHERE p.role = 'admin'
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Tenter d'insérer une notification de test
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (test_user_id, 'task_assigned', 'Test notification', 'Test message', '{"test": true}')
        RETURNING id INTO notification_id;
        
        -- Supprimer la notification de test
        DELETE FROM notifications WHERE id = notification_id;
        
        RAISE NOTICE 'Notification insert/delete test: ✅ PASS';
    ELSE
        RAISE NOTICE 'Notification insert/delete test: ⚠️ SKIP (no admin user found)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Notification insert/delete test: ❌ FAIL - %', SQLERRM;
END $$;

-- =========================================
-- 7. RÉSUMÉ DES TESTS
-- =========================================

SELECT '========================================' as summary;
SELECT 'DATABASE FIXES VERIFICATION COMPLETE' as summary;
SELECT '========================================' as summary;

-- Compter les résultats
WITH test_results AS (
    SELECT 'notifications table exists' as test_name,
           CASE WHEN EXISTS (
               SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'notifications'
           ) THEN 1 ELSE 0 END as passed
    UNION ALL
    SELECT 'projects.deadline column exists',
           CASE WHEN EXISTS (
               SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'projects' AND column_name = 'deadline'
           ) THEN 1 ELSE 0 END
    UNION ALL
    SELECT 'task_assignments table exists',
           CASE WHEN EXISTS (
               SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'task_assignments'
           ) THEN 1 ELSE 0 END
    UNION ALL
    SELECT 'RPC functions exist',
           CASE WHEN (
               SELECT COUNT(*) FROM information_schema.routines 
               WHERE routine_name IN ('get_task_assignments_with_projects', 'get_profiles_with_id')
           ) = 2 THEN 1 ELSE 0 END
)
SELECT 
    CONCAT('Total tests passed: ', SUM(passed), '/', COUNT(*)) as summary
FROM test_results;

SELECT 'If all tests pass, your database fixes are working correctly!' as summary; 