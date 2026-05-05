-- =========================================
-- ÉTAPE 1: CRÉER UNIQUEMENT LES TABLES
-- Script minimal - exécuter en premier
-- =========================================

-- 1. Table des conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'workgroup')),
    name TEXT,
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE,
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

-- Vérification que les tables ont été créées
SELECT 
    'TABLES CRÉÉES AVEC SUCCÈS' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'conversations') as conversations_table,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'conversation_participants') as participants_table,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'messages') as messages_table,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'message_reads') as reads_table;

SELECT '✅ ÉTAPE 1 TERMINÉE - Exécutez maintenant messaging_functions_only.sql' as next_step; 