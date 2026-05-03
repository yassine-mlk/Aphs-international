-- Migration: Ajouter les colonnes de limite de révision aux tables de tâches
-- Description: Permet de définir un nombre maximum de révisions par tâche

-- Appliquer aux tâches workflow (Type 2 Séquentiel)
ALTER TABLE public.workflow_tasks 
ADD COLUMN IF NOT EXISTS max_revisions int DEFAULT 3,
ADD COLUMN IF NOT EXISTS revision_count int DEFAULT 0;

COMMENT ON COLUMN public.workflow_tasks.max_revisions IS 'Nombre maximum de révisions autorisées pour cette tâche';
COMMENT ON COLUMN public.workflow_tasks.revision_count IS 'Nombre actuel de révisions soumises pour cette tâche';

-- Ajouter 'blocked' aux statuts autorisés
ALTER TABLE public.workflow_tasks DROP CONSTRAINT IF EXISTS workflow_tasks_status_check;
ALTER TABLE public.workflow_tasks ADD CONSTRAINT workflow_tasks_status_check 
CHECK (status IN ('open', 'in_review', 'vso', 'vao', 'var', 'closed', 'blocked'));

-- Appliquer aux tâches standard (Type 1 Parallèle) pour la cohérence
ALTER TABLE public.standard_tasks 
ADD COLUMN IF NOT EXISTS max_revisions int DEFAULT 3,
ADD COLUMN IF NOT EXISTS revision_count int DEFAULT 0;

COMMENT ON COLUMN public.standard_tasks.max_revisions IS 'Nombre maximum de révisions autorisées pour cette tâche';
COMMENT ON COLUMN public.standard_tasks.revision_count IS 'Nombre actuel de révisions soumises pour cette tâche';

-- Ajouter 'blocked' aux statuts autorisés pour standard également
ALTER TABLE public.standard_tasks DROP CONSTRAINT IF EXISTS standard_tasks_status_check;
ALTER TABLE public.standard_tasks ADD CONSTRAINT standard_tasks_status_check 
CHECK (status IN ('open', 'in_review', 'approved', 'rejected', 'closed', 'blocked'));
