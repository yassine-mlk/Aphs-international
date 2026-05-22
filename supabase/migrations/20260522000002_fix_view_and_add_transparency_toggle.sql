-- ============================================================
-- CORRECTION : transparency_mode toujours false dans la vue pour les tâches standard
-- AJOUT : RPC pour basculer transparency_mode par l'admin
-- ============================================================

-- 1. Recréer la vue avec la correction : t.transparency_mode au lieu de false
DROP VIEW IF EXISTS public.task_assignments_view CASCADE;
CREATE VIEW public.task_assignments_view AS
SELECT 
    t.id, t.project_id, p.name as project_name, t.phase_id, 
    t.section_id, t.subsection_id,
    COALESCE(s.title, t.section_id) as section_name, 
    COALESCE(ss.title, t.subsection_id) as subsection_name,
    t.title as task_name, t.description as comment, 'standard' as assignment_type,
    t.status, t.priority, t.deadline, t.validation_deadline, 
    t.created_by,
    NULL::date as start_date, NULL::date as end_date, 'pdf'::text as file_extension,
    COALESCE((SELECT array_agg(user_id) FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'executor'), '{}'::uuid[]) as assigned_to,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', 3, 'role', 'validator', 'order', NULL))
              FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'validator'), '[]'::jsonb) as validators,
    t.created_at, t.updated_at, t.tenant_id,
    t.transparency_mode, 0 as revision_count, 3 as max_revisions,
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
    t.created_by,
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

-- 2. RPC pour basculer transparency_mode (admin uniquement)
CREATE OR REPLACE FUNCTION public.toggle_task_transparency(
    p_task_id UUID,
    p_transparency_mode BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.standard_tasks
    SET transparency_mode = p_transparency_mode, updated_at = NOW()
    WHERE id = p_task_id;

    IF NOT FOUND THEN
        UPDATE public.workflow_tasks
        SET transparency_mode = p_transparency_mode, updated_at = NOW()
        WHERE id = p_task_id;
    END IF;
END;
$$;

-- 3. Accorder les permissions
GRANT SELECT ON public.task_assignments_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_task_transparency TO authenticated;
