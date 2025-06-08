-- Script SQL pour ajouter le statut 'finalized' à l'enum task_status
-- Ce script doit être exécuté en deux parties séparées à cause des restrictions PostgreSQL

-- PARTIE 1: Ajouter la nouvelle valeur à l'enum (à exécuter en premier)
-- Cette commande doit être dans sa propre transaction
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'finalized';

-- Afficher le résultat de la partie 1
SELECT 'Partie 1 terminée - Statut finalized ajouté à l''enum!' as message;
SELECT enum_range(NULL::task_status) as statuts_disponibles;

-- IMPORTANT: Exécutez d'abord cette partie, puis exécutez la partie 2 ci-dessous
-- dans une requête séparée ou après un commit/refresh de votre session.

-- ===================================================================
-- PARTIE 2: Mettre à jour les contraintes (à exécuter après la partie 1)
-- ===================================================================

-- Uncomment and run this in a separate query after part 1:

/*
-- Supprimer l'ancienne contrainte
ALTER TABLE task_submission_history DROP CONSTRAINT IF EXISTS task_submission_history_action_type_check;

-- Ajouter la nouvelle contrainte avec 'finalized'
ALTER TABLE task_submission_history ADD CONSTRAINT task_submission_history_action_type_check 
    CHECK (action_type IN ('submitted', 'validated', 'rejected', 'resubmitted', 'finalized'));

-- Ajouter un commentaire sur le nouveau statut
COMMENT ON TYPE task_status IS 'Statuts des tâches: assigned, in_progress, submitted, validated, rejected, finalized';

-- Afficher le résultat final
SELECT 'Partie 2 terminée - Contraintes mises à jour!' as message;
*/ 