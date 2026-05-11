-- ============================================================================
-- Fix Workgroups : recréer les fonctions RPC + nettoyer les anciennes policies
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Supprimer les anciennes policies RLS de l'archive (basées sur profiles.tenant_id)
--    La policy "workgroups_tenant_policy" créée par la migration multi-tenant
--    utilisant is_tenant_member() reste active.
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "workgroups_select" ON public.workgroups;
DROP POLICY IF EXISTS "workgroups_modify" ON public.workgroups;
DROP POLICY IF EXISTS "workgroup_members_select" ON public.workgroup_members;
DROP POLICY IF EXISTS "workgroup_members_modify" ON public.workgroup_members;

-- --------------------------------------------------------------------------
-- 2. Supprimer les anciennes versions des fonctions (la signature / type de retour
--    peut différer de ce qui est déclaré ci-dessous)
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS create_workgroup_simple(TEXT, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_workgroup_simple(TEXT, TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_members_to_workgroup(UUID, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS remove_member_from_workgroup(UUID) CASCADE;
DROP FUNCTION IF EXISTS remove_workgroup_member(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_contacts(UUID) CASCADE;

-- --------------------------------------------------------------------------
-- 3. Recréer create_workgroup_simple avec tenant_members au lieu de profiles.tenant_id
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_workgroup_simple(
    p_name TEXT,
    p_description TEXT,
    p_creator_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_workgroup_id UUID;
    v_tenant_id UUID;
BEGIN
    -- Récupérer le tenant actif du créateur via tenant_members
    SELECT tenant_id INTO v_tenant_id
    FROM public.tenant_members
    WHERE user_id = p_creator_id
      AND status = 'active'
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Aucun tenant actif trouvé pour cet utilisateur.';
    END IF;

    -- Créer le groupe
    INSERT INTO public.workgroups (name, description, created_by, tenant_id)
    VALUES (p_name, p_description, p_creator_id, v_tenant_id)
    RETURNING id INTO v_workgroup_id;

    -- Ajouter le créateur comme admin
    INSERT INTO public.workgroup_members (workgroup_id, user_id, role)
    VALUES (v_workgroup_id, p_creator_id, 'admin');

    RETURN v_workgroup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 4. Recréer add_members_to_workgroup avec tenant_members
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_members_to_workgroup(
    p_workgroup_id UUID,
    p_user_ids UUID[]
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_wg_tenant_id UUID;
BEGIN
    -- Récupérer le tenant du groupe
    SELECT tenant_id INTO v_wg_tenant_id FROM public.workgroups WHERE id = p_workgroup_id;

    FOREACH v_user_id IN ARRAY p_user_ids
    LOOP
        -- Vérifier que l'utilisateur appartient au même tenant via tenant_members
        IF EXISTS (
            SELECT 1 FROM public.tenant_members
            WHERE user_id = v_user_id AND tenant_id = v_wg_tenant_id AND status = 'active'
        ) THEN
            INSERT INTO public.workgroup_members (workgroup_id, user_id, role)
            VALUES (p_workgroup_id, v_user_id, 'member')
            ON CONFLICT (workgroup_id, user_id) DO NOTHING;
        END IF;
    END LOOP;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 5. Recréer remove_member_from_workgroup (reste inchangée, mais on s'assure qu'elle existe)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION remove_member_from_workgroup(
    p_member_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.workgroup_members
    WHERE id = p_member_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 6. Recréer remove_workgroup_member (reste inchangée)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION remove_workgroup_member(
    p_workgroup_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.workgroup_members
    WHERE workgroup_id = p_workgroup_id AND user_id = p_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 7. Également recréer get_user_contacts (utilisée par la messagerie)
--    pour utiliser tenant_members au lieu de profiles.tenant_id
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_contacts(user_id UUID)
RETURNS TABLE (contact_id UUID) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Récupérer le tenant de l'utilisateur via tenant_members
    SELECT tenant_id INTO v_tenant_id
    FROM public.tenant_members
    WHERE tenant_members.user_id = get_user_contacts.user_id
      AND status = 'active'
    LIMIT 1;

    RETURN QUERY
    -- Contacts from same workgroups
    SELECT DISTINCT wm.user_id
    FROM public.workgroup_members wm
    JOIN public.workgroups w ON w.id = wm.workgroup_id
    WHERE w.tenant_id = v_tenant_id
      AND wm.user_id != get_user_contacts.user_id
      AND wm.user_id IN (
          SELECT wm2.user_id FROM public.workgroup_members wm2
          JOIN public.workgroups w2 ON w2.id = wm2.workgroup_id
          WHERE w2.id IN (
              SELECT w3.id FROM public.workgroups w3
              JOIN public.workgroup_members wm3 ON wm3.workgroup_id = w3.id
              WHERE wm3.user_id = get_user_contacts.user_id
          )
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 8. Mettre à jour create_workgroup_conversation pour inclure tenant_id
--    (nécessaire car conversations a maintenant une colonne tenant_id)
--    Note: DROP CASCADE supprime aussi le trigger trigger_auto_create_workgroup_conversation,
--    on le recrée après.
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS create_workgroup_conversation(UUID) CASCADE;
CREATE OR REPLACE FUNCTION create_workgroup_conversation(p_workgroup_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    workgroup_name TEXT;
    v_tenant_id UUID;
    member_record RECORD;
BEGIN
    SELECT name, tenant_id INTO workgroup_name, v_tenant_id
    FROM workgroups
    WHERE id = p_workgroup_id;

    IF workgroup_name IS NULL THEN
        RAISE EXCEPTION 'Workgroup non trouvé: %', p_workgroup_id;
    END IF;

    INSERT INTO conversations (type, name, workgroup_id, tenant_id)
    VALUES ('workgroup', 'Discussion - ' || workgroup_name, p_workgroup_id, v_tenant_id)
    RETURNING id INTO conversation_id;

    FOR member_record IN
        SELECT user_id FROM workgroup_members WHERE workgroup_id = p_workgroup_id
    LOOP
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (conversation_id, member_record.user_id)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END LOOP;

    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer la fonction wrapper trigger + le trigger (supprimés par le CASCADE)
CREATE OR REPLACE FUNCTION auto_create_workgroup_conversation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_workgroup_conversation(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_create_workgroup_conversation ON workgroups;
CREATE TRIGGER trigger_auto_create_workgroup_conversation
    AFTER INSERT ON workgroups
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_workgroup_conversation();

-- --------------------------------------------------------------------------
-- 9. Recréer get_user_workgroups_simple (était SECURITY INVOKER → bloque RLS)
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_user_workgroups_simple(UUID) CASCADE;

CREATE OR REPLACE FUNCTION get_user_workgroups_simple(
    p_user_id UUID,
    p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    workgroup_id UUID,
    workgroup_name TEXT,
    workgroup_description TEXT,
    workgroup_status TEXT,
    workgroup_created_at TIMESTAMPTZ,
    workgroup_updated_at TIMESTAMPTZ,
    user_role TEXT,
    member_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.name,
        w.description,
        w.status,
        w.created_at,
        w.updated_at,
        wm.role,
        (SELECT COUNT(*)::BIGINT FROM workgroup_members wm2 WHERE wm2.workgroup_id = w.id)
    FROM workgroups w
    INNER JOIN workgroup_members wm ON w.id = wm.workgroup_id
    WHERE wm.user_id = p_user_id
      AND (p_tenant_id IS NULL OR w.tenant_id = p_tenant_id)
    ORDER BY w.updated_at DESC;
END;
$$;

-- --------------------------------------------------------------------------
-- 10. RPC delete_workgroup — suppression par admin via RPC (évite RLS + cache)
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS delete_workgroup(UUID) CASCADE;

CREATE OR REPLACE FUNCTION delete_workgroup(p_workgroup_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM workgroups WHERE id = p_workgroup_id;

    IF NOT (is_tenant_admin(v_tenant_id) OR is_super_admin()) THEN
        RAISE EXCEPTION 'Seul un admin du tenant peut supprimer un groupe';
    END IF;

    DELETE FROM workgroups WHERE id = p_workgroup_id;
    RETURN TRUE;
END;
$$;

-- --------------------------------------------------------------------------
-- 11. Ajouter FK tenant_members.user_id → profiles(user_id) pour PostgREST join
--     (la FK vers auth.users est conservée, les deux coexistent)
-- --------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'tenant_members_user_id_profiles_fkey'
          AND table_name = 'tenant_members'
    ) THEN
        ALTER TABLE public.tenant_members
            ADD CONSTRAINT tenant_members_user_id_profiles_fkey
            FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 12. RPC get_user_conversations — isolé par tenant (workgroup) + direct (tenant_id NULL)
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_user_conversations(UUID) CASCADE;

CREATE OR REPLACE FUNCTION get_user_conversations(
    p_user_id UUID,
    p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    conversation_id UUID
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT cp.conversation_id
    FROM conversation_participants cp
    JOIN conversations c ON c.id = cp.conversation_id
    WHERE cp.user_id = p_user_id
      AND (
          c.tenant_id IS NULL               -- conversations directes : visibles partout
          OR p_tenant_id IS NULL             -- pas de filtre tenant passé
          OR c.tenant_id = p_tenant_id       -- workgroup : filtré par tenant actif
      );
END;
$$;

-- Rafraîchir le cache PostgREST
NOTIFY pgrst, 'reload schema';
