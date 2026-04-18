-- ============================================================================
-- MIGRATION SaaS MULTI-TENANT
-- ============================================================================
-- Ce script crée la structure de base pour passer en mode SaaS multi-tenant
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE DES TENANTS (Organisations/Clients)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,                    -- Nom de l'entreprise/client
    slug VARCHAR(100) UNIQUE NOT NULL,             -- Identifiant unique URL-friendly
    
    -- Contact et propriétaire
    owner_email VARCHAR(255) NOT NULL,             -- Email du admin principal
    owner_user_id UUID REFERENCES profiles(user_id),
    
    -- Plan et limites
    plan VARCHAR(50) DEFAULT 'starter',            -- starter, pro, enterprise, custom
    max_projects INTEGER DEFAULT 5,
    max_intervenants INTEGER DEFAULT 10,
    max_storage_gb INTEGER DEFAULT 10,
    
    -- Utilisation actuelle (mise à jour via triggers ou calculée)
    current_projects_count INTEGER DEFAULT 0,
    current_intervenants_count INTEGER DEFAULT 0,
    current_storage_used_bytes BIGINT DEFAULT 0,
    
    -- Statut et cycle de vie
    status VARCHAR(20) DEFAULT 'active',           -- active, trial, suspended, cancelled
    trial_ends_at TIMESTAMP,
    subscription_starts_at TIMESTAMP,
    subscription_ends_at TIMESTAMP,
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    settings JSONB DEFAULT '{}',                   -- Config spécifique au tenant
    
    -- Facturation (optionnel pour l'instant)
    billing_email VARCHAR(255),
    billing_address TEXT,
    tax_id VARCHAR(50)                             -- Numéro de TVA/SIRET
);

-- Index pour tenants
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

COMMENT ON TABLE tenants IS 'Table des organisations/tenants SaaS';
COMMENT ON COLUMN tenants.slug IS 'Identifiant unique utilisé dans les URLs (ex: aps-construction-paris)';

-- ----------------------------------------------------------------------------
-- 2. TABLE DES MEMBRES DE TENANT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(user_id),
    
    -- Rôle dans le tenant
    role VARCHAR(50) DEFAULT 'intervenant',        -- admin, intervenant, viewer
    
    -- Statut d'invitation
    invited_by UUID REFERENCES profiles(user_id),
    invited_at TIMESTAMP DEFAULT NOW(),
    joined_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',          -- pending, active, deactivated
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(tenant_id, user_id)
);

-- Index pour tenant_members
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_status ON tenant_members(status);

COMMENT ON TABLE tenant_members IS 'Association users <-> tenants avec rôles';

-- ----------------------------------------------------------------------------
-- 3. AJOUTER TENANT_ID AUX TABLES EXISTANTES
-- ----------------------------------------------------------------------------

-- Table profiles
ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id),
    ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Table projects
ALTER TABLE projects 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Table intervenants  
ALTER TABLE intervenants 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Table task_assignments
ALTER TABLE task_assignments 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Table membre
ALTER TABLE membre 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Table conversations (messages)
ALTER TABLE conversations 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE messages 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Table companies (sociétés)
ALTER TABLE companies 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Table video_meetings
ALTER TABLE video_meetings 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Table notifications
ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- ----------------------------------------------------------------------------
-- 4. FONCTIONS UTILITAIRES
-- ----------------------------------------------------------------------------

-- Fonction pour récupérer le tenant_id courant depuis le JWT
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
    tenant_id UUID;
BEGIN
    -- Récupérer depuis les claims du JWT Supabase
    tenant_id := current_setting('app.current_tenant_id', true)::UUID;
    RETURN tenant_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si l'utilisateur est super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    SELECT p.is_super_admin INTO is_admin
    FROM profiles p
    WHERE p.user_id = auth.uid();
    RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si l'utilisateur est admin d'un tenant
CREATE OR REPLACE FUNCTION is_tenant_admin(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM tenant_members tm
        WHERE tm.tenant_id = tenant_uuid
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
        AND tm.status = 'active'
    ) INTO is_admin;
    RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si l'utilisateur est membre d'un tenant
