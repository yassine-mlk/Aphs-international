-- SCRIPT DE REFONTE TOTALE POUR GESTION DE PROJET SÉQUENTIELLE ET WORKFLOW

-- 1. NETTOYAGE (Optionnel, à exécuter si vous voulez repartir de zéro)
-- DROP TABLE IF EXISTS project_task_assignments CASCADE;
-- DROP TABLE IF EXISTS project_tasks_snapshot CASCADE;
-- DROP TABLE IF EXISTS project_items_snapshot CASCADE;
-- DROP TABLE IF EXISTS project_sections_snapshot CASCADE;
-- DROP TABLE IF EXISTS project_info_sheets CASCADE;

-- 2. EXTENSION DE LA STRUCTURE DES SECTIONS (ÉTAPES)
ALTER TABLE project_sections_snapshot 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'started', 'completed')),
ADD COLUMN IF NOT EXISTS actual_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS planned_end_date TIMESTAMP WITH TIME ZONE;

-- 3. EXTENSION DE LA STRUCTURE DES ITEMS (SOUS-ÉTAPES)
ALTER TABLE project_items_snapshot 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'started', 'completed')),
ADD COLUMN IF NOT EXISTS actual_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS planned_end_date TIMESTAMP WITH TIME ZONE;

-- 4. AJOUT DES FICHES INFORMATIVES
CREATE TABLE IF NOT EXISTS project_info_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID, -- Référence au project_tasks_snapshot
    title TEXT NOT NULL,
    content TEXT, -- Markdown ou HTML
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. REFONTE DU SYSTÈME D'ASSIGNATION ET WORKFLOW
-- On ajoute le type d'assignation et la gestion des délais
ALTER TABLE project_task_assignments
ADD COLUMN IF NOT EXISTS assignment_type TEXT DEFAULT 'standard' CHECK (assignment_type IN ('standard', 'workflow')),
ADD COLUMN IF NOT EXISTS workflow_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS days_limit INTEGER, -- Délai imparti en jours
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Table pour l'ordre des validateurs dans un workflow
CREATE TABLE IF NOT EXISTS project_task_workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES project_task_assignments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    step_order INTEGER NOT NULL,
    days_limit INTEGER NOT NULL, -- Nombre de jours pour cette étape du workflow
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'rejected')),
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. FONCTION POUR DÉBUTER UNE ÉTAPE
CREATE OR REPLACE FUNCTION start_project_section(
    p_section_id UUID,
    p_planned_end_date TIMESTAMP WITH TIME ZONE
) RETURNS VOID AS $$
BEGIN
    UPDATE project_sections_snapshot
    SET status = 'started',
        actual_start_date = NOW(),
        planned_end_date = p_planned_end_date
    WHERE id = p_section_id;
END;
$$ LANGUAGE plpgsql;

-- 7. FONCTION POUR DÉBUTER UNE SOUS-ÉTAPE
CREATE OR REPLACE FUNCTION start_project_item(
    p_item_id UUID,
    p_planned_end_date TIMESTAMP WITH TIME ZONE
) RETURNS VOID AS $$
DECLARE
    v_section_id UUID;
    v_section_status TEXT;
BEGIN
    -- Vérifier si la section parente est débutée
    SELECT section_id INTO v_section_id FROM project_items_snapshot WHERE id = p_item_id;
    SELECT status INTO v_section_status FROM project_sections_snapshot WHERE id = v_section_id;
    
    IF v_section_status != 'started' THEN
        RAISE EXCEPTION 'Impossible de débuter une sous-étape si l''étape parente n''est pas débutée.';
    END IF;

    UPDATE project_items_snapshot
    SET status = 'started',
        actual_start_date = NOW(),
        planned_end_date = p_planned_end_date
    WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql;

-- 8. INDEX POUR LA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_info_sheets_project ON project_info_sheets(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_assignment ON project_task_workflow_steps(assignment_id);
