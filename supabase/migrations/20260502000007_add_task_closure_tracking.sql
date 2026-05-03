-- Migration: Ajouter closed_by et closed_at aux tables de tâches
-- Description: Permet de tracer qui a clôturé la tâche et quand

ALTER TABLE public.workflow_tasks 
ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE public.standard_tasks 
ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Mettre à jour la vue task_assignments_view pour inclure ces champs
DROP VIEW IF EXISTS public.task_assignments_view CASCADE;
CREATE OR REPLACE VIEW public.task_assignments_view AS
SELECT 
    t.id, t.project_id, p.name as project_name, p.tenant_id, t.phase_id, 
    t.section_id, t.subsection_id,
    t.section_id as section_name, t.subsection_id as subsection_name,
    t.title as task_name, t.description as comment, 'standard' as assignment_type,
    t.status, t.priority, t.deadline, NULL::date as validation_deadline,
    NULL::date as start_date, NULL::date as end_date, 'pdf'::text as file_extension,
    t.created_at, t.updated_at,
    COALESCE((SELECT array_agg(user_id) FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'executor'), '{}'::uuid[]) as assigned_to,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', 3, 'role', 'validator', 'order', NULL))
              FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'validator'), '[]'::jsonb) as validators,
    NULL as current_version_label,
    0 as current_validator_idx,
    t.transparency_mode,
    t.max_revisions,
    t.revision_count,
    t.closed_by,
    t.closed_at
FROM public.standard_tasks t
JOIN public.projects p ON t.project_id = p.id
UNION ALL
SELECT 
    t.id, t.project_id, p.name as project_name, p.tenant_id, t.phase_id, 
    t.section_id, t.subsection_id,
    t.section_id as section_name, t.subsection_id as subsection_name,
    t.title as task_name, t.description as comment, 'workflow' as assignment_type,
    t.status, t.priority, t.deadline, t.validation_deadline,
    NULL::date as start_date, NULL::date as end_date, 'pdf'::text as file_extension,
    t.created_at, t.updated_at,
    COALESCE((SELECT array_agg(user_id) FROM public.workflow_task_assignments WHERE task_id = t.id AND role = 'executor'), '{}'::uuid[]) as assigned_to,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', days_limit, 'role', 'validator', 'order', validator_order) ORDER BY validator_order ASC)
              FROM public.workflow_task_assignments WHERE task_id = t.id AND role = 'validator'), '[]'::jsonb) as validators,
    t.current_version_label,
    t.current_validator_idx,
    t.transparency_mode,
    t.max_revisions,
    t.revision_count,
    t.closed_by,
    t.closed_at
FROM public.workflow_tasks t
JOIN public.projects p ON t.project_id = p.id;
