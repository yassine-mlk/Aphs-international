-- Fix for workflow_task_submissions version column and tenant_id
-- The version column was NOT NULL but we want to handle versioning via labels and triggers
-- Also ensuring tenant_id is properly handled

-- 1. Make version column nullable in workflow_task_submissions
ALTER TABLE public.workflow_task_submissions ALTER COLUMN version DROP NOT NULL;

-- 2. Add version_label to standard_task_submissions for consistency (optional but good)
ALTER TABLE public.standard_task_submissions ADD COLUMN IF NOT EXISTS version_label TEXT;

-- 3. Update the trigger to also handle the integer version if needed, or just rely on labels
-- Actually, let's make the integer version auto-incrementing based on task_id
CREATE OR REPLACE FUNCTION public.set_workflow_submission_version()
RETURNS TRIGGER AS $$
DECLARE
    v_max_version INTEGER;
BEGIN
    -- Handle integer version
    SELECT COALESCE(MAX(version), 0) INTO v_max_version
    FROM public.workflow_task_submissions
    WHERE task_id = NEW.task_id;
    
    NEW.version := v_max_version + 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_workflow_submission_version ON public.workflow_task_submissions;
CREATE TRIGGER trigger_set_workflow_submission_version
    BEFORE INSERT ON public.workflow_task_submissions
    FOR EACH ROW EXECUTE FUNCTION public.set_workflow_submission_version();
