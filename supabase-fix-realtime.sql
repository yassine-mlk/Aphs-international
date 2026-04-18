-- ============================================================================
-- SCRIPT DE RÉPARATION REALTIME SUPABASE
-- Exécutez ce script dans l'éditeur SQL de Supabase Dashboard
-- ============================================================================

-- 1. Désactiver RLS sur toutes les tables concernées
-- (Vous avez dit que RLS était désactivé, mais vérifions)
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS membre DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS video_meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS video_meeting_participants DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer TOUTES les policies existantes (au cas où)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE tablename IN ('messages', 'notifications', 'conversations', 'task_assignments', 'membre', 'projects', 'video_meetings', 'video_meeting_participants')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. Vérifier la publication supabase_realtime
-- Supprimer et recréer pour être sûr
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');

-- 4. Ajouter toutes les tables à la publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE membre;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE video_meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE video_meeting_participants;

-- 5. Vérification
SELECT 
    t.tablename,
    c.relrowsecurity as rls_enabled,
    EXISTS (
        SELECT 1 FROM pg_publication_tables pt 
        WHERE pt.pubname = 'supabase_realtime' 
        AND pt.tablename = t.tablename
    ) as in_realtime_pub,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) as policy_count
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.tablename IN ('messages', 'notifications', 'conversations', 'task_assignments', 'membre', 'projects', 'video_meetings', 'video_meeting_participants')
AND t.schemaname = 'public';
