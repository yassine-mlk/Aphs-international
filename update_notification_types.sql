-- =========================================
-- MISE À JOUR DES TYPES DE NOTIFICATIONS
-- Script à exécuter dans Supabase SQL Editor
-- Ajoute le type 'meeting_started' à la contrainte CHECK
-- =========================================

-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Ajouter la nouvelle contrainte CHECK avec meeting_started
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
    'meeting_started'
));

-- Vérifier que la contrainte a été mise à jour
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'notifications_type_check';

-- Confirmer que la table est prête
SELECT 'Mise à jour des types de notifications terminée avec succès' as status; 