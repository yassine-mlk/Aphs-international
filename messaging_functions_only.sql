-- =========================================
-- ÉTAPE 2: CRÉER UNIQUEMENT LES FONCTIONS
-- Script à exécuter APRÈS messaging_tables_only.sql
-- =========================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les contacts disponibles (membres des mêmes workgroups)
CREATE OR REPLACE FUNCTION get_available_contacts(p_user_id UUID)
RETURNS TABLE (
    contact_id UUID,
    contact_email TEXT,
    contact_first_name TEXT,
    contact_last_name TEXT,
    contact_role TEXT,
    contact_specialty TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.user_id as contact_id,
        p.email as contact_email,
        p.first_name as contact_first_name,
        p.last_name as contact_last_name,
        p.role as contact_role,
        p.specialty as contact_specialty
    FROM profiles p
    INNER JOIN workgroup_members wm1 ON p.user_id = wm1.user_id
    INNER JOIN workgroup_members wm2 ON wm1.workgroup_id = wm2.workgroup_id
    WHERE wm2.user_id = p_user_id
    AND p.user_id != p_user_id
    AND p.status = 'active'
    ORDER BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les conversations d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id UUID)
RETURNS TABLE (
    conversation_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT cp.conversation_id
    FROM conversation_participants cp
    WHERE cp.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour compter les messages non lus
CREATE OR REPLACE FUNCTION get_unread_count(p_conversation_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM messages m
    LEFT JOIN message_reads mr ON (m.id = mr.message_id AND mr.user_id = p_user_id)
    WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != p_user_id
    AND mr.id IS NULL;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer une conversation directe
CREATE OR REPLACE FUNCTION create_direct_conversation(p_user1_id UUID, p_user2_id UUID)
RETURNS UUID AS $$
DECLARE
    new_conversation_id UUID;
    existing_conversation_id UUID;
BEGIN
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
    
    -- Vérifier que les deux utilisateurs sont dans le même workgroup
    IF NOT EXISTS (
        SELECT 1 
        FROM workgroup_members wm1
        INNER JOIN workgroup_members wm2 ON wm1.workgroup_id = wm2.workgroup_id
        WHERE wm1.user_id = p_user1_id AND wm2.user_id = p_user2_id
    ) THEN
        RAISE EXCEPTION 'Les utilisateurs ne font pas partie du même workgroup';
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

-- Fonction pour créer une conversation de groupe
CREATE OR REPLACE FUNCTION create_group_conversation(p_name TEXT, p_user_ids UUID[])
RETURNS UUID AS $$
DECLARE
    new_conversation_id UUID;
    current_user_id UUID;
    first_user_workgroups UUID[];
    user_workgroups UUID[];
    common_workgroups UUID[];
BEGIN
    -- Vérifier qu'il y a au moins 2 utilisateurs
    IF array_length(p_user_ids, 1) < 2 THEN
        RAISE EXCEPTION 'Un groupe doit avoir au moins 2 membres';
    END IF;
    
    -- Récupérer les workgroups du premier utilisateur
    SELECT ARRAY(
        SELECT workgroup_id 
        FROM workgroup_members 
        WHERE user_id = p_user_ids[1]
    ) INTO first_user_workgroups;
    
    -- Vérifier que tous les utilisateurs partagent au moins un workgroup
    FOREACH current_user_id IN ARRAY p_user_ids[2:array_length(p_user_ids, 1)]
    LOOP
        SELECT ARRAY(
            SELECT workgroup_id 
            FROM workgroup_members 
            WHERE user_id = current_user_id
        ) INTO user_workgroups;
        
        -- Trouver les workgroups communs
        SELECT ARRAY(
            SELECT unnest(first_user_workgroups)
            INTERSECT
            SELECT unnest(user_workgroups)
        ) INTO common_workgroups;
        
        IF array_length(common_workgroups, 1) = 0 THEN
            RAISE EXCEPTION 'Tous les membres doivent faire partie d''au moins un workgroup commun';
        END IF;
    END LOOP;
    
    -- Créer la conversation
    INSERT INTO conversations (type, name)
    VALUES ('group', p_name)
    RETURNING id INTO new_conversation_id;
    
    -- Ajouter tous les participants
    FOREACH current_user_id IN ARRAY p_user_ids
    LOOP
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (new_conversation_id, current_user_id);
    END LOOP;
    
    RETURN new_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer automatiquement des conversations de workgroup
CREATE OR REPLACE FUNCTION create_workgroup_conversation(p_workgroup_id UUID)
RETURNS UUID AS $$
DECLARE
    new_conversation_id UUID;
    workgroup_name TEXT;
    member_record RECORD;
BEGIN
    -- Récupérer le nom du workgroup
    SELECT name INTO workgroup_name 
    FROM workgroups 
    WHERE id = p_workgroup_id;
    
    IF workgroup_name IS NULL THEN
        RAISE EXCEPTION 'Workgroup non trouvé: %', p_workgroup_id;
    END IF;
    
    -- Créer la conversation workgroup
    INSERT INTO conversations (type, name, workgroup_id)
    VALUES ('workgroup', 'Discussion - ' || workgroup_name, p_workgroup_id)
    RETURNING id INTO new_conversation_id;
    
    -- Ajouter tous les membres du workgroup à la conversation
    FOR member_record IN 
        SELECT user_id FROM workgroup_members WHERE workgroup_id = p_workgroup_id
    LOOP
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (new_conversation_id, member_record.user_id)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END LOOP;
    
    RETURN new_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction trigger pour créer automatiquement une conversation quand un workgroup est créé
CREATE OR REPLACE FUNCTION auto_create_workgroup_conversation()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer la conversation workgroup automatiquement
    PERFORM create_workgroup_conversation(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour ajouter automatiquement les nouveaux membres à la conversation workgroup
CREATE OR REPLACE FUNCTION auto_add_member_to_workgroup_conversation()
RETURNS TRIGGER AS $$
DECLARE
    target_conversation_id UUID;
BEGIN
    -- Trouver la conversation du workgroup
    SELECT id INTO target_conversation_id
    FROM conversations
    WHERE workgroup_id = NEW.workgroup_id
    AND type = 'workgroup';
    
    -- Si la conversation existe, ajouter le membre
    IF target_conversation_id IS NOT NULL THEN
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (target_conversation_id, NEW.user_id)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at des conversations quand un message est envoyé
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_auto_create_workgroup_conversation
    AFTER INSERT ON workgroups
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_workgroup_conversation();

CREATE TRIGGER trigger_auto_add_member_to_workgroup_conversation
    AFTER INSERT ON workgroup_members
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_member_to_workgroup_conversation();

CREATE TRIGGER trigger_update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_message();

-- Créer les conversations pour workgroups existants
DO $$
DECLARE
    workgroup_record RECORD;
    conversation_count INTEGER;
BEGIN
    FOR workgroup_record IN 
        SELECT id, name FROM workgroups
    LOOP
        -- Vérifier si le workgroup a déjà une conversation
        SELECT COUNT(*) INTO conversation_count
        FROM conversations
        WHERE workgroup_id = workgroup_record.id;
        
        -- Si pas de conversation, la créer
        IF conversation_count = 0 THEN
            PERFORM create_workgroup_conversation(workgroup_record.id);
            RAISE NOTICE 'Conversation créée pour workgroup: %', workgroup_record.name;
        END IF;
    END LOOP;
END;
$$;

-- Vérification finale
SELECT 
    'SYSTÈME MESSAGES COMPLET' as status,
    (SELECT COUNT(*) FROM conversations) as total_conversations,
    (SELECT COUNT(*) FROM conversations WHERE type = 'workgroup') as conversations_workgroup,
    (SELECT COUNT(*) FROM conversation_participants) as total_participants;

SELECT '🎉 SYSTÈME DE MESSAGES CRÉÉ AVEC SUCCÈS!' as message; 