-- ============================================================================
-- SCHEMA POUR LA FONCTIONNALITÉ DE VISIOCONFÉRENCE
-- ============================================================================

-- 1. TABLE DES RÉUNIONS VIDÉO
CREATE TABLE IF NOT EXISTS video_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, scheduled, active, completed, cancelled
    room_url TEXT,
    room_name VARCHAR(100),
    is_recording_enabled BOOLEAN DEFAULT false,
    recording_url TEXT,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLE DES PARTICIPANTS AUX RÉUNIONS
CREATE TABLE IF NOT EXISTS video_meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES video_meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'participant', -- moderator, participant
    status VARCHAR(50) DEFAULT 'invited', -- invited, present, absent
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(meeting_id, user_id)
);

-- 3. TABLE DES MESSAGES DE CHAT (HISTORIQUE)
CREATE TABLE IF NOT EXISTS video_meeting_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES video_meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ACTIVER RLS (Row Level Security)
ALTER TABLE video_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_messages ENABLE ROW LEVEL SECURITY;

-- 5. POLITIQUES RLS POUR video_meetings

-- Lecture : Les membres du tenant peuvent voir les réunions où ils sont invités ou s'ils sont admin
DROP POLICY IF EXISTS "video_meetings_select" ON video_meetings;
CREATE POLICY "video_meetings_select" ON video_meetings
    FOR SELECT
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
    );

-- Insertion : Les admins peuvent créer, les intervenants peuvent demander (pending)
DROP POLICY IF EXISTS "video_meetings_insert" ON video_meetings;
CREATE POLICY "video_meetings_insert" ON video_meetings
    FOR INSERT
    WITH CHECK (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
    );

-- Mise à jour : Admin ou créateur
DROP POLICY IF EXISTS "video_meetings_update" ON video_meetings;
CREATE POLICY "video_meetings_update" ON video_meetings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM tenant_members tm 
            WHERE tm.tenant_id = video_meetings.tenant_id 
            AND tm.user_id = auth.uid() 
            AND tm.role = 'admin'
        )
        OR created_by = auth.uid()
    );

-- 6. POLITIQUES RLS POUR video_meeting_participants

DROP POLICY IF EXISTS "video_meeting_participants_select" ON video_meeting_participants;
CREATE POLICY "video_meeting_participants_select" ON video_meeting_participants
    FOR SELECT
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "video_meeting_participants_all" ON video_meeting_participants;
CREATE POLICY "video_meeting_participants_all" ON video_meeting_participants
    FOR ALL
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
    );

-- 7. POLITIQUES RLS POUR video_meeting_messages

DROP POLICY IF EXISTS "video_meeting_messages_select" ON video_meeting_messages;
CREATE POLICY "video_meeting_messages_select" ON video_meeting_messages
    FOR SELECT
    USING (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "video_meeting_messages_insert" ON video_meeting_messages;
CREATE POLICY "video_meeting_messages_insert" ON video_meeting_messages
    FOR INSERT
    WITH CHECK (
        tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
    );

-- 8. INDEX POUR LA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_video_meetings_tenant ON video_meetings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_meeting ON video_meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_user ON video_meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_messages_meeting ON video_meeting_messages(meeting_id);

-- 9. TABLE DES LOGS DE RÉUNION (POUR LE SUIVI)
CREATE TABLE IF NOT EXISTS video_meeting_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES video_meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    event_type TEXT NOT NULL, -- 'join', 'leave', 'signal', 'error', 'recording_start', 'recording_stop'
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_meeting_logs_meeting ON video_meeting_logs(meeting_id);

-- 10. MISE À JOUR DE LA TABLE NOTIFICATIONS
-- Ajout des nouveaux types de notifications et des colonnes de paramètres
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'file_uploaded', 'task_validated', 'new_message', 'meeting_request',
    'task_assigned', 'project_added', 'task_validation_request', 
    'file_validation_request', 'message_received', 'meeting_invitation',
    'meeting_accepted', 'meeting_declined', 'task_status_changed',
    'videoconf_request', 'videoconf_accepted', 'videoconf_rejected', 'videoconf_scheduled'
));

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_key TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_key TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_params JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_params JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE video_meeting_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_meeting_logs_select" ON video_meeting_logs
    FOR SELECT
    USING (
        meeting_id IN (
            SELECT id FROM video_meetings 
            WHERE tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm WHERE tm.user_id = auth.uid())
        )
    );

