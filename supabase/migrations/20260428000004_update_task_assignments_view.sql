-- Mise à jour de la vue task_assignments_view pour inclure le nom du projet et de la phase
DROP VIEW IF EXISTS public.task_assignments_view;

CREATE OR REPLACE VIEW public.task_assignments_view AS
SELECT 
    t.id,
    t.project_id,
    p.tenant_id,
    p.name AS project_name,
    t.phase_id,
    t.section_id,
    t.subsection_id,
    t.title AS task_name,
    t.status,
    CASE 
        WHEN t.task_type = 'sequential' THEN 'workflow' 
        ELSE 'standard' 
    END AS assignment_type,
    t.deadline,
    t.validation_deadline,
    t.start_date,
    t.end_date,
    t.file_extension,
    t.description AS comment,
    t.priority,
    t.created_at,
    t.updated_at,
    COALESCE(
        (
            SELECT array_agg(user_id) 
            FROM public.task_assignments 
            WHERE task_id = t.id AND role = 'executor'
        ), 
        ARRAY[]::UUID[]
    ) AS assigned_to,
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', days_limit, 'role', role))
            FROM (
                SELECT user_id, days_limit, role 
                FROM public.task_assignments 
                WHERE task_id = t.id AND role = 'validator'
                ORDER BY validator_order ASC
            ) v
        ),
        '[]'::JSONB
    ) AS validators,
    COALESCE(
        (
            SELECT MAX(days_limit)
            FROM public.task_assignments
            WHERE task_id = t.id AND role = 'executor'
        ),
        3
    ) AS executor_days_limit
FROM public.tasks t
JOIN public.projects p ON t.project_id = p.id;

-- Accorder les permissions
GRANT SELECT ON public.task_assignments_view TO authenticated;
GRANT SELECT ON public.task_assignments_view TO anon;
