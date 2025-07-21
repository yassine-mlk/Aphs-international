-- =========================================
-- CORRECTION DES POLITIQUES RLS VIDÉOCONFÉRENCE
-- Script à exécuter dans Supabase SQL Editor
-- Résout la récursion infinie dans les politiques
-- =========================================

-- =========================================
-- 1. SUPPRIMER LES ANCIENNES POLITIQUES PROBLÉMATIQUES
-- =========================================

-- Supprimer toutes les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Users can view their meetings" ON video_meetings;
DROP POLICY IF EXISTS "Users can create meetings" ON video_meetings;
DROP POLICY IF EXISTS "Users can update their meetings" ON video_meetings;
DROP POLICY IF EXISTS "Users can delete their meetings" ON video_meetings;

DROP POLICY IF EXISTS "Users can view meeting participants" ON video_meeting_participants;
DROP POLICY IF EXISTS "Users can manage meeting participants" ON video_meeting_participants;

-- =========================================
-- 2. CRÉER DES POLITIQUES SIMPLIFIÉES SANS RÉCURSION
-- =========================================

-- Politiques pour video_meetings (simplifiées)
CREATE POLICY "video_meetings_select_policy" ON video_meetings
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "video_meetings_insert_policy" ON video_meetings
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "video_meetings_update_policy" ON video_meetings
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "video_meetings_delete_policy" ON video_meetings
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Politiques pour video_meeting_participants (simplifiées)
CREATE POLICY "video_meeting_participants_select_policy" ON video_meeting_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "video_meeting_participants_insert_policy" ON video_meeting_participants
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "video_meeting_participants_update_policy" ON video_meeting_participants
    FOR UPDATE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "video_meeting_participants_delete_policy" ON video_meeting_participants
    FOR DELETE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- =========================================
-- 3. CRÉER UNE FONCTION POUR RÉCUPÉRER LES RÉUNIONS AVEC PARTICIPANTS
-- =========================================

CREATE OR REPLACE FUNCTION get_user_meetings_with_participants()
RETURNS TABLE (
    id UUID,
    title TEXT,
    room_id TEXT,
    description TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    is_instant BOOLEAN,
    status TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    recording_available BOOLEAN,
    deleted_at TIMESTAMP WITH TIME ZONE,
    participant_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vm.*,
        COALESCE(pc.participant_count, 0) as participant_count
    FROM video_meetings vm
    LEFT JOIN (
        SELECT 
            meeting_id,
            COUNT(*) as participant_count
        FROM video_meeting_participants
        WHERE status = 'joined'
        GROUP BY meeting_id
    ) pc ON vm.id = pc.meeting_id
    WHERE 
        vm.created_by = auth.uid() OR
        vm.id IN (
            SELECT meeting_id 
            FROM video_meeting_participants 
            WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    ORDER BY vm.created_at DESC;
END;
$$;

-- =========================================
-- 4. CRÉER UNE FONCTION POUR RÉCUPÉRER TOUTES LES RÉUNIONS (ADMIN)
-- =========================================

CREATE OR REPLACE FUNCTION get_all_meetings_with_participants()
RETURNS TABLE (
    id UUID,
    title TEXT,
    room_id TEXT,
    description TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    is_instant BOOLEAN,
    status TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    recording_available BOOLEAN,
    deleted_at TIMESTAMP WITH TIME ZONE,
    participant_count BIGINT,
    creator_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Vérifier que l'utilisateur est admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Accès non autorisé';
    END IF;

    RETURN QUERY
    SELECT 
        vm.*,
        COALESCE(pc.participant_count, 0) as participant_count,
        u.email as creator_email
    FROM video_meetings vm
    LEFT JOIN auth.users u ON vm.created_by = u.id
    LEFT JOIN (
        SELECT 
            meeting_id,
            COUNT(*) as participant_count
        FROM video_meeting_participants
        WHERE status = 'joined'
        GROUP BY meeting_id
    ) pc ON vm.id = pc.meeting_id
    WHERE vm.deleted_at IS NULL
    ORDER BY vm.created_at DESC;
END;
$$;

-- =========================================
-- 5. CRÉER UNE FONCTION POUR RÉCUPÉRER LES PARTICIPANTS D'UNE RÉUNION
-- =========================================

CREATE OR REPLACE FUNCTION get_meeting_participants(p_meeting_id UUID)
RETURNS TABLE (
    id UUID,
    meeting_id UUID,
    user_id UUID,
    role TEXT,
    status TEXT,
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    user_email TEXT,
    user_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vmp.*,
        u.email as user_email,
        COALESCE(p.first_name || ' ' || p.last_name, u.email) as user_name
    FROM video_meeting_participants vmp
    LEFT JOIN auth.users u ON vmp.user_id = u.id
    LEFT JOIN profiles p ON vmp.user_id = p.user_id
    WHERE 
        vmp.meeting_id = p_meeting_id AND
        (
            vmp.user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM video_meetings vm
                WHERE vm.id = p_meeting_id AND vm.created_by = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        )
    ORDER BY vmp.created_at;
END;
$$;

-- =========================================
-- 6. VÉRIFICATION FINALE
-- =========================================

-- Vérifier les nouvelles politiques
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('video_meetings', 'video_meeting_participants')
ORDER BY tablename, policyname;

-- Vérifier les nouvelles fonctions
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name LIKE '%meeting%'
ORDER BY routine_name;

-- Afficher un message de succès
SELECT 'Politiques RLS corrigées avec succès !' as status; 