-- ============================================================================
-- MIGRATION SaaS ULTRA-SIMPLE (sans fonctions PL/pgSQL)
-- ============================================================================

-- 1. TABLE DES TENANTS
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    owner_user_id UUID,
    plan VARCHAR(50) DEFAULT 'starter',
    max_projects INTEGER DEFAULT 5,
    max_intervenants INTEGER DEFAULT 10,
    max_storage_gb INTEGER DEFAULT 10,
    current_projects_count INTEGER DEFAULT 0,
    current_intervenants_count INTEGER DEFAULT 0,
    current_storage_used_bytes BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    trial_ends_at TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. TABLE DES MEMBRES
CREATE TABLE IF NOT EXISTS tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID,
    role VARCHAR(50) DEFAULT 'intervenant',
    status VARCHAR(20) DEFAULT 'active',
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- Ajouter contrainte FK pour owner_user_id
DO $$
BEGIN
    ALTER TABLE tenants 
    ADD CONSTRAINT fk_tenants_owner_user 
    FOREIGN KEY (owner_user_id) 
    REFERENCES auth.users(id) 
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_table THEN
    -- La contrainte existe déjà
    NULL;
WHEN OTHERS THEN
    RAISE NOTICE 'Could not add FK constraint: %', SQLERRM;
END $$;

-- 3. AJOUTER COLONNES (avec IF EXISTS)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE membre ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE video_meetings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 4. MIGRATION DES DONNÉES
-- Créer tenant legacy si des profils existent sans tenant
INSERT INTO tenants (name, slug, owner_email, plan, max_projects, max_intervenants, max_storage_gb, status)
SELECT 
    'Client Legacy',
    'legacy-client',
    COALESCE((SELECT email FROM profiles WHERE role = 'admin' LIMIT 1), 'admin@legacy.com'),
    'enterprise',
    999,
    999,
    999,
    'active'
WHERE EXISTS (SELECT 1 FROM profiles WHERE tenant_id IS NULL)
ON CONFLICT (slug) DO NOTHING;

-- Mettre à jour les profils avec le tenant legacy
UPDATE profiles 
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'legacy-client')
WHERE tenant_id IS NULL;

-- Marquer les admins comme super admin
UPDATE profiles 
SET is_super_admin = true 
WHERE role = 'admin' 
AND tenant_id = (SELECT id FROM tenants WHERE slug = 'legacy-client');

-- Créer les tenant_members
INSERT INTO tenant_members (tenant_id, user_id, role, status)
SELECT 
    (SELECT id FROM tenants WHERE slug = 'legacy-client'),
    user_id,
    CASE WHEN role = 'admin' THEN 'admin' ELSE 'intervenant' END,
    'active'
FROM profiles
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'legacy-client')
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Mettre à jour les autres tables
UPDATE projects SET tenant_id = (SELECT id FROM tenants WHERE slug = 'legacy-client') WHERE tenant_id IS NULL;
UPDATE task_assignments SET tenant_id = (SELECT id FROM tenants WHERE slug = 'legacy-client') WHERE tenant_id IS NULL;
UPDATE membre SET tenant_id = (SELECT id FROM tenants WHERE slug = 'legacy-client') WHERE tenant_id IS NULL;
UPDATE conversations SET tenant_id = (SELECT id FROM tenants WHERE slug = 'legacy-client') WHERE tenant_id IS NULL;
UPDATE messages SET tenant_id = (SELECT id FROM tenants WHERE slug = 'legacy-client') WHERE tenant_id IS NULL;
UPDATE companies SET tenant_id = (SELECT id FROM tenants WHERE slug = 'legacy-client') WHERE tenant_id IS NULL;
UPDATE video_meetings SET tenant_id = (SELECT id FROM tenants WHERE slug = 'legacy-client') WHERE tenant_id IS NULL;
UPDATE notifications SET tenant_id = (SELECT id FROM tenants WHERE slug = 'legacy-client') WHERE tenant_id IS NULL;

