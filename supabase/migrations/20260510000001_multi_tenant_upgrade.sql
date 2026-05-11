-- ============================================================================
-- Migration multi-tenant : un user dans plusieurs tenants
-- ============================================================================
-- 1. Aligne tenant_members sur le nouveau schéma (FK auth.users, contraintes)
-- 2. Migre get_auth_tenant_id() → is_tenant_member()
-- 3. Uniformise les RLS policies
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. ALIGNER TENANT_MEMBERS
-- --------------------------------------------------------------------------

-- Drop existing FK on user_id (references profiles)
ALTER TABLE public.tenant_members
    DROP CONSTRAINT IF EXISTS tenant_members_user_id_fkey;

-- Ensure invited_by column exists
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS invited_by UUID;

-- Drop existing FK on invited_by (references profiles)
ALTER TABLE public.tenant_members
    DROP CONSTRAINT IF EXISTS tenant_members_invited_by_fkey;

-- Re-add FK referencing auth.users(id) with SET NULL
ALTER TABLE public.tenant_members
    ADD CONSTRAINT tenant_members_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Re-add FK referencing auth.users(id) with CASCADE
ALTER TABLE public.tenant_members
    ADD CONSTRAINT tenant_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add CHECK constraints on role and status
ALTER TABLE public.tenant_members
    DROP CONSTRAINT IF EXISTS tenant_members_role_check;

ALTER TABLE public.tenant_members
    ADD CONSTRAINT tenant_members_role_check
    CHECK (role IN ('admin', 'intervenant'));

ALTER TABLE public.tenant_members
    DROP CONSTRAINT IF EXISTS tenant_members_status_check;

ALTER TABLE public.tenant_members
    ADD CONSTRAINT tenant_members_status_check
    CHECK (status IN ('active', 'invited', 'suspended'));

-- Change default status from 'pending' to 'active'
ALTER TABLE public.tenant_members
    ALTER COLUMN status SET DEFAULT 'active';

-- --------------------------------------------------------------------------
-- 2. METTRE À JOUR get_auth_tenant_id()
--    Avant : lisait profiles.tenant_id (1 seul tenant)
--    Après : renvoie le tenant_id le plus récent (fallback)
--    → dépréciée au profit de is_tenant_member() pour les RLS
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Retourne le dernier tenant actif rejoint
    SELECT tenant_id INTO v_tenant_id
    FROM public.tenant_members
    WHERE user_id = auth.uid()
      AND status = 'active'
    ORDER BY joined_at DESC NULLS LAST
    LIMIT 1;

    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 3. METTRE À JOUR is_tenant_member() / is_tenant_admin()
--    (Les versions existantes sont déjà correctes, on s'assure juste
--     qu'elles sont à jour et qu'elles utilisent auth.uid())
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_tenant_member(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.tenant_members
        WHERE tenant_id = check_tenant_id
          AND user_id = auth.uid()
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.tenant_members
        WHERE tenant_id = check_tenant_id
          AND user_id = auth.uid()
          AND role = 'admin'
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 4. RLS POLICIES — passer de get_auth_tenant_id() à is_tenant_member()
--    pour supporter les users multi-tenants
-- --------------------------------------------------------------------------

-- Projets
DROP POLICY IF EXISTS "tenant_isolation" ON public.projects;
CREATE POLICY "tenant_isolation" ON public.projects
    FOR ALL
    USING (
        is_tenant_member(tenant_id)
        OR is_super_admin()
    );

-- Tâches standard
DROP POLICY IF EXISTS "tenant_isolation_standard_tasks" ON public.standard_tasks;
CREATE POLICY "tenant_isolation_standard_tasks" ON public.standard_tasks
    FOR ALL
    USING (
        is_tenant_member(tenant_id)
        OR is_super_admin()
    );

-- Tâches workflow
DROP POLICY IF EXISTS "tenant_isolation_workflow_tasks" ON public.workflow_tasks;
CREATE POLICY "tenant_isolation_workflow_tasks" ON public.workflow_tasks
    FOR ALL
    USING (
        is_tenant_member(tenant_id)
        OR is_super_admin()
    );

-- RLS tenant_members elle-même : un user voit ses memberships
-- et les admins voient ceux de leur tenant
DROP POLICY IF EXISTS "tenant_members_select" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant_members_insert" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant_members_update" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant_members_delete" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant_members_view" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant_members_manage" ON public.tenant_members;

-- SELECT : l'user voit ses propres memberships + les membres de ses tenants
CREATE POLICY "tenant_members_select" ON public.tenant_members
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR is_tenant_admin(tenant_id)
        OR is_super_admin()
    );

