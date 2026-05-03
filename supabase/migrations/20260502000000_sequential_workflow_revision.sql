-- ============================================================
-- REVISION DU MODULE DE WORKFLOW SÉQUENTIEL
-- ============================================================

-- 1. Mise à jour des tables pour supporter les indices alphabétiques (A, B, C...)
ALTER TABLE public.workflow_tasks ADD COLUMN IF NOT EXISTS current_version_label TEXT DEFAULT 'A';
ALTER TABLE public.workflow_task_submissions ADD COLUMN IF NOT EXISTS version_label TEXT;
ALTER TABLE public.workflow_task_submissions ADD COLUMN IF NOT EXISTS visa_status TEXT CHECK (visa_status IN ('vso', 'vao', 'var'));

-- 2. Fonction pour incrémenter l'indice alphabétique (A -> B, ..., Z -> AA)
CREATE OR REPLACE FUNCTION public.get_next_version_label(p_current_label TEXT)
RETURNS TEXT AS $$
DECLARE
    v_last_char TEXT;
    v_prefix TEXT;
    v_last_val INTEGER;
BEGIN
    IF p_current_label IS NULL OR p_current_label = '' THEN
        RETURN 'A';
    END IF;

    -- Pour simplifier, on gère A-Z. Pour AA, AB etc, c'est plus complexe mais A-Z suffit généralement.
    -- Si on veut vraiment gérer AA, on peut faire une logique de base 26.
    
    v_last_val := ascii(right(p_current_label, 1));
    
    IF v_last_val < 90 THEN -- 'Z' est 90
        RETURN left(p_current_label, length(p_current_label) - 1) || chr(v_last_val + 1);
    ELSE
        -- Si on finit par Z, on ajoute un A (Z -> AA, AZ -> BA etc)
        -- Logique simplifiée pour l'instant : on boucle ou on ajoute un digit
        RETURN p_current_label || 'A';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Fonction pour calculer le visa final basé sur les avis
CREATE OR REPLACE FUNCTION public.calculate_final_visa(p_submission_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_has_d BOOLEAN;
    v_has_s BOOLEAN;
BEGIN
    -- Vérifier s'il y a au moins un 'D' (Défavorable)
    SELECT EXISTS(
        SELECT 1 FROM public.workflow_task_reviews 
        WHERE submission_id = p_submission_id AND opinion = 'D'
    ) INTO v_has_d;
    
    IF v_has_d THEN
        RETURN 'var'; -- Visa À Resoumettre
    END IF;
    
    -- Vérifier s'il y a au moins un 'S' (Suspendu)
    SELECT EXISTS(
        SELECT 1 FROM public.workflow_task_reviews 
        WHERE submission_id = p_submission_id AND opinion = 'S'
    ) INTO v_has_s;
    
    IF v_has_s THEN
        RETURN 'vao'; -- Visa Avec Observations
    END IF;
    
    -- Sinon, tout est F ou HM
    RETURN 'vso'; -- Visa Sans Observations
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Trigger : Lors d'une soumission (Exécuteur)
CREATE OR REPLACE FUNCTION public.on_workflow_submission_added()
RETURNS TRIGGER AS $$
DECLARE
    v_current_label TEXT;
    v_next_label TEXT;
    v_first_validator_id UUID;
    v_task_name TEXT;
    v_project_name TEXT;
    v_tenant_id UUID;
BEGIN
    -- Récupérer le label actuel de la tâche
    SELECT current_version_label, title, project_id, tenant_id 
    INTO v_current_label, v_task_name, v_project_name, v_tenant_id
    FROM public.workflow_tasks WHERE id = NEW.task_id;
    
    SELECT name INTO v_project_name FROM public.projects WHERE id = (SELECT project_id FROM public.workflow_tasks WHERE id = NEW.task_id);

    -- Si c'est la première soumission, c'est A. Sinon, on incrémente si la précédente était terminée.
    -- Mais le plus simple est de suivre la demande : l'exécuteur soumet -> nouvel indice.
    -- On vérifie s'il existe déjà des soumissions pour cette tâche
    IF EXISTS (SELECT 1 FROM public.workflow_task_submissions WHERE task_id = NEW.task_id AND id != NEW.id) THEN
        v_next_label := public.get_next_version_label(v_current_label);
    ELSE
        v_next_label := 'A';
    END IF;

    -- Mettre à jour la soumission avec son label
    UPDATE public.workflow_task_submissions 
    SET version_label = v_next_label 
    WHERE id = NEW.id;

    -- Mettre à jour la tâche : statut 'in_review', reset validator idx à 1, update current label
    UPDATE public.workflow_tasks SET
        status = 'in_review',
        current_validator_idx = 1,
        current_version_label = v_next_label,
        updated_at = NOW()
    WHERE id = NEW.task_id;

    -- Notifier le PREMIER validateur
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
            format('Vous êtes le premier validateur pour le document "%s" (Indice %s) du projet "%s".', v_task_name, v_next_label, v_project_name),
            jsonb_build_object('task_id', NEW.task_id, 'submission_id', NEW.id, 'version_label', v_next_label)
        );
    END IF;

    -- Log dans l'historique
    INSERT INTO public.task_history (task_id, user_id, action, details)
    VALUES (NEW.task_id, NEW.executor_id, 'submission_created', jsonb_build_object('version_label', v_next_label, 'file_name', NEW.file_name));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_on_workflow_submission_added ON public.workflow_task_submissions;
