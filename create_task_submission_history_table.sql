-- Script SQL pour créer la table task_submission_history
-- Cette table conserve l'historique complet de toutes les soumissions, rejets et validations

-- Créer la table task_submission_history
CREATE TABLE IF NOT EXISTS task_submission_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_assignment_id UUID NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('submitted', 'validated', 'rejected', 'resubmitted')),
    file_url TEXT,
    file_name TEXT,
    comment TEXT,
    validation_comment TEXT,
    performed_by UUID NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}', -- Pour stocker des informations supplémentaires
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Commentaires sur les colonnes
COMMENT ON TABLE task_submission_history IS 'Historique complet des soumissions, validations et rejets de tâches';
COMMENT ON COLUMN task_submission_history.id IS 'Identifiant unique de l''entrée d''historique';
COMMENT ON COLUMN task_submission_history.task_assignment_id IS 'Référence à l''assignement de tâche';
COMMENT ON COLUMN task_submission_history.action_type IS 'Type d''action: submitted, validated, rejected, resubmitted';
COMMENT ON COLUMN task_submission_history.file_url IS 'URL du fichier soumis';
COMMENT ON COLUMN task_submission_history.file_name IS 'Nom du fichier soumis';
COMMENT ON COLUMN task_submission_history.comment IS 'Commentaire de soumission';
COMMENT ON COLUMN task_submission_history.validation_comment IS 'Commentaire de validation/rejet';
COMMENT ON COLUMN task_submission_history.performed_by IS 'UUID de l''utilisateur qui a effectué l''action';
COMMENT ON COLUMN task_submission_history.performed_at IS 'Date et heure de l''action';
COMMENT ON COLUMN task_submission_history.metadata IS 'Métadonnées supplémentaires en JSON';
COMMENT ON COLUMN task_submission_history.created_at IS 'Date de création de l''entrée';

-- Créer des index pour améliorer les performances
CREATE INDEX idx_task_submission_history_task_assignment_id ON task_submission_history(task_assignment_id);
CREATE INDEX idx_task_submission_history_action_type ON task_submission_history(action_type);
CREATE INDEX idx_task_submission_history_performed_by ON task_submission_history(performed_by);
CREATE INDEX idx_task_submission_history_performed_at ON task_submission_history(performed_at);

-- Index composite pour optimiser les requêtes de récupération d'historique
CREATE INDEX idx_task_submission_history_task_action_date ON task_submission_history(
    task_assignment_id, action_type, performed_at DESC
);

-- Désactiver RLS pour cette table (comme pour task_assignments)
ALTER TABLE task_submission_history DISABLE ROW LEVEL SECURITY; 