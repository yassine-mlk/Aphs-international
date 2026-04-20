-- ============================================
-- MIGRATION: Visa Workflow & Validation System
-- Date: 2025-04-20
-- Phase 1: Schéma BDD
-- ============================================

-- ============================================
-- 1. CIRCUITS DE VISA (définis par admin/CP par projet)
-- ============================================
CREATE TABLE IF NOT EXISTS visa_circuits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  document_type text NOT NULL DEFAULT 'plan',
  
  -- Ordre des validateurs: [{role, user_id, deadline_days, order_index}]
  steps jsonb NOT NULL DEFAULT '[]',
  
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE visa_circuits IS 'Circuits de validation visa définis par projet';

-- ============================================
-- 2. EXTENSION task_assignments (modes de validation)
-- ============================================
ALTER TABLE task_assignments 
ADD COLUMN IF NOT EXISTS task_mode text DEFAULT 'simple',
ADD COLUMN IF NOT EXISTS visa_circuit_id uuid REFERENCES visa_circuits(id),
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_pattern text,
ADD COLUMN IF NOT EXISTS recurrence_day int,
ADD COLUMN IF NOT EXISTS recurrence_config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS recurring_end_date date;

COMMENT ON COLUMN task_assignments.task_mode IS 'simple|validation|visa';

-- ============================================
-- 3. SOUMISSIONS (historique de tous les dépôts)
-- ============================================
CREATE TABLE IF NOT EXISTS task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES task_assignments(id) ON DELETE CASCADE,
  
  -- Pour les récurrents et versions
  occurrence_number int DEFAULT 1,
  period_label text,
  version_index text DEFAULT '0',
  
  -- Document déposé
  file_url text,
  file_name text,
  submitted_by uuid REFERENCES auth.users(id),
  submitted_at timestamptz DEFAULT now(),
  
  -- Mode validation simple (pour récurrents)
  simple_status text DEFAULT 'pending',
  simple_validated_by uuid REFERENCES auth.users(id),
  simple_validated_at timestamptz,
  simple_comments text,
  
  -- Mode visa (référence)
  visa_instance_id uuid,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE task_submissions IS 'Tous les fichiers déposés avec historique versions';

-- ============================================
-- 4. INSTANCES VISA (circuits en cours)
-- ============================================
CREATE TABLE IF NOT EXISTS visa_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES task_submissions(id),
  circuit_id uuid REFERENCES visa_circuits(id),
  
  -- Qui a émis
  emitted_by uuid REFERENCES auth.users(id),
  emitted_by_role text,
  
  -- Version (indices numériques)
  version_index text DEFAULT '0',
  
  -- Progression
  current_step_index int DEFAULT 0,
  total_steps int DEFAULT 0,
  status text DEFAULT 'en_cours',
  
  -- Dates
  started_at timestamptz DEFAULT now(),
  deadline_at timestamptz,
  completed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE visa_instances IS 'Instances de circuits visa actifs';
COMMENT ON COLUMN visa_instances.status IS 'en_cours|valide|refuse|suspendu';

-- ============================================
-- 5. ÉTAPES DE VISA (chaque validateur)
-- ============================================
CREATE TABLE IF NOT EXISTS visa_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES visa_instances(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  
  -- Qui valide
  validator_user_id uuid REFERENCES auth.users(id),
  validator_role text,
  
  -- Délai
  deadline_at timestamptz,
  
  -- AVIS TECHNIQUE: F/D/S/HM
  opinion text,
  opinion_comment text,
  
  -- VISA FINAL: VSO/VAO/VAR
  visa_status text,
  visa_comment text,
  
  -- Timing
  notified_at timestamptz,
  viewed_at timestamptz,
  completed_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE visa_steps IS 'Chaque étape de validation avec avis et visa';
COMMENT ON COLUMN visa_steps.opinion IS 'F=Favorable, D=Défavorable, S=Suspendu, HM=Hors Mission';
COMMENT ON COLUMN visa_steps.visa_status IS 'VSO=Visa Sans Obs, VAO=Visa Avec Obs, VAR=Visa A Resoumettre';

-- ============================================
-- 6. OCCURRENCES RÉCURRENTES
-- ============================================
CREATE TABLE IF NOT EXISTS recurring_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES task_assignments(id) ON DELETE CASCADE,
  occurrence_number int NOT NULL,
  period_start date,
  period_end date,
  period_label text,
  
  status text DEFAULT 'en_attente',
  
  -- Lien vers soumission ou visa
  submission_id uuid REFERENCES task_submissions(id),
  visa_instance_id uuid REFERENCES visa_instances(id),
  
  -- Date butoir pour cette occurrence
  deadline_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, occurrence_number)
);

COMMENT ON TABLE recurring_occurrences IS 'Occurrences générées pour tâches récurrentes';

