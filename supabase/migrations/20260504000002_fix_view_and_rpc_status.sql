-- Migration: Corriger la vue task_assignments_view et ajouter get_task_validation_status
-- Description: Ajoute created_by à la vue et implémente la fonction de statut de validation

-- 1. Recréer la vue task_assignments_view avec created_by
DROP VIEW IF EXISTS public.task_assignments_view CASCADE;
CREATE VIEW public.task_assignments_view AS
SELECT 
    t.id, t.project_id, p.name as project_name, t.phase_id, 
    t.section_id, t.subsection_id,
    COALESCE(s.title, t.section_id) as section_name, 
    COALESCE(ss.title, t.subsection_id) as subsection_name,
    t.title as task_name, t.description as comment, 'standard' as assignment_type,
    t.status, t.priority, t.deadline, t.validation_deadline, 
    t.created_by, -- Ajout de la colonne manquante
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
    t.created_by, -- Ajout de la colonne manquante
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

-- 2. Créer la fonction RPC get_task_validation_status
CREATE OR REPLACE FUNCTION public.get_task_validation_status(p_task_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_executors INTEGER;
    v_submitted_executors INTEGER;
    v_total_validators INTEGER;
    v_reviewed_validators INTEGER;
    v_result JSONB;
BEGIN
    -- Nombre total d'exécuteurs assignés
    SELECT count(*) INTO v_total_executors
    FROM public.standard_task_assignments
    WHERE task_id = p_task_id AND role = 'executor';

    -- Nombre d'exécuteurs ayant soumis au moins un fichier
    SELECT count(DISTINCT executor_id) INTO v_submitted_executors
    FROM public.standard_task_submissions
    WHERE task_id = p_task_id;

    -- Nombre total de validateurs assignés
    SELECT count(*) INTO v_total_validators
    FROM public.standard_task_assignments
    WHERE task_id = p_task_id AND role = 'validator';

    -- Nombre de validateurs ayant donné leur avis sur TOUTES les dernières soumissions
    -- Pour simplifier, on compte ici les validateurs ayant donné au moins un avis
    -- sur la tâche actuelle (vous pouvez complexifier si besoin)
    SELECT count(DISTINCT r.validator_id) INTO v_reviewed_validators
    FROM public.standard_task_reviews r
    JOIN public.standard_task_submissions s ON r.submission_id = s.id
    WHERE s.task_id = p_task_id;

    SELECT jsonb_build_object(
        'total_executors', v_total_executors,
        'submitted_executors', v_submitted_executors,
        'total_validators', v_total_validators,
        'reviewed_validators', v_reviewed_validators,
        'all_submitted', (v_total_executors > 0 AND v_submitted_executors >= v_total_executors),
        'all_reviewed', (v_total_validators > 0 AND v_reviewed_validators >= v_total_validators)
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Accorder les permissions
GRANT SELECT ON public.task_assignments_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_task_validation_status TO authenticated;
