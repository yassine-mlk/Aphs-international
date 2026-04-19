-- ============================================================================
-- FIX RLS ULTRA-SIMPLE - Désactiver RLS complètement pour tester
-- ============================================================================

-- Option 1: Désactiver RLS sur toutes les tables (pour tester)
ALTER TABLE IF EXISTS tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenant_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS membre DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS video_meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;

-- Option 2: OU Activer RLS avec politique simple pour Super Admin
-- (Décommentez cette section si vous voulez garder RLS)
/*
-- Supprimer toutes les politiques existantes
DO $$
DECLARE
    pol RECORD;
    tbl RECORD;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl.tablename LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl.tablename);
        END LOOP;
    END LOOP;
END $$;

-- Réactiver RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

-- Politique simple: Super Admin peut tout faire
CREATE POLICY "super_admin_all" ON tenants FOR ALL 
    USING ((SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "super_admin_members" ON tenant_members FOR ALL 
    USING ((SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()));
*/

SELECT 'RLS disabled on all tables - you can now test tenant creation' as status;