-- ============================================
-- 7. HISTORIQUE (log de toutes les actions)
-- ============================================
CREATE TABLE IF NOT EXISTS visa_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES visa_instances(id),
  submission_id uuid REFERENCES task_submissions(id),
  step_id uuid REFERENCES visa_steps(id),
  
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  actor_role text,
  
  details jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE visa_history IS 'Audit trail complet des actions visa';

-- ============================================
-- INDEX pour performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_visa_circuits_project ON visa_circuits(project_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_assignment ON task_submissions(assignment_id, occurrence_number);
CREATE INDEX IF NOT EXISTS idx_task_submissions_visa ON task_submissions(visa_instance_id);
CREATE INDEX IF NOT EXISTS idx_visa_instances_circuit ON visa_instances(circuit_id);
CREATE INDEX IF NOT EXISTS idx_visa_instances_status ON visa_instances(status, current_step_index);
CREATE INDEX IF NOT EXISTS idx_visa_steps_instance ON visa_steps(instance_id, step_order);
CREATE INDEX IF NOT EXISTS idx_visa_steps_validator ON visa_steps(validator_user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_assignment ON recurring_occurrences(assignment_id, occurrence_number);
CREATE INDEX IF NOT EXISTS idx_visa_history_instance ON visa_history(instance_id, created_at);

-- ============================================
-- POLICIES RLS (Row Level Security)
-- ============================================

-- visa_circuits: Admin/CP full access, others read
ALTER TABLE visa_circuits ENABLE ROW LEVEL SECURITY;

CREATE POLICY visa_circuits_admin_all ON visa_circuits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR role = 'chef_projet')
    )
  );

CREATE POLICY visa_circuits_read ON visa_circuits
  FOR SELECT USING (true);

-- task_submissions: User sees own submissions + validators
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_submissions_owner ON task_submissions
  FOR ALL USING (submitted_by = auth.uid());

CREATE POLICY task_submissions_validator ON task_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM visa_steps vs
      JOIN visa_instances vi ON vs.instance_id = vi.id
      WHERE vi.id = task_submissions.visa_instance_id
      AND vs.validator_user_id = auth.uid()
    )
  );

-- visa_instances: Project members
ALTER TABLE visa_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY visa_instances_project ON visa_instances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM visa_circuits vc
      WHERE vc.id = visa_instances.circuit_id
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = vc.project_id
      )
    )
  );

-- visa_steps: Validator sees their steps
ALTER TABLE visa_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY visa_steps_validator ON visa_steps
  FOR ALL USING (validator_user_id = auth.uid());

CREATE POLICY visa_steps_admin ON visa_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- recurring_occurrences: Same as parent assignment
ALTER TABLE recurring_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurring_occurrences_assignment ON recurring_occurrences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM task_assignments ta
      WHERE ta.id = recurring_occurrences.assignment_id
    )
  );

-- visa_history: Project members
ALTER TABLE visa_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY visa_history_project ON visa_history
  FOR SELECT USING (true);

-- ============================================
-- TRIGGERS pour updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_visa_circuits_updated_at 
  BEFORE UPDATE ON visa_circuits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_submissions_updated_at 
  BEFORE UPDATE ON task_submissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visa_instances_updated_at 
  BEFORE UPDATE ON visa_instances 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS pour faciliter les requêtes
-- ============================================

-- Vue: File d'attente d'un validateur
CREATE OR REPLACE VIEW visa_validator_queue AS
SELECT 
  vs.id as step_id,
  vs.instance_id,
  vs.step_order,
  vs.deadline_at,
  vs.validator_user_id,
  vi.circuit_id,
  vi.version_index,
  vi.status as instance_status,
  vc.project_id,
  vc.name as circuit_name,
  ts.file_url,
  ts.file_name,
  ts.submitted_by,
  ts.submitted_at,
  p.name as project_title
FROM visa_steps vs
JOIN visa_instances vi ON vs.instance_id = vi.id
JOIN visa_circuits vc ON vi.circuit_id = vc.id
JOIN task_submissions ts ON vi.submission_id = ts.id
JOIN projects p ON vc.project_id = p.id
WHERE vs.completed_at IS NULL
AND vi.status = 'en_cours'
ORDER BY vs.deadline_at ASC;

-- Vue: Historique par projet
CREATE OR REPLACE VIEW visa_project_history AS
SELECT 
  vh.*,
  vc.project_id,
  vi.circuit_id,
  vs.step_order,
  vs.validator_role
FROM visa_history vh
LEFT JOIN visa_instances vi ON vh.instance_id = vi.id
LEFT JOIN visa_circuits vc ON vi.circuit_id = vc.id
LEFT JOIN visa_steps vs ON vh.step_id = vs.id
ORDER BY vh.created_at DESC;

-- ============================================
-- MIGRATION TERMINÉE
-- ============================================
