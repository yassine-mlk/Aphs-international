-- 1. Ajout de la colonne validation_deadline à standard_tasks si elle n'existe pas
ALTER TABLE public.standard_tasks ADD COLUMN IF NOT EXISTS validation_deadline DATE;

-- 2. Backfill : pour les tâches existantes, si validation_deadline est NULL, on prend la deadline
UPDATE public.standard_tasks SET validation_deadline = deadline WHERE validation_deadline IS NULL;

-- 3. Mise à jour de la vue pour inclure validation_deadline pour les tâches standard et workflow
DROP VIEW IF EXISTS public.task_assignments_view;
CREATE VIEW public.task_assignments_view AS
SELECT 
    t.id, t.project_id, p.name as project_name, t.phase_id, 
    t.section_id, t.subsection_id,
    COALESCE(s.title, t.section_id) as section_name, 
    COALESCE(ss.title, t.subsection_id) as subsection_name,
    t.title as task_name, t.description as comment, 'standard' as assignment_type,
    t.status, t.priority, t.deadline, t.validation_deadline, 
    NULL::date as start_date, NULL::date as end_date, 'pdf'::text as file_extension,
    COALESCE((SELECT array_agg(user_id) FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'executor'), '{}'::uuid[]) as assigned_to,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', 3, 'role', 'validator', 'order', NULL))
              FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'validator'), '[]'::jsonb) as validators,
    t.created_at, t.updated_at, t.tenant_id,
    false as transparency_mode, 0 as revision_count, 3 as max_revisions,
    NULL::text as current_version_label, 0 as current_validator_idx, NULL::uuid as current_validator_id,
    NULL::uuid as closed_by, NULL::timestamptz as closed_at
FROM public.standard_tasks t
JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.project_sections_snapshot s ON (t.section_id = s.id::text OR t.section_id = s.tenant_section_id::text) AND t.project_id = s.project_id
LEFT JOIN public.project_items_snapshot ss ON (t.subsection_id = ss.id::text OR t.subsection_id = ss.tenant_item_id::text) AND t.project_id = ss.project_id
UNION ALL
SELECT 
    t.id, t.project_id, p.name as project_name, t.phase_id, 
    t.section_id, t.subsection_id,
    COALESCE(s.title, t.section_id) as section_name, 
    COALESCE(ss.title, t.subsection_id) as subsection_name,
    t.title as task_name, t.description as comment, 'workflow' as assignment_type,
    t.status, t.priority, t.deadline, t.validation_deadline,
    NULL::date as start_date, NULL::date as end_date, 'pdf'::text as file_extension,
    COALESCE((SELECT array_agg(user_id) FROM public.workflow_task_assignments WHERE task_id = t.id AND role = 'executor'), '{}'::uuid[]) as assigned_to,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', days_limit, 'role', 'validator', 'order', validator_order) ORDER BY validator_order ASC)
              FROM public.workflow_task_assignments WHERE task_id = t.id AND role = 'validator'), '[]'::jsonb) as validators,
    t.created_at, t.updated_at, t.tenant_id,
    t.transparency_mode, t.revision_count, t.max_revisions,
    t.current_version_label, t.current_validator_idx, t.current_validator_id,
    t.closed_by, t.closed_at
FROM public.workflow_tasks t
JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.project_sections_snapshot s ON (t.section_id = s.id::text OR t.section_id = s.tenant_section_id::text) AND t.project_id = s.project_id
LEFT JOIN public.project_items_snapshot ss ON (t.subsection_id = ss.id::text OR t.subsection_id = ss.tenant_item_id::text) AND t.project_id = ss.project_id;

-- 4. Mise à jour du RPC pour sauvegarder validation_deadline
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
    p_transparency_mode BOOLEAN DEFAULT FALSE,
    p_max_revisions INTEGER DEFAULT 3
)
RETURNS JSONB AS $$
DECLARE
    v_task_id UUID;
    v_validator_record RECORD;
    v_validator_idx INTEGER := 0;
    v_result JSONB;
    v_tenant_id UUID;
