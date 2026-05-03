-- ============================================================
-- RAFFINEMENT DES POLITIQUES RLS POUR LES TABLES SÉPARÉES
-- Sécurisation des soumissions entre exécuteurs
-- ============================================================

-- 1. Nettoyage des anciennes politiques permissives
DROP POLICY IF EXISTS "Standard submissions access" ON public.standard_task_submissions;
DROP POLICY IF EXISTS "Standard reviews access" ON public.standard_task_reviews;
DROP POLICY IF EXISTS "Workflow submissions access" ON public.workflow_task_submissions;
DROP POLICY IF EXISTS "Workflow reviews access" ON public.workflow_task_reviews;

-- 2. POLITIQUES POUR standard_task_submissions
-- Lecture : 
-- - L'exécuteur qui a soumis
-- - Les validateurs assignés à la tâche
-- - Les admins du projet (à simplifier par auth.role() = 'authenticated' pour l'instant avec filtrage frontend, 
--   mais on restreint l'insertion et la visibilité directe)

CREATE POLICY "Standard submissions select" ON public.standard_task_submissions
FOR SELECT USING (
    executor_id = auth.uid() -- L'exécuteur voit son propre travail
    OR EXISTS ( -- Les validateurs voient tout pour cette tâche
        SELECT 1 FROM public.standard_task_assignments 
        WHERE task_id = public.standard_task_submissions.task_id 
        AND user_id = auth.uid() 
        AND role = 'validator'
    )
    OR EXISTS ( -- Les admins voient tout
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Standard submissions insert" ON public.standard_task_submissions
FOR INSERT WITH CHECK (
    executor_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.standard_task_assignments 
        WHERE task_id = standard_task_submissions.task_id 
        AND user_id = auth.uid() 
        AND role = 'executor'
    )
);

-- 3. POLITIQUES POUR standard_task_reviews
CREATE POLICY "Standard reviews select" ON public.standard_task_reviews
FOR SELECT USING (
    EXISTS ( -- On voit les reviews si on a accès à la soumission
        SELECT 1 FROM public.standard_task_submissions
        WHERE id = standard_task_reviews.submission_id
    )
);

CREATE POLICY "Standard reviews insert" ON public.standard_task_reviews
FOR INSERT WITH CHECK (
    validator_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.standard_task_assignments 
        WHERE task_id = (SELECT task_id FROM public.standard_task_submissions WHERE id = submission_id)
        AND user_id = auth.uid() 
        AND role = 'validator'
    )
);

-- 4. POLITIQUES POUR workflow_task_submissions (Similaire mais versionné)
CREATE POLICY "Workflow submissions select" ON public.workflow_task_submissions
FOR SELECT USING (
    executor_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.workflow_task_assignments 
        WHERE task_id = workflow_task_submissions.task_id 
        AND user_id = auth.uid() 
        AND role = 'validator'
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Workflow submissions insert" ON public.workflow_task_submissions
FOR INSERT WITH CHECK (
    executor_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.workflow_task_assignments 
        WHERE task_id = workflow_task_submissions.task_id 
        AND user_id = auth.uid() 
        AND role = 'executor'
    )
);

-- 5. POLITIQUES POUR workflow_task_reviews
CREATE POLICY "Workflow reviews select" ON public.workflow_task_reviews
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.workflow_task_submissions
        WHERE id = workflow_task_reviews.submission_id
    )
);

CREATE POLICY "Workflow reviews insert" ON public.workflow_task_reviews
FOR INSERT WITH CHECK (
    validator_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.workflow_task_assignments 
        WHERE task_id = (SELECT task_id FROM public.workflow_task_submissions WHERE id = submission_id)
        AND user_id = auth.uid() 
        AND role = 'validator'
    )
);