CREATE OR REPLACE FUNCTION is_tenant_member(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_member BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM tenant_members tm
        WHERE tm.tenant_id = tenant_uuid
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    ) INTO is_member;
    RETURN COALESCE(is_member, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 5. MISE À JOUR AUTOMATIQUE DES COMpteurs
-- ----------------------------------------------------------------------------

-- Fonction pour mettre à jour les compteurs d'un tenant
CREATE OR REPLACE FUNCTION update_tenant_counters()
RETURNS TRIGGER AS $$
DECLARE
    target_tenant_id UUID;
BEGIN
    -- Déterminer le tenant_id concerné
    IF TG_OP = 'DELETE' THEN
        target_tenant_id := OLD.tenant_id;
    ELSE
        target_tenant_id := NEW.tenant_id;
    END IF;
    
    IF target_tenant_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Mettre à jour selon la table
    IF TG_TABLE_NAME = 'projects' THEN
        UPDATE tenants 
        SET current_projects_count = (
            SELECT COUNT(*) FROM projects WHERE tenant_id = target_tenant_id
        ),
        updated_at = NOW()
        WHERE id = target_tenant_id;
        
    ELSIF TG_TABLE_NAME = 'intervenants' OR TG_TABLE_NAME = 'profiles' THEN
        -- Pour les intervenants (profils avec rôle intervenant)
        UPDATE tenants 
        SET current_intervenants_count = (
            SELECT COUNT(DISTINCT tm.user_id) 
            FROM tenant_members tm
            WHERE tm.tenant_id = target_tenant_id
            AND tm.status = 'active'
        ),
        updated_at = NOW()
        WHERE id = target_tenant_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers pour mise à jour auto des compteurs
DROP TRIGGER IF EXISTS update_tenant_counters_projects ON projects;
CREATE TRIGGER update_tenant_counters_projects
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_counters();

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) - Isolation des données
-- ----------------------------------------------------------------------------

-- Activer RLS sur toutes les tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE membre ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "tenant_isolation_projects" ON projects;
DROP POLICY IF EXISTS "tenant_isolation_intervenants" ON intervenants;
DROP POLICY IF EXISTS "tenant_isolation_task_assignments" ON task_assignments;
DROP POLICY IF EXISTS "tenant_isolation_membre" ON membre;
DROP POLICY IF EXISTS "tenant_isolation_conversations" ON conversations;
DROP POLICY IF EXISTS "tenant_isolation_messages" ON messages;
DROP POLICY IF EXISTS "tenant_isolation_companies" ON companies;
DROP POLICY IF EXISTS "tenant_isolation_video_meetings" ON video_meetings;
DROP POLICY IF EXISTS "tenant_isolation_notifications" ON notifications;

-- Politique pour projects
CREATE POLICY "tenant_isolation_projects" ON projects
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
        OR is_super_admin()
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
        OR is_super_admin()
    );

-- Politique pour intervenants
CREATE POLICY "tenant_isolation_intervenants" ON intervenants
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
        OR is_super_admin()
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
        OR is_super_admin()
    );

-- Politique pour task_assignments
CREATE POLICY "tenant_isolation_task_assignments" ON task_assignments
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
        OR is_super_admin()
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
        OR is_super_admin()
    );

-- Politique pour membre
CREATE POLICY "tenant_isolation_membre" ON membre
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
        OR is_super_admin()
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
        OR is_super_admin()
    );

-- Politique pour messages (simplifiée, besoin de vérifier aussi conversation)
CREATE POLICY "tenant_isolation_messages" ON messages
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
        OR is_super_admin()
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
        OR is_super_admin()
    );

-- Politique pour notifications
CREATE POLICY "tenant_isolation_notifications" ON notifications
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
        OR is_super_admin()
        OR user_id = auth.uid()  -- Notifications personnelles
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
        OR is_super_admin()
    );

-- Politiques pour tenants (qui peut voir/modifier)
DROP POLICY IF EXISTS "tenants_view" ON tenants;
DROP POLICY IF EXISTS "tenants_update" ON tenants;

