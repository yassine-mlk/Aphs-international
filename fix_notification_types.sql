-- =========================================
-- CORRECTION DES TYPES DE NOTIFICATIONS
-- À exécuter dans Supabase SQL Editor
-- =========================================

-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Ajouter la nouvelle contrainte CHECK avec tous les types supportés
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'file_uploaded', 
    'task_validated', 
    'new_message', 
    'meeting_request',
    'task_assigned', 
    'project_added', 
    'task_validation_request', 
    'file_validation_request', 
    'message_received', 
    'meeting_invitation',
    'meeting_accepted', 
    'meeting_declined',
    'meeting_request_approved',
    'meeting_request_rejected',
    'meeting_started',
    'task_status_changed'  -- Ajout du type manquant
));

-- Vérifier que la contrainte a été mise à jour
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'notifications_type_check';

-- Afficher tous les types de notifications supportés
SELECT 'Types de notifications supportés :' as info;
SELECT notification_type as supported_notification_types
FROM (
    VALUES 
        ('file_uploaded'),
        ('task_validated'),
        ('new_message'),
        ('meeting_request'),
        ('task_assigned'),
        ('project_added'),
        ('task_validation_request'),
        ('file_validation_request'),
        ('message_received'),
        ('meeting_invitation'),
        ('meeting_accepted'),
        ('meeting_declined'),
        ('meeting_request_approved'),
        ('meeting_request_rejected'),
        ('meeting_started'),
        ('task_status_changed')
) as types(notification_type)
ORDER BY notification_type;

-- Confirmer que la mise à jour est terminée
SELECT 'Mise à jour des types de notifications terminée avec succès' as status; 