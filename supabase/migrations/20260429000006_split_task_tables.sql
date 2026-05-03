-- ============================================================
-- SÉPARATION DES TÂCHES STANDARD ET WORKFLOW VISA
-- ============================================================

-- 1. Nettoyage complet
DROP VIEW IF EXISTS public.task_assignments_view CASCADE;
DROP TABLE IF EXISTS public.task_reviews CASCADE;
DROP TABLE IF EXISTS public.task_submissions CASCADE;
DROP TABLE IF EXISTS public.task_assignments CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;

-- ============================================================
-- STRUCTURE POUR LES TÂCHES STANDARD (PARALLÈLE)
-- ============================================================

CREATE TABLE public.standard_tasks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    phase_id            TEXT NOT NULL,
    section_id          TEXT NOT NULL,
    subsection_id       TEXT NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'approved', 'rejected', 'closed')),
    priority            TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    deadline            DATE,
    created_by          UUID REFERENCES auth.users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, phase_id, section_id, subsection_id, title)
);

CREATE TABLE public.standard_task_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES public.standard_tasks(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('executor', 'validator')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, user_id, role)
);

CREATE TABLE public.standard_task_submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES public.standard_tasks(id) ON DELETE CASCADE,
    executor_id     UUID NOT NULL REFERENCES public.profiles(user_id),
    file_url        TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    comment         TEXT,
    submitted_at    TIMESTAMPTZ DEFAULT NOW()
    -- Pas de contrainte UNIQUE ici pour permettre à un exécuteur de soumettre plusieurs fois si besoin (historique)
);

CREATE TABLE public.standard_task_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID NOT NULL REFERENCES public.standard_task_submissions(id) ON DELETE CASCADE,
    validator_id    UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    opinion         TEXT NOT NULL CHECK (opinion IN ('F', 'D')), -- F = Valide, D = Non Valide
    comment         TEXT,
    reviewed_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, validator_id)
);

-- ============================================================
-- STRUCTURE POUR LES TÂCHES WORKFLOW (SÉQUENTIEL)
-- ============================================================

CREATE TABLE public.workflow_tasks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    phase_id            TEXT NOT NULL,
    section_id          TEXT NOT NULL,
    subsection_id       TEXT NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'vso', 'vao', 'var', 'closed')),
    priority            TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    deadline            DATE,
    validation_deadline DATE,
    current_validator_idx INTEGER DEFAULT 0,
    current_version     INTEGER DEFAULT 1,
    created_by          UUID REFERENCES auth.users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, phase_id, section_id, subsection_id, title)
);

CREATE TABLE public.workflow_task_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES public.workflow_tasks(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('executor', 'validator')),
    validator_order INTEGER, -- 1, 2, 3...
    days_limit      INTEGER DEFAULT 3,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, user_id, role)
);

CREATE TABLE public.workflow_task_submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES public.workflow_tasks(id) ON DELETE CASCADE,
    executor_id     UUID NOT NULL REFERENCES public.profiles(user_id),
    version         INTEGER NOT NULL,
    file_url        TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    comment         TEXT,
    submitted_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, version)
);

CREATE TABLE public.workflow_task_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID NOT NULL REFERENCES public.workflow_task_submissions(id) ON DELETE CASCADE,
    validator_id    UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    opinion         TEXT NOT NULL CHECK (opinion IN ('F', 'D', 'S', 'HM')),
    comment         TEXT NOT NULL,
    reviewed_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, validator_id)
);

-- ============================================================
-- VUES ET INDEX
-- ============================================================

-- Vue consolidée pour garder la compatibilité avec le frontend existant
CREATE OR REPLACE VIEW public.task_assignments_view AS
SELECT 
    t.id, t.project_id, p.name as project_name, t.phase_id, 
    t.section_id, t.subsection_id,
    t.section_id as section_name, t.subsection_id as subsection_name,
    t.title as task_name, t.description as comment, 'standard' as assignment_type,
    t.status, t.priority, t.deadline, NULL::date as validation_deadline,
    NULL::date as start_date, NULL::date as end_date, 'pdf'::text as file_extension,
    COALESCE((SELECT array_agg(user_id) FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'executor'), '{}'::uuid[]) as assigned_to,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', 3, 'role', 'validator', 'order', NULL))
              FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'validator'), '[]'::jsonb) as validators
FROM public.standard_tasks t
JOIN public.projects p ON t.project_id = p.id
UNION ALL
SELECT 
    t.id, t.project_id, p.name as project_name, t.phase_id, 
    t.section_id as section_name, t.subsection_id as subsection_name,
    t.title as task_name, t.description as comment, 'workflow' as assignment_type,
    t.status, t.priority, t.deadline, t.validation_deadline,
    NULL::date as start_date, NULL::date as end_date, 'pdf'::text as file_extension,
    COALESCE((SELECT array_agg(user_id) FROM public.workflow_task_assignments WHERE task_id = t.id AND role = 'executor'), '{}'::uuid[]) as assigned_to,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', days_limit, 'role', 'validator', 'order', validator_order) ORDER BY validator_order ASC)
              FROM public.workflow_task_assignments WHERE task_id = t.id AND role = 'validator'), '[]'::jsonb) as validators
FROM public.workflow_tasks t
JOIN public.projects p ON t.project_id = p.id;

-- Index
CREATE INDEX idx_standard_tasks_project ON public.standard_tasks(project_id);
CREATE INDEX idx_workflow_tasks_project ON public.workflow_tasks(project_id);

-- RLS
ALTER TABLE public.standard_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standard_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standard_task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standard_task_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_task_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Standard tasks access" ON public.standard_tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Standard assignments access" ON public.standard_task_assignments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Standard submissions access" ON public.standard_task_submissions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Standard reviews access" ON public.standard_task_reviews FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Workflow tasks access" ON public.workflow_tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Workflow assignments access" ON public.workflow_task_assignments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Workflow submissions access" ON public.workflow_task_submissions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Workflow reviews access" ON public.workflow_task_reviews FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- RPC : upsert_task_assignment (Routage intelligent)
-- ============================================================

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
    p_validation_deadline DATE DEFAULT NULL
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
                title = p_task_name, description = p_comment, deadline = p_deadline, updated_at = NOW()
            WHERE id = p_id RETURNING id INTO v_task_id;
        ELSE
            INSERT INTO public.standard_tasks (project_id, phase_id, section_id, subsection_id, title, description, deadline, status)
            VALUES (p_project_id, p_phase_id, p_section_id, p_subsection_id, p_task_name, p_comment, p_deadline, p_status)
            ON CONFLICT (project_id, phase_id, section_id, subsection_id, title) 
            DO UPDATE SET deadline = EXCLUDED.deadline, description = EXCLUDED.description, updated_at = NOW()
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
                validation_deadline = p_validation_deadline, updated_at = NOW()
            WHERE id = p_id RETURNING id INTO v_task_id;
        ELSE
            INSERT INTO public.workflow_tasks (project_id, phase_id, section_id, subsection_id, title, description, deadline, validation_deadline, status)
            VALUES (p_project_id, p_phase_id, p_section_id, p_subsection_id, p_task_name, p_comment, p_deadline, p_validation_deadline, p_status)
            ON CONFLICT (project_id, phase_id, section_id, subsection_id, title) 
            DO UPDATE SET deadline = EXCLUDED.deadline, validation_deadline = EXCLUDED.validation_deadline, description = EXCLUDED.description, updated_at = NOW()
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

    SELECT jsonb_build_object('id', v_task_id, 'title', p_task_name, 'status', 'success') INTO v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;