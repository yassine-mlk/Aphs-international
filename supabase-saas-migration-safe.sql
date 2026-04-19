-- ============================================================================
-- MIGRATION SaaS MULTI-TENANT (Version sécurisée)
-- ============================================================================
-- Ce script crée la structure SaaS en vérifiant l'existence des tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE DES TENANTS (Organisations/Clients)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    owner_user_id UUID REFERENCES profiles(user_id),
    plan VARCHAR(50) DEFAULT 'starter',
    max_projects INTEGER DEFAULT 5,
    max_intervenants INTEGER DEFAULT 10,
    max_storage_gb INTEGER DEFAULT 10,
    current_projects_count INTEGER DEFAULT 0,
    current_intervenants_count INTEGER DEFAULT 0,
    current_storage_used_bytes BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    trial_ends_at TIMESTAMP,
    subscription_starts_at TIMESTAMP,
    subscription_ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    settings JSONB DEFAULT '{}',
    billing_email VARCHAR(255),
    billing_address TEXT,
    tax_id VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- ----------------------------------------------------------------------------
-- 2. TABLE DES MEMBRES DE TENANT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(user_id),
    role VARCHAR(50) DEFAULT 'intervenant',
    invited_by UUID REFERENCES profiles(user_id),
    invited_at TIMESTAMP DEFAULT NOW(),
    joined_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id);

-- ----------------------------------------------------------------------------
-- 3. AJOUTER TENANT_ID AUX TABLES EXISTANTES (avec vérification)
-- ----------------------------------------------------------------------------

-- Fonction helper pour ajouter une colonne si la table existe
CREATE OR REPLACE FUNCTION add_tenant_id_if_table_exists(target_table text)
RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = target_table
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id)', target_table);
        RAISE NOTICE 'Added tenant_id to table: %', target_table;
    ELSE
        RAISE NOTICE 'Table does not exist, skipping: %', target_table;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Appliquer à toutes les tables
SELECT add_tenant_id_if_table_exists('profiles');
SELECT add_tenant_id_if_table_exists('projects');
SELECT add_tenant_id_if_table_exists('intervenants');
SELECT add_tenant_id_if_table_exists('task_assignments');
SELECT add_tenant_id_if_table_exists('membre');
SELECT add_tenant_id_if_table_exists('conversations');
SELECT add_tenant_id_if_table_exists('messages');
SELECT add_tenant_id_if_table_exists('companies');
SELECT add_tenant_id_if_table_exists('video_meetings');
SELECT add_tenant_id_if_table_exists('notifications');

-- Colonne spéciale pour profiles (is_super_admin)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_super_admin to profiles';
    END IF;
END $$;

-- Supprimer la fonction helper
DROP FUNCTION IF EXISTS add_tenant_id_if_table_exists(text);

-- ----------------------------------------------------------------------------
-- 4. FONCTIONS UTILITAIRES
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    result BOOLEAN;
BEGIN
    BEGIN
        -- Essayer de lire la colonne is_super_admin
        EXECUTE 'SELECT COALESCE(is_super_admin, false) FROM profiles WHERE user_id = $1'
        INTO result
        USING auth.uid();
        
        RETURN COALESCE(result, false);
    EXCEPTION
        WHEN undefined_column THEN
            -- La colonne n'existe pas encore
            RETURN false;
        WHEN OTHERS THEN
            -- Toute autre erreur
            RETURN false;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_tenant_admin(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    admin_flag BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM tenant_members tm
        WHERE tm.tenant_id = tenant_uuid
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
        AND tm.status = 'active'
    ) INTO admin_flag;
    RETURN COALESCE(admin_flag, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) - Uniquement pour les tables qui existent
-- ----------------------------------------------------------------------------

-- Activer RLS sur tenants et tenant_members
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_view" ON tenants;
DROP POLICY IF EXISTS "tenants_update" ON tenants;
DROP POLICY IF EXISTS "tenant_members_view" ON tenant_members;
DROP POLICY IF EXISTS "tenant_members_manage" ON tenant_members;

CREATE POLICY "tenants_view" ON tenants
    FOR SELECT
    USING (
        id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid() AND tm.status = 'active')
        OR owner_user_id = auth.uid()
        OR is_super_admin()
    );

CREATE POLICY "tenants_update" ON tenants
    FOR UPDATE
    USING (owner_user_id = auth.uid() OR is_super_admin())
    WITH CHECK (owner_user_id = auth.uid() OR is_super_admin());

CREATE POLICY "tenant_members_view" ON tenant_members
    FOR SELECT
    USING (
        tenant_id IN (SELECT tm2.tenant_id FROM tenant_members tm2 WHERE tm2.user_id = auth.uid() AND tm2.status = 'active')
        OR is_super_admin()
    );

CREATE POLICY "tenant_members_manage" ON tenant_members
    FOR ALL
    USING (is_tenant_admin(tenant_id) OR is_super_admin())
    WITH CHECK (is_tenant_admin(tenant_id) OR is_super_admin());

