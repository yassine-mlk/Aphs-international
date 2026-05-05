-- =========================================
-- SCRIPT DE NETTOYAGE COMPLET
-- À exécuter AVANT messaging_functions_only.sql
-- =========================================

-- Supprimer tous les triggers liés au messaging
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS trigger_auto_create_workgroup_conversation ON workgroups;
DROP TRIGGER IF EXISTS trigger_auto_add_member_to_workgroup_conversation ON workgroup_members;
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;

-- Supprimer toutes les fonctions liées au messaging
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_available_contacts(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_conversations(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_unread_count(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_direct_conversation(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_group_conversation(TEXT, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS create_workgroup_conversation(UUID) CASCADE;
DROP FUNCTION IF EXISTS auto_create_workgroup_conversation() CASCADE;
DROP FUNCTION IF EXISTS auto_add_member_to_workgroup_conversation() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_on_message() CASCADE;

-- Supprimer les fonctions avec signatures possiblement différentes
DROP FUNCTION IF EXISTS get_user_conversations(p_user_id UUID) CASCADE;
DROP FUNCTION IF EXISTS get_available_contacts(p_user_id UUID) CASCADE;
DROP FUNCTION IF EXISTS get_unread_count(p_conversation_id UUID, p_user_id UUID) CASCADE;
DROP FUNCTION IF EXISTS create_direct_conversation(p_user1_id UUID, p_user2_id UUID) CASCADE;
DROP FUNCTION IF EXISTS create_group_conversation(p_name TEXT, p_user_ids UUID[]) CASCADE;
DROP FUNCTION IF EXISTS create_workgroup_conversation(p_workgroup_id UUID) CASCADE;

-- Supprimer aussi toute fonction avec des variantes de nom
DROP FUNCTION IF EXISTS get_user_conversations_simple(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_contacts(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_contacts(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_conversation(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_message_conversation(UUID, UUID) CASCADE;

-- Vérification que toutes les fonctions ont été supprimées
SELECT 
    'NETTOYAGE TERMINÉ' as status,
    COUNT(*) as fonctions_restantes
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%conversation%' 
OR routine_name LIKE '%message%' 
OR routine_name LIKE '%contact%';

SELECT '✅ Maintenant exécutez messaging_functions_only.sql' as next_step; 