CREATE TRIGGER trigger_on_workflow_submission_added
    AFTER INSERT ON public.workflow_task_submissions
    FOR EACH ROW EXECUTE FUNCTION public.on_workflow_submission_added();

-- 5. Trigger : Lors d'un avis (Validateur)
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
        
        -- Si c'est VSO, notifier aussi l'admin qui a créé la tâche
        IF v_final_visa = 'vso' THEN
            -- ... (optionnel)
        END IF;
    END IF;

    -- Log dans l'historique
    INSERT INTO public.task_history (task_id, user_id, action, details)
    VALUES (v_task_id, NEW.validator_id, 'review_submitted', jsonb_build_object('opinion', NEW.opinion, 'version_label', v_version_label));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_on_workflow_review_added ON public.workflow_task_reviews;
CREATE TRIGGER trigger_on_workflow_review_added
    AFTER INSERT ON public.workflow_task_reviews
    FOR EACH ROW EXECUTE FUNCTION public.on_workflow_review_added();

-- 6. Mise à jour de la vue pour inclure les labels de version
DROP VIEW IF EXISTS public.task_assignments_view CASCADE;
CREATE OR REPLACE VIEW public.task_assignments_view AS
SELECT 
    t.id, t.project_id, p.name as project_name, p.tenant_id, t.phase_id, 
    t.section_id, t.subsection_id,
    t.section_id as section_name, t.subsection_id as subsection_name,
    t.title as task_name, t.description as comment, 'standard' as assignment_type,
    t.status, t.priority, t.deadline, NULL::date as validation_deadline,
    NULL::date as start_date, NULL::date as end_date, 'pdf'::text as file_extension,
    t.created_at, t.updated_at,
    COALESCE((SELECT array_agg(user_id) FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'executor'), '{}'::uuid[]) as assigned_to,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', 3, 'role', 'validator', 'order', NULL))
              FROM public.standard_task_assignments WHERE task_id = t.id AND role = 'validator'), '[]'::jsonb) as validators,
    NULL as current_version_label,
    0 as current_validator_idx
FROM public.standard_tasks t
JOIN public.projects p ON t.project_id = p.id
UNION ALL
SELECT 
    t.id, t.project_id, p.name as project_name, p.tenant_id, t.phase_id, 
    t.section_id as section_name, t.subsection_id as subsection_name,
    t.section_id, t.subsection_id,
    t.title as task_name, t.description as comment, 'workflow' as assignment_type,
    t.status, t.priority, t.deadline, t.validation_deadline,
    NULL::date as start_date, NULL::date as end_date, 'pdf'::text as file_extension,
    t.created_at, t.updated_at,
    COALESCE((SELECT array_agg(user_id) FROM public.workflow_task_assignments WHERE task_id = t.id AND role = 'executor'), '{}'::uuid[]) as assigned_to,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'days_limit', days_limit, 'role', 'validator', 'order', validator_order) ORDER BY validator_order ASC)
              FROM public.workflow_task_assignments WHERE task_id = t.id AND role = 'validator'), '[]'::jsonb) as validators,
    t.current_version_label,
    t.current_validator_idx
FROM public.workflow_tasks t
JOIN public.projects p ON t.project_id = p.id;
