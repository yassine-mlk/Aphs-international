-- Migration: Messaging System
-- Consolidated from create_messaging_system.sql

-- 1. Table des conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'workgroup')),
    name TEXT,
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sender_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table des participants aux conversations
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- 3. Table des messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table pour marquer les messages comme lus
CREATE TABLE IF NOT EXISTS message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- 5. Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_conversations_workgroup_id ON conversations(workgroup_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);

-- Appliquer le trigger sur conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- FONCTIONS RPC POUR LE SYSTÈME DE MESSAGES
-- =========================================

-- Fonction pour créer automatiquement des conversations de workgroup
CREATE OR REPLACE FUNCTION create_workgroup_conversation(p_workgroup_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
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
    RETURNING id INTO conversation_id;
    
    -- Ajouter tous les membres du workgroup à la conversation
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

-- =========================================
-- TRIGGER POUR CRÉER AUTOMATIQUEMENT LES CONVERSATIONS WORKGROUP
-- =========================================

-- Fonction trigger pour créer automatiquement une conversation quand un workgroup est créé
CREATE OR REPLACE FUNCTION auto_create_workgroup_conversation()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer la conversation workgroup automatiquement
    PERFORM create_workgroup_conversation(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger
DROP TRIGGER IF EXISTS trigger_auto_create_workgroup_conversation ON workgroups;
CREATE TRIGGER trigger_auto_create_workgroup_conversation
    AFTER INSERT ON workgroups
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_workgroup_conversation();

-- Fonction trigger pour ajouter automatiquement les nouveaux membres à la conversation workgroup
CREATE OR REPLACE FUNCTION auto_add_member_to_workgroup_conversation()
RETURNS TRIGGER AS $$
DECLARE
    workgroup_conversation_id UUID;
BEGIN
    -- Trouver la conversation du workgroup
    SELECT id INTO workgroup_conversation_id
    FROM conversations
    WHERE workgroup_id = NEW.workgroup_id
    AND type = 'workgroup';
    
    -- Si la conversation existe, ajouter le membre
    IF workgroup_conversation_id IS NOT NULL THEN
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (workgroup_conversation_id, NEW.user_id)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger
DROP TRIGGER IF EXISTS trigger_auto_add_member_to_workgroup_conversation ON workgroup_members;
CREATE TRIGGER trigger_auto_add_member_to_workgroup_conversation
    AFTER INSERT ON workgroup_members
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_member_to_workgroup_conversation();

-- Trigger pour mettre à jour updated_at des conversations quand un message est envoyé
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET 
        updated_at = NEW.created_at,
        last_message_at = NEW.created_at,
        last_sender_id = NEW.sender_id
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
CREATE TRIGGER trigger_update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_message();
