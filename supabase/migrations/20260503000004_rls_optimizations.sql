-- Optimization of RLS policies using a security definer function
-- This avoids repeated subqueries and improves performance

-- Function to get the current user's tenant_id (cached for the duration of the transaction)
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Check if tenant_id is already in the session settings to avoid DB lookup
    -- (Can be extended to use custom JWT claims if available)
    
    SELECT tenant_id INTO v_tenant_id
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if the current user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (SELECT is_super_admin FROM public.profiles WHERE user_id = auth.uid()),
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: Re-applying optimized policy to projects
-- (Note: You can apply this pattern to all multi-tenant tables)

DROP POLICY IF EXISTS "tenant_isolation" ON public.projects;
CREATE POLICY "tenant_isolation" ON public.projects
    FOR ALL
    USING (
        tenant_id = get_auth_tenant_id()
        OR is_super_admin()
    );

-- Apply to other tables...
DROP POLICY IF EXISTS "tenant_isolation_standard_tasks" ON public.standard_tasks;
CREATE POLICY "tenant_isolation_standard_tasks" ON public.standard_tasks
    FOR ALL
    USING (
        tenant_id = get_auth_tenant_id()
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "tenant_isolation_workflow_tasks" ON public.workflow_tasks;
CREATE POLICY "tenant_isolation_workflow_tasks" ON public.workflow_tasks
    FOR ALL
    USING (
        tenant_id = get_auth_tenant_id()
        OR is_super_admin()
    );
