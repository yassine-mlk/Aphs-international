-- ============================================================================
-- FIX RLS POLICIES - Version simplifiée qui fonctionne
-- ============================================================================

-- Désactiver RLS temporairement pour toutes les tables
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE membre DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les anciennes politiques
DROP POLICY IF EXISTS "tenants_select" ON tenants;
DROP POLICY IF EXISTS "tenants_insert" ON tenants;
DROP POLICY IF EXISTS "tenants_update" ON tenants;
DROP POLICY IF EXISTS "tenants_delete" ON tenants;
DROP POLICY IF EXISTS "tenant_members_select" ON tenant_members;
DROP POLICY IF EXISTS "tenant_members_insert" ON tenant_members;
DROP POLICY IF EXISTS "tenant_members_modify" ON tenant_members;
DROP POLICY IF EXISTS "tenant_members_all" ON tenant_members;
DROP POLICY IF EXISTS "projects_all" ON projects;
DROP POLICY IF EXISTS "task_assignments_all" ON task_assignments;
DROP POLICY IF EXISTS "membre_all" ON membre;
DROP POLICY IF EXISTS "conversations_all" ON conversations;
DROP POLICY IF EXISTS "messages_all" ON messages;
DROP POLICY IF EXISTS "companies_all" ON companies;
DROP POLICY IF EXISTS "video_meetings_all" ON video_meetings;
DROP POLICY IF EXISTS "notifications_all" ON notifications;

-- Réactiver RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE membre ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLITIQUES TENANTS (Super Admin = full access, owner = update)
-- ============================================================================

-- SELECT: Voir son tenant, ou tous si super admin
CREATE POLICY "tenants_select" ON tenants
    FOR SELECT
    USING (
        id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
        OR owner_user_id = auth.uid()
        OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true
    );

-- INSERT: Super admin uniquement
CREATE POLICY "tenants_insert" ON tenants
    FOR INSERT
    WITH CHECK (
        (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true
    );

-- UPDATE: Owner ou Super admin
CREATE POLICY "tenants_update" ON tenants
    FOR UPDATE
    USING (
        owner_user_id = auth.uid()
        OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true
    );

-- DELETE: Super admin uniquement  
CREATE POLICY "tenants_delete" ON tenants
    FOR DELETE
    USING (
        (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true
    );

-- ============================================================================
-- POLITIQUES TENANT_MEMBERS (Simplifiées)
-- ============================================================================

-- SELECT: Voir les membres de son tenant, ou tous si super admin
CREATE POLICY "tenant_members_select" ON tenant_members
    FOR SELECT
    USING (
        tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
        OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true
    );

-- INSERT: Super admin uniquement (simplifié pour éviter les erreurs)
CREATE POLICY "tenant_members_insert" ON tenant_members
    FOR INSERT
    WITH CHECK (
        (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true
    );

-- UPDATE/DELETE: Super admin uniquement
CREATE POLICY "tenant_members_modify" ON tenant_members
    FOR ALL
    USING (
        (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true
    );

-- ============================================================================
-- POLITIQUES AUTRES TABLES (simplifiées)
-- ============================================================================

-- Projects: Voir/modifier si membre du tenant, ou super admin
CREATE POLICY "projects_select" ON projects FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);
           
CREATE POLICY "projects_modify" ON projects FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);

-- Task assignments
CREATE POLICY "task_assignments_select" ON task_assignments FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);
           
CREATE POLICY "task_assignments_modify" ON task_assignments FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);

-- Membre
CREATE POLICY "membre_select" ON membre FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);
           
CREATE POLICY "membre_modify" ON membre FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);

-- Conversations
CREATE POLICY "conversations_select" ON conversations FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);
           
CREATE POLICY "conversations_modify" ON conversations FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);

-- Messages
CREATE POLICY "messages_select" ON messages FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR user_id = auth.uid()
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);
           
CREATE POLICY "messages_modify" ON messages FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR user_id = auth.uid()
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);

-- Companies
CREATE POLICY "companies_select" ON companies FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);
           
CREATE POLICY "companies_modify" ON companies FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);

-- Video meetings
CREATE POLICY "video_meetings_select" ON video_meetings FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);
           
CREATE POLICY "video_meetings_modify" ON video_meetings FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);

-- Notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR user_id = auth.uid()
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);
           
CREATE POLICY "notifications_modify" ON notifications FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
           OR user_id = auth.uid()
           OR (SELECT is_super_admin FROM profiles WHERE user_id = auth.uid()) = true);

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
SELECT 'RLS policies updated successfully!' as status;
