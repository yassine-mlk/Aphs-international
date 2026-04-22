-- ============================================================
-- Correction v5 : Cast explicite avec typage fort
-- ============================================================

DROP FUNCTION IF EXISTS upsert_task_assignment CASCADE;

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
  p_use_visa_workflow BOOLEAN DEFAULT true,
  p_id UUID DEFAULT NULL,
  p_comment TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'assigned'
)
RETURNS JSONB AS $$
DECLARE
  v_result task_assignments%ROWTYPE;
  v_uuid_assigned_to UUID[];
  v_uuid_validators UUID[];
  v_status task_status;
  v_executor_id UUID;
BEGIN
  -- Convertir les tableaux de text en UUID[]
  v_uuid_assigned_to := ARRAY(SELECT x::UUID FROM UNNEST(p_assigned_to) AS x);
  v_uuid_validators := ARRAY(SELECT x::UUID FROM UNNEST(p_validators) AS x);
  
  -- Extraire le premier exécutant comme UUID
  IF array_length(v_uuid_assigned_to, 1) > 0 THEN
    v_executor_id := v_uuid_assigned_to[1];
  END IF;
  
  -- Convertir le statut en type task_status
  v_status := p_status::task_status;
  
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
      status = v_status,
      updated_at = NOW()
    WHERE id = p_id
    RETURNING * INTO v_result;
    
    -- Mettre à jour ou supprimer le workflow selon p_use_visa_workflow
    IF p_use_visa_workflow THEN
      -- Désactiver temporairement le trigger pour éviter les conflits
      ALTER TABLE task_assignments DISABLE TRIGGER trigger_create_visa_workflow;
      
      -- Supprimer et recréer pour éviter les problèmes de type
      DELETE FROM task_visa_workflows WHERE task_assignment_id = p_id;
      
      INSERT INTO task_visa_workflows (
        task_assignment_id,
        executor_id,
        validator_order,
        current_validator_idx,
        status,
        current_version
      ) VALUES (
        p_id,
        v_executor_id,
        v_uuid_validators,
        0,
        'pending_execution',
        1
      );
    ELSE
      DELETE FROM task_visa_workflows WHERE task_assignment_id = p_id;
    END IF;
    
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
      v_status,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_result;
    
    -- Créer le workflow seulement si p_use_visa_workflow est true
    IF p_use_visa_workflow THEN
      INSERT INTO task_visa_workflows (
        task_assignment_id,
        executor_id,
        validator_order,
        current_validator_idx,
        status,
        current_version
      ) VALUES (
        v_result.id,
        v_executor_id,
        v_uuid_validators,
        0,
        'pending_execution',
        1
      );
    END IF;
  END IF;
  
  RETURN to_jsonb(v_result);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION upsert_task_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_task_assignment TO anon;
