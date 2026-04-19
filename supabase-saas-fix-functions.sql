-- ============================================================================
-- FONCTIONS ET RLS POUR SAAS
-- ============================================================================

-- 1. FONCTION: Vérifier si l'utilisateur est Super Admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND is_super_admin = true
    );
EXCEPTION WHEN undefined_table THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FONCTION: Vérifier si l'utilisateur est membre d'un tenant
CREATE OR REPLACE FUNCTION is_tenant_member(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_members
        WHERE tenant_id = check_tenant_id
        AND user_id = auth.uid()
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FONCTION: Vérifier si l'utilisateur est admin d'un tenant
CREATE OR REPLACE FUNCTION is_tenant_admin(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_members
        WHERE tenant_id = check_tenant_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES SIMPLIFIÉES
-- ============================================================================

-- Tenants: Super Admin peut tout faire, les membres peuvent voir leur tenant
DROP POLICY IF EXISTS tenants_select ON tenants;
DROP POLICY IF EXISTS tenants_insert ON tenants;
DROP POLICY IF EXISTS tenants_update ON tenants;
DROP POLICY IF EXISTS tenants_delete ON tenants;

CREATE POLICY tenants_select ON tenants
    FOR SELECT
    USING (
        is_super_admin()
        OR id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
    );

CREATE POLICY tenants_insert ON tenants
    FOR INSERT
    WITH CHECK (is_super_admin());

CREATE POLICY tenants_update ON tenants
    FOR UPDATE
    USING (is_super_admin());

CREATE POLICY tenants_delete ON tenants
    FOR DELETE
    USING (is_super_admin());

-- Tenant Members: Gestion simplifiée
DROP POLICY IF EXISTS tenant_members_select ON tenant_members;
DROP POLICY IF EXISTS tenant_members_insert ON tenant_members;
DROP POLICY IF EXISTS tenant_members_update ON tenant_members;
DROP POLICY IF EXISTS tenant_members_delete ON tenant_members;

CREATE POLICY tenant_members_select ON tenant_members
    FOR SELECT
    USING (
        is_super_admin()
        OR tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
    );

CREATE POLICY tenant_members_insert ON tenant_members
    FOR INSERT
    WITH CHECK (
        is_super_admin()
        OR is_tenant_admin(tenant_id)
    );

CREATE POLICY tenant_members_update ON tenant_members
    FOR UPDATE
    USING (
        is_super_admin()
        OR is_tenant_admin(tenant_id)
    );

CREATE POLICY tenant_members_delete ON tenant_members
    FOR DELETE
    USING (
        is_super_admin()
        OR is_tenant_admin(tenant_id)
        OR user_id = auth.uid()
    );

-- Profiles: Mise à jour simplifiée
DROP POLICY IF EXISTS profiles_update ON profiles;

CREATE POLICY profiles_update ON profiles
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR is_super_admin()
    );

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
SELECT 'Fonctions créées:' as info;
SELECT proname FROM pg_proc WHERE proname IN ('is_super_admin', 'is_tenant_member', 'is_tenant_admin');
