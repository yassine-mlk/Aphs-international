-- ============================================================
-- AJOUT DE L'HISTORIQUE DES TÂCHES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL,
    task_type       TEXT NOT NULL CHECK (task_type IN ('standard', 'workflow')),
    user_id         UUID REFERENCES auth.users(id),
    action          TEXT NOT NULL, -- 'status_change', 'submission', 'validation', 'admin_decision'
    old_status      TEXT,
    new_status      TEXT,
    details         JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON public.task_history(task_id);

-- RLS
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Task history access" ON public.task_history FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger pour logger les changements de statut (Standard Tasks)
CREATE OR REPLACE FUNCTION log_standard_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.task_history (task_id, task_type, action, old_status, new_status, details)
        VALUES (NEW.id, 'standard', 'status_change', OLD.status, NEW.status, 
                jsonb_build_object('title', NEW.title));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_standard_task_status
AFTER UPDATE ON public.standard_tasks
FOR EACH ROW EXECUTE FUNCTION log_standard_task_status_change();

-- Trigger pour logger les changements de statut (Workflow Tasks)
CREATE OR REPLACE FUNCTION log_workflow_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.task_history (task_id, task_type, action, old_status, new_status, details)
        VALUES (NEW.id, 'workflow', 'status_change', OLD.status, NEW.status, 
                jsonb_build_object('title', NEW.title, 'version', NEW.current_version));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_workflow_task_status
AFTER UPDATE ON public.workflow_tasks
FOR EACH ROW EXECUTE FUNCTION log_workflow_task_status_change();

-- Trigger pour logger les soumissions (Standard)
CREATE OR REPLACE FUNCTION log_standard_submission()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.task_history (task_id, task_type, user_id, action, details)
    VALUES (NEW.task_id, 'standard', NEW.executor_id, 'submission', 
            jsonb_build_object('file_name', NEW.file_name, 'submission_id', NEW.id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_standard_submission
AFTER INSERT ON public.standard_task_submissions
FOR EACH ROW EXECUTE FUNCTION log_standard_submission();

-- Trigger pour logger les soumissions (Workflow)
CREATE OR REPLACE FUNCTION log_workflow_submission()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.task_history (task_id, task_type, user_id, action, details)
    VALUES (NEW.task_id, 'workflow', NEW.executor_id, 'submission', 
            jsonb_build_object('file_name', NEW.file_name, 'version', NEW.version, 'submission_id', NEW.id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_workflow_submission
AFTER INSERT ON public.workflow_task_submissions
FOR EACH ROW EXECUTE FUNCTION log_workflow_submission();

-- Trigger pour logger les validations (Standard)
CREATE OR REPLACE FUNCTION log_standard_review()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
BEGIN
    SELECT task_id INTO v_task_id FROM public.standard_task_submissions WHERE id = NEW.submission_id;
    INSERT INTO public.task_history (task_id, task_type, user_id, action, details)
    VALUES (v_task_id, 'standard', NEW.validator_id, 'validation', 
            jsonb_build_object('opinion', NEW.opinion, 'submission_id', NEW.submission_id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_standard_review
AFTER INSERT ON public.standard_task_reviews
FOR EACH ROW EXECUTE FUNCTION log_standard_review();

-- Trigger pour logger les validations (Workflow)
CREATE OR REPLACE FUNCTION log_workflow_review()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
    v_version INTEGER;
BEGIN
    SELECT task_id, version INTO v_task_id, v_version FROM public.workflow_task_submissions WHERE id = NEW.submission_id;
    INSERT INTO public.task_history (task_id, task_type, user_id, action, details)
    VALUES (v_task_id, 'workflow', NEW.validator_id, 'validation', 
            jsonb_build_object('opinion', NEW.opinion, 'version', v_version, 'submission_id', NEW.submission_id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_workflow_review
AFTER INSERT ON public.workflow_task_reviews
FOR EACH ROW EXECUTE FUNCTION log_workflow_review();