BEGIN
    -- Récupérer le tenant_id du projet
    SELECT tenant_id INTO v_tenant_id FROM public.projects WHERE id = p_project_id;

    IF p_assignment_type = 'standard' THEN
        -- GESTION TÂCHE STANDARD
        IF p_id IS NOT NULL THEN
            UPDATE public.standard_tasks SET
                title = p_task_name, 
                description = p_comment, 
                deadline = p_deadline, 
                validation_deadline = p_validation_deadline, 
                updated_at = NOW()
            WHERE id = p_id RETURNING id INTO v_task_id;
        ELSE
            INSERT INTO public.standard_tasks (project_id, phase_id, section_id, subsection_id, title, description, deadline, validation_deadline, status, tenant_id)
            VALUES (p_project_id, p_phase_id, p_section_id, p_subsection_id, p_task_name, p_comment, p_deadline, p_validation_deadline, p_status, v_tenant_id)
            ON CONFLICT (project_id, phase_id, section_id, subsection_id, title) 
            DO UPDATE SET 
                deadline = EXCLUDED.deadline, 
                validation_deadline = EXCLUDED.validation_deadline,
                description = EXCLUDED.description, 
                updated_at = NOW()
            RETURNING id INTO v_task_id;
        END IF;

        DELETE FROM public.standard_task_assignments WHERE task_id = v_task_id;
        
        -- Executors
        IF p_assigned_to IS NOT NULL THEN
            INSERT INTO public.standard_task_assignments (task_id, user_id, role)
            SELECT v_task_id, unnest(p_assigned_to), 'executor';
        END IF;
        
        -- Validators
        IF p_validators IS NOT NULL THEN
            FOR v_validator_record IN SELECT * FROM jsonb_to_recordset(p_validators) AS x(user_id UUID)
            LOOP
                INSERT INTO public.standard_task_assignments (task_id, user_id, role)
                VALUES (v_task_id, v_validator_record.user_id, 'validator');
            END LOOP;
        END IF;

    ELSE
        -- GESTION TÂCHE WORKFLOW
        IF p_id IS NOT NULL THEN
            UPDATE public.workflow_tasks SET
                title = p_task_name, 
                description = p_comment, 
                deadline = p_deadline, 
                validation_deadline = p_validation_deadline,
                transparency_mode = p_transparency_mode,
                max_revisions = p_max_revisions,
                updated_at = NOW()
            WHERE id = p_id RETURNING id INTO v_task_id;
        ELSE
            INSERT INTO public.workflow_tasks (project_id, phase_id, section_id, subsection_id, title, description, deadline, validation_deadline, status, tenant_id, transparency_mode, max_revisions)
            VALUES (p_project_id, p_phase_id, p_section_id, p_subsection_id, p_task_name, p_comment, p_deadline, p_validation_deadline, p_status, v_tenant_id, p_transparency_mode, p_max_revisions)
            ON CONFLICT (project_id, phase_id, section_id, subsection_id, title) 
            DO UPDATE SET 
                deadline = EXCLUDED.deadline, 
                validation_deadline = EXCLUDED.validation_deadline,
                description = EXCLUDED.description,
                transparency_mode = EXCLUDED.transparency_mode,
                max_revisions = EXCLUDED.max_revisions,
                updated_at = NOW()
            RETURNING id INTO v_task_id;
        END IF;

        DELETE FROM public.workflow_task_assignments WHERE task_id = v_task_id;
        
        -- Executors
        IF p_assigned_to IS NOT NULL THEN
            INSERT INTO public.workflow_task_assignments (task_id, user_id, role, days_limit)
            SELECT v_task_id, unnest(p_assigned_to), 'executor', p_executor_days_limit;
        END IF;
        
        -- Validators
        IF p_validators IS NOT NULL THEN
            FOR v_validator_record IN SELECT * FROM jsonb_to_recordset(p_validators) AS x(user_id UUID, days_limit INTEGER)
            LOOP
                v_validator_idx := v_validator_idx + 1;
                INSERT INTO public.workflow_task_assignments (task_id, user_id, role, validator_order, days_limit)
                VALUES (v_task_id, v_validator_record.user_id, 'validator', v_validator_idx, COALESCE(v_validator_record.days_limit, 5));
            END LOOP;
        END IF;
    END IF;

    SELECT jsonb_build_object('id', v_task_id, 'title', p_task_name, 'status', 'success') INTO v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