-- 5. ACTIVER RLS (Row Level Security)
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

-- 6. CRÉER LES POLITIQUES RLS

-- Politique pour tenants (lecture pour tous, modif pour owner et super admin)
DROP POLICY IF EXISTS "tenants_select" ON tenants;
CREATE POLICY "tenants_select" ON tenants
    FOR SELECT
    USING (
        id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
        OR owner_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Politique INSERT pour tenants (super admin uniquement)
DROP POLICY IF EXISTS "tenants_insert" ON tenants;
CREATE POLICY "tenants_insert" ON tenants
    FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Politique UPDATE pour tenants (owner ou super admin)
DROP POLICY IF EXISTS "tenants_update" ON tenants;
CREATE POLICY "tenants_update" ON tenants
    FOR UPDATE
    USING (
        owner_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    )
    WITH CHECK (
        owner_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Politique DELETE pour tenants (super admin uniquement)
DROP POLICY IF EXISTS "tenants_delete" ON tenants;
CREATE POLICY "tenants_delete" ON tenants
    FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Politique SELECT pour tenant_members
DROP POLICY IF EXISTS "tenant_members_select" ON tenant_members;
CREATE POLICY "tenant_members_select" ON tenant_members
    FOR SELECT
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Politique INSERT pour tenant_members (super admin ou admin du tenant)
DROP POLICY IF EXISTS "tenant_members_insert" ON tenant_members;
CREATE POLICY "tenant_members_insert" ON tenant_members
    FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
        OR EXISTS (
            SELECT 1 FROM tenant_members tm 
            WHERE tm.tenant_id = tenant_members.tenant_id 
            AND tm.user_id = auth.uid() 
            AND tm.role = 'admin'
        )
    );

-- Politique UPDATE/DELETE pour tenant_members
DROP POLICY IF EXISTS "tenant_members_modify" ON tenant_members;
CREATE POLICY "tenant_members_modify" ON tenant_members
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
        OR EXISTS (
            SELECT 1 FROM tenant_members tm 
            WHERE tm.tenant_id = tenant_members.tenant_id 
            AND tm.user_id = auth.uid() 
            AND tm.role = 'admin'
        )
    );

-- Politique pour projects
DROP POLICY IF EXISTS "projects_all" ON projects;
CREATE POLICY "projects_all" ON projects
    FOR ALL
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Politique pour task_assignments
DROP POLICY IF EXISTS "task_assignments_all" ON task_assignments;
CREATE POLICY "task_assignments_all" ON task_assignments
    FOR ALL
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Politique pour membre
DROP POLICY IF EXISTS "membre_all" ON membre;
CREATE POLICY "membre_all" ON membre
    FOR ALL
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Politique pour conversations
DROP POLICY IF EXISTS "conversations_all" ON conversations;
CREATE POLICY "conversations_all" ON conversations
    FOR ALL
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Politique pour messages
DROP POLICY IF EXISTS "messages_all" ON messages;
CREATE POLICY "messages_all" ON messages
    FOR ALL
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Politique pour companies
DROP POLICY IF EXISTS "companies_all" ON companies;
CREATE POLICY "companies_all" ON companies
    FOR ALL
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Politique pour video_meetings
DROP POLICY IF EXISTS "video_meetings_all" ON video_meetings;
CREATE POLICY "video_meetings_all" ON video_meetings
    FOR ALL
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Politique pour notifications
DROP POLICY IF EXISTS "notifications_all" ON notifications;
CREATE POLICY "notifications_all" ON notifications
    FOR ALL
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
        OR user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- 7. INDEX
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_tenant ON task_assignments(tenant_id);

-- Vérification finale
SELECT 'Migration SaaS terminée avec succès!' as status;
SELECT COUNT(*) as tenants FROM tenants;
SELECT COUNT(*) as members FROM tenant_members;
SELECT COUNT(*) as profiles_with_tenant FROM profiles WHERE tenant_id IS NOT NULL;
