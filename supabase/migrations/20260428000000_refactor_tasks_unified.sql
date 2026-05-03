-- ============================================================
-- REFONTE DU SYSTÈME DE GESTION DES TÂCHES (PARALLEL & SEQUENTIAL)
-- ============================================================

-- 1. Création de la table 'tasks' (Table centrale)
CREATE TABLE IF NOT EXISTS public.tasks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT,
    task_type     TEXT NOT NULL CHECK (task_type IN ('parallel', 'sequential')),
    deadline      DATE,
    status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
        'open',         -- créée, en attente de soumission
        'in_review',    -- soumise, en cours de validation
        'approved',     -- validée (type parallel)
        'rejected',     -- refusée (type parallel)
        'vso',          -- Visa Sans Observations (type sequential)
        'vao',          -- Visa Avec Observations (type sequential)
        'var',          -- Visa À Resoumettre (type sequential)
        'closed'        -- clôturée par l'admin
    )),
    created_by    UUID REFERENCES auth.users(id),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Refonte de 'task_assignments'
-- Note: On supprime l'ancienne structure car elle est incompatible avec le nouveau modèle normalisé
DROP TABLE IF EXISTS public.task_assignments CASCADE;

CREATE TABLE public.task_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id),
    role            TEXT NOT NULL CHECK (role IN ('executor', 'validator')),
    validator_order INTEGER, -- NULL pour executor, 1/2/3... pour validators séquentiels
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, user_id, role, validator_order)
);

-- 3. Création de 'task_revisions'
-- Chaque soumission de document par l'executor crée une révision
CREATE TABLE IF NOT EXISTS public.task_revisions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id       UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    executor_id   UUID NOT NULL REFERENCES auth.users(id),
    indice        TEXT NOT NULL, -- Auto-généré : A, B, C...
    file_url      TEXT NOT NULL,
    notes         TEXT,
    visa_status   TEXT NOT NULL DEFAULT 'pending' CHECK (visa_status IN ('pending', 'vso', 'vao', 'var')),
    submitted_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Création de 'task_reviews'
-- L'avis de chaque validator sur une révision donnée
CREATE TABLE IF NOT EXISTS public.task_reviews (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id   UUID NOT NULL REFERENCES public.task_revisions(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES public.task_assignments(id) ON DELETE CASCADE,
    avis          TEXT CHECK (avis IN ('F', 'D', 'S', 'HM')),
    comment       TEXT,
    reviewed_at   TIMESTAMPTZ,
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done'))
);

-- 5. INDEX POUR LES PERFORMANCES
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_revisions_task_id ON public.task_revisions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_revision_id ON public.task_reviews(revision_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_assignment_id ON public.task_reviews(assignment_id);

-- 6. ACTIVATION DU RLS (Row Level Security)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;

-- 7. POLITIQUES RLS DE BASE (Accès aux membres du projet)
-- Note: Ces politiques supposent l'existence d'une table 'membre' ou 'project_members'

-- Tâches : Visibles par tous les membres du projet
CREATE POLICY "Tasks are viewable by project members" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.membre m
            WHERE m.project_id = public.tasks.project_id
            AND m.user_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Assignations : Visibles par les membres du projet
CREATE POLICY "Assignments are viewable by project members" ON public.task_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.membre m ON t.project_id = m.project_id
            WHERE t.id = public.task_assignments.task_id
            AND m.user_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Révisions : Visibles par les membres du projet
CREATE POLICY "Revisions are viewable by project members" ON public.task_revisions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.membre m ON t.project_id = m.project_id
            WHERE t.id = public.task_revisions.task_id
            AND m.user_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Reviews : Visibles par les membres du projet
CREATE POLICY "Reviews are viewable by project members" ON public.task_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.task_revisions tr
            JOIN public.tasks t ON tr.task_id = t.id
            JOIN public.membre m ON t.project_id = m.project_id
            WHERE tr.id = public.task_reviews.revision_id
            AND m.user_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Insertion/Modification (Admin uniquement pour les tâches et assignations)
CREATE POLICY "Admins can manage tasks" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage assignments" ON public.task_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Executors peuvent créer des révisions
CREATE POLICY "Executors can create revisions" ON public.task_revisions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.task_assignments ta
            WHERE ta.task_id = public.task_revisions.task_id
            AND ta.user_id = auth.uid()
            AND ta.role = 'executor'
        )
    );

-- Validators peuvent créer des reviews
CREATE POLICY "Validators can create reviews" ON public.task_reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.task_assignments ta
            WHERE ta.id = public.task_reviews.assignment_id
            AND ta.user_id = auth.uid()
            AND ta.role = 'validator'
        )
    );
