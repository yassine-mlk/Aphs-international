-- =========================================
-- DIAGNOSTIC ET CORRECTION PROBLÈME MESSAGING
-- =========================================

-- 1. FONCTION DE DIAGNOSTIC POUR IDENTIFIER LE PROBLÈME
CREATE OR REPLACE FUNCTION diagnostic_workgroup_membership(p_user1_id UUID, p_user2_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    workgroup_id UUID,
    workgroup_name TEXT,
    has_workgroup BOOLEAN,
    shared_workgroups INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH user_workgroups AS (
        SELECT 
            u.id as user_id,
            u.email as user_email,
            (u.first_name || ' ' || u.last_name) as user_name,
            wm.workgroup_id,
            w.name as workgroup_name,
            (wm.workgroup_id IS NOT NULL) as has_workgroup
        FROM (
            SELECT id, email, first_name, last_name FROM profiles WHERE user_id = p_user1_id
            UNION ALL
            SELECT id, email, first_name, last_name FROM profiles WHERE user_id = p_user2_id
        ) u
        LEFT JOIN workgroup_members wm ON u.id = wm.user_id
        LEFT JOIN workgroups w ON wm.workgroup_id = w.id
    ),
    shared_count AS (
        SELECT COUNT(DISTINCT wm1.workgroup_id) as shared_workgroups
        FROM workgroup_members wm1
        INNER JOIN workgroup_members wm2 ON wm1.workgroup_id = wm2.workgroup_id
        WHERE wm1.user_id = p_user1_id AND wm2.user_id = p_user2_id
    )
    SELECT 
        uw.user_id,
        uw.user_email,
        uw.user_name,
        uw.workgroup_id,
        uw.workgroup_name,
        uw.has_workgroup,
        sc.shared_workgroups
    FROM user_workgroups uw
    CROSS JOIN shared_count sc
    ORDER BY uw.user_id, uw.workgroup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FONCTION CREATE_DIRECT_CONVERSATION AMÉLIORÉE AVEC DIAGNOSTIC
CREATE OR REPLACE FUNCTION create_direct_conversation_debug(p_user1_id UUID, p_user2_id UUID)
RETURNS UUID AS $$
DECLARE
    new_conversation_id UUID;
    existing_conversation_id UUID;
    user1_workgroups UUID[];
    user2_workgroups UUID[];
    shared_workgroups UUID[];
    user1_info RECORD;
    user2_info RECORD;
BEGIN
    -- Récupérer les informations des utilisateurs
    SELECT email, (first_name || ' ' || last_name) as name INTO user1_info
    FROM profiles WHERE user_id = p_user1_id;
    
    SELECT email, (first_name || ' ' || last_name) as name INTO user2_info
    FROM profiles WHERE user_id = p_user2_id;
    
    -- Vérifier que les utilisateurs existent
    IF user1_info IS NULL THEN
        RAISE EXCEPTION 'Utilisateur 1 non trouvé: %', p_user1_id;
    END IF;
    
    IF user2_info IS NULL THEN
        RAISE EXCEPTION 'Utilisateur 2 non trouvé: %', p_user2_id;
    END IF;
    
    -- Récupérer les workgroups de chaque utilisateur
    SELECT ARRAY(
        SELECT workgroup_id 
        FROM workgroup_members 
        WHERE user_id = p_user1_id
    ) INTO user1_workgroups;
    
    SELECT ARRAY(
        SELECT workgroup_id 
        FROM workgroup_members 
        WHERE user_id = p_user2_id
    ) INTO user2_workgroups;
    
    -- Diagnostic détaillé
    RAISE NOTICE 'DIAGNOSTIC: Utilisateur 1: % (%) - Workgroups: %', 
        user1_info.name, user1_info.email, user1_workgroups;
    RAISE NOTICE 'DIAGNOSTIC: Utilisateur 2: % (%) - Workgroups: %', 
        user2_info.name, user2_info.email, user2_workgroups;
    
    -- Vérifier si les utilisateurs ont des workgroups
    IF user1_workgroups IS NULL OR array_length(user1_workgroups, 1) = 0 THEN
        RAISE EXCEPTION 'L''utilisateur % (%) n''appartient à aucun workgroup', 
            user1_info.name, user1_info.email;
    END IF;
    
    IF user2_workgroups IS NULL OR array_length(user2_workgroups, 1) = 0 THEN
        RAISE EXCEPTION 'L''utilisateur % (%) n''appartient à aucun workgroup', 
            user2_info.name, user2_info.email;
    END IF;
    
    -- Trouver les workgroups partagés
    SELECT ARRAY(
        SELECT unnest(user1_workgroups)
        INTERSECT
        SELECT unnest(user2_workgroups)
    ) INTO shared_workgroups;
    
    RAISE NOTICE 'DIAGNOSTIC: Workgroups partagés: %', shared_workgroups;
    
    -- Vérifier s'il y a des workgroups partagés
    IF shared_workgroups IS NULL OR array_length(shared_workgroups, 1) = 0 THEN
        RAISE EXCEPTION 'Les utilisateurs % (%) et % (%) ne partagent aucun workgroup commun. Workgroups de %: %, Workgroups de %: %', 
            user1_info.name, user1_info.email, 
            user2_info.name, user2_info.email,
            user1_info.name, user1_workgroups,
            user2_info.name, user2_workgroups;
    END IF;
    
    -- Vérifier si une conversation directe existe déjà
    SELECT c.id INTO existing_conversation_id
    FROM conversations c
    INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
    INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
    WHERE c.type = 'direct'
    AND cp1.user_id = p_user1_id
    AND cp2.user_id = p_user2_id
    AND (
        SELECT COUNT(*) 
        FROM conversation_participants cp3 
        WHERE cp3.conversation_id = c.id
    ) = 2;
    
    IF existing_conversation_id IS NOT NULL THEN
        RAISE NOTICE 'DIAGNOSTIC: Conversation existante trouvée: %', existing_conversation_id;
        RETURN existing_conversation_id;
    END IF;
    
    -- Créer nouvelle conversation
    INSERT INTO conversations (type)
    VALUES ('direct')
    RETURNING id INTO new_conversation_id;
    
    -- Ajouter les participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES 
        (new_conversation_id, p_user1_id),
        (new_conversation_id, p_user2_id);
    
    RAISE NOTICE 'DIAGNOSTIC: Nouvelle conversation créée: %', new_conversation_id;
    
    RETURN new_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FONCTION CREATE_DIRECT_CONVERSATION CORRIGÉE (version production)
CREATE OR REPLACE FUNCTION create_direct_conversation(p_user1_id UUID, p_user2_id UUID)
RETURNS UUID AS $$
DECLARE
    new_conversation_id UUID;
    existing_conversation_id UUID;
    user1_workgroups UUID[];
    user2_workgroups UUID[];
    shared_workgroups UUID[];
    user1_info RECORD;
    user2_info RECORD;
BEGIN
    -- Récupérer les informations des utilisateurs
    SELECT email, (first_name || ' ' || last_name) as name INTO user1_info
    FROM profiles WHERE user_id = p_user1_id;
    
    SELECT email, (first_name || ' ' || last_name) as name INTO user2_info
    FROM profiles WHERE user_id = p_user2_id;
    
    -- Vérifier que les utilisateurs existent
    IF user1_info IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non trouvé';
    END IF;
    
    IF user2_info IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non trouvé';
    END IF;
    
    -- Vérifier si une conversation directe existe déjà
    SELECT c.id INTO existing_conversation_id
    FROM conversations c
    INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
    INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
    WHERE c.type = 'direct'
    AND cp1.user_id = p_user1_id
    AND cp2.user_id = p_user2_id
    AND (
        SELECT COUNT(*) 
        FROM conversation_participants cp3 
        WHERE cp3.conversation_id = c.id
    ) = 2;
    
    IF existing_conversation_id IS NOT NULL THEN
        RETURN existing_conversation_id;
    END IF;
    
    -- Récupérer les workgroups de chaque utilisateur
    SELECT ARRAY(
        SELECT workgroup_id 
        FROM workgroup_members 
        WHERE user_id = p_user1_id
    ) INTO user1_workgroups;
    
    SELECT ARRAY(
        SELECT workgroup_id 
        FROM workgroup_members 
        WHERE user_id = p_user2_id
    ) INTO user2_workgroups;
    
    -- Vérifier si les utilisateurs ont des workgroups
    IF user1_workgroups IS NULL OR array_length(user1_workgroups, 1) = 0 THEN
        RAISE EXCEPTION 'Vous n''appartenez à aucun groupe de travail. Contactez votre administrateur.';
    END IF;
    
    IF user2_workgroups IS NULL OR array_length(user2_workgroups, 1) = 0 THEN
        RAISE EXCEPTION 'L''utilisateur sélectionné n''appartient à aucun groupe de travail.';
    END IF;
    
    -- Trouver les workgroups partagés
    SELECT ARRAY(
        SELECT unnest(user1_workgroups)
        INTERSECT
        SELECT unnest(user2_workgroups)
    ) INTO shared_workgroups;
    
    -- Vérifier s'il y a des workgroups partagés
    IF shared_workgroups IS NULL OR array_length(shared_workgroups, 1) = 0 THEN
        RAISE EXCEPTION 'Vous ne pouvez communiquer qu''avec des membres de vos groupes de travail.';
    END IF;
    
    -- Créer nouvelle conversation
    INSERT INTO conversations (type)
    VALUES ('direct')
    RETURNING id INTO new_conversation_id;
    
    -- Ajouter les participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES 
        (new_conversation_id, p_user1_id),
        (new_conversation_id, p_user2_id);
    
    RETURN new_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FONCTION POUR AJOUTER UN UTILISATEUR À UN WORKGROUP (si nécessaire)
CREATE OR REPLACE FUNCTION add_user_to_workgroup(p_user_id UUID, p_workgroup_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérifier que l'utilisateur existe
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'Utilisateur non trouvé';
    END IF;
    
    -- Vérifier que le workgroup existe
    IF NOT EXISTS (SELECT 1 FROM workgroups WHERE id = p_workgroup_id) THEN
        RAISE EXCEPTION 'Groupe de travail non trouvé';
    END IF;
    
    -- Ajouter l'utilisateur au workgroup
    INSERT INTO workgroup_members (user_id, workgroup_id)
    VALUES (p_user_id, p_workgroup_id)
    ON CONFLICT (user_id, workgroup_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. COMMANDES DE DIAGNOSTIC (à exécuter pour identifier le problème)
-- Pour diagnostiquer le problème, exécuter :
-- SELECT * FROM diagnostic_workgroup_membership('user1_id', 'user2_id');

-- Pour tester la fonction avec debug :
-- SELECT create_direct_conversation_debug('user1_id', 'user2_id');

-- Pour voir tous les workgroups et leurs membres :
-- SELECT w.name as workgroup_name, p.email, p.first_name, p.last_name
-- FROM workgroups w
-- JOIN workgroup_members wm ON w.id = wm.workgroup_id
-- JOIN profiles p ON wm.user_id = p.user_id
-- ORDER BY w.name, p.email; 