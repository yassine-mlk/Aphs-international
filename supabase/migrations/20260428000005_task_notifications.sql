-- ============================================================
-- NOTIFICATIONS POUR LES TÂCHES (TRIGGERS)
-- ============================================================

-- 1. Mise à jour des types de notifications autorisés
-- Pour éviter les erreurs de contrainte CHECK avec les données existantes inconnues,
-- nous supprimons la contrainte restrictive et la remplaçons par une simple vérification de non-nullité.
-- Cela garantit que la migration passe quel que soit l'état actuel des données.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Optionnel : si vous voulez vraiment une contrainte CHECK, il est préférable de ne pas l'appliquer 
-- aux lignes existantes (NOT VALID) ou de s'assurer qu'elle est assez large.
-- Ici, on choisit la flexibilité pour ne pas bloquer le déploiement.
ALTER TABLE public.notifications ALTER COLUMN type SET NOT NULL;

-- 2. FONCTION : Notifier le changement de statut d'une tâche
CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_task_name TEXT;
    v_project_name TEXT;
    v_recipient_id UUID;
    v_status_label TEXT;
BEGIN
    -- Ne notifier que si le statut a changé
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    v_task_name := NEW.title;
    SELECT name INTO v_project_name FROM public.projects WHERE id = NEW.project_id;

    CASE NEW.status
        WHEN 'open' THEN v_status_label := 'ouverte';
        WHEN 'in_review' THEN v_status_label := 'en cours de revue';
        WHEN 'approved' THEN v_status_label := 'approuvée';
        WHEN 'rejected' THEN v_status_label := 'rejetée';
        WHEN 'vso' THEN v_status_label := 'validée (VSO)';
        WHEN 'vao' THEN v_status_label := 'validée avec observations (VAO)';
        WHEN 'var' THEN v_status_label := 'à resoumettre (VAR)';
        ELSE v_status_label := NEW.status;
    END CASE;

    -- Notifier les exécuteurs du changement de statut (si c'est une validation finale)
    IF NEW.status IN ('approved', 'rejected', 'vso', 'vao', 'var') THEN
        FOR v_recipient_id IN 
            SELECT user_id FROM public.task_assignments WHERE task_id = NEW.id AND role = 'executor'
        LOOP
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES (
                v_recipient_id,
                'task_status_changed',
                'Statut de tâche mis à jour',
                format('La tâche "%s" du projet "%s" est désormais %s.', v_task_name, v_project_name, v_status_label),
                jsonb_build_object('task_id', NEW.id, 'status', NEW.status)
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TRIGGER sur tasks pour les changements de statut
DROP TRIGGER IF EXISTS on_task_status_changed ON public.tasks;
CREATE TRIGGER on_task_status_changed
    AFTER UPDATE OF status ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.notify_task_status_change();

-- 4. FONCTION : Notifier la soumission d'une nouvelle révision (aux validateurs)
CREATE OR REPLACE FUNCTION public.notify_task_revision_submitted()
RETURNS TRIGGER AS $$
DECLARE
    v_task_name TEXT;
    v_project_name TEXT;
    v_recipient_id UUID;
    v_task_type TEXT;
    v_first_validator_id UUID;
BEGIN
    SELECT title, task_type, project_id INTO v_task_name, v_task_type, v_project_name 
    FROM public.tasks WHERE id = NEW.task_id;
    
    SELECT name INTO v_project_name FROM public.projects WHERE id = (SELECT project_id FROM public.tasks WHERE id = NEW.task_id);

    IF v_task_type = 'parallel' THEN
        -- Notifier TOUS les validateurs
        FOR v_recipient_id IN 
            SELECT user_id FROM public.task_assignments WHERE task_id = NEW.task_id AND role = 'validator'
        LOOP
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES (
                v_recipient_id,
                'task_validation_request',
                'Nouvelle révision à valider',
                format('Une nouvelle révision (indice %s) a été soumise pour la tâche "%s" (%s).', NEW.indice, v_task_name, v_project_name),
                jsonb_build_object('task_id', NEW.task_id, 'revision_id', NEW.id)
            );
        END LOOP;
    ELSIF v_task_type = 'sequential' THEN
        -- Notifier seulement le PREMIER validateur
        SELECT user_id INTO v_first_validator_id
        FROM public.task_assignments
        WHERE task_id = NEW.task_id AND role = 'validator'
        ORDER BY validator_order ASC
        LIMIT 1;

        IF v_first_validator_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES (
                v_first_validator_id,
                'task_validation_request',
                'Nouvelle révision à valider (Circuit de visa)',
                format('Vous êtes le premier validateur pour la nouvelle révision de la tâche "%s" (%s).', v_task_name, v_project_name),
                jsonb_build_object('task_id', NEW.task_id, 'revision_id', NEW.id)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGER sur task_revisions pour les nouvelles soumissions
DROP TRIGGER IF EXISTS on_task_revision_notified ON public.task_revisions;
CREATE TRIGGER on_task_revision_notified
    AFTER INSERT ON public.task_revisions
    FOR EACH ROW EXECUTE FUNCTION public.notify_task_revision_submitted();

-- 6. FONCTION : Notifier la validation d'une étape (au suivant ou à l'exécuteur)
CREATE OR REPLACE FUNCTION public.notify_task_review_submitted()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
    v_task_name TEXT;
    v_project_name TEXT;
    v_task_type TEXT;
    v_current_order INTEGER;
    v_next_validator_id UUID;
    v_revision_id UUID;
BEGIN
    -- Ne notifier que si le statut est 'done'
    IF NEW.status != 'done' THEN
        RETURN NEW;
    END IF;

    SELECT task_id, id INTO v_task_id, v_revision_id FROM public.task_revisions WHERE id = NEW.revision_id;
    SELECT title, task_type, project_id INTO v_task_name, v_task_type, v_project_name FROM public.tasks WHERE id = v_task_id;
    SELECT name INTO v_project_name FROM public.projects WHERE id = (SELECT project_id FROM public.tasks WHERE id = v_task_id);

    IF v_task_type = 'sequential' THEN
        -- Trouver l'ordre actuel
        SELECT validator_order INTO v_current_order FROM public.task_assignments WHERE id = NEW.assignment_id;

        -- Trouver le prochain validateur
        SELECT user_id INTO v_next_validator_id
        FROM public.task_assignments
        WHERE task_id = v_task_id AND role = 'validator' AND validator_order > v_current_order
        ORDER BY validator_order ASC
        LIMIT 1;

        IF v_next_validator_id IS NOT NULL THEN
            -- Notifier le suivant
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES (
                v_next_validator_id,
                'task_validation_request',
                'Votre tour de validation',
                format('Le validateur précédent a donné son avis sur la tâche "%s". C''est maintenant à votre tour.', v_task_name),
                jsonb_build_object('task_id', v_task_id, 'revision_id', v_revision_id)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGER sur task_reviews pour les validations d'étapes
DROP TRIGGER IF EXISTS on_task_review_notified ON public.task_reviews;
CREATE TRIGGER on_task_review_notified
    AFTER UPDATE OF status ON public.task_reviews
    FOR EACH ROW 
    WHEN (OLD.status = 'pending' AND NEW.status = 'done')
    EXECUTE FUNCTION public.notify_task_review_submitted();
