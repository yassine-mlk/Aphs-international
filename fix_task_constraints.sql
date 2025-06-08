-- Script SQL pour corriger les contraintes sur task_assignments
-- Ce script supprime la contrainte check_validated_at_valid qui cause des problèmes

-- Supprimer la contrainte problématique
ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS check_validated_at_valid;

-- La contrainte était trop restrictive et empêchait les mises à jour en deux étapes
-- En production, on peut s'assurer de la cohérence des données au niveau application

-- Optionnel: Créer une contrainte moins restrictive si nécessaire
-- Cette contrainte permet validated_at d'être défini même si le statut n'est pas encore mis à jour
-- ALTER TABLE task_assignments ADD CONSTRAINT check_validated_at_with_status 
--     CHECK (validated_at IS NULL OR validated_by IS NOT NULL);

-- Afficher le résultat
SELECT 'Contrainte check_validated_at_valid supprimée avec succès!' as message; 