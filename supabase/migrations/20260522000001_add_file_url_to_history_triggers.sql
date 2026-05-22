-- ============================================================
-- AJOUT DE file_url DANS LES TRIGGERS D'HISTORIQUE DE SOUMISSION
-- ============================================================
-- Les anciens triggers ne stockaient pas file_url dans details,
-- ce qui empêchait le téléchargement des fichiers depuis l'historique.

-- Mise à jour du trigger de soumission standard
CREATE OR REPLACE FUNCTION public.log_standard_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM public.standard_tasks WHERE id = NEW.task_id;
    INSERT INTO public.task_history (task_id, task_type, tenant_id, user_id, action, details)
    VALUES (NEW.task_id, 'standard', v_tenant_id, NEW.executor_id, 'submission',
            jsonb_build_object(
                'file_name', NEW.file_name,
                'file_url', NEW.file_url,
                'submission_id', NEW.id
            ));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mise à jour du trigger de soumission workflow
CREATE OR REPLACE FUNCTION public.log_workflow_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM public.workflow_tasks WHERE id = NEW.task_id;
    INSERT INTO public.task_history (task_id, task_type, tenant_id, user_id, action, details)
    VALUES (NEW.task_id, 'workflow', v_tenant_id, NEW.executor_id, 'submission',
            jsonb_build_object(
                'file_name', NEW.file_name,
                'file_url', NEW.file_url,
                'version', NEW.version,
                'version_label', NEW.version_label,
                'submission_id', NEW.id
            ));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
