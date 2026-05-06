-- Create video_meeting_chat table
CREATE TABLE IF NOT EXISTS public.video_meeting_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES public.video_meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.video_meeting_chat ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Les utilisateurs peuvent lire les messages de leurs réunions" ON public.video_meeting_chat
    FOR SELECT
    USING (
        meeting_id IN (
            SELECT meeting_id FROM public.video_meeting_participants WHERE user_id = auth.uid()
        )
        OR 
        meeting_id IN (
            SELECT id FROM public.video_meetings WHERE created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Les participants peuvent écrire dans le chat" ON public.video_meeting_chat
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND (
            meeting_id IN (
                SELECT meeting_id FROM public.video_meeting_participants WHERE user_id = auth.uid()
            )
            OR 
            meeting_id IN (
                SELECT id FROM public.video_meetings WHERE created_by = auth.uid()
            )
            OR
            EXISTS (
                SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
            )
        )
    );
