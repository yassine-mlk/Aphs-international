-- ============================================================
-- UNIFICATION DU SYSTÈME DE GESTION DES TÂCHES (V3)
-- Consolidé, normalisé et compatible avec Cloudflare R2
-- ============================================================

-- 1. Nettoyage des anciennes structures (Set A, Set B et Legacy)
DROP VIEW IF EXISTS public.task_assignments_view CASCADE;
DROP VIEW IF EXISTS public.task_visa_workflows_view CASCADE;

DROP TABLE IF EXISTS public.task_visa_history CASCADE;
DROP TABLE IF EXISTS public.task_visa_submissions CASCADE;
DROP TABLE IF EXISTS public.task_visa_validations CASCADE;
DROP TABLE IF EXISTS public.task_visa_workflows CASCADE;

DROP TABLE IF EXISTS public.task_reviews CASCADE;
DROP TABLE IF EXISTS public.task_revisions CASCADE;
DROP TABLE IF EXISTS public.task_assignments CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.project_tasks CASCADE; -- Ancienne table legacy

-- 2. Table centrale : tasks
CREATE TABLE public.tasks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    phase_id            TEXT NOT NULL,
    section_id          TEXT NOT NULL,
    subsection_id       TEXT NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    task_type           TEXT NOT NULL CHECK (task_type IN ('standard', 'workflow')), -- standard = parallèle, workflow = séquentiel
    status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
        'open',             -- créée, en attente de soumission
        'in_review',        -- soumise, en cours de validation
        'approved',         -- validée (tous les avis favorables)
        'rejected',         -- rejetée (au moins un avis défavorable)
        'vso',              -- Visa Sans Observations (workflow terminé)
        'vao',              -- Visa Avec Observations (workflow terminé)
        'var',              -- Visa À Resoumettre (révision nécessaire)
        'closed'            -- clôturée
    )),
    priority            TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    deadline            DATE,
    validation_deadline DATE,
    start_date          DATE,
    end_date            DATE,
    file_extension      TEXT DEFAULT 'pdf',
    created_by          UUID REFERENCES auth.users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    -- Unicité par structure de projet
    UNIQUE(project_id, phase_id, section_id, subsection_id, title)
);

-- 3. Table des assignations (Exécuteurs et Validateurs)
CREATE TABLE public.task_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('executor', 'validator')),
    validator_order INTEGER, -- NULL pour executor, 1, 2, 3... pour validators séquentiels
    days_limit      INTEGER DEFAULT 3, -- Délai imparti pour cette étape
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, user_id, role)
);

-- 4. Table des soumissions (Versions de fichiers)
CREATE TABLE public.task_submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    executor_id     UUID NOT NULL REFERENCES public.profiles(user_id),
    version         INTEGER NOT NULL, -- 1, 2, 3...
    file_url        TEXT NOT NULL, -- URL Cloudflare R2
    file_name       TEXT NOT NULL,
    comment         TEXT,
    submitted_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, version)
);

-- 5. Table des avis (Reviews / Validations)
CREATE TABLE public.task_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID NOT NULL REFERENCES public.task_submissions(id) ON DELETE CASCADE,
    validator_id    UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    opinion         TEXT NOT NULL CHECK (opinion IN ('F', 'D', 'S', 'HM')), -- F, D, S, HM
    comment         TEXT NOT NULL,
    reviewed_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, validator_id)
);

-- 6. INDEX POUR LES PERFORMANCES
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX idx_task_submissions_task_id ON public.task_submissions(task_id);
CREATE INDEX idx_task_reviews_submission_id ON public.task_reviews(submission_id);

-- 7. RLS ENABLE
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;

-- 8. POLITIQUES RLS (Simplifiées pour le moment, à affiner selon les besoins)
CREATE POLICY "Tasks access" ON public.tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Assignments access" ON public.task_assignments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Submissions access" ON public.task_submissions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Reviews access" ON public.task_reviews FOR ALL USING (auth.role() = 'authenticated');

