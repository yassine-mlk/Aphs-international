-- Refactor triggers for workflow_task_submissions to be more efficient (BEFORE INSERT)
-- This combines version (int) and version_label (text) calculation

CREATE OR REPLACE FUNCTION public.set_workflow_submission_metadata()
RETURNS TRIGGER AS $$
DECLARE
    v_max_version INTEGER;
    v_current_label TEXT;
    v_next_label TEXT;
BEGIN
    -- 1. Handle integer version
    SELECT COALESCE(MAX(version), 0) INTO v_max_version
    FROM public.workflow_task_submissions
    WHERE task_id = NEW.task_id;
    
    NEW.version := v_max_version + 1;

    -- 2. Handle version label (A, B, C...)
    SELECT current_version_label INTO v_current_label
    FROM public.workflow_tasks WHERE id = NEW.task_id;

    IF v_max_version > 0 THEN
        NEW.version_label := public.get_next_version_label(v_current_label);
    ELSE
        NEW.version_label := 'A';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove old triggers
DROP TRIGGER IF EXISTS trigger_set_workflow_submission_version ON public.workflow_task_submissions;
DROP TRIGGER IF EXISTS trigger_on_workflow_submission_added ON public.workflow_task_submissions;

-- Create new consolidated BEFORE INSERT trigger
CREATE TRIGGER trigger_set_workflow_submission_metadata
    BEFORE INSERT ON public.workflow_task_submissions
    FOR EACH ROW EXECUTE FUNCTION public.set_workflow_submission_metadata();

-- Keep the AFTER INSERT trigger for status updates and notifications only
CREATE OR REPLACE FUNCTION public.on_workflow_submission_notif_status()
RETURNS TRIGGER AS $$
DECLARE
    v_first_validator_id UUID;
    v_task_name TEXT;
    v_project_name TEXT;
    v_tenant_id UUID;
BEGIN
    -- Mettre à jour la tâche : statut 'in_review', reset validator idx à 1, update current label
    UPDATE public.workflow_tasks SET
        status = 'in_review',
        current_validator_idx = 1,
        current_version_label = NEW.version_label,
        updated_at = NOW()
    WHERE id = NEW.task_id;

    -- Notifier le PREMIER validateur
    SELECT title, project_id, tenant_id 
    INTO v_task_name, v_project_name, v_tenant_id
    FROM public.workflow_tasks WHERE id = NEW.task_id;
    
    SELECT name INTO v_project_name FROM public.projects WHERE id = (SELECT project_id FROM public.workflow_tasks WHERE id = NEW.task_id);

    SELECT user_id INTO v_first_validator_id
    FROM public.workflow_task_assignments
    WHERE task_id = NEW.task_id AND role = 'validator'
    ORDER BY validator_order ASC
    LIMIT 1;

    IF v_first_validator_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, tenant_id, type, title, message, data)
        VALUES (
            v_first_validator_id,
            v_tenant_id,
            'task_validation_request',
            'Nouvelle soumission à valider (Circuit de visa)',
            format('Vous êtes le premier validateur pour le document "%s" (Indice %s) du projet "%s".', v_task_name, NEW.version_label, v_project_name),
            jsonb_build_object('task_id', NEW.task_id, 'submission_id', NEW.id, 'version_label', NEW.version_label)
        );
    END IF;

    -- Log dans l'historique
    INSERT INTO public.task_history (task_id, user_id, action, details)
    VALUES (NEW.task_id, NEW.executor_id, 'submission_created', jsonb_build_object('version_label', NEW.version_label, 'file_name', NEW.file_name));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_on_workflow_submission_notif_status
    AFTER INSERT ON public.workflow_task_submissions
    FOR EACH ROW EXECUTE FUNCTION public.on_workflow_submission_notif_status();
