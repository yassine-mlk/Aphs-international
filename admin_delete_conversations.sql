-- =========================================
-- SCRIPT DE SUPPRESSION DE CONVERSATIONS ADMIN
-- Script à exécuter dans Supabase Dashboard > SQL Editor
-- =========================================

-- Fonction pour supprimer une conversation (admin uniquement)
CREATE OR REPLACE FUNCTION admin_delete_conversation(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    conversation_type TEXT;
    conversation_name TEXT;
    conversation_workgroup_id UUID;
    participant_count INTEGER;
    message_count INTEGER;
    admin_role TEXT;
    admin_email TEXT;
BEGIN
    -- Vérifier que l'utilisateur est admin
    SELECT role, email INTO admin_role, admin_email
    FROM profiles 
    WHERE user_id = p_user_id;
    
    IF admin_role IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non trouvé';
    END IF;
    
    -- Vérifier les permissions admin
    IF admin_role != 'admin' AND admin_email != 'admin@aphs.com' THEN
        RAISE EXCEPTION 'Accès refusé: seuls les administrateurs peuvent supprimer des conversations';
    END IF;
    
    -- Récupérer les informations de la conversation
    SELECT type, name, workgroup_id 
    INTO conversation_type, conversation_name, conversation_workgroup_id
    FROM conversations 
    WHERE id = p_conversation_id;
    
    -- Vérifier que la conversation existe
    IF conversation_type IS NULL THEN
        RAISE EXCEPTION 'Conversation non trouvée';
    END IF;
    
    -- Empêcher la suppression des conversations workgroup
    IF conversation_type = 'workgroup' THEN
        RAISE EXCEPTION 'Impossible de supprimer une conversation de workgroup';
    END IF;
    
    -- Compter les participants et messages pour les logs
    SELECT COUNT(*) INTO participant_count
    FROM conversation_participants 
    WHERE conversation_id = p_conversation_id;
    
    SELECT COUNT(*) INTO message_count
    FROM messages 
    WHERE conversation_id = p_conversation_id;
    
    -- Log de l'action
    RAISE NOTICE 'ADMIN DELETE: Suppression conversation % (type: %, participants: %, messages: %) par admin % (%)', 
        p_conversation_id, conversation_type, participant_count, message_count, admin_email, p_user_id;
    
    -- Supprimer en cascade :
    -- 1. Messages reads (marques de lecture)
    DELETE FROM message_reads 
    WHERE message_id IN (
        SELECT id FROM messages WHERE conversation_id = p_conversation_id
    );
    
    -- 2. Messages
    DELETE FROM messages 
    WHERE conversation_id = p_conversation_id;
    
    -- 3. Participants
    DELETE FROM conversation_participants 
    WHERE conversation_id = p_conversation_id;
    
    -- 4. Conversation
    DELETE FROM conversations 
    WHERE id = p_conversation_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques des conversations (admin uniquement)
CREATE OR REPLACE FUNCTION admin_get_conversation_stats(p_user_id UUID)
RETURNS TABLE (
    conversation_id UUID,
    conversation_type TEXT,
    conversation_name TEXT,
    participant_count INTEGER,
    message_count INTEGER,
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    can_delete BOOLEAN
) AS $$
DECLARE
    admin_role TEXT;
    admin_email TEXT;
BEGIN
    -- Vérifier que l'utilisateur est admin
    SELECT role, email INTO admin_role, admin_email
    FROM profiles 
    WHERE user_id = p_user_id;
    
    IF admin_role IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non trouvé';
    END IF;
    
    -- Vérifier les permissions admin
    IF admin_role != 'admin' AND admin_email != 'admin@aphs.com' THEN
        RAISE EXCEPTION 'Accès refusé: seuls les administrateurs peuvent accéder aux statistiques';
    END IF;
    
    RETURN QUERY
    SELECT 
        c.id as conversation_id,
        c.type as conversation_type,
        COALESCE(c.name, 
            CASE 
                WHEN c.type = 'direct' THEN 'Conversation directe'
                WHEN c.type = 'group' THEN 'Groupe sans nom'
                WHEN c.type = 'workgroup' THEN 'Conversation workgroup'
                ELSE 'Conversation inconnue'
            END
        ) as conversation_name,
        (
            SELECT COUNT(*)::INTEGER 
            FROM conversation_participants cp 
            WHERE cp.conversation_id = c.id
        ) as participant_count,
        (
            SELECT COUNT(*)::INTEGER 
            FROM messages m 
            WHERE m.conversation_id = c.id
        ) as message_count,
        c.updated_at as last_activity,
        c.created_at,
        (c.type != 'workgroup') as can_delete
    FROM conversations c
    ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les détails d'une conversation (admin uniquement)
CREATE OR REPLACE FUNCTION admin_get_conversation_details(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    conversation_id UUID,
    conversation_type TEXT,
    conversation_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    workgroup_name TEXT,
    participant_email TEXT,
    participant_name TEXT,
    participant_role TEXT,
    message_count INTEGER,
    recent_messages TEXT[]
) AS $$
DECLARE
    admin_role TEXT;
    admin_email TEXT;
BEGIN
    -- Vérifier que l'utilisateur est admin
    SELECT role, email INTO admin_role, admin_email
    FROM profiles 
    WHERE user_id = p_user_id;
    
    IF admin_role IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non trouvé';
    END IF;
    
    -- Vérifier les permissions admin
    IF admin_role != 'admin' AND admin_email != 'admin@aphs.com' THEN
        RAISE EXCEPTION 'Accès refusé: seuls les administrateurs peuvent accéder aux détails';
    END IF;
    
    RETURN QUERY
    SELECT 
        c.id as conversation_id,
        c.type as conversation_type,
        c.name as conversation_name,
        c.created_at,
        c.updated_at,
        w.name as workgroup_name,
        p.email as participant_email,
        (p.first_name || ' ' || p.last_name) as participant_name,
        p.role as participant_role,
        (
            SELECT COUNT(*)::INTEGER 
            FROM messages m 
            WHERE m.conversation_id = c.id
        ) as message_count,
        (
            SELECT ARRAY(
                SELECT LEFT(content, 100) || CASE WHEN LENGTH(content) > 100 THEN '...' ELSE '' END
                FROM messages m2 
                WHERE m2.conversation_id = c.id 
                ORDER BY m2.created_at DESC 
                LIMIT 5
            )
        ) as recent_messages
    FROM conversations c
    LEFT JOIN workgroups w ON c.workgroup_id = w.id
    LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
    LEFT JOIN profiles p ON cp.user_id = p.user_id
    WHERE c.id = p_conversation_id
    ORDER BY cp.joined_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour valider qu'un utilisateur peut supprimer une conversation
CREATE OR REPLACE FUNCTION can_delete_conversation(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    admin_role TEXT;
    admin_email TEXT;
    conversation_type TEXT;
BEGIN
    -- Vérifier que l'utilisateur est admin
    SELECT role, email INTO admin_role, admin_email
    FROM profiles 
    WHERE user_id = p_user_id;
    
    IF admin_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier les permissions admin
    IF admin_role != 'admin' AND admin_email != 'admin@aphs.com' THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier le type de conversation
    SELECT type INTO conversation_type
    FROM conversations 
    WHERE id = p_conversation_id;
    
    -- Ne peut pas supprimer les conversations workgroup
    IF conversation_type = 'workgroup' THEN
        RETURN FALSE;
    END IF;
    
    -- Conversation existe et n'est pas workgroup
    RETURN (conversation_type IS NOT NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer un index pour améliorer les performances des requêtes admin
CREATE INDEX IF NOT EXISTS idx_conversations_admin_stats 
ON conversations(type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

-- Commentaires pour la documentation
COMMENT ON FUNCTION admin_delete_conversation(UUID, UUID) IS 
'Supprime une conversation et tous ses messages. Réservé aux administrateurs. Ne peut pas supprimer les conversations workgroup.';

COMMENT ON FUNCTION admin_get_conversation_stats(UUID) IS 
'Retourne les statistiques de toutes les conversations pour les administrateurs.';

COMMENT ON FUNCTION admin_get_conversation_details(UUID, UUID) IS 
'Retourne les détails complets d''une conversation pour les administrateurs.';

COMMENT ON FUNCTION can_delete_conversation(UUID, UUID) IS 
'Vérifie si un utilisateur peut supprimer une conversation donnée.'; 