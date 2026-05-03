-- ============================================================
-- CORRECTION DE LA LOGIQUE DES TÂCHES STANDARD (V3.1)
-- Soumissions par exécuteur et validation simplifiée
-- ============================================================

-- 1. Correction de la contrainte d'unicité sur les soumissions
-- On permet à chaque exécuteur d'avoir sa propre suite de versions
ALTER TABLE public.task_submissions DROP CONSTRAINT IF EXISTS task_submissions_task_id_version_key;
ALTER TABLE public.task_submissions ADD CONSTRAINT task_submissions_task_id_executor_id_version_key UNIQUE(task_id, executor_id, version);

-- 2. Fonction pour obtenir les choix de validation selon le type de tâche
-- Utilisée par le frontend ou pour des contraintes
CREATE OR REPLACE FUNCTION public.get_valid_opinions(p_task_id UUID)
RETURNS TEXT[] AS $$
DECLARE
    v_task_type TEXT;
BEGIN
    SELECT task_type INTO v_task_type FROM public.tasks WHERE id = p_task_id;
    IF v_task_type = 'standard' THEN
        RETURN ARRAY['F', 'D']; -- F = Valide, D = Non Valide
    ELSE
        RETURN ARRAY['F', 'D', 'S', 'HM']; -- Workflow complet
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Trigger pour valider l'opinion et l'ordre des validateurs
CREATE OR REPLACE FUNCTION public.check_task_review_opinion()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
    v_task_type TEXT;
    v_validator_order INTEGER;
    v_prev_reviews_count INTEGER;
BEGIN
    -- Récupérer le task_id et le type via la submission
    SELECT task_id INTO v_task_id FROM public.task_submissions WHERE id = NEW.submission_id;
    SELECT task_type INTO v_task_type FROM public.tasks WHERE id = v_task_id;
    
    -- 1. Vérification des opinions autorisées pour les tâches standard
    IF v_task_type = 'standard' AND NEW.opinion NOT IN ('F', 'D') THEN
        RAISE EXCEPTION 'Pour les tâches standard, seuls les avis "F" (Valide) ou "D" (Non Valide) sont autorisés.';
    END IF;
    
    -- 2. Vérification de l'ordre pour les tâches workflow
    IF v_task_type = 'workflow' THEN
        -- Récupérer l'ordre du validateur actuel
        SELECT validator_order INTO v_validator_order 
        FROM public.task_assignments 
        WHERE task_id = v_task_id AND user_id = NEW.validator_id AND role = 'validator';
        
        -- Compter combien de reviews ont déjà été faites pour cette soumission
        SELECT COUNT(*) INTO v_prev_reviews_count
        FROM public.task_reviews
        WHERE submission_id = NEW.submission_id;
        
        -- L'ordre doit correspondre au nombre de reviews déjà faites + 1
        IF v_validator_order != (v_prev_reviews_count + 1) THEN
            RAISE EXCEPTION 'Ce n''est pas encore votre tour de valider ce document (Validateur % attendu, vous êtes %).', (v_prev_reviews_count + 1), v_validator_order;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_task_review_opinion ON public.task_reviews;
CREATE TRIGGER trigger_check_task_review_opinion
    BEFORE INSERT OR UPDATE ON public.task_reviews
    FOR EACH ROW EXECUTE FUNCTION public.check_task_review_opinion();

-- 4. Vue mise à jour pour inclure les informations de soumission par exécuteur
CREATE OR REPLACE VIEW public.task_submissions_with_reviews AS
SELECT 
    ts.*,
    p.full_name as executor_name,
    COALESCE(
        (SELECT jsonb_agg(
            jsonb_build_object(
                'id', tr.id,
                'validator_id', tr.validator_id,
                'validator_name', vp.full_name,
                'opinion', tr.opinion,
                'comment', tr.comment,
                'reviewed_at', tr.reviewed_at
            )
        )
        FROM public.task_reviews tr
        JOIN public.profiles vp ON tr.validator_id = vp.user_id
        WHERE tr.submission_id = ts.id),
        '[]'::jsonb
    ) as reviews
FROM public.task_submissions ts
JOIN public.profiles p ON ts.executor_id = p.user_id;

-- 5. Fonction pour vérifier si une tâche est totalement validée (pour l'admin)
-- Une tâche standard est validée si TOUTES les soumissions de TOUS les exécuteurs 
-- ont reçu un avis favorable de TOUS les validateurs.
-- Sinon, l'admin doit trancher.
CREATE OR REPLACE FUNCTION public.get_task_validation_status(p_task_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_executors INTEGER;
    v_submitted_executors INTEGER;
    v_total_validators INTEGER;
    v_pending_reviews INTEGER;
    v_rejected_reviews INTEGER;
    v_result JSONB;
BEGIN
    -- Nombre d'exécuteurs assignés
    SELECT COUNT(*) INTO v_total_executors 
    FROM public.task_assignments WHERE task_id = p_task_id AND role = 'executor';
    
    -- Nombre d'exécuteurs ayant soumis au moins un fichier
    SELECT COUNT(DISTINCT executor_id) INTO v_submitted_executors 
    FROM public.task_submissions WHERE task_id = p_task_id;
    
    -- Nombre de validateurs assignés
    SELECT COUNT(*) INTO v_total_validators 
    FROM public.task_assignments WHERE task_id = p_task_id AND role = 'validator';
    
    -- Nombre de reviews rejetées (avis 'D')
    SELECT COUNT(*) INTO v_rejected_reviews
    FROM public.task_reviews tr
    JOIN public.task_submissions ts ON tr.submission_id = ts.id
    WHERE ts.task_id = p_task_id AND tr.opinion = 'D';
    
    -- Vérifier si tout le monde a soumis et tout le monde a validé favorablement
    -- (Cette logique est simplifiée, l'admin peut toujours outrepasser via le statut de la tâche)
    
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
