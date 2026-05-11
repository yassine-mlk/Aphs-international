-- ============================================================
-- PROPAGATION AUTOMATIQUE DES STATUTS DE LA STRUCTURE PROJET
-- ============================================================

-- 1. Fonction pour propager le statut 'started' lors de l'assignation
CREATE OR REPLACE FUNCTION public.fn_propagate_task_assignment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_section_id UUID;
    v_subsection_id UUID;
BEGIN
    -- Tenter de convertir les IDs de section/sous-section en UUID (car ils sont stockés en TEXT)
    BEGIN
        v_section_id := NEW.section_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_section_id := NULL;
    END;

    BEGIN
        v_subsection_id := NEW.subsection_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_subsection_id := NULL;
    END;

    -- Si on a des UUIDs valides, on met à jour les statuts
    IF v_subsection_id IS NOT NULL THEN
        UPDATE public.project_items_snapshot 
        SET status = 'started', actual_start_date = COALESCE(actual_start_date, NOW())
        WHERE id = v_subsection_id AND status = 'pending';
    END IF;

    IF v_section_id IS NOT NULL THEN
        UPDATE public.project_sections_snapshot 
        SET status = 'started', actual_start_date = COALESCE(actual_start_date, NOW())
        WHERE id = v_section_id AND status = 'pending';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Fonction pour propager le statut 'completed' lors de la clôture des tâches
CREATE OR REPLACE FUNCTION public.fn_propagate_task_completion_status()
RETURNS TRIGGER AS $$
DECLARE
    v_section_id UUID;
    v_subsection_id UUID;
    v_all_tasks_done BOOLEAN;
    v_all_items_done BOOLEAN;
BEGIN
    -- On ne traite que si le statut passe à un état 'terminé'
    -- Standard: approved, closed
    -- Workflow: closed
    IF (NEW.status IN ('approved', 'closed') AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'closed'))) THEN
        
        BEGIN
            v_section_id := NEW.section_id::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_section_id := NULL;
        END;

        BEGIN
            v_subsection_id := NEW.subsection_id::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_subsection_id := NULL;
        END;

        -- 1. Vérifier la sous-section (item)
        IF v_subsection_id IS NOT NULL THEN
            -- Vérifier si TOUTES les tâches de cette sous-section sont terminées
            -- On vérifie dans les deux tables (standard et workflow)
            SELECT NOT EXISTS (
                SELECT 1 FROM public.standard_tasks 
                WHERE subsection_id = NEW.subsection_id AND project_id = NEW.project_id
                AND status NOT IN ('approved', 'closed')
                UNION ALL
                SELECT 1 FROM public.workflow_tasks 
                WHERE subsection_id = NEW.subsection_id AND project_id = NEW.project_id
                AND status != 'closed'
            ) INTO v_all_tasks_done;

            IF v_all_tasks_done THEN
                UPDATE public.project_items_snapshot 
                SET status = 'completed'
                WHERE id = v_subsection_id;

                -- 2. Vérifier la section si la sous-section vient de se terminer
                IF v_section_id IS NOT NULL THEN
                    SELECT NOT EXISTS (
                        SELECT 1 FROM public.project_items_snapshot
                        WHERE section_id = v_section_id
                        AND status != 'completed'
                    ) INTO v_all_items_done;

                    IF v_all_items_done THEN
                        UPDATE public.project_sections_snapshot 
                        SET status = 'completed'
                        WHERE id = v_section_id;
                    END IF;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Application des triggers sur standard_tasks
DROP TRIGGER IF EXISTS tr_propagate_assign_standard ON public.standard_tasks;
CREATE TRIGGER tr_propagate_assign_standard
AFTER INSERT OR UPDATE OF status ON public.standard_tasks
FOR EACH ROW EXECUTE FUNCTION public.fn_propagate_task_assignment_status();

DROP TRIGGER IF EXISTS tr_propagate_complete_standard ON public.standard_tasks;
CREATE TRIGGER tr_propagate_complete_standard
AFTER UPDATE OF status ON public.standard_tasks
FOR EACH ROW EXECUTE FUNCTION public.fn_propagate_task_completion_status();

-- 4. Application des triggers sur workflow_tasks
DROP TRIGGER IF EXISTS tr_propagate_assign_workflow ON public.workflow_tasks;
CREATE TRIGGER tr_propagate_assign_workflow
AFTER INSERT OR UPDATE OF status ON public.workflow_tasks
FOR EACH ROW EXECUTE FUNCTION public.fn_propagate_task_assignment_status();

DROP TRIGGER IF EXISTS tr_propagate_complete_workflow ON public.workflow_tasks;
CREATE TRIGGER tr_propagate_complete_workflow
AFTER UPDATE OF status ON public.workflow_tasks
FOR EACH ROW EXECUTE FUNCTION public.fn_propagate_task_completion_status();
