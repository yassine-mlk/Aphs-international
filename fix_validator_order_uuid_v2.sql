-- ============================================================
-- Correction : Fonction RPC avec paramètres correctement ordonnés
-- ============================================================

-- Supprimer la fonction existante si elle existe
DROP FUNCTION IF EXISTS upsert_task_assignment CASCADE;

-- Fonction pour créer ou mettre à jour une assignation
-- Paramètres avec DEFAULT doivent être à la fin
CREATE OR REPLACE FUNCTION upsert_task_assignment(
  p_project_id UUID,
  p_phase_id TEXT,
  p_section_id TEXT,
  p_subsection_id TEXT,
  p_task_name TEXT,
  p_assigned_to TEXT[],
  p_deadline DATE,
  p_validation_deadline DATE,
  p_validators TEXT[],
  p_file_extension TEXT,
  p_id UUID DEFAULT NULL,
  p_comment TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'assigned'
)
RETURNS JSONB AS $$
DECLARE
  v_result task_assignments%ROWTYPE;
  v_uuid_assigned_to UUID[];
  v_uuid_validators UUID[];
BEGIN
  -- Convertir les tableaux de text en UUID[]
  SELECT ARRAY_AGG(x::UUID) INTO v_uuid_assigned_to
  FROM UNNEST(p_assigned_to) AS x;
  
  SELECT ARRAY_AGG(x::UUID) INTO v_uuid_validators
  FROM UNNEST(p_validators) AS x;
  
  -- Si un ID est fourni, mettre à jour
  IF p_id IS NOT NULL THEN
    UPDATE task_assignments SET
      project_id = p_project_id,
      phase_id = p_phase_id,
      section_id = p_section_id,
      subsection_id = p_subsection_id,
      task_name = p_task_name,
      assigned_to = v_uuid_assigned_to,
      deadline = p_deadline,
      validation_deadline = p_validation_deadline,
      validators = v_uuid_validators,
      file_extension = p_file_extension,
      comment = p_comment,
      status = p_status,
      updated_at = NOW()
    WHERE id = p_id
    RETURNING * INTO v_result;
    
    -- Mettre à jour le workflow existant si les validateurs ont changé
    UPDATE task_visa_workflows SET
      validator_order = v_uuid_validators,
      executor_id = v_uuid_assigned_to[1],
      updated_at = NOW()
    WHERE task_assignment_id = p_id;
    
  ELSE
    -- Sinon, créer
    INSERT INTO task_assignments (
      project_id,
      phase_id,
      section_id,
      subsection_id,
      task_name,
      assigned_to,
      deadline,
      validation_deadline,
      validators,
      file_extension,
      comment,
      status,
      created_at,
      updated_at
    ) VALUES (
      p_project_id,
      p_phase_id,
      p_section_id,
      p_subsection_id,
      p_task_name,
      v_uuid_assigned_to,
      p_deadline,
      p_validation_deadline,
      v_uuid_validators,
      p_file_extension,
      p_comment,
      p_status,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_result;
    -- Le trigger créera automatiquement le workflow
  END IF;
  
  RETURN to_jsonb(v_result);
END;
$$ LANGUAGE plpgsql;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION upsert_task_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_task_assignment TO anon;

COMMENT ON FUNCTION upsert_task_assignment IS 
'Crée ou met à jour une task_assignment avec conversion explicite des UUIDs.
Paramètres requis: project_id, phase_id, section_id, subsection_id, task_name, assigned_to[], deadline, validation_deadline, validators[], file_extension
Paramètres optionnels: p_id (NULL pour créer), p_comment, p_status';
