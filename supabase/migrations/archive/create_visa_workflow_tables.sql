-- ============================================================
-- Système de Workflow VISA - Tables et structures
-- ============================================================

-- 1. Table des workflows visa par assignation de tâche
CREATE TABLE IF NOT EXISTS public.task_visa_workflows (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_assignment_id    UUID NOT NULL REFERENCES public.task_assignments(id) ON DELETE CASCADE,
  executor_id           UUID NOT NULL REFERENCES auth.users(id), -- Exécutant (celui qui upload)
  validator_order       UUID[] NOT NULL DEFAULT '{}', -- Ordre des validateurs [validator1_id, validator2_id, ...]
  current_validator_idx INTEGER DEFAULT 0, -- Index du validateur actuel dans validator_order
  status                TEXT NOT NULL DEFAULT 'pending_execution' CHECK (status IN (
    'pending_execution',    -- En attente de soumission par l'exécutant
    'pending_validation',   -- En attente de validation
    'revision_required',  -- Rejeté, l'exécutant doit resoumettre
    'validated',          -- Tous les validateurs ont approuvé
    'suspended',          -- Suspendu (attente éléments complémentaires)
    'out_of_scope'        -- Hors mission
  )),
  current_version       INTEGER DEFAULT 0, -- Version actuelle du document (incrémentée à chaque resoumission)
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (task_assignment_id)
);

-- 2. Table des validations (avis des validateurs)
CREATE TABLE IF NOT EXISTS public.task_visa_validations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id           UUID NOT NULL REFERENCES public.task_visa_workflows(id) ON DELETE CASCADE,
  validator_id          UUID NOT NULL REFERENCES auth.users(id),
  version               INTEGER NOT NULL, -- Version du document validée
  opinion               TEXT NOT NULL CHECK (opinion IN ('F', 'D', 'S', 'HM')), -- Favorable, Défavorable, Suspendu, Hors Mission
  comment               TEXT NOT NULL, -- Commentaire obligatoire
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  -- Un validateur ne peut donner qu'un avis par version
  UNIQUE (workflow_id, validator_id, version)
);

-- 3. Table des soumissions (versions de fichiers)
CREATE TABLE IF NOT EXISTS public.task_visa_submissions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id           UUID NOT NULL REFERENCES public.task_visa_workflows(id) ON DELETE CASCADE,
  version               INTEGER NOT NULL, -- Numéro de version (1, 2, 3...)
  executor_id           UUID NOT NULL REFERENCES auth.users(id),
  file_url              TEXT NOT NULL,
  file_name             TEXT NOT NULL,
  comment               TEXT, -- Commentaire de l'exécutant lors de la soumission
  submitted_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workflow_id, version)
);

-- 4. Table d'historique des transitions de statut
CREATE TABLE IF NOT EXISTS public.task_visa_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id           UUID NOT NULL REFERENCES public.task_visa_workflows(id) ON DELETE CASCADE,
  version               INTEGER NOT NULL,
  action                TEXT NOT NULL CHECK (action IN ('submitted', 'validated', 'rejected', 'suspended', 'out_of_scope', 'resubmitted')),
  actor_id              UUID NOT NULL REFERENCES auth.users(id),
  actor_role            TEXT NOT NULL CHECK (actor_role IN ('executor', 'validator')),
  comment               TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_task_visa_workflows_assignment ON public.task_visa_workflows(task_assignment_id);
CREATE INDEX IF NOT EXISTS idx_task_visa_workflows_executor ON public.task_visa_workflows(executor_id);
CREATE INDEX IF NOT EXISTS idx_task_visa_validations_workflow ON public.task_visa_validations(workflow_id);
CREATE INDEX IF NOT EXISTS idx_task_visa_submissions_workflow ON public.task_visa_submissions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_task_visa_history_workflow ON public.task_visa_history(workflow_id);

-- RLS
ALTER TABLE public.task_visa_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_visa_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_visa_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_visa_history ENABLE ROW LEVEL SECURITY;

-- Politiques permissives
CREATE POLICY "Allow all authenticated users" ON public.task_visa_workflows
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated users" ON public.task_visa_validations
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated users" ON public.task_visa_submissions
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated users" ON public.task_visa_history
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Fonction pour créer automatiquement un workflow visa lors de la création d'une task_assignment
CREATE OR REPLACE FUNCTION create_visa_workflow_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.task_visa_workflows (
    task_assignment_id,
    executor_id,
    validator_order,
    current_validator_idx,
    status,
    current_version
  ) VALUES (
    NEW.id,
    NEW.assigned_to[1], -- Premier assigné comme exécutant par défaut
    NEW.validators,
    0,
    'pending_execution',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement le workflow
DROP TRIGGER IF EXISTS trigger_create_visa_workflow ON public.task_assignments;
CREATE TRIGGER trigger_create_visa_workflow
  AFTER INSERT ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION create_visa_workflow_on_assignment();

COMMENT ON TABLE public.task_visa_workflows IS 'Workflow visa par tâche assignée';
COMMENT ON TABLE public.task_visa_validations IS 'Avis des validateurs (F, D, S, HM)';
COMMENT ON TABLE public.task_visa_submissions IS 'Versions des fichiers soumis';
COMMENT ON TABLE public.task_visa_history IS 'Historique des transitions';
