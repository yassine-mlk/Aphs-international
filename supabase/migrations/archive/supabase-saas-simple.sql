-- ============================================================================
-- MIGRATION SaaS SIMPLIFIÉE
-- ============================================================================
-- Version minimaliste sans fonctions complexes
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

-- 3. AJOUTER COLONNES AUX TABLES EXISTANTES (sans vérifications complexes)

-- Profiles
DO $$
BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error altering profiles: %', SQLERRM;
END $$;

-- Projects
DO $$
BEGIN
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id UUID;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error altering projects: %', SQLERRM;
END $$;

-- Task assignments
DO $$
BEGIN
    ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS tenant_id UUID;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error altering task_assignments: %', SQLERRM;
END $$;

-- Membre
DO $$
BEGIN
    ALTER TABLE membre ADD COLUMN IF NOT EXISTS tenant_id UUID;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error altering membre: %', SQLERRM;
END $$;

-- Conversations
DO $$
BEGIN
    ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tenant_id UUID;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error altering conversations: %', SQLERRM;
END $$;

-- Messages
DO $$
BEGIN
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS tenant_id UUID;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error altering messages: %', SQLERRM;
END $$;

-- Companies
DO $$
BEGIN
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS tenant_id UUID;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error altering companies: %', SQLERRM;
END $$;

-- Video meetings
DO $$
BEGIN
    ALTER TABLE video_meetings ADD COLUMN IF NOT EXISTS tenant_id UUID;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error altering video_meetings: %', SQLERRM;
END $$;

-- Notifications
DO $$
BEGIN
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error altering notifications: %', SQLERRM;
END $$;

-- 4. MIGRATION DES DONNÉES EXISTANTES
DO $$
DECLARE
    default_tenant_id UUID;
    admin_email TEXT;
BEGIN
    -- Vérifier s'il y a des profils sans tenant
    IF EXISTS (SELECT 1 FROM profiles WHERE tenant_id IS NULL LIMIT 1) THEN
        -- Trouver un admin
        SELECT email INTO admin_email FROM profiles WHERE role = 'admin' LIMIT 1;
        
        IF admin_email IS NULL THEN
            admin_email := 'admin@legacy.com';
        END IF;
        
        -- Créer tenant legacy
        INSERT INTO tenants (name, slug, owner_email, plan, max_projects, max_intervenants, max_storage_gb, status)
        VALUES ('Client Legacy', 'legacy-client', admin_email, 'enterprise', 999, 999, 999, 'active')
        ON CONFLICT (slug) DO NOTHING
        RETURNING id INTO default_tenant_id;
        
        -- Si existe déjà
        IF default_tenant_id IS NULL THEN
            SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'legacy-client';
        END IF;
        
        -- Mettre à jour profils
        UPDATE profiles SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE profiles SET is_super_admin = true WHERE role = 'admin' AND tenant_id = default_tenant_id;
        
        -- Créer members
        INSERT INTO tenant_members (tenant_id, user_id, role, status)
        SELECT default_tenant_id, user_id, 
            CASE WHEN role = 'admin' THEN 'admin' ELSE 'intervenant' END,
            'active'
        FROM profiles
        WHERE tenant_id = default_tenant_id
        ON CONFLICT (tenant_id, user_id) DO NOTHING;
        
        -- Mettre à jour autres tables (si existent)
        UPDATE projects SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE task_assignments SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE membre SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE conversations SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE messages SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE companies SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE video_meetings SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE notifications SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        
        RAISE NOTICE 'Migration legacy terminée pour tenant: %', default_tenant_id;
    END IF;
END $$;

-- 5. RLS SIMPLE (sans fonctions externes)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

-- Politique simple pour tenants
DROP POLICY IF EXISTS "tenants_policy" ON tenants;
CREATE POLICY "tenants_policy" ON tenants
    FOR ALL
    USING (
        id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
        OR owner_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Politique simple pour tenant_members
DROP POLICY IF EXISTS "tenant_members_policy" ON tenant_members;
CREATE POLICY "tenant_members_policy" ON tenant_members
    FOR ALL
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- Index
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id);

-- Vérification
SELECT 'Migration SaaS terminée!' as status;
SELECT COUNT(*) as tenants_count FROM tenants;
SELECT COUNT(*) as members_count FROM tenant_members;