CREATE POLICY "tenants_view" ON tenants
    FOR SELECT
    USING (
        id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
        OR owner_user_id = auth.uid()
        OR is_super_admin()
    );

CREATE POLICY "tenants_update" ON tenants
    FOR UPDATE
    USING (
        owner_user_id = auth.uid()
        OR is_super_admin()
    )
    WITH CHECK (
        owner_user_id = auth.uid()
        OR is_super_admin()
    );

-- Politiques pour tenant_members
DROP POLICY IF EXISTS "tenant_members_view" ON tenant_members;
DROP POLICY IF EXISTS "tenant_members_manage" ON tenant_members;

CREATE POLICY "tenant_members_view" ON tenant_members
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tm2.tenant_id FROM tenant_members tm2
            WHERE tm2.user_id = auth.uid()
            AND tm2.status = 'active'
        )
        OR is_super_admin()
    );

CREATE POLICY "tenant_members_manage" ON tenant_members
    FOR ALL
    USING (
        is_tenant_admin(tenant_id)
        OR is_super_admin()
    )
    WITH CHECK (
        is_tenant_admin(tenant_id)
        OR is_super_admin()
    );

-- ----------------------------------------------------------------------------
-- 7. MIGRATION DES DONNÉES EXISTANTES
-- ----------------------------------------------------------------------------

-- Créer un tenant par défaut pour les données existantes
DO $$
DECLARE
    default_tenant_id UUID;
BEGIN
    -- Vérifier si des données existent sans tenant_id
    IF EXISTS (SELECT 1 FROM profiles WHERE tenant_id IS NULL LIMIT 1) THEN
        -- Créer le tenant Legacy
        INSERT INTO tenants (
            name, 
            slug, 
            owner_email, 
            plan, 
            max_projects, 
            max_intervenants, 
            max_storage_gb,
            status,
            is_super_admin
        )
        SELECT 
            'Client Legacy',
            'legacy-client',
            email,
            'enterprise',
            999,
            999,
            999,
            'active',
            true
        FROM profiles 
        WHERE role = 'admin' 
        LIMIT 1
        ON CONFLICT (slug) DO NOTHING
        RETURNING id INTO default_tenant_id;
        
        -- Si le tenant existait déjà, récupérer son ID
        IF default_tenant_id IS NULL THEN
            SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'legacy-client';
        END IF;
        
        -- Mettre à jour tous les profils existants
        UPDATE profiles SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE profiles SET is_super_admin = true WHERE role = 'admin' AND tenant_id = default_tenant_id;
        
        -- Créer les tenant_members pour tous les users existants
        INSERT INTO tenant_members (tenant_id, user_id, role, status, joined_at)
        SELECT default_tenant_id, user_id, 
            CASE 
                WHEN role = 'admin' THEN 'admin'
                ELSE 'intervenant'
            END,
            'active',
            NOW()
        FROM profiles
        WHERE tenant_id = default_tenant_id
        ON CONFLICT (tenant_id, user_id) DO NOTHING;
        
        -- Mettre à jour les autres tables
        UPDATE projects SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE intervenants SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE task_assignments SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE membre SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE conversations SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE messages SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE companies SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE video_meetings SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        UPDATE notifications SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
        
        -- Mettre à jour les compteurs du tenant
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
-- 8. VÉRIFICATION
-- ----------------------------------------------------------------------------

SELECT 
    'Tenants créés: ' || COUNT(*)::text as info
FROM tenants;

SELECT 
    'Tenant members: ' || COUNT(*)::text as info
FROM tenant_members;

SELECT 
    'Profils avec tenant_id: ' || COUNT(*)::text || ' / ' || (SELECT COUNT(*) FROM profiles)::text as info
FROM profiles 
WHERE tenant_id IS NOT NULL;

-- Liste des tenants
SELECT 
    t.id,
    t.name,
    t.slug,
    t.plan,
    t.status,
    t.current_projects_count,
    t.current_intervenants_count,
    p.email as owner_email
FROM tenants t
LEFT JOIN profiles p ON t.owner_user_id = p.user_id;
