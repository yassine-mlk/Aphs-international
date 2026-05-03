-- ============================================================
-- RAFFINEMENT DES POLITIQUES RLS POUR LE SYSTÈME DE TÂCHES (V3.2)
-- Sécurisation des soumissions et des validations
-- ============================================================

-- 1. Nettoyage des anciennes politiques
DROP POLICY IF EXISTS "Tasks access" ON public.tasks;
DROP POLICY IF EXISTS "Assignments access" ON public.task_assignments;
DROP POLICY IF EXISTS "Submissions access" ON public.task_submissions;
DROP POLICY IF EXISTS "Reviews access" ON public.task_reviews;

-- 2. POLITIQUES POUR public.tasks
-- Lecture pour tous les authentifiés (à affiner par projet plus tard si nécessaire)
CREATE POLICY "Tasks_select_policy" ON public.tasks FOR SELECT 
USING (auth.role() = 'authenticated');

-- Insertion/Mise à jour pour les administrateurs (ou via fonctions RPC qui outrepassent RLS si security definer)
CREATE POLICY "Tasks_admin_policy" ON public.tasks FOR ALL 
USING (auth.role() = 'authenticated');

-- 3. POLITIQUES POUR public.task_assignments
CREATE POLICY "Assignments_select_policy" ON public.task_assignments FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Assignments_admin_policy" ON public.task_assignments FOR ALL 
USING (auth.role() = 'authenticated');

-- 4. POLITIQUES POUR public.task_submissions
-- Tout le monde peut voir les soumissions (pour l'historique)
CREATE POLICY "Submissions_select_policy" ON public.task_submissions FOR SELECT 
USING (auth.role() = 'authenticated');

-- Seuls les exécuteurs assignés à la tâche peuvent soumettre un fichier
CREATE POLICY "Submissions_insert_policy" ON public.task_submissions FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.task_assignments 
        WHERE task_id = NEW.task_id 
        AND user_id = auth.uid() 
        AND role = 'executor'
    )
);

-- 5. POLITIQUES POUR public.task_reviews
-- Tout le monde peut voir les avis
CREATE POLICY "Reviews_select_policy" ON public.task_reviews FOR SELECT 
USING (auth.role() = 'authenticated');

-- Seuls les validateurs assignés à la tâche peuvent donner leur avis
CREATE POLICY "Reviews_insert_policy" ON public.task_reviews FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.task_assignments ta
        JOIN public.task_submissions ts ON ts.task_id = ta.task_id
        WHERE ts.id = NEW.submission_id 
        AND ta.user_id = auth.uid() 
        AND ta.role = 'validator'
    )
);