-- Fonction pour activer RLS sur une table si elle existe
CREATE OR REPLACE FUNCTION enable_rls_if_exists(target_table text)
RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = target_table
    ) THEN
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target_table);
        
        -- Créer la politique d'isolation
        EXECUTE format('
            DROP POLICY IF EXISTS "tenant_isolation_%I" ON %I;
            CREATE POLICY "tenant_isolation_%I" ON %I
                FOR ALL
                USING (
                    tenant_id IN (
                        SELECT tm.tenant_id FROM tenant_members tm
                        WHERE tm.user_id = auth.uid()
                        AND tm.status = ''active''
                    )
                    OR is_super_admin()
                )
                WITH CHECK (
                    tenant_id IN (
                        SELECT tm.tenant_id FROM tenant_members tm
                        WHERE tm.user_id = auth.uid()
                        AND tm.status = ''active''
                    )
                    OR is_super_admin()
                );
        ', target_table, target_table, target_table, target_table);
        
        RAISE NOTICE 'Enabled RLS on table: %', target_table;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Activer RLS sur les tables existantes
SELECT enable_rls_if_exists('projects');
SELECT enable_rls_if_exists('intervenants');
SELECT enable_rls_if_exists('task_assignments');
SELECT enable_rls_if_exists('membre');
SELECT enable_rls_if_exists('conversations');
SELECT enable_rls_if_exists('messages');
SELECT enable_rls_if_exists('companies');
SELECT enable_rls_if_exists('video_meetings');
SELECT enable_rls_if_exists('notifications');

DROP FUNCTION IF EXISTS enable_rls_if_exists(text);

-- ----------------------------------------------------------------------------
-- 6. MIGRATION DES DONNÉES EXISTANTES
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    default_tenant_id UUID;
    admin_user_id UUID;
BEGIN
    -- Vérifier si des données existent sans tenant_id
    IF EXISTS (SELECT 1 FROM profiles WHERE tenant_id IS NULL LIMIT 1) THEN
        -- Trouver le premier admin
        SELECT user_id INTO admin_user_id FROM profiles WHERE role = 'admin' LIMIT 1;
        
        IF admin_user_id IS NULL THEN
            RAISE NOTICE 'No admin user found. Skipping legacy migration.';
            RETURN;
        END IF;
        
        -- Créer le tenant Legacy
        INSERT INTO tenants (
            name, slug, owner_email, owner_user_id, plan, 
            max_projects, max_intervenants, max_storage_gb, status
        )
        SELECT 
            'Client Legacy',
            'legacy-client',
            email,
            user_id,
            'enterprise',
            999, 999, 999,
            'active'
        FROM profiles 
        WHERE role = 'admin' 
        LIMIT 1
        ON CONFLICT (slug) DO NOTHING
        RETURNING id INTO default_tenant_id;
        
        -- Si le tenant existait déjà
        IF default_tenant_id IS NULL THEN
            SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'legacy-client';
        END IF;
        
        IF default_tenant_id IS NULL THEN
            RAISE NOTICE 'Could not create or find legacy tenant.';
            RETURN;
        END IF;
        
        -- Mettre à jour tous les profils
        UPDATE profiles SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE profiles SET is_super_admin = true WHERE role = 'admin' AND tenant_id = default_tenant_id;
        
        -- Créer les tenant_members
        INSERT INTO tenant_members (tenant_id, user_id, role, status, joined_at)
        SELECT default_tenant_id, user_id, 
            CASE WHEN role = 'admin' THEN 'admin' ELSE 'intervenant' END,
            'active', NOW()
        FROM profiles
        WHERE tenant_id = default_tenant_id
        ON CONFLICT (tenant_id, user_id) DO NOTHING;
        
        -- Mettre à jour les autres tables (si elles existent)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
            UPDATE projects SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intervenants') THEN
            UPDATE intervenants SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_assignments') THEN
            UPDATE task_assignments SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'membre') THEN
            UPDATE membre SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
            UPDATE conversations SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
            UPDATE messages SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
            UPDATE companies SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meetings') THEN
            UPDATE video_meetings SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
            UPDATE notifications SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        END IF;
        
        -- Mettre à jour les compteurs
        UPDATE tenants 
        SET current_projects_count = (SELECT COUNT(*) FROM projects WHERE tenant_id = default_tenant_id),
            current_intervenants_count = (SELECT COUNT(*) FROM tenant_members WHERE tenant_id = default_tenant_id),
            updated_at = NOW()
        WHERE id = default_tenant_id;
        
        RAISE NOTICE 'Migration Legacy terminée. Tenant ID: %', default_tenant_id;
    ELSE
        RAISE NOTICE 'Aucune donnée legacy à migrer.';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7. VÉRIFICATION
-- ----------------------------------------------------------------------------

SELECT 'Migration terminée!' as status;
SELECT COUNT(*) as total_tenants FROM tenants;
SELECT COUNT(*) as total_tenant_members FROM tenant_members;
