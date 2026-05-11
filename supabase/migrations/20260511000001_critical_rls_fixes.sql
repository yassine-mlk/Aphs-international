-- ============================================================================
-- Critical RLS fixes before production launch
-- Fixes messaging RLS, tenant_project_* policies, and task_history isolation
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. MESSAGING SYSTEM — Add RLS to conversations, messages, participants, reads
-- --------------------------------------------------------------------------

-- Add tenant_id to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Enable RLS on all messaging tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "conversations_tenant_policy" ON public.conversations;
DROP POLICY IF EXISTS "messages_tenant_policy" ON public.messages;
DROP POLICY IF EXISTS "conversation_participants_tenant_policy" ON public.conversation_participants;
DROP POLICY IF EXISTS "message_reads_tenant_policy" ON public.message_reads;

-- Conversations: direct tenant_id check
CREATE POLICY "conversations_tenant_policy" ON public.conversations
    FOR ALL
    USING (tenant_id IS NULL OR is_tenant_member(tenant_id) OR is_super_admin());

-- Messages: inherit tenant isolation via conversation
CREATE POLICY "messages_tenant_policy" ON public.messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
              AND (c.tenant_id IS NULL OR is_tenant_member(c.tenant_id) OR is_super_admin())
        )
    );

-- Conversation participants: inherit via conversation
CREATE POLICY "conversation_participants_tenant_policy" ON public.conversation_participants
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
              AND (c.tenant_id IS NULL OR is_tenant_member(c.tenant_id) OR is_super_admin())
        )
    );

-- Message reads: inherit via message -> conversation
CREATE POLICY "message_reads_tenant_policy" ON public.message_reads
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.conversations c ON c.id = m.conversation_id
            WHERE m.id = message_id
              AND (c.tenant_id IS NULL OR is_tenant_member(c.tenant_id) OR is_super_admin())
        )
    );

-- --------------------------------------------------------------------------
-- 2. TENANT PROJECT STRUCTURE — Replace profiles.tenant_id with is_tenant_member()
-- --------------------------------------------------------------------------

-- Sections
DROP POLICY IF EXISTS "tenant_sections_admin_all" ON public.tenant_project_sections;
DROP POLICY IF EXISTS "tenant_sections_members_read" ON public.tenant_project_sections;

CREATE POLICY "tenant_sections_admin_all" ON public.tenant_project_sections
    FOR ALL
    USING (is_tenant_admin(tenant_id) OR is_super_admin());

CREATE POLICY "tenant_sections_members_read" ON public.tenant_project_sections
    FOR SELECT
    USING (is_tenant_member(tenant_id) OR is_super_admin());

-- Items
DROP POLICY IF EXISTS "tenant_items_admin_all" ON public.tenant_project_items;
DROP POLICY IF EXISTS "tenant_items_members_read" ON public.tenant_project_items;

CREATE POLICY "tenant_items_admin_all" ON public.tenant_project_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_project_sections s
            WHERE s.id = section_id
              AND (is_tenant_admin(s.tenant_id) OR is_super_admin())
        )
    );

CREATE POLICY "tenant_items_members_read" ON public.tenant_project_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_project_sections s
            WHERE s.id = section_id
              AND (is_tenant_member(s.tenant_id) OR is_super_admin())
        )
    );

-- Tasks
DROP POLICY IF EXISTS "tenant_tasks_admin_all" ON public.tenant_project_tasks;
DROP POLICY IF EXISTS "tenant_tasks_members_read" ON public.tenant_project_tasks;

CREATE POLICY "tenant_tasks_admin_all" ON public.tenant_project_tasks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_project_items i
            JOIN public.tenant_project_sections s ON s.id = i.section_id
            WHERE i.id = item_id
              AND (is_tenant_admin(s.tenant_id) OR is_super_admin())
        )
    );

CREATE POLICY "tenant_tasks_members_read" ON public.tenant_project_tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_project_items i
            JOIN public.tenant_project_sections s ON s.id = i.section_id
            WHERE i.id = item_id
              AND (is_tenant_member(s.tenant_id) OR is_super_admin())
        )
    );

-- --------------------------------------------------------------------------
-- 3. TASK HISTORY — Add tenant_id and fix permissive RLS
-- --------------------------------------------------------------------------

-- Add tenant_id column
ALTER TABLE public.task_history ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Drop old permissive policy
DROP POLICY IF EXISTS "Task history access" ON public.task_history;

-- Create new policy with tenant isolation
CREATE POLICY "task_history_tenant_policy" ON public.task_history
    FOR SELECT
    USING (tenant_id IS NULL OR is_tenant_member(tenant_id) OR is_super_admin());

-- Backfill tenant_id for existing rows (standard tasks)
UPDATE public.task_history h
SET tenant_id = st.tenant_id
FROM public.standard_tasks st
WHERE h.task_type = 'standard'
  AND h.task_id = st.id
  AND h.tenant_id IS NULL;

