-- ============================================================
-- MISE À JOUR DE LA TABLE 'tasks' POUR LA HIÉRARCHIE ET LA PRIORITÉ
-- ============================================================

-- 1. Ajouter les colonnes de hiérarchie et priorité à la table 'tasks'
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS phase_id TEXT,
ADD COLUMN IF NOT EXISTS section_id TEXT,
ADD COLUMN IF NOT EXISTS subsection_id TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS file_extension TEXT DEFAULT 'pdf',
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS validation_deadline DATE;

-- 2. Ajouter une contrainte d'unicité pour identifier les tâches par leur position dans la structure
-- Cela permet d'utiliser ON CONFLICT dans le RPC upsert_task_assignment
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_project_hierarchy_title_key;

ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_project_hierarchy_title_key 
UNIQUE (project_id, phase_id, section_id, subsection_id, title);

-- 3. Mettre à jour 'task_assignments' pour inclure 'days_limit'
ALTER TABLE public.task_assignments
ADD COLUMN IF NOT EXISTS days_limit INTEGER DEFAULT 3;

-- 4. RPC : upsert_task_assignment (Refactorisé pour le nouveau schéma)
DROP FUNCTION IF EXISTS public.upsert_task_assignment CASCADE;

CREATE OR REPLACE FUNCTION public.upsert_task_assignment(
    p_project_id UUID,
    p_phase_id TEXT,
    p_section_id TEXT,
    p_subsection_id TEXT,
    p_task_name TEXT,
    p_assigned_to UUID[], -- Liste des IDs des exécutants
    p_deadline DATE,
    p_validators JSONB, -- Liste d'objets {user_id: UUID, days_limit: number}
    p_assignment_type TEXT, -- 'standard' (parallel) ou 'workflow' (sequential)
    p_file_extension TEXT DEFAULT 'pdf',
    p_comment TEXT DEFAULT NULL,
    p_id UUID DEFAULT NULL, -- Optionnel : ID existant de la tâche (si connu)
    p_status TEXT DEFAULT 'open',
    p_executor_days_limit INTEGER DEFAULT 3,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_validation_deadline DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_task_id UUID;
    v_task_type TEXT;
    v_validator_record RECORD;
    v_validator_idx INTEGER := 1;
    v_result JSONB;
BEGIN
    -- Déterminer le type de tâche technique
    v_task_type := CASE WHEN p_assignment_type = 'workflow' THEN 'sequential' ELSE 'parallel' END;

    -- 1. Créer ou Mettre à jour la tâche
    INSERT INTO public.tasks (
        project_id, phase_id, section_id, subsection_id, title, 
        task_type, deadline, status, description, file_extension, priority,
        start_date, end_date, validation_deadline
    ) 
    VALUES (
        p_project_id, p_phase_id, p_section_id, p_subsection_id, p_task_name,
        v_task_type, p_deadline, p_status, p_comment, p_file_extension, 'medium',
        p_start_date, p_end_date, p_validation_deadline
    )
    ON CONFLICT (project_id, phase_id, section_id, subsection_id, title) 
    DO UPDATE SET
        task_type = EXCLUDED.task_type,
        deadline = EXCLUDED.deadline,
        status = CASE 
            WHEN tasks.status = 'open' THEN EXCLUDED.status 
            ELSE tasks.status 
        END,
        description = EXCLUDED.description,
        file_extension = EXCLUDED.file_extension,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        validation_deadline = EXCLUDED.validation_deadline,
        updated_at = NOW()
    RETURNING id INTO v_task_id;

    -- 2. Nettoyer les anciennes assignations
    DELETE FROM public.task_assignments WHERE task_id = v_task_id;

    -- 3. Insérer les nouveaux exécutants
    INSERT INTO public.task_assignments (task_id, user_id, role, days_limit)
    SELECT v_task_id, unnest(p_assigned_to), 'executor', p_executor_days_limit;

    -- 4. Insérer les nouveaux validateurs
    FOR v_validator_record IN SELECT * FROM jsonb_to_recordset(p_validators) AS x(user_id UUID, days_limit INTEGER)
    LOOP
        INSERT INTO public.task_assignments (task_id, user_id, role, validator_order, days_limit)
        VALUES (v_task_id, v_validator_record.user_id, 'validator', v_validator_idx, v_validator_record.days_limit);
        v_validator_idx := v_validator_idx + 1;
    END LOOP;

    -- 5. Préparer le résultat
    SELECT jsonb_build_object(
        'id', v_task_id,
        'title', p_task_name,
        'status', 'success'
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.upsert_task_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_task_assignment TO anon;