-- INSERT : seuls les admins du tenant ou super admin peuvent ajouter
CREATE POLICY "tenant_members_insert" ON public.tenant_members
    FOR INSERT
    WITH CHECK (
        is_tenant_admin(tenant_id)
        OR is_super_admin()
    );

-- UPDATE : admin du tenant ou super admin
CREATE POLICY "tenant_members_update" ON public.tenant_members
    FOR UPDATE
    USING (
        is_tenant_admin(tenant_id)
        OR is_super_admin()
    );

-- DELETE : admin du tenant, super admin, ou le user lui-même
CREATE POLICY "tenant_members_delete" ON public.tenant_members
    FOR DELETE
    USING (
        is_tenant_admin(tenant_id)
        OR is_super_admin()
        OR user_id = auth.uid()
    );

-- Tenants
DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update" ON public.tenants;
DROP POLICY IF EXISTS "tenants_delete" ON public.tenants;
DROP POLICY IF EXISTS "tenants_view" ON public.tenants;

CREATE POLICY "tenants_select" ON public.tenants
    FOR SELECT
    USING (
        is_tenant_member(id)
        OR is_super_admin()
    );

CREATE POLICY "tenants_insert" ON public.tenants
    FOR INSERT
    WITH CHECK (is_super_admin());

CREATE POLICY "tenants_update" ON public.tenants
    FOR UPDATE
    USING (is_super_admin());

CREATE POLICY "tenants_delete" ON public.tenants
    FOR DELETE
    USING (is_super_admin());

-- --------------------------------------------------------------------------
-- 4b. RLS NOTIFICATIONS — remplacer profiles.tenant_id par tenant_members
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenant isolation for notifications" ON public.notifications;
CREATE POLICY "Tenant isolation for notifications" ON public.notifications
    FOR ALL
    USING (
        tenant_id IS NULL
        OR is_tenant_member(tenant_id)
        OR is_super_admin()
    );

-- --------------------------------------------------------------------------
-- 4c. RLS COMPANIES — remplacer get_auth_tenant_id() par is_tenant_member()
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenant isolation for companies" ON public.companies;
CREATE POLICY "Tenant isolation for companies" ON public.companies
    FOR ALL
    USING (
        is_tenant_member(tenant_id)
        OR is_super_admin()
    );

-- --------------------------------------------------------------------------
-- 4d. RLS SUR LES TABLES MANQUANTES (messages, conversations, video_meetings, membre)
-- --------------------------------------------------------------------------
DO $$
BEGIN
    -- messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'tenant_id' AND table_schema = 'public')
    THEN
        EXECUTE 'DROP POLICY IF EXISTS "messages_tenant_policy" ON public.messages';
        EXECUTE 'CREATE POLICY "messages_tenant_policy" ON public.messages
            FOR ALL USING (is_tenant_member(tenant_id) OR is_super_admin())';
    END IF;

    -- conversations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations' AND table_schema = 'public') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'tenant_id' AND table_schema = 'public')
    THEN
        EXECUTE 'DROP POLICY IF EXISTS "conversations_tenant_policy" ON public.conversations';
        EXECUTE 'CREATE POLICY "conversations_tenant_policy" ON public.conversations
            FOR ALL USING (is_tenant_member(tenant_id) OR is_super_admin())';
    END IF;

    -- video_meetings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meetings' AND table_schema = 'public') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meetings' AND column_name = 'tenant_id' AND table_schema = 'public')
    THEN
        EXECUTE 'DROP POLICY IF EXISTS "video_meetings_tenant_policy" ON public.video_meetings';
        EXECUTE 'CREATE POLICY "video_meetings_tenant_policy" ON public.video_meetings
            FOR ALL USING (is_tenant_member(tenant_id) OR is_super_admin())';
    END IF;

    -- membre
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'membre' AND table_schema = 'public') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membre' AND column_name = 'tenant_id' AND table_schema = 'public')
    THEN
        EXECUTE 'DROP POLICY IF EXISTS "membre_tenant_policy" ON public.membre';
        EXECUTE 'CREATE POLICY "membre_tenant_policy" ON public.membre
            FOR ALL USING (is_tenant_member(tenant_id) OR is_super_admin())';
    END IF;
END $$;

