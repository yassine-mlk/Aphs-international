-- SCRIPT DE REFONTE AVEC SUPPRESSION PRÉALABLE DES FONCTIONS CONFLICTUELLES

-- 1. SUPPRESSION DES FONCTIONS EXISTANTES POUR ÉVITER LES ERREURS DE TYPE DE RETOUR
DROP FUNCTION IF EXISTS get_task_assignments_with_projects(uuid);
DROP FUNCTION IF EXISTS upsert_task_assignment CASCADE;

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
    content TEXT, -- Contenu riche (Markdown ou HTML)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. REFONTE DU SYSTÈME D'ASSIGNATION (task_assignments)
ALTER TABLE task_assignments
ADD COLUMN IF NOT EXISTS assignment_type TEXT DEFAULT 'standard' CHECK (assignment_type IN ('standard', 'workflow')),
ADD COLUMN IF NOT EXISTS workflow_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS days_limit INTEGER, 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- 6. CRÉATION DE LA TABLE WORKFLOW STEPS
CREATE TABLE IF NOT EXISTS project_task_workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES task_assignments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    step_order INTEGER NOT NULL,
    days_limit INTEGER NOT NULL, 
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'rejected')),
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. RECRÉATION DE LA FONCTION get_task_assignments_with_projects (MISE À JOUR)
CREATE OR REPLACE FUNCTION get_task_assignments_with_projects(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    project_name TEXT,
    phase_id TEXT,
    section_id TEXT,
    subsection_id TEXT,
    task_name TEXT,
    assigned_to UUID[],
    deadline TIMESTAMP WITH TIME ZONE,
    validation_deadline TIMESTAMP WITH TIME ZONE,
    validators TEXT[],
    file_extension TEXT,
    comment TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    file_url TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE,
    validation_comment TEXT,
    validated_by UUID,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    assignment_type TEXT,
    workflow_step INTEGER,
    days_limit INTEGER,
    due_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ta.id,
        ta.project_id,
        p.name as project_name,
        ta.phase_id,
        ta.section_id,
        ta.subsection_id,
        ta.task_name,
        ta.assigned_to,
        ta.deadline,
        ta.validation_deadline,
        ta.validators,
        ta.file_extension,
        ta.comment,
        ta.status,
        ta.created_at,
        ta.updated_at,
        ta.assigned_at,
        ta.file_url,
        ta.submitted_at,
        ta.validated_at,
        ta.validation_comment,
        ta.validated_by,
        ta.start_date,
        ta.end_date,
        ta.assignment_type,
        ta.workflow_step,
        ta.days_limit,
        ta.due_date
    FROM task_assignments ta
    LEFT JOIN projects p ON ta.project_id = p.id
    WHERE (p_user_id IS NULL OR p_user_id = ANY(ta.assigned_to))
    ORDER BY ta.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. FONCTION POUR DÉBUTER UNE ÉTAPE
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

-- 9. FONCTION POUR DÉBUTER UNE SOUS-ÉTAPE
CREATE OR REPLACE FUNCTION start_project_item(
    p_item_id UUID,
    p_planned_end_date TIMESTAMP WITH TIME ZONE
) RETURNS VOID AS $$
DECLARE
    v_section_id UUID;
    v_section_status TEXT;
BEGIN
    SELECT section_id INTO v_section_id FROM project_items_snapshot WHERE id = p_item_id;
    SELECT status INTO v_section_status FROM project_sections_snapshot WHERE id = v_section_id;
    
    IF v_section_status IS NULL OR v_section_status != 'started' THEN
        RAISE EXCEPTION 'Action bloquée : L''étape parente doit être débutée avant de lancer cette sous-étape.';
    END IF;

    UPDATE project_items_snapshot
    SET status = 'started',
        actual_start_date = NOW(),
        planned_end_date = p_planned_end_date
    WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql;
