-- Script SQL direct pour créer la table task_assignments
-- Basée sur l'interface TaskAssignment de la page détails projet
-- SANS RLS comme demandé

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

-- Commentaires sur les colonnes
COMMENT ON TABLE task_assignments IS 'Table des assignements de tâches - Basée sur les formulaires existants de la page détails projet';
COMMENT ON COLUMN task_assignments.id IS 'Identifiant unique de l''assignement';
COMMENT ON COLUMN task_assignments.project_id IS 'Référence au projet (UUID)';
COMMENT ON COLUMN task_assignments.phase_id IS 'Phase du projet: conception ou realisation';
COMMENT ON COLUMN task_assignments.section_id IS 'ID de la section (A, B, C, etc.)';
COMMENT ON COLUMN task_assignments.subsection_id IS 'ID de la sous-section (A1, A2, B1, etc.)';
COMMENT ON COLUMN task_assignments.task_name IS 'Nom de la tâche';
COMMENT ON COLUMN task_assignments.assigned_to IS 'UUID de l''intervenant assigné';
COMMENT ON COLUMN task_assignments.deadline IS 'Date limite de remise';
COMMENT ON COLUMN task_assignments.validation_deadline IS 'Date limite de validation';
COMMENT ON COLUMN task_assignments.validators IS 'Array des UUIDs des validateurs';
COMMENT ON COLUMN task_assignments.file_extension IS 'Extension du fichier attendu (pdf, doc, etc.)';
COMMENT ON COLUMN task_assignments.comment IS 'Commentaire optionnel sur l''assignement';
COMMENT ON COLUMN task_assignments.status IS 'Statut de la tâche';
COMMENT ON COLUMN task_assignments.file_url IS 'URL du fichier soumis';
COMMENT ON COLUMN task_assignments.validation_comment IS 'Commentaire de validation';
COMMENT ON COLUMN task_assignments.submitted_at IS 'Date de soumission du fichier';
COMMENT ON COLUMN task_assignments.validated_at IS 'Date de validation';
COMMENT ON COLUMN task_assignments.validated_by IS 'UUID du validateur';
COMMENT ON COLUMN task_assignments.created_at IS 'Date de création de l''assignement';
COMMENT ON COLUMN task_assignments.updated_at IS 'Date de dernière mise à jour';

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
-- La table sera accessible sans restrictions pour tous les utilisateurs

-- Données d'exemple (optionnel)
-- Note: Ces UUIDs sont des exemples, remplacez-les par des UUIDs valides de votre base
-- 
-- INSERT INTO task_assignments (
--     project_id, phase_id, section_id, subsection_id, task_name,
--     assigned_to, deadline, validation_deadline, validators,
--     file_extension, comment, status
-- ) VALUES
-- (
--     '550e8400-e29b-41d4-a716-446655440000', -- project_id (exemple)
--     'conception', 'A', 'A1', 'ETUDE PRÉALABLE',
--     '550e8400-e29b-41d4-a716-446655440001', -- assigned_to (exemple)
--     NOW() + INTERVAL '7 days',
--     NOW() + INTERVAL '10 days',
--     ARRAY['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003'],
--     'pdf',
--     'Première tâche d''étude préalable à réaliser',
--     'assigned'
-- ),
-- (
--     '550e8400-e29b-41d4-a716-446655440000', -- même project_id
--     'conception', 'A', 'A1', 'AVIS SERVICES EXTERIEURS',
--     '550e8400-e29b-41d4-a716-446655440004', -- assigned_to différent
--     NOW() + INTERVAL '14 days',
--     NOW() + INTERVAL '17 days',
--     ARRAY['550e8400-e29b-41d4-a716-446655440002'],
--     'pdf',
--     'Recueillir les avis des services extérieurs',
--     'assigned'
-- ),
-- (
--     '550e8400-e29b-41d4-a716-446655440000', -- même project_id
--     'realisation', 'I', 'I1', 'FORME DU MARCHÉ',
--     '550e8400-e29b-41d4-a716-446655440001',
--     NOW() + INTERVAL '21 days',
--     NOW() + INTERVAL '24 days',
--     ARRAY['550e8400-e29b-41d4-a716-446655440003'],
--     'doc',
--     'Définir la forme du marché pour la phase réalisation',
--     'in_progress'
-- );

-- Afficher le résultat
SELECT 'Table task_assignments créée avec succès!' as message;
SELECT 
    'Colonnes créées: ' || string_agg(column_name, ', ' ORDER BY ordinal_position) as colonnes
FROM information_schema.columns 
WHERE table_name = 'task_assignments' 
    AND table_schema = 'public';

-- Afficher les index créés
SELECT 'Index créés: ' || string_agg(indexname, ', ') as indexes
FROM pg_indexes 
WHERE tablename = 'task_assignments';

-- Afficher les contraintes
SELECT 'Contraintes créées: ' || string_agg(conname, ', ') as constraints
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'task_assignments'; 