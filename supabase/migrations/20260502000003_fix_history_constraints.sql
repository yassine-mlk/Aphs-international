-- Fix for task_history inserts in triggers
-- Adding missing task_type and consolidating logging

-- 1. Update the workflow submission trigger to include task_type and version_label
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

    -- On ne fait pas d'insert ici car le trigger tr_log_workflow_submission s'en charge déjà
    -- On va juste mettre à jour ce trigger pour inclure le label
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the dedicated logging trigger for workflow submissions
CREATE OR REPLACE FUNCTION log_workflow_submission()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.task_history (task_id, task_type, user_id, action, details)
    VALUES (NEW.task_id, 'workflow', NEW.executor_id, 'submission', 
            jsonb_build_object(
                'file_name', NEW.file_name, 
                'version', NEW.version, 
                'version_label', NEW.version_label,
                'submission_id', NEW.id
            ));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Update the review trigger to include task_type
CREATE OR REPLACE FUNCTION public.on_workflow_review_added()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
    v_task_name TEXT;
    v_project_name TEXT;
    v_tenant_id UUID;
    v_current_order INTEGER;
    v_total_validators INTEGER;
    v_next_validator_id UUID;
    v_final_visa TEXT;
    v_executor_id UUID;
    v_version_label TEXT;
BEGIN
    -- Récupérer les infos de base
    SELECT task_id, version_label INTO v_task_id, v_version_label FROM public.workflow_task_submissions WHERE id = NEW.submission_id;
    SELECT title, project_id, tenant_id INTO v_task_name, v_project_name, v_tenant_id FROM public.workflow_tasks WHERE id = v_task_id;
    SELECT name INTO v_project_name FROM public.projects WHERE id = (SELECT project_id FROM public.workflow_tasks WHERE id = v_task_id);

    -- Récupérer l'ordre du validateur actuel
    SELECT validator_order INTO v_current_order 
    FROM public.workflow_task_assignments 
    WHERE task_id = v_task_id AND user_id = NEW.validator_id AND role = 'validator';

    -- Compter le nombre total de validateurs
    SELECT COUNT(*) INTO v_total_validators 
    FROM public.workflow_task_assignments 
    WHERE task_id = v_task_id AND role = 'validator';

    IF v_current_order < v_total_validators THEN
        -- Il y a un validateur suivant
        SELECT user_id INTO v_next_validator_id
        FROM public.workflow_task_assignments
        WHERE task_id = v_task_id AND role = 'validator' AND validator_order = v_current_order + 1;

        -- Mettre à jour la tâche : passer au validateur suivant
        UPDATE public.workflow_tasks SET
            current_validator_idx = v_current_order + 1,
            updated_at = NOW()
        WHERE id = v_task_id;

        -- Notifier le prochain validateur
        IF v_next_validator_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, tenant_id, type, title, message, data)
            VALUES (
                v_next_validator_id,
                v_tenant_id,
                'task_validation_request',
                'Votre tour de validation',
                format('Le validateur précédent a donné son avis sur "%s" (Indice %s). C''est maintenant à votre tour.', v_task_name, v_version_label),
                jsonb_build_object('task_id', v_task_id, 'submission_id', NEW.submission_id)
            );
        END IF;
    ELSE
        -- C'était le dernier validateur ! Calculer le visa final
        v_final_visa := public.calculate_final_visa(NEW.submission_id);

        -- Mettre à jour la soumission avec le visa final
        UPDATE public.workflow_task_submissions 
        SET visa_status = v_final_visa 
        WHERE id = NEW.submission_id;

        -- Mettre à jour la tâche avec le statut final (vso, vao, var)
        UPDATE public.workflow_tasks SET
            status = v_final_visa,
            current_validator_idx = 0, -- Cycle terminé
            updated_at = NOW()
        WHERE id = v_task_id;

        -- Notifier l'exécuteur du résultat final
        FOR v_executor_id IN 
            SELECT user_id FROM public.workflow_task_assignments WHERE task_id = v_task_id AND role = 'executor'
        LOOP
            INSERT INTO public.notifications (user_id, tenant_id, type, title, message, data)
            VALUES (
                v_executor_id,
                v_tenant_id,
                'task_status_changed',
                'Résultat final du circuit de visa',
                format('Le circuit de visa pour "%s" (Indice %s) est terminé. Visa final : %s.', v_task_name, v_version_label, UPPER(v_final_visa)),
                jsonb_build_object('task_id', v_task_id, 'status', v_final_visa, 'version_label', v_version_label)
            );
        END LOOP;
    END IF;

    -- On ne fait pas d'insert ici car le trigger log_workflow_review (ou similaire) devrait s'en charger
    -- Mais s'il n'existe pas pour workflow, on l'ajoute avec task_type
    -- Vérifions si log_workflow_review existe
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Assurer que le log de review pour workflow existe et est correct
CREATE OR REPLACE FUNCTION log_workflow_review()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
    v_version_label TEXT;
BEGIN
    SELECT task_id, version_label INTO v_task_id, v_version_label 
    FROM public.workflow_task_submissions WHERE id = NEW.submission_id;
    
    INSERT INTO public.task_history (task_id, task_type, user_id, action, details)
    VALUES (v_task_id, 'workflow', NEW.validator_id, 'validation', 
            jsonb_build_object(
                'opinion', NEW.opinion, 
                'submission_id', NEW.submission_id,
                'version_label', v_version_label
            ));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_log_workflow_review ON public.workflow_task_reviews;
CREATE TRIGGER tr_log_workflow_review
AFTER INSERT ON public.workflow_task_reviews
FOR EACH ROW EXECUTE FUNCTION log_workflow_review();
