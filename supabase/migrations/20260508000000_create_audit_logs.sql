-- ============================================================================
-- CRÉATION DE LA TABLE AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- SÉCURITÉ - RLS
-- ============================================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Super Admin peut tout voir
DROP POLICY IF EXISTS "audit_logs_super_admin_select" ON audit_logs;
CREATE POLICY "audit_logs_super_admin_select" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    );

-- 2. Tenant Admin peut voir les logs de son tenant
DROP POLICY IF EXISTS "audit_logs_tenant_admin_select" ON audit_logs;
CREATE POLICY "audit_logs_tenant_admin_select" ON audit_logs
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm 
            WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
        )
    );

-- 3. Tout utilisateur authentifié peut insérer ses propres logs (ou sans user_id pour les actions systèmes)
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR user_id IS NULL
    );

-- ============================================================================
-- FONCTION RPC POUR INSÉRER FACILEMENT DES LOGS (Optionnelle mais pratique)
-- ============================================================================
CREATE OR REPLACE FUNCTION log_audit_action(
    p_tenant_id UUID,
    p_action_type VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id VARCHAR DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_user_id UUID;
BEGIN
    -- Récupérer l'ID de l'utilisateur courant s'il y en a un
    v_user_id := auth.uid();
    
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        details
    ) VALUES (
        p_tenant_id,
        v_user_id,
        p_action_type,
        p_entity_type,
        p_entity_id,
        p_details
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