-- 9. VUE CONSOLIDÉE POUR LE FRONTEND (task_assignments_view)
CREATE OR REPLACE VIEW public.task_assignments_view AS
SELECT 
    t.id,
    t.project_id,
    p.name as project_name,
    t.phase_id,
    t.section_id,
    t.subsection_id,
    t.title as task_name,
    t.description as comment,
    t.task_type as assignment_type,
    t.status,
    t.priority,
    t.deadline,
    t.validation_deadline,
    t.start_date,
    t.end_date,
    t.file_extension,
    -- Collecter les exécuteurs
    COALESCE(
        (SELECT array_agg(user_id) FROM public.task_assignments WHERE task_id = t.id AND role = 'executor'),
        '{}'::uuid[]
    ) as assigned_to,
    -- Collecter les validateurs avec leurs détails
    COALESCE(
        (SELECT jsonb_agg(
            jsonb_build_object(
                'user_id', user_id, 
                'days_limit', days_limit, 
                'role', 'validator', 
                'order', validator_order
            ) ORDER BY validator_order ASC
         )
         FROM public.task_assignments 
         WHERE task_id = t.id AND role = 'validator'),
        '[]'::jsonb
    ) as validators
FROM public.tasks t
JOIN public.projects p ON t.project_id = p.id;

-- 10. RPC : upsert_task_assignment
-- Cette fonction gère la création/mise à jour complète d'une tâche et de ses assignations
CREATE OR REPLACE FUNCTION public.upsert_task_assignment(
    p_project_id UUID,
    p_phase_id TEXT,
    p_section_id TEXT,
    p_subsection_id TEXT,
    p_task_name TEXT,
    p_assigned_to UUID[], -- Liste des IDs des exécuteurs
    p_deadline DATE,
    p_validators JSONB, -- Liste d'objets {user_id: UUID, days_limit: number}
    p_assignment_type TEXT, -- 'standard' ou 'workflow'
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
    -- 1. Insérer ou mettre à jour la tâche
    IF p_id IS NOT NULL THEN
        UPDATE public.tasks SET
            title = p_task_name,
            description = p_comment,
            task_type = p_assignment_type,
            deadline = p_deadline,
            validation_deadline = p_validation_deadline,
            start_date = p_start_date,
            end_date = p_end_date,
            file_extension = p_file_extension,
            updated_at = NOW()
        WHERE id = p_id
        RETURNING id INTO v_task_id;
    ELSE
        INSERT INTO public.tasks (
            project_id, phase_id, section_id, subsection_id, title, 
            task_type, deadline, status, description, file_extension,
            start_date, end_date, validation_deadline
        ) 
        VALUES (
            p_project_id, p_phase_id, p_section_id, p_subsection_id, p_task_name,
            p_assignment_type, p_deadline, p_status, p_comment, p_file_extension,
            p_start_date, p_end_date, p_validation_deadline
        )
        ON CONFLICT (project_id, phase_id, section_id, subsection_id, title) 
        DO UPDATE SET
            task_type = EXCLUDED.task_type,
            deadline = EXCLUDED.deadline,
            description = EXCLUDED.description,
            file_extension = EXCLUDED.file_extension,
            updated_at = NOW()
        RETURNING id INTO v_task_id;
    END IF;

    -- 2. Nettoyer les anciennes assignations
    DELETE FROM public.task_assignments WHERE task_id = v_task_id;

    -- 3. Insérer les nouveaux exécuteurs
    INSERT INTO public.task_assignments (task_id, user_id, role, days_limit)
    SELECT v_task_id, unnest(p_assigned_to), 'executor', p_executor_days_limit;

    -- 4. Insérer les nouveaux validateurs
    FOR v_validator_record IN SELECT * FROM jsonb_to_recordset(p_validators) AS x(user_id UUID, days_limit INTEGER)
    LOOP
        v_validator_idx := v_validator_idx + 1;
        INSERT INTO public.task_assignments (task_id, user_id, role, validator_order, days_limit)
        VALUES (v_task_id, v_validator_record.user_id, 'validator', v_validator_idx, v_validator_record.days_limit);
    END LOOP;

    -- 5. Résultat
    SELECT jsonb_build_object(
        'id', v_task_id,
        'title', p_task_name,
        'status', 'success'
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