-- Backfill tenant_id for existing rows (workflow tasks)
UPDATE public.task_history h
SET tenant_id = wt.tenant_id
FROM public.workflow_tasks wt
WHERE h.task_type = 'workflow'
  AND h.task_id = wt.id
  AND h.tenant_id IS NULL;

-- --------------------------------------------------------------------------
-- 3b. Update trigger functions to include tenant_id in task_history inserts
-- --------------------------------------------------------------------------

-- Standard task status change
CREATE OR REPLACE FUNCTION public.log_standard_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.task_history (task_id, task_type, tenant_id, action, old_status, new_status, details)
        VALUES (NEW.id, 'standard', NEW.tenant_id, 'status_change', OLD.status, NEW.status,
                jsonb_build_object('title', NEW.title));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Workflow task status change
CREATE OR REPLACE FUNCTION public.log_workflow_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.task_history (task_id, task_type, tenant_id, action, old_status, new_status, details)
        VALUES (NEW.id, 'workflow', NEW.tenant_id, 'status_change', OLD.status, NEW.status,
                jsonb_build_object('title', NEW.title, 'version', NEW.current_version));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Standard submission
CREATE OR REPLACE FUNCTION public.log_standard_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM public.standard_tasks WHERE id = NEW.task_id;
    INSERT INTO public.task_history (task_id, task_type, tenant_id, user_id, action, details)
    VALUES (NEW.task_id, 'standard', v_tenant_id, NEW.executor_id, 'submission',
            jsonb_build_object('file_name', NEW.file_name, 'submission_id', NEW.id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Workflow submission
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
                'version', NEW.version,
                'version_label', NEW.version_label,
                'submission_id', NEW.id
            ));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Standard review
CREATE OR REPLACE FUNCTION public.log_standard_review()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
    v_tenant_id UUID;
BEGIN
    SELECT sts.task_id, st.tenant_id INTO v_task_id, v_tenant_id
    FROM public.standard_task_submissions sts
    JOIN public.standard_tasks st ON st.id = sts.task_id
    WHERE sts.id = NEW.submission_id;

    INSERT INTO public.task_history (task_id, task_type, tenant_id, user_id, action, details)
    VALUES (v_task_id, 'standard', v_tenant_id, NEW.validator_id, 'validation',
            jsonb_build_object('opinion', NEW.opinion, 'submission_id', NEW.submission_id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Workflow review
CREATE OR REPLACE FUNCTION public.log_workflow_review()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
    v_version_label TEXT;
    v_tenant_id UUID;
BEGIN
    SELECT wts.task_id, wts.version_label, wt.tenant_id INTO v_task_id, v_version_label, v_tenant_id
    FROM public.workflow_task_submissions wts
    JOIN public.workflow_tasks wt ON wt.id = wts.task_id
    WHERE wts.id = NEW.submission_id;

    INSERT INTO public.task_history (task_id, task_type, tenant_id, user_id, action, details)
    VALUES (v_task_id, 'workflow', v_tenant_id, NEW.validator_id, 'validation',
            jsonb_build_object(
                'opinion', NEW.opinion,
                'submission_id', NEW.submission_id,
                'version_label', v_version_label
            ));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also update the admin decision function from the multi-tenant upgrade
-- to include tenant_id if it inserts into task_history
CREATE OR REPLACE FUNCTION public.log_standard_admin_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.task_history (task_id, task_type, tenant_id, action, old_status, new_status, details)
        VALUES (NEW.id, 'standard', NEW.tenant_id, 'admin_decision', OLD.status, NEW.status,
                jsonb_build_object('title', NEW.title));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 4. NOTIFICATIONS — Drop old legacy policy based on profiles.tenant_id if it still exists
--    (The multi-tenant migration already dropped and recreated "Tenant isolation for notifications"
--     with is_tenant_member(), but archive policies with different names may linger.)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation_notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_modify" ON public.notifications;

-- Ensure the correct policy exists
DROP POLICY IF EXISTS "Tenant isolation for notifications" ON public.notifications;
CREATE POLICY "Tenant isolation for notifications" ON public.notifications
    FOR ALL
    USING (
        tenant_id IS NULL
        OR is_tenant_member(tenant_id)
        OR is_super_admin()
    );

-- Also ensure RLS is enabled on video_meeting_chat if not already
ALTER TABLE IF EXISTS public.video_meeting_chat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "video_meeting_chat_tenant_policy" ON public.video_meeting_chat;
CREATE POLICY "video_meeting_chat_tenant_policy" ON public.video_meeting_chat
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.video_meetings vm
            WHERE vm.id = meeting_id
              AND (is_tenant_member(vm.tenant_id) OR is_super_admin())
        )
    );

-- RELOAD PostgREST schema cache
NOTIFY pgrst, 'reload schema';
