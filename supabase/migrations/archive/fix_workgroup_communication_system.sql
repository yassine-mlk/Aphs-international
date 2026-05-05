-- ============================================================================
-- FIX GLOBAL: COMMUNICATION ENTRE MEMBRES DE GROUPES DE TRAVAIL
-- Ce script résout l'impossibilité de communiquer entre membres d'un groupe.
-- ============================================================================

-- 1. S'assurer que les tables de base existent avec support Multi-tenant
CREATE TABLE IF NOT EXISTS workgroups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    tenant_id UUID, -- Ajout du support tenant
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supprimer la colonne status si elle existe
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'workgroups' AND COLUMN_NAME = 'status') THEN
        ALTER TABLE workgroups DROP COLUMN status;
    END IF;
END $$;

-- Ajouter la colonne tenant_id si elle n'existe pas déjà
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'workgroups' AND COLUMN_NAME = 'tenant_id') THEN
        ALTER TABLE workgroups ADD COLUMN tenant_id UUID;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS workgroup_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workgroup_id UUID NOT NULL REFERENCES workgroups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workgroup_id, user_id)
);

-- 2. Redéfinir get_user_contacts pour inclure les membres des groupes de travail (FILTRÉ PAR TENANT)
CREATE OR REPLACE FUNCTION get_user_contacts(user_id UUID)
RETURNS TABLE (
    contact_id UUID
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Récupérer le tenant de l'utilisateur
    SELECT tenant_id INTO v_tenant_id FROM profiles WHERE profiles.user_id = get_user_contacts.user_id;

    RETURN QUERY
    -- Contacts explicites dans la table user_contacts (doivent être du même tenant)
    SELECT uc.contact_id
    FROM user_contacts uc
    JOIN profiles p ON uc.contact_id = p.user_id
    WHERE uc.user_id = get_user_contacts.user_id
    AND p.tenant_id = v_tenant_id
    
    UNION
    
    -- Membres des mêmes groupes de travail (sont déjà filtrés par tenant via la création du groupe)
    SELECT DISTINCT wm1.user_id as contact_id
    FROM workgroup_members wm1
    JOIN workgroup_members wm2 ON wm1.workgroup_id = wm2.workgroup_id
    JOIN profiles p ON wm1.user_id = p.user_id
    WHERE wm2.user_id = get_user_contacts.user_id
    AND wm1.user_id != get_user_contacts.user_id
    AND p.tenant_id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Redéfinir get_available_contacts (FILTRÉ PAR TENANT)
CREATE OR REPLACE FUNCTION get_available_contacts(p_current_user_id UUID)
RETURNS TABLE (
    contact_id UUID,
    contact_email TEXT,
    contact_first_name TEXT,
    contact_last_name TEXT,
    contact_role TEXT,
    contact_specialty TEXT
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Récupérer le tenant de l'utilisateur
    SELECT tenant_id INTO v_tenant_id FROM profiles WHERE profiles.user_id = p_current_user_id;

    RETURN QUERY
    SELECT DISTINCT
        p.user_id as contact_id,
        p.email::TEXT as contact_email,
        p.first_name::TEXT as contact_first_name,
        p.last_name::TEXT as contact_last_name,
        p.role::TEXT as contact_role,
        COALESCE(p.specialty, '')::TEXT as contact_specialty
    FROM profiles p
    JOIN (
        -- Soit dans user_contacts
        SELECT uc.contact_id FROM user_contacts uc WHERE uc.user_id = p_current_user_id
        UNION
        -- Soit dans un groupe commun
        SELECT wm1.user_id FROM workgroup_members wm1
        JOIN workgroup_members wm2 ON wm1.workgroup_id = wm2.workgroup_id
        WHERE wm2.user_id = p_current_user_id
    ) contacts ON p.user_id = contacts.contact_id
    WHERE p.user_id != p_current_user_id
    AND p.status = 'active'
    AND p.tenant_id = v_tenant_id -- Strict isolation par tenant
    ORDER BY contact_first_name, contact_last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fonctions RPC "Simple" utilisées par useWorkGroups.ts
-- Ces fonctions manquaient dans la base de code SQL

-- get_user_workgroups_simple
CREATE OR REPLACE FUNCTION get_user_workgroups_simple(p_user_id UUID)
RETURNS TABLE (
    workgroup_id UUID,
    workgroup_name TEXT,
    workgroup_description TEXT,
    workgroup_status TEXT,
    workgroup_created_at TIMESTAMP WITH TIME ZONE,
    workgroup_updated_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id as workgroup_id,
        w.name as workgroup_name,
        w.description as workgroup_description,
        w.status as workgroup_status,
        w.created_at as workgroup_created_at,
        w.updated_at as workgroup_updated_at,
        w.created_by,
        wm.role
    FROM workgroups w
    JOIN workgroup_members wm ON w.id = wm.workgroup_id
    WHERE wm.user_id = p_user_id
    ORDER BY w.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- create_workgroup_simple (SUPPORT MULTI-TENANT)
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
    -- Récupérer le tenant du créateur
    SELECT tenant_id INTO v_tenant_id FROM profiles WHERE user_id = p_creator_id;

    -- Créer le groupe
    INSERT INTO workgroups (name, description, created_by, tenant_id)
    VALUES (p_name, p_description, p_creator_id, v_tenant_id)
    RETURNING id INTO v_workgroup_id;
    
    -- Ajouter le créateur comme admin
    INSERT INTO workgroup_members (workgroup_id, user_id, role)
    VALUES (v_workgroup_id, p_creator_id, 'admin');
    
    RETURN v_workgroup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- add_members_to_workgroup (SUPPORT MULTI-TENANT)
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
    SELECT tenant_id INTO v_wg_tenant_id FROM workgroups WHERE id = p_workgroup_id;

    FOREACH v_user_id IN ARRAY p_user_ids
    LOOP
        -- Vérifier que l'utilisateur appartient au même tenant
        IF EXISTS (SELECT 1 FROM profiles WHERE user_id = v_user_id AND tenant_id = v_wg_tenant_id) THEN
            INSERT INTO workgroup_members (workgroup_id, user_id, role)
            VALUES (p_workgroup_id, v_user_id, 'member')
            ON CONFLICT (workgroup_id, user_id) DO NOTHING;
        END IF;
    END LOOP;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- remove_member_from_workgroup
CREATE OR REPLACE FUNCTION remove_member_from_workgroup(
    p_member_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM workgroup_members 
    WHERE id = p_member_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative pour suppression par workgroup_id et user_id
CREATE OR REPLACE FUNCTION remove_workgroup_member(
    p_workgroup_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM workgroup_members 
    WHERE workgroup_id = p_workgroup_id AND user_id = p_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Améliorer create_direct_conversation pour être plus permissif si nécessaire
-- mais toujours sécurisé (doivent partager un groupe)
CREATE OR REPLACE FUNCTION create_direct_conversation(p_user1_id UUID, p_user2_id UUID)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
    v_existing_id UUID;
BEGIN
    -- 1. Chercher une conversation directe existante
    SELECT c.id INTO v_existing_id
    FROM conversations c
    JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
    WHERE c.type = 'direct'
    AND cp1.user_id = p_user1_id
    AND cp2.user_id = p_user2_id
    AND (SELECT count(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
    LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
        RETURN v_existing_id;
    END IF;
    
    -- 2. Vérifier s'ils partagent un groupe (sécurité)
    IF NOT EXISTS (
        SELECT 1 FROM workgroup_members wm1
        JOIN workgroup_members wm2 ON wm1.workgroup_id = wm2.workgroup_id
        WHERE wm1.user_id = p_user1_id AND wm2.user_id = p_user2_id
    ) AND NOT EXISTS (
        -- Ou s'ils sont dans user_contacts
        SELECT 1 FROM user_contacts 
        WHERE (user_id = p_user1_id AND contact_id = p_user2_id)
        OR (user_id = p_user2_id AND contact_id = p_user1_id)
    ) THEN
        RAISE EXCEPTION 'Communication non autorisée : aucun groupe en commun.';
    END IF;
    
    -- 3. Créer la conversation
    INSERT INTO conversations (type) VALUES ('direct') RETURNING id INTO v_conversation_id;
    
    -- 4. Ajouter les participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (v_conversation_id, p_user1_id), (v_conversation_id, p_user2_id);
    
    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Triggers de synchronisation pour les conversations de groupe (Workgroups)
-- S'assurer qu'une conversation de type 'workgroup' existe et que les membres y sont ajoutés

CREATE OR REPLACE FUNCTION sync_workgroup_conversation_member()
RETURNS TRIGGER AS $$
DECLARE
    v_conv_id UUID;
BEGIN
    -- Trouver la conversation associée au groupe
    SELECT id INTO v_conv_id FROM conversations WHERE workgroup_id = NEW.workgroup_id AND type = 'workgroup' LIMIT 1;
    
    -- Si elle n'existe pas, elle sera créée par le trigger sur la table workgroups
    -- mais par sécurité on vérifie ici
    IF v_conv_id IS NOT NULL THEN
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (v_conv_id, NEW.user_id)
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_workgroup_member ON workgroup_members;
CREATE TRIGGER trigger_sync_workgroup_member
    AFTER INSERT ON workgroup_members
    FOR EACH ROW
    EXECUTE FUNCTION sync_workgroup_conversation_member();

-- Trigger pour créer la conversation quand le groupe est créé
CREATE OR REPLACE FUNCTION auto_create_wg_conv()
RETURNS TRIGGER AS $$
DECLARE
    v_conv_id UUID;
BEGIN
    INSERT INTO conversations (type, name, workgroup_id)
    VALUES ('workgroup', 'Groupe: ' || NEW.name, NEW.id)
    RETURNING id INTO v_conv_id;
    
    -- Le créateur sera ajouté via le trigger sur workgroup_members
    -- car create_workgroup_simple insère dans workgroup_members juste après.
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_create_wg_conv ON workgroups;
CREATE TRIGGER trigger_auto_create_wg_conv
    AFTER INSERT ON workgroups
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_wg_conv();

-- 7. Politiques RLS (Sécurité avec isolation par Tenant)

-- Activer RLS sur les tables de workgroups
ALTER TABLE workgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE workgroup_members ENABLE ROW LEVEL SECURITY;

-- Politiques pour workgroups (Strict Tenant Isolation)
DROP POLICY IF EXISTS "workgroups_select" ON workgroups;
CREATE POLICY "workgroups_select" ON workgroups FOR SELECT
    USING (
        (
            created_by = auth.uid() 
            OR id IN (SELECT workgroup_id FROM workgroup_members WHERE user_id = auth.uid())
        )
        AND (tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin())
    );

DROP POLICY IF EXISTS "workgroups_modify" ON workgroups;
CREATE POLICY "workgroups_modify" ON workgroups FOR ALL
    USING (
        (
            created_by = auth.uid() 
            OR id IN (SELECT workgroup_id FROM workgroup_members WHERE user_id = auth.uid() AND role = 'admin')
        )
        AND (tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin())
    );

-- Politiques pour workgroup_members
DROP POLICY IF EXISTS "workgroup_members_select" ON workgroup_members;
CREATE POLICY "workgroup_members_select" ON workgroup_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workgroups w 
            WHERE w.id = workgroup_members.workgroup_id 
            AND (w.tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin())
        )
    );

DROP POLICY IF EXISTS "workgroup_members_modify" ON workgroup_members;
CREATE POLICY "workgroup_members_modify" ON workgroup_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workgroups w 
            WHERE w.id = workgroup_members.workgroup_id 
            AND (
                w.created_by = auth.uid() 
                OR EXISTS (SELECT 1 FROM workgroup_members wm WHERE wm.workgroup_id = w.id AND wm.user_id = auth.uid() AND wm.role = 'admin')
            )
            AND (w.tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()) OR is_super_admin())
        )
    );

-- S'assurer que les tables de messagerie ont les bonnes politiques pour les membres de groupes
-- On utilise conversation_participants comme base pour l'accès

DROP POLICY IF EXISTS "conversations_access" ON conversations;
CREATE POLICY "conversations_access" ON conversations FOR ALL
    USING (
        id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "conversation_participants_access" ON conversation_participants;
CREATE POLICY "conversation_participants_access" ON conversation_participants FOR ALL
    USING (
        conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
        OR is_super_admin()
    );

DROP POLICY IF EXISTS "messages_access" ON messages;
CREATE POLICY "messages_access" ON messages FOR ALL
    USING (
        conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
        OR is_super_admin()
    );
336→
337→SELECT '✅ Fix Workgroup Communication appliqué avec succès' as status;
