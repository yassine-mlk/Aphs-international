-- Migration pour créer la table task_assignments
-- Basée sur l'interface TaskAssignment de la page détails projet

-- Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS task_assignments CASCADE;

-- Créer le type enum pour le statut des tâches
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('assigned', 'in_progress', 'submitted', 'validated', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Créer la table task_assignments
CREATE TABLE task_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL,
    phase_id TEXT NOT NULL CHECK (phase_id IN ('conception', 'realisation')),
    section_id TEXT NOT NULL,
    subsection_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    assigned_to UUID NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    validation_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    validators TEXT[] NOT NULL DEFAULT '{}',
    file_extension TEXT NOT NULL DEFAULT 'pdf',
    comment TEXT,
    status task_status NOT NULL DEFAULT 'assigned',
    file_url TEXT,
    validation_comment TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE,
    validated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Créer des index pour améliorer les performances
CREATE INDEX idx_task_assignments_project_id ON task_assignments(project_id);
CREATE INDEX idx_task_assignments_assigned_to ON task_assignments(assigned_to);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);
CREATE INDEX idx_task_assignments_phase_id ON task_assignments(phase_id);
CREATE INDEX idx_task_assignments_deadline ON task_assignments(deadline);
CREATE INDEX idx_task_assignments_validation_deadline ON task_assignments(validation_deadline);

-- Index composite pour optimiser les requêtes de recherche de tâche
CREATE UNIQUE INDEX idx_task_assignments_unique_task ON task_assignments(
    project_id, phase_id, section_id, subsection_id, task_name
);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_task_assignments_updated_at 
    BEFORE UPDATE ON task_assignments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Contraintes optionnelles pour assurer la cohérence des données
ALTER TABLE task_assignments ADD CONSTRAINT check_deadline_order 
    CHECK (validation_deadline >= deadline);

ALTER TABLE task_assignments ADD CONSTRAINT check_submitted_at_valid 
    CHECK (submitted_at IS NULL OR status IN ('submitted', 'validated', 'rejected'));

ALTER TABLE task_assignments ADD CONSTRAINT check_validated_at_valid 
    CHECK (validated_at IS NULL OR status IN ('validated', 'rejected'));

ALTER TABLE task_assignments ADD CONSTRAINT check_validated_by_required 
    CHECK (validated_by IS NULL OR status IN ('validated', 'rejected'));

-- AUCUNE POLITIQUE RLS (Row Level Security) COMME DEMANDÉ
-- La table sera accessible sans restrictions 