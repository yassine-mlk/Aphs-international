-- PARTIE 2: Mise à jour des contraintes pour supporter 'finalized'
-- Ce script doit être exécuté APRÈS avoir ajouté la valeur 'finalized' à l'enum task_status

-- Supprimer l'ancienne contrainte
ALTER TABLE task_submission_history DROP CONSTRAINT IF EXISTS task_submission_history_action_type_check;

-- Ajouter la nouvelle contrainte avec 'finalized'
ALTER TABLE task_submission_history ADD CONSTRAINT task_submission_history_action_type_check 
    CHECK (action_type IN ('submitted', 'validated', 'rejected', 'resubmitted', 'finalized'));

-- Ajouter un commentaire sur le nouveau statut
COMMENT ON TYPE task_status IS 'Statuts des tâches: assigned, in_progress, submitted, validated, rejected, finalized';

-- Afficher le résultat final
SELECT 'Partie 2 terminée - Contraintes mises à jour avec succès!' as message;
SELECT 'L''enum task_status supporte maintenant: ' || array_to_string(enum_range(NULL::task_status), ', ') as statuts_disponibles; 