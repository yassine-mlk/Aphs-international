-- ============================================================
-- RÉIMPLÉMENTATION DE LA LOGIQUE MÉTIER POUR LES TABLES SÉPARÉES
-- ============================================================

-- 1. Fonction pour obtenir les choix de validation selon le type de tâche
CREATE OR REPLACE FUNCTION public.get_valid_opinions(p_task_id UUID)
RETURNS TEXT[] AS $$
DECLARE
    is_standard BOOLEAN;
BEGIN
    -- On vérifie d'abord si c'est une tâche standard
    SELECT EXISTS(SELECT 1 FROM public.standard_tasks WHERE id = p_task_id) INTO is_standard;
    
    IF is_standard THEN
        RETURN ARRAY['F', 'D']; -- F = Valide, D = Non Valide
    ELSE
        RETURN ARRAY['F', 'D', 'S', 'HM']; -- Workflow complet
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Trigger pour valider l'opinion (Standard)
CREATE OR REPLACE FUNCTION public.check_standard_review_opinion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.opinion NOT IN ('F', 'D') THEN
        RAISE EXCEPTION 'Pour les tâches standard, seuls les avis "F" (Valide) ou "D" (Non Valide) sont autorisés.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_standard_review_opinion ON public.standard_task_reviews;
CREATE TRIGGER trigger_check_standard_review_opinion
    BEFORE INSERT OR UPDATE ON public.standard_task_reviews
    FOR EACH ROW EXECUTE FUNCTION public.check_standard_review_opinion();

-- 3. Trigger pour valider l'opinion et l'ordre (Workflow)
CREATE OR REPLACE FUNCTION public.check_workflow_review_opinion()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
    v_validator_order INTEGER;
    v_prev_reviews_count INTEGER;
BEGIN
    -- Récupérer le task_id via la submission
    SELECT task_id INTO v_task_id FROM public.workflow_task_submissions WHERE id = NEW.submission_id;
    
    -- Vérification de l'ordre pour les tâches workflow
    SELECT validator_order INTO v_validator_order 
    FROM public.workflow_task_assignments 
    WHERE task_id = v_task_id AND user_id = NEW.validator_id AND role = 'validator';
    
    -- Compter combien de reviews ont déjà été faites pour cette soumission
    SELECT COUNT(*) INTO v_prev_reviews_count
    FROM public.workflow_task_reviews
    WHERE submission_id = NEW.submission_id;
    
    -- L'ordre doit correspondre au nombre de reviews déjà faites + 1
    IF v_validator_order != (v_prev_reviews_count + 1) THEN
        RAISE EXCEPTION 'Ce n''est pas encore votre tour de valider ce document (Validateur % attendu, vous êtes %).', (v_prev_reviews_count + 1), v_validator_order;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_workflow_review_opinion ON public.workflow_task_reviews;
CREATE TRIGGER trigger_check_workflow_review_opinion
    BEFORE INSERT OR UPDATE ON public.workflow_task_reviews
    FOR EACH ROW EXECUTE FUNCTION public.check_workflow_review_opinion();

-- 4. Fonction pour vérifier si une tâche est totalement validée (pour l'admin)
-- Version mise à jour pour standard_tasks
CREATE OR REPLACE FUNCTION public.get_task_validation_status(p_task_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_executors INTEGER;
    v_submitted_executors INTEGER;
    v_total_validators INTEGER;
    v_rejected_reviews INTEGER;
    v_result JSONB;
BEGIN
    -- Nombre d'exécuteurs assignés
    SELECT COUNT(*) INTO v_total_executors 
    FROM public.standard_task_assignments WHERE task_id = p_task_id AND role = 'executor';
    
    -- Nombre d'exécuteurs ayant soumis au moins un fichier
    SELECT COUNT(DISTINCT executor_id) INTO v_submitted_executors 
    FROM public.standard_task_submissions WHERE task_id = p_task_id;
    
    -- Nombre de validateurs assignés
    SELECT COUNT(*) INTO v_total_validators 
    FROM public.standard_task_assignments WHERE task_id = p_task_id AND role = 'validator';
    
    -- Nombre de reviews rejetées (avis 'D')
    SELECT COUNT(*) INTO v_rejected_reviews
    FROM public.standard_task_reviews tr
    JOIN public.standard_task_submissions ts ON tr.submission_id = ts.id
    WHERE ts.task_id = p_task_id AND tr.opinion = 'D';
    
    SELECT jsonb_build_object(
        'total_executors', v_total_executors,
        'submitted_executors', v_submitted_executors,
        'total_validators', v_total_validators,
        'has_rejections', v_rejected_reviews > 0,
        'is_fully_submitted', v_submitted_executors >= v_total_executors
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;
