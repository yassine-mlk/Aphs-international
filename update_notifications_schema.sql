-- =========================================
-- SCRIPT DE MISE À JOUR DU SCHÉMA DE NOTIFICATIONS
-- À exécuter dans Supabase SQL Editor
-- =========================================

-- Ajouter le nouveau type de notification 'task_status_changed'
-- D'abord, supprimer la contrainte existante
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Recréer la contrainte avec le nouveau type
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'file_uploaded', 'task_validated', 'new_message', 'meeting_request',
    'task_assigned', 'project_added', 'task_validation_request', 
    'file_validation_request', 'message_received', 'meeting_invitation',
    'meeting_accepted', 'meeting_declined', 'meeting_request_approved',
    'meeting_request_rejected', 'meeting_started', 'task_status_changed'
));

-- Vérifier que la mise à jour s'est bien passée
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND contype = 'c';

-- Afficher les types de notifications supportés
SELECT unnest(enum_range(NULL::text)) as supported_notification_types
FROM (
    SELECT 'file_uploaded'::text
    UNION SELECT 'task_validated'
    UNION SELECT 'new_message'
    UNION SELECT 'meeting_request'
    UNION SELECT 'task_assigned'
    UNION SELECT 'project_added'
    UNION SELECT 'task_validation_request'
    UNION SELECT 'file_validation_request'
    UNION SELECT 'message_received'
    UNION SELECT 'meeting_invitation'
    UNION SELECT 'meeting_accepted'
    UNION SELECT 'meeting_declined'
    UNION SELECT 'meeting_request_approved'
    UNION SELECT 'meeting_request_rejected'
    UNION SELECT 'meeting_started'
    UNION SELECT 'task_status_changed'
) as types; 