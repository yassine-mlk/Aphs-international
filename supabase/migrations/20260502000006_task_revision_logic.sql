-- Migration: Implémenter la logique de limite de révision
-- Description: Incrémente le compteur de révisions et bloque la tâche si la limite est atteinte

-- 1. Incrémenter revision_count lors d'une nouvelle soumission workflow
CREATE OR REPLACE FUNCTION public.set_workflow_submission_metadata()
RETURNS TRIGGER AS $$
DECLARE
    v_max_version INTEGER;
    v_current_label TEXT;
BEGIN
    -- 1. Gérer la version numérique
    SELECT COALESCE(MAX(version), 0) INTO v_max_version
    FROM public.workflow_task_submissions
    WHERE task_id = NEW.task_id;
    
    NEW.version := v_max_version + 1;

    -- 2. Gérer le label de version (A, B, C...)
    SELECT current_version_label INTO v_current_label
    FROM public.workflow_tasks WHERE id = NEW.task_id;

    IF v_max_version > 0 THEN
        NEW.version_label := public.get_next_version_label(v_current_label);
    ELSE
        NEW.version_label := 'A';
    END IF;

    -- 3. Incrémenter le compteur de révisions sur la tâche
    UPDATE public.workflow_tasks 
    SET revision_count = revision_count + 1 
    WHERE id = NEW.task_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Vérifier la limite de révision lors du calcul du visa final
CREATE OR REPLACE FUNCTION public.on_workflow_review_added()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
    v_project_id UUID;
    v_task_name TEXT;
    v_project_name TEXT;
    v_tenant_id UUID;
    v_current_order INTEGER;
    v_total_validators INTEGER;
    v_next_validator_id UUID;
    v_final_visa TEXT;
    v_executor_id UUID;
    v_version_label TEXT;
    v_max_revisions INTEGER;
    v_revision_count INTEGER;
    v_created_by UUID;
BEGIN
    -- Récupérer les infos de base
    SELECT task_id, version_label INTO v_task_id, v_version_label FROM public.workflow_task_submissions WHERE id = NEW.submission_id;
    SELECT title, project_id, tenant_id, max_revisions, revision_count, created_by 
    INTO v_task_name, v_project_id, v_tenant_id, v_max_revisions, v_revision_count, v_created_by
    FROM public.workflow_tasks WHERE id = v_task_id;
    
    SELECT name INTO v_project_name FROM public.projects WHERE id = v_project_id;

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

        -- Logique de blocage si limite de révisions atteinte
        IF v_final_visa = 'var' AND v_revision_count >= v_max_revisions THEN
            v_final_visa := 'blocked';
            
            -- Notifier l'admin
            IF v_created_by IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, tenant_id, type, title, message, data)
                VALUES (
                    v_created_by,
                    v_tenant_id,
                    'task_blocked',
                    'Tâche bloquée : Limite de révisions atteinte',
                    format('La tâche "%s" du projet "%s" a atteint son nombre maximum de révisions (%s) et est maintenant bloquée.', v_task_name, v_project_name, v_max_revisions),
                    jsonb_build_object('task_id', v_task_id, 'status', 'blocked')
                );
            END IF;
        END IF;

        -- Mettre à jour la tâche avec le statut final
        UPDATE public.workflow_tasks SET
            status = v_final_visa,
            current_validator_idx = 0, -- Cycle terminé
            updated_at = NOW()
        WHERE id = v_task_id;

        -- Notifier l'exécuteur du résultat final
        FOR v_executor_id IN 
            SELECT user_id FROM public.workflow_task_assignments WHERE task_id = v_task_id AND role = 'executor'
        LOOP
            IF v_final_visa = 'blocked' THEN
                INSERT INTO public.notifications (user_id, tenant_id, type, title, message, data)
                VALUES (
                    v_executor_id,
                    v_tenant_id,
                    'task_status_changed',
                    'Tâche bloquée',
                    format('La tâche "%s" a été bloquée car le nombre maximum de révisions (%s) est atteint.', v_task_name, v_max_revisions),
                    jsonb_build_object('task_id', v_task_id, 'status', 'blocked')
                );
            ELSE
                INSERT INTO public.notifications (user_id, tenant_id, type, title, message, data)
                VALUES (
                    v_executor_id,
                    v_tenant_id,
                    'task_status_changed',
                    'Résultat final du circuit de visa',
                    format('Le circuit de visa pour "%s" (Indice %s) est terminé. Visa final : %s.', v_task_name, v_version_label, UPPER(v_final_visa)),
                    jsonb_build_object('task_id', v_task_id, 'status', v_final_visa, 'version_label', v_version_label)
                );
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Incrémenter revision_count pour les tâches standard également
CREATE OR REPLACE FUNCTION public.handle_standard_submission()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.standard_tasks 
    SET 
        revision_count = revision_count + 1,
        status = 'in_review',
        updated_at = NOW()
    WHERE id = NEW.task_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_handle_standard_submission ON public.standard_task_submissions;
CREATE TRIGGER tr_handle_standard_submission
AFTER INSERT ON public.standard_task_submissions
FOR EACH ROW EXECUTE FUNCTION public.handle_standard_submission();
