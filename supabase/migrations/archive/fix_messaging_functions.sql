-- =========================================
-- CORRECTION DES FONCTIONS MESSAGING
-- À exécuter dans Supabase Dashboard AVANT le script principal
-- =========================================

-- Supprimer toutes les fonctions existantes qui pourraient causer des conflits
DROP FUNCTION IF EXISTS get_user_conversations(UUID);
DROP FUNCTION IF EXISTS get_available_contacts(UUID);
DROP FUNCTION IF EXISTS get_unread_count(UUID, UUID);
DROP FUNCTION IF EXISTS create_direct_conversation(UUID, UUID);
DROP FUNCTION IF EXISTS create_group_conversation(TEXT, UUID[]);
DROP FUNCTION IF EXISTS create_workgroup_conversation(UUID);

-- Supprimer les triggers existants
DROP TRIGGER IF EXISTS trigger_auto_create_workgroup_conversation ON workgroups;
DROP TRIGGER IF EXISTS trigger_auto_add_member_to_workgroup_conversation ON workgroup_members;
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;

-- Supprimer les fonctions trigger existantes
DROP FUNCTION IF EXISTS auto_create_workgroup_conversation();
DROP FUNCTION IF EXISTS auto_add_member_to_workgroup_conversation();
DROP FUNCTION IF EXISTS update_conversation_on_message();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Message de confirmation
SELECT '✅ Fonctions existantes supprimées - Vous pouvez maintenant exécuter le script principal messaging_system_workgroups.sql' as message; 