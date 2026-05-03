-- ============================================================
-- LOGIQUE MÉTIER DES TÂCHES (TRIGGERS & FONCTIONS)
-- ============================================================

-- 1. FONCTION : Calculer l'indice suivant (A, B, C...)
CREATE OR REPLACE FUNCTION public.get_next_indice(current_indice TEXT)
RETURNS TEXT AS $$
DECLARE
    next_char TEXT;
BEGIN
    IF current_indice IS NULL OR current_indice = '' THEN
        RETURN 'A';
    END IF;
    
    -- Pour simplifier, on gère A-Z. Si on dépasse Z, on pourrait faire AA, AB...
    -- Mais pour une revue documentaire, A-Z est généralement suffisant.
    next_char := CHR(ASCII(current_indice) + 1);
    RETURN next_char;
END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGER : Gérer la soumission d'une révision
CREATE OR REPLACE FUNCTION public.handle_task_revision_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_task_type TEXT;
    v_total_executors INTEGER;
    v_submitted_executors INTEGER;
    v_assignment_id UUID;
BEGIN
    -- Récupérer le type de tâche
    SELECT task_type INTO v_task_type FROM public.tasks WHERE id = NEW.task_id;

    IF v_task_type = 'parallel' THEN
        -- TYPE 1 : Parallel
        -- Vérifier si tous les executors ont soumis au moins une révision
        SELECT COUNT(*) INTO v_total_executors 
        FROM public.task_assignments 
        WHERE task_id = NEW.task_id AND role = 'executor';

        SELECT COUNT(DISTINCT executor_id) INTO v_submitted_executors 
        FROM public.task_revisions 
        WHERE task_id = NEW.task_id;

        IF v_submitted_executors >= v_total_executors THEN
            -- Tout le monde a soumis -> passage en revue
            UPDATE public.tasks SET status = 'in_review' WHERE id = NEW.task_id;
            
            -- Créer les reviews en attente pour TOUS les validateurs
            INSERT INTO public.task_reviews (revision_id, assignment_id, status)
            SELECT NEW.id, id, 'pending'
            FROM public.task_assignments
            WHERE task_id = NEW.task_id AND role = 'validator';
        END IF;

    ELSIF v_task_type = 'sequential' THEN
        -- TYPE 2 : Sequential
        -- Mettre la tâche en revue
        UPDATE public.tasks SET status = 'in_review' WHERE id = NEW.task_id;

        -- Créer les reviews pour TOUS les validateurs, mais seul le premier sera notifié (via l'app ou un autre trigger)
        INSERT INTO public.task_reviews (revision_id, assignment_id, status)
        SELECT NEW.id, id, 'pending'
        FROM public.task_assignments
        WHERE task_id = NEW.task_id AND role = 'validator'
        ORDER BY validator_order ASC;
        
        -- Note: La logique de notification du premier validateur se fait côté applicatif 
        -- ou via un trigger sur task_reviews
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_task_revision_submitted
    AFTER INSERT ON public.task_revisions
    FOR EACH ROW EXECUTE FUNCTION public.handle_task_revision_submission();

-- 3. TRIGGER : Gérer la validation d'une review
CREATE OR REPLACE FUNCTION public.handle_task_review_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
    v_task_type TEXT;
    v_revision_id UUID;
    v_total_validators INTEGER;
    v_done_validators INTEGER;
    v_has_rejected BOOLEAN;
    v_has_s BOOLEAN;
    v_has_d BOOLEAN;
    v_current_order INTEGER;
    v_next_assignment_id UUID;
BEGIN
    -- Ignorer si le statut n'est pas 'done'
    IF NEW.status != 'done' THEN
        RETURN NEW;
    END IF;

    -- Récupérer les infos
    SELECT tr.task_id, tr.id INTO v_task_id, v_revision_id 
    FROM public.task_revisions tr WHERE tr.id = NEW.revision_id;
    
    SELECT task_type INTO v_task_type FROM public.tasks WHERE id = v_task_id;

    IF v_task_type = 'parallel' THEN
        -- TYPE 1 : Parallel
        -- Vérifier si tous les validateurs ont répondu
        SELECT COUNT(*) INTO v_total_validators 
        FROM public.task_assignments WHERE task_id = v_task_id AND role = 'validator';

        SELECT COUNT(*) INTO v_done_validators 
        FROM public.task_reviews WHERE revision_id = v_revision_id AND status = 'done';

        IF v_done_validators >= v_total_validators THEN
            -- Calculer le résultat final
            SELECT EXISTS (SELECT 1 FROM public.task_reviews WHERE revision_id = v_revision_id AND avis = 'D')
            INTO v_has_rejected;

            IF v_has_rejected THEN
                UPDATE public.task_revisions SET visa_status = 'rejected' WHERE id = v_revision_id;
                UPDATE public.tasks SET status = 'rejected' WHERE id = v_task_id;
            ELSE
                UPDATE public.task_revisions SET visa_status = 'approved' WHERE id = v_revision_id;
                UPDATE public.tasks SET status = 'approved' WHERE id = v_task_id;
            END IF;
        END IF;

    ELSIF v_task_type = 'sequential' THEN
        -- TYPE 2 : Sequential
        -- Récupérer l'ordre actuel
        SELECT validator_order INTO v_current_order 
        FROM public.task_assignments WHERE id = NEW.assignment_id;

        -- Chercher le prochain validateur
        SELECT id INTO v_next_assignment_id
        FROM public.task_assignments
        WHERE task_id = v_task_id AND role = 'validator' AND validator_order > v_current_order
        ORDER BY validator_order ASC
        LIMIT 1;

        IF v_next_assignment_id IS NOT NULL THEN
            -- Notifier le prochain (via l'app ou trigger)
            -- Le statut de la tâche reste 'in_review'
        ELSE
            -- C'était le dernier validateur, calculer le VISA FINAL
            SELECT 
                EXISTS (SELECT 1 FROM public.task_reviews WHERE revision_id = v_revision_id AND avis = 'D'),
                EXISTS (SELECT 1 FROM public.task_reviews WHERE revision_id = v_revision_id AND avis = 'S')
            INTO v_has_d, v_has_s;

            IF v_has_d THEN
                UPDATE public.task_revisions SET visa_status = 'var' WHERE id = v_revision_id;
                UPDATE public.tasks SET status = 'var' WHERE id = v_task_id;
            ELSIF v_has_s THEN
                UPDATE public.task_revisions SET visa_status = 'vao' WHERE id = v_revision_id;
                UPDATE public.tasks SET status = 'vao' WHERE id = v_task_id;
            ELSE
                UPDATE public.task_revisions SET visa_status = 'vso' WHERE id = v_revision_id;
                UPDATE public.tasks SET status = 'vso' WHERE id = v_task_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_task_review_submitted
    AFTER UPDATE OF status ON public.task_reviews
    FOR EACH ROW 
    WHEN (OLD.status = 'pending' AND NEW.status = 'done')
    EXECUTE FUNCTION public.handle_task_review_submission();
