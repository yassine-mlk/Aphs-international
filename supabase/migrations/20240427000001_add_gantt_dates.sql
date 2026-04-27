-- ============================================================
-- AJOUT DES DATES DE DÉBUT ET DE FIN POUR LE DIAGRAMME DE GANTT
-- ============================================================

-- 1. Ajouter les colonnes aux tables de structure snapshot
ALTER TABLE public.project_sections_snapshot 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

ALTER TABLE public.project_items_snapshot 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- 2. Ajouter les colonnes à la table task_assignments
ALTER TABLE public.task_assignments 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- 3. Mettre à jour la fonction upsert_task_assignment pour inclure les dates
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
  p_status TEXT DEFAULT 'assigned',
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result task_assignments%ROWTYPE;
  v_uuid_assigned_to UUID[];
  v_uuid_validators UUID[];
  v_status task_status;
BEGIN
  -- Convertir les tableaux pour task_assignments (qui attend UUID[])
  SELECT ARRAY_AGG(x::UUID) INTO v_uuid_assigned_to
  FROM UNNEST(p_assigned_to) AS x;
  
  SELECT ARRAY_AGG(x::UUID) INTO v_uuid_validators
  FROM UNNEST(p_validators) AS x;
  
  -- Convertir le statut
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
      start_date = COALESCE(p_start_date, start_date),
      end_date = COALESCE(p_end_date, end_date),
      updated_at = NOW()
    WHERE id = p_id
    RETURNING * INTO v_result;
    
    -- Supprimer l'ancien workflow si existant (pour éviter les conflits)
    DELETE FROM task_visa_workflows WHERE task_assignment_id = p_id;
    
    -- Créer le nouveau workflow si demandé
    IF p_use_visa_workflow THEN
      INSERT INTO task_visa_workflows (
        task_assignment_id,
        executor_id,
        validator_order,
        current_validator_idx,
        status,
        current_version
      ) VALUES (
        p_id,
        p_assigned_to[1],
        p_validators,
        0,
        'pending_execution',
        1
      );
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
      start_date,
      end_date,
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
      p_start_date,
      p_end_date,
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
        p_assigned_to[1],
        p_validators,
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

-- 4. Mettre à jour get_task_assignments_with_projects pour inclure les dates
CREATE OR REPLACE FUNCTION get_task_assignments_with_projects(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    project_name TEXT,
    phase_id TEXT,
    section_id TEXT,
    subsection_id TEXT,
    task_name TEXT,
    assigned_to UUID[],
    deadline TIMESTAMP WITH TIME ZONE,
    validation_deadline TIMESTAMP WITH TIME ZONE,
    validators TEXT[],
    file_extension TEXT,
    comment TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    file_url TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE,
    validation_comment TEXT,
    validated_by UUID,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ta.id,
        ta.project_id,
        p.name as project_name,
        ta.phase_id,
        ta.section_id,
        ta.subsection_id,
        ta.task_name,
        ta.assigned_to,
        ta.deadline,
        ta.validation_deadline,
        ta.validators,
        ta.file_extension,
        ta.comment,
        ta.status,
        ta.created_at,
        ta.updated_at,
        ta.assigned_at,
        ta.file_url,
        ta.submitted_at,
        ta.validated_at,
        ta.validation_comment,
        ta.validated_by,
        ta.start_date,
        ta.end_date
    FROM task_assignments ta
    LEFT JOIN projects p ON ta.project_id = p.id
    WHERE (p_user_id IS NULL OR p_user_id = ANY(ta.assigned_to))
    ORDER BY ta.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
