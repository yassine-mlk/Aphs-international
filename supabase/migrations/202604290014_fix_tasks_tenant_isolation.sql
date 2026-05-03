-- Migration to add tenant_id to standard and workflow task tables and update the consolidated view
-- This ensures multi-tenant isolation and fixes dashboard loading issues

-- 1. Add tenant_id to standard_tasks and workflow_tasks
ALTER TABLE public.standard_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.workflow_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 2. Add tenant_id to assignment tables
ALTER TABLE public.standard_task_assignments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.workflow_task_assignments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 3. Add tenant_id to submission and review tables
ALTER TABLE public.standard_task_submissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.standard_task_reviews ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.workflow_task_submissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.workflow_task_reviews ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 4. Update data from projects
UPDATE public.standard_tasks t SET tenant_id = p.tenant_id FROM public.projects p WHERE t.project_id = p.id AND t.tenant_id IS NULL;
UPDATE public.workflow_tasks t SET tenant_id = p.tenant_id FROM public.projects p WHERE t.project_id = p.id AND t.tenant_id IS NULL;

UPDATE public.standard_task_assignments t SET tenant_id = st.tenant_id FROM public.standard_tasks st WHERE t.task_id = st.id AND t.tenant_id IS NULL;
UPDATE public.workflow_task_assignments t SET tenant_id = wt.tenant_id FROM public.workflow_tasks wt WHERE t.task_id = wt.id AND t.tenant_id IS NULL;

UPDATE public.standard_task_submissions t SET tenant_id = st.tenant_id FROM public.standard_tasks st WHERE t.task_id = st.id AND t.tenant_id IS NULL;
UPDATE public.standard_task_reviews t SET tenant_id = ts.tenant_id FROM public.standard_task_submissions ts WHERE t.submission_id = ts.id AND t.tenant_id IS NULL;

UPDATE public.workflow_task_submissions t SET tenant_id = wt.tenant_id FROM public.workflow_tasks wt WHERE t.task_id = wt.id AND t.tenant_id IS NULL;
UPDATE public.workflow_task_reviews t SET tenant_id = ts.tenant_id FROM public.workflow_task_submissions ts WHERE t.submission_id = ts.id AND t.tenant_id IS NULL;

-- 5. Update task_assignments_view to include tenant_id
DROP VIEW IF EXISTS public.task_assignments_view CASCADE;
CREATE OR REPLACE VIEW public.task_assignments_view AS
SELECT 
    t.id, t.project_id, p.name as project_name, p.tenant_id, t.phase_id, 
    COALESCE(ps.id::text, t.section_id) as section_id, COALESCE(ps.title, t.section_id) as section_name,
    COALESCE(pi.id::text, t.subsection_id) as subsection_id, COALESCE(pi.title, t.subsection_id) as subsection_name,
    pts.id as task_id,
    t.title as task_name, t.description as comment, 'standard' as assignment_type,
    t.status, t.priority, t.deadline, NULL::date as validation_deadline,
    NULL::date as start_date, NULL::date as end_date, 'pdf'::text as file_extension,
    t.transparency_mode, t.created_at, t.updated_at,
    COALESCE((SELECT array_agg(user_id) FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'executor'), '{}'::uuid[]) as assigned_to,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', 3, 'role', 'validator', 'order', NULL))
              FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'validator'), '[]'::jsonb) as validators
FROM public.standard_tasks t
JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.project_sections_snapshot ps ON (
    t.project_id = ps.project_id AND
    CASE 
        WHEN t.section_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ps.id = t.section_id::uuid
        ELSE ps.title = t.section_id
    END
)
LEFT JOIN public.project_items_snapshot pi ON (
    ps.id = pi.section_id AND
    CASE 
        WHEN t.subsection_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN pi.id = t.subsection_id::uuid
        ELSE pi.title = t.subsection_id
    END
)
LEFT JOIN public.project_tasks_snapshot pts ON (
    pi.id = pts.item_id AND
    t.title = pts.title
)
UNION ALL
SELECT 
    t.id, t.project_id, p.name as project_name, p.tenant_id, t.phase_id, 
    COALESCE(ps.id::text, t.section_id) as section_id, COALESCE(ps.title, t.section_id) as section_name,
    COALESCE(pi.id::text, t.subsection_id) as subsection_id, COALESCE(pi.title, t.subsection_id) as subsection_name,
    pts.id as task_id,
    t.title as task_name, t.description as comment, 'workflow' as assignment_type,
    t.status, t.priority, t.deadline, t.validation_deadline,
    NULL::date as start_date, NULL::date as end_date, 'pdf'::text as file_extension,
    t.transparency_mode, t.created_at, t.updated_at,
    COALESCE((SELECT array_agg(user_id) FROM public.workflow_task_assignments WHERE task_id = t.id AND role = 'executor'), '{}'::uuid[]) as assigned_to,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', days_limit, 'role', 'validator', 'order', validator_order) ORDER BY validator_order ASC)
              FROM public.workflow_task_assignments WHERE task_id = t.id AND role = 'validator'), '[]'::jsonb) as validators
FROM public.workflow_tasks t
JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.project_sections_snapshot ps ON (
    t.project_id = ps.project_id AND
    CASE 
        WHEN t.section_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ps.id = t.section_id::uuid
        ELSE ps.title = t.section_id
    END
)
LEFT JOIN public.project_items_snapshot pi ON (
    ps.id = pi.section_id AND
    CASE 
        WHEN t.subsection_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN pi.id = t.subsection_id::uuid
        ELSE pi.title = t.subsection_id
    END
)
LEFT JOIN public.project_tasks_snapshot pts ON (
    pi.id = pts.item_id AND
    t.title = pts.title
);

-- 6. Update RLS policies for these tables
-- We will use the common pattern from supabase-saas-ultra-simple.sql

DO $$
DECLARE
    t_name TEXT;
    tables TEXT[] := ARRAY[
        'standard_tasks', 'workflow_tasks', 
        'standard_task_assignments', 'workflow_task_assignments',
        'standard_task_submissions', 'workflow_task_submissions',
        'standard_task_reviews', 'workflow_task_reviews'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t_name || '_tenant_policy', t_name);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (
            tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
            OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
        )', t_name || '_tenant_policy', t_name);
    END LOOP;
END $$;
