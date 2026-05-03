-- ============================================================
-- CORRECTION DU SCHÉMA TASK_VISA_WORKFLOWS
-- Le problème: task_visa_workflows.task_assignment_id pointait vers
-- l'ancien task_assignments (1 ligne par tâche) mais le nouveau schéma
-- a task_assignments comme table de liaison personne↔tâche (plusieurs lignes)
-- ============================================================

-- 1. Ajouter la colonne task_id si elle n'existe pas
ALTER TABLE public.task_visa_workflows ADD COLUMN IF NOT EXISTS task_id UUID;

-- 2. Peupler task_id depuis task_assignments pour les workflows existants
-- Pour chaque workflow, trouver le task_id correspondant au task_assignment
UPDATE public.task_visa_workflows tw
SET task_id = (
    SELECT ta.task_id
    FROM public.task_assignments ta
    WHERE ta.id = tw.task_assignment_id
    LIMIT 1
)
WHERE task_id IS NULL AND task_assignment_id IS NOT NULL;

-- 3. Supprimer la contrainte FK ancienne et changer le type de référence
-- D'abord supprimer les FK existantes qui causent des problèmes
ALTER TABLE public.task_visa_workflows DROP CONSTRAINT IF EXISTS task_visa_workflows_task_assignment_id_fkey;
ALTER TABLE public.task_visa_workflows DROP CONSTRAINT IF EXISTS fk_task_assignment;
ALTER TABLE public.task_visa_workflows DROP CONSTRAINT IF EXISTS task_visa_workflows_task_id_fkey;

-- 4. Nettoyer les colonnes obsolètes si nécessaire
-- Note: On ne supprime task_assignment_id que si task_id est bien rempli pour éviter les pertes de données
-- ALTER TABLE public.task_visa_workflows DROP COLUMN IF EXISTS task_assignment_id;

-- 5. Ajouter la contrainte FK correcte
ALTER TABLE public.task_visa_workflows ADD CONSTRAINT task_visa_workflows_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- 6. Supprimer le trigger obsolète de création auto du workflow (incompatible avec nouveau schéma)
DROP TRIGGER IF EXISTS trigger_create_visa_workflow ON public.task_assignments;
DROP FUNCTION IF EXISTS create_visa_workflow_on_assignment();

-- 6. Créer une vue compatible pour le frontend qui utilise task_visa_workflows
DROP VIEW IF EXISTS public.task_visa_workflows_view;
CREATE OR REPLACE VIEW public.task_visa_workflows_view AS
SELECT
    tw.*,
    t.title AS task_name,
    t.project_id,
    t.status AS task_status,
    t.deadline AS task_deadline,
    t.validation_deadline,
    t.description AS task_description,
    t.file_extension
FROM public.task_visa_workflows tw
LEFT JOIN public.tasks t ON t.id = tw.task_id;

-- Permissions
GRANT SELECT ON public.task_visa_workflows_view TO authenticated;
GRANT SELECT ON public.task_visa_workflows_view TO anon;