-- Appliquer RLS sur workgroups si la table et tenant_id existent
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'workgroups' AND table_schema = 'public'
    ) THEN
        EXECUTE 'ALTER TABLE IF EXISTS public.workgroups ENABLE ROW LEVEL SECURITY';

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'workgroups' AND column_name = 'tenant_id' AND table_schema = 'public'
        ) THEN
            EXECUTE 'DROP POLICY IF EXISTS "workgroups_tenant_policy" ON public.workgroups';
            EXECUTE 'CREATE POLICY "workgroups_tenant_policy" ON public.workgroups
                FOR ALL USING (is_tenant_member(tenant_id) OR is_super_admin())';
        END IF;
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 5. FONCTION RPC : invite_user_to_tenant
--    Crée un user auth + profil + membership en une seule opération
--    (SECURITY DEFINER pour pouvoir écrire dans auth.users)
-- --------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.invite_user_to_tenant(
    p_email TEXT,
    p_first_name TEXT DEFAULT '',
    p_last_name TEXT DEFAULT '',
    p_role TEXT DEFAULT 'intervenant',
    p_tenant_id UUID DEFAULT NULL,
    p_invited_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_existing_user_id UUID;
    v_encrypted_password TEXT;
    v_result JSONB;
BEGIN
    -- Vérifier que l'appelant est admin du tenant (ou super admin)
    IF p_tenant_id IS NOT NULL THEN
        IF NOT (
            is_tenant_admin(p_tenant_id)
            OR (SELECT is_super_admin FROM public.profiles WHERE user_id = auth.uid())
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Seuls les administrateurs du tenant peuvent inviter des utilisateurs'
            );
        END IF;
    END IF;

    -- Vérifier si l'utilisateur existe déjà dans auth.users
    SELECT id INTO v_existing_user_id
    FROM auth.users
    WHERE email = p_email
    LIMIT 1;

    IF v_existing_user_id IS NOT NULL THEN
        v_user_id := v_existing_user_id;

        -- Vérifier s'il est déjà membre de ce tenant
        IF p_tenant_id IS NOT NULL THEN
            IF EXISTS (
                SELECT 1 FROM public.tenant_members
                WHERE user_id = v_user_id AND tenant_id = p_tenant_id
            ) THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Cet utilisateur est déjà membre de ce tenant',
                    'user_id', v_user_id::text
                );
            END IF;
        END IF;

    ELSE
        -- Créer un nouvel utilisateur dans auth.users
        v_user_id := gen_random_uuid();
        v_encrypted_password := extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'));

        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_user_meta_data,
            raw_app_meta_data,
            role,
            aud
        ) VALUES (
            v_user_id,
            p_email,
            v_encrypted_password,
            NOW(),
            NOW(),
            NOW(),
            jsonb_build_object(
                'first_name', p_first_name,
                'last_name', p_last_name,
                'role', p_role
            ),
            jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
            'authenticated',
            'authenticated'
        );

        -- Créer le profil
        BEGIN
            INSERT INTO public.profiles (
                user_id,
                email,
                first_name,
                last_name,
                name,
                role,
                status
            ) VALUES (
                v_user_id,
                p_email,
                p_first_name,
                p_last_name,
                COALESCE(NULLIF(TRIM(p_first_name || ' ' || p_last_name), ''), p_email),
                p_role,
                'active'
            );
        EXCEPTION WHEN OTHERS THEN
            -- Non bloquant
        END;
    END IF;

    -- Créer le membership si tenant_id fourni
    IF p_tenant_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.tenant_members (
                user_id,
                tenant_id,
                role,
                status,
                invited_by,
                joined_at
            ) VALUES (
                v_user_id,
                p_tenant_id,
                p_role,
                'active',
                p_invited_by,
                NOW()
            );

            -- Mettre à jour profiles.tenant_id si l'user n'en a pas encore
            UPDATE public.profiles
            SET tenant_id = COALESCE(tenant_id, p_tenant_id),
                role = COALESCE(NULLIF(role, ''), p_role)
            WHERE user_id = v_user_id
              AND (tenant_id IS NULL OR tenant_id = p_tenant_id);

        EXCEPTION WHEN unique_violation THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Cet utilisateur est déjà membre de ce tenant',
                'user_id', v_user_id::text
            );
        END;
    END IF;

    v_result := jsonb_build_object(
        'success', true,
        'user_id', v_user_id::text,
        'is_new', (v_existing_user_id IS NULL)
    );

    RETURN v_result;

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cet email est déjà utilisé'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_user_to_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin TO authenticated;
