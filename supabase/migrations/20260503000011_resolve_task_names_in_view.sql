-- ============================================================
-- MISE À JOUR DE LA VUE POUR RÉSOUDRE LES NOMS DES SECTIONS ET SOUS-SECTIONS
-- ============================================================

-- 1. S'assurer que les colonnes nécessaires existent dans les tables physiques
ALTER TABLE public.standard_tasks ADD COLUMN IF NOT EXISTS validation_deadline DATE;
ALTER TABLE public.standard_tasks ADD COLUMN IF NOT EXISTS transparency_mode BOOLEAN DEFAULT FALSE;

ALTER TABLE public.workflow_tasks ADD COLUMN IF NOT EXISTS transparency_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE public.workflow_tasks ADD COLUMN IF NOT EXISTS current_version_label TEXT DEFAULT 'A';
ALTER TABLE public.workflow_tasks ADD COLUMN IF NOT EXISTS current_validator_id UUID REFERENCES public.profiles(user_id);
ALTER TABLE public.workflow_tasks ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0;
ALTER TABLE public.workflow_tasks ADD COLUMN IF NOT EXISTS max_revisions INTEGER DEFAULT 3;
ALTER TABLE public.workflow_tasks ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.profiles(user_id);
ALTER TABLE public.workflow_tasks ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

DROP VIEW IF EXISTS public.task_assignments_view CASCADE;

CREATE OR REPLACE VIEW public.task_assignments_view AS
SELECT 
    t.id, t.project_id, p.name as project_name, t.phase_id, 
    t.section_id, COALESCE(ps.title, t.section_id) as section_name,
    t.subsection_id, COALESCE(pi.title, t.subsection_id) as subsection_name,
    t.title as task_name, t.description as comment, 'standard' as assignment_type,
    t.status, t.priority, t.deadline, t.validation_deadline,
    NULL::date as start_date, NULL::date as end_date, 'pdf'::text as file_extension,
    t.transparency_mode,
    COALESCE((SELECT array_agg(user_id) FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'executor'), '{}'::uuid[]) as assigned_to,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', 3, 'role', 'validator', 'order', NULL))
              FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'validator'), '[]'::jsonb) as validators,
    t.created_at, t.updated_at, t.tenant_id,
    0 as revision_count, 3 as max_revisions,
    NULL::text as current_version_label, 0 as current_validator_idx, NULL::uuid as current_validator_id,
    NULL::uuid as closed_by, NULL::timestamptz as closed_at
FROM public.standard_tasks t
JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.project_sections_snapshot ps ON (
    CASE 
        WHEN t.section_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ps.id = t.section_id::uuid
        ELSE false
    END
)
LEFT JOIN public.project_items_snapshot pi ON (
    CASE 
        WHEN t.subsection_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN pi.id = t.subsection_id::uuid
        ELSE false
    END
)
UNION ALL
SELECT 
    t.id, t.project_id, p.name as project_name, t.phase_id, 
    t.section_id, COALESCE(ps.title, t.section_id) as section_name,
    t.subsection_id, COALESCE(pi.title, t.subsection_id) as subsection_name,
    t.title as task_name, t.description as comment, 'workflow' as assignment_type,
    t.status, t.priority, t.deadline, t.validation_deadline,
    NULL::date as start_date, NULL::date as end_date, 'pdf'::text as file_extension,
    t.transparency_mode,
    COALESCE((SELECT array_agg(user_id) FROM public.workflow_task_assignments WHERE task_id = t.id AND role = 'executor'), '{}'::uuid[]) as assigned_to,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', days_limit, 'role', 'validator', 'order', validator_order) ORDER BY validator_order ASC)
              FROM public.workflow_task_assignments WHERE task_id = t.id AND role = 'validator'), '[]'::jsonb) as validators,
    t.created_at, t.updated_at, t.tenant_id,
    t.revision_count, t.max_revisions,
    t.current_version_label, t.current_validator_idx, t.current_validator_id,
    t.closed_by, t.closed_at
FROM public.workflow_tasks t
JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.project_sections_snapshot ps ON (
    CASE 
        WHEN t.section_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ps.id = t.section_id::uuid
        ELSE false
    END
)
LEFT JOIN public.project_items_snapshot pi ON (
    CASE 
        WHEN t.subsection_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN pi.id = t.subsection_id::uuid
        ELSE false
    END
);

-- Accorder les permissions
GRANT SELECT ON public.task_assignments_view TO authenticated;
GRANT SELECT ON public.task_assignments_view TO anon;
