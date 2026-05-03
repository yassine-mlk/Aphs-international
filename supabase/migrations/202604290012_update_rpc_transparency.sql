-- Update upsert_task_assignment to handle transparency_mode
DROP FUNCTION IF EXISTS public.upsert_task_assignment CASCADE;

CREATE OR REPLACE FUNCTION public.upsert_task_assignment(
    p_project_id UUID,
    p_phase_id TEXT,
    p_section_id TEXT,
    p_subsection_id TEXT,
    p_task_name TEXT,
    p_assigned_to UUID[],
    p_deadline DATE,
    p_validators JSONB,
    p_assignment_type TEXT,
    p_file_extension TEXT DEFAULT 'pdf',
    p_comment TEXT DEFAULT NULL,
    p_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'open',
    p_executor_days_limit INTEGER DEFAULT 3,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_validation_deadline DATE DEFAULT NULL,
    p_transparency_mode BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    v_task_id UUID;
    v_validator_record RECORD;
    v_validator_idx INTEGER := 0;
    v_result JSONB;
BEGIN
    IF p_assignment_type = 'standard' THEN
        -- GESTION TÂCHE STANDARD
        IF p_id IS NOT NULL THEN
            UPDATE public.standard_tasks SET
                title = p_task_name, description = p_comment, deadline = p_deadline, 
                transparency_mode = p_transparency_mode, updated_at = NOW()
            WHERE id = p_id RETURNING id INTO v_task_id;
        ELSE
            INSERT INTO public.standard_tasks (project_id, phase_id, section_id, subsection_id, title, description, deadline, status, transparency_mode)
            VALUES (p_project_id, p_phase_id, p_section_id, p_subsection_id, p_task_name, p_comment, p_deadline, p_status, p_transparency_mode)
            ON CONFLICT (project_id, phase_id, section_id, subsection_id, title) 
            DO UPDATE SET deadline = EXCLUDED.deadline, description = EXCLUDED.description, transparency_mode = EXCLUDED.transparency_mode, updated_at = NOW()
            RETURNING id INTO v_task_id;
        END IF;

        DELETE FROM public.standard_task_assignments WHERE task_id = v_task_id;
        INSERT INTO public.standard_task_assignments (task_id, user_id, role)
        SELECT v_task_id, unnest(p_assigned_to), 'executor';
        
        FOR v_validator_record IN SELECT * FROM jsonb_to_recordset(p_validators) AS x(user_id UUID)
        LOOP
            INSERT INTO public.standard_task_assignments (task_id, user_id, role)
            VALUES (v_task_id, v_validator_record.user_id, 'validator');
        END LOOP;

    ELSE
        -- GESTION TÂCHE WORKFLOW
        IF p_id IS NOT NULL THEN
            UPDATE public.workflow_tasks SET
                title = p_task_name, description = p_comment, deadline = p_deadline, 
                validation_deadline = p_validation_deadline, transparency_mode = p_transparency_mode, updated_at = NOW()
            WHERE id = p_id RETURNING id INTO v_task_id;
        ELSE
            INSERT INTO public.workflow_tasks (project_id, phase_id, section_id, subsection_id, title, description, deadline, validation_deadline, status, transparency_mode)
            VALUES (p_project_id, p_phase_id, p_section_id, p_subsection_id, p_task_name, p_comment, p_deadline, p_validation_deadline, p_status, p_transparency_mode)
            ON CONFLICT (project_id, phase_id, section_id, subsection_id, title) 
            DO UPDATE SET deadline = EXCLUDED.deadline, validation_deadline = EXCLUDED.validation_deadline, description = EXCLUDED.description, transparency_mode = EXCLUDED.transparency_mode, updated_at = NOW()
            RETURNING id INTO v_task_id;
        END IF;

        DELETE FROM public.workflow_task_assignments WHERE task_id = v_task_id;
        INSERT INTO public.workflow_task_assignments (task_id, user_id, role, days_limit)
        SELECT v_task_id, unnest(p_assigned_to), 'executor', p_executor_days_limit;
        
        FOR v_validator_record IN SELECT * FROM jsonb_to_recordset(p_validators) AS x(user_id UUID, days_limit INTEGER)
        LOOP
            v_validator_idx := v_validator_idx + 1;
            INSERT INTO public.workflow_task_assignments (task_id, user_id, role, validator_order, days_limit)
            VALUES (v_task_id, v_validator_record.user_id, 'validator', v_validator_idx, v_validator_record.days_limit);
        END LOOP;
    END IF;

    SELECT jsonb_build_object('id', v_task_id) INTO v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.upsert_task_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_task_assignment TO anon;
