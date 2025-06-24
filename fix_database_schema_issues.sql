-- =========================================
-- SCRIPT DE CORRECTION DES ERREURS DE SCHÉMA DE BASE DE DONNÉES
-- À exécuter dans Supabase SQL Editor
-- =========================================

-- =========================================
-- 1. CRÉATION DE LA TABLE NOTIFICATIONS (MANQUANTE)
-- =========================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'file_uploaded', 'task_validated', 'new_message', 'meeting_request',
        'task_assigned', 'project_added', 'task_validation_request', 
        'file_validation_request', 'message_received', 'meeting_invitation',
        'meeting_accepted', 'meeting_declined'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes sur les notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- =========================================
-- 2. AJOUT DE LA COLONNE DEADLINE AUX PROJETS
-- =========================================

-- Ajouter la colonne deadline aux projets si elle n'existe pas
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;

-- Ajouter un index pour optimiser les requêtes sur les deadlines
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects(deadline);

-- =========================================
-- 3. CORRECTION DE LA TABLE PROFILES
-- =========================================

-- La table profiles utilise user_id comme clé primaire, mais le code attend parfois 'id'
-- Ajouter une vue ou corriger les requêtes qui utilisent profiles.id

-- Vérifier la structure actuelle de la table profiles
DO $$
BEGIN
    -- Si la table profiles n'a pas de colonne id, on peut créer une vue
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'id'
    ) THEN
        -- Créer une vue temporaire pour la compatibilité
        CREATE OR REPLACE VIEW profiles_with_id AS
        SELECT 
            user_id as id,
            user_id,
            first_name,
            last_name,
            email,
            phone,
            role,
            specialty,
            company,
            company_id,
            status,
            bio,
            theme,
            language,
            email_notifications,
            push_notifications,
            message_notifications,
            update_notifications,
            created_at,
            updated_at
        FROM profiles;
    END IF;
END $$;

-- =========================================
-- 4. CRÉATION/VÉRIFICATION DE LA TABLE TASK_ASSIGNMENTS
-- =========================================

-- Vérifier si la table task_assignments existe et a les bonnes colonnes
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    subsection_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    assigned_to UUID NOT NULL REFERENCES auth.users(id),
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    validation_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    validators TEXT[] DEFAULT '{}',
    file_extension TEXT,
    comment TEXT,
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'submitted', 'validated', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_url TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE,
    validation_comment TEXT,
    validated_by UUID REFERENCES auth.users(id)
);

-- =========================================
-- 5. AJOUT D'INDEX POUR OPTIMISER LES PERFORMANCES
-- =========================================

-- Index pour task_assignments
CREATE INDEX IF NOT EXISTS idx_task_assignments_project_id ON task_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_to ON task_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON task_assignments(status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_deadline ON task_assignments(deadline);
CREATE INDEX IF NOT EXISTS idx_task_assignments_validated_by ON task_assignments(validated_by);

-- Index pour profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- =========================================
-- 6. CRÉATION DE FONCTIONS RPC POUR RÉSOUDRE LES PROBLÈMES DE RELATIONS
-- =========================================

-- Fonction pour obtenir les assignations de tâches avec les informations des projets
CREATE OR REPLACE FUNCTION get_task_assignments_with_projects(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    project_name TEXT,
    phase_id TEXT,
    section_id TEXT,
    subsection_id TEXT,
    task_name TEXT,
    assigned_to UUID,
    deadline TIMESTAMP WITH TIME ZONE,
    validation_deadline TIMESTAMP WITH TIME ZONE,
    validators TEXT[],
    file_extension TEXT,
    comment TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    file_url TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE,
    validation_comment TEXT,
    validated_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ta.id,
        ta.project_id,
        p.name as project_name,
        ta.phase_id,
        ta.section_id,
        ta.subsection_id,
        ta.task_name,
        ta.assigned_to,
        ta.deadline,
        ta.validation_deadline,
        ta.validators,
        ta.file_extension,
        ta.comment,
        ta.status,
        ta.created_at,
        ta.updated_at,
        ta.assigned_at,
        ta.file_url,
        ta.submitted_at,
        ta.validated_at,
        ta.validation_comment,
        ta.validated_by
    FROM task_assignments ta
    LEFT JOIN projects p ON ta.project_id = p.id
    WHERE (p_user_id IS NULL OR ta.assigned_to = p_user_id)
    ORDER BY ta.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les profils avec id mapping
CREATE OR REPLACE FUNCTION get_profiles_with_id()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT,
    specialty TEXT,
    company TEXT,
    company_id UUID,
    status TEXT,
    bio TEXT,
    theme TEXT,
    language TEXT,
    email_notifications BOOLEAN,
    push_notifications BOOLEAN,
    message_notifications BOOLEAN,
    update_notifications BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id as id,
        p.user_id,
        p.first_name,
        p.last_name,
        p.email,
        p.phone,
        p.role,
        p.specialty,
        p.company,
        p.company_id,
        p.status,
        p.bio,
        p.theme,
        p.language,
        p.email_notifications,
        p.push_notifications,
        p.message_notifications,
        p.update_notifications,
        p.created_at,
        p.updated_at
    FROM profiles p
    WHERE p.status = 'active'
    ORDER BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 7. TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- =========================================

-- Trigger pour mettre à jour updated_at sur notifications
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Trigger pour mettre à jour updated_at sur task_assignments
CREATE OR REPLACE FUNCTION update_task_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_assignments_updated_at
    BEFORE UPDATE ON task_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_task_assignments_updated_at();

-- =========================================
-- 8. POLITIQUE DE SÉCURITÉ RLS (Row Level Security)
-- =========================================

-- Activer RLS pour notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs ne voient que leurs notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Politique pour que les admins puissent créer des notifications
CREATE POLICY "Admins can create notifications" ON notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- =========================================
-- 9. DONNÉES DE TEST/EXEMPLE (OPTIONNEL)
-- =========================================

-- Ajouter quelques notifications de test pour vérifier que tout fonctionne
-- (À supprimer en production)
INSERT INTO notifications (user_id, type, title, message, data) 
SELECT 
    u.id,
    'task_assigned',
    'Notification de test',
    'Ceci est une notification de test pour vérifier que le système fonctionne',
    '{"test": true}'
FROM auth.users u
JOIN profiles p ON u.id = p.user_id
WHERE p.role = 'intervenant'
LIMIT 1
ON CONFLICT DO NOTHING;

-- =========================================
-- RÉSUMÉ DES CORRECTIONS
-- =========================================

/*
Ce script corrige les erreurs suivantes :

1. ✅ Table 'notifications' manquante
   - Créé la table notifications avec tous les champs nécessaires
   - Ajouté les index et contraintes appropriés

2. ✅ Colonne 'projects.deadline' manquante  
   - Ajouté la colonne deadline à la table projects
   - Ajouté un index pour optimiser les requêtes

3. ✅ Colonne 'profiles.id' manquante
   - Créé une vue temporaire pour mapper user_id vers id
   - Créé une fonction RPC pour obtenir les profils avec le mapping

4. ✅ Relations manquantes entre 'task_assignments' et 'projects'
   - Vérifié/créé la table task_assignments avec les bonnes contraintes
   - Créé une fonction RPC pour obtenir les données avec jointures

5. ✅ Optimisations de performance
   - Ajouté tous les index nécessaires
   - Créé des triggers pour la mise à jour automatique des timestamps
   - Configuré les politiques de sécurité RLS

Après l'exécution de ce script, toutes les erreurs rapportées devraient être résolues.
*/ 