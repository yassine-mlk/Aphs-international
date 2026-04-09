-- =========================================
-- MISE À JOUR DU SYSTÈME D'ASSIGNATION DE TÂCHES (CORRIGÉ V2)
-- Script à exécuter dans Supabase SQL Editor
-- Permet d'assigner plusieurs intervenants à une même tâche
-- =========================================

-- 1. Supprimer temporairement la politique RLS qui bloque la modification
DROP POLICY IF EXISTS "Intervenants can view custom project structures" ON custom_project_structures;

-- 2. Supprimer la fonction RPC existante pour pouvoir changer son type de retour
-- PostgreSQL ne permet pas de changer la signature de retour avec CREATE OR REPLACE
DROP FUNCTION IF EXISTS get_task_assignments_with_projects(uuid);

-- 3. Modifier la colonne assigned_to pour devenir un tableau de UUIDs
-- On convertit les valeurs existantes en tableaux d'un seul élément
ALTER TABLE task_assignments 
ALTER COLUMN assigned_to TYPE UUID[] USING ARRAY[assigned_to]::UUID[];

-- 4. Recréer la politique RLS sur custom_project_structures avec le support multi-intervenants
CREATE POLICY "Intervenants can view custom project structures" ON custom_project_structures
    FOR SELECT USING (
        -- Accès si membre du projet
        EXISTS (
            SELECT 1 FROM membre 
            WHERE membre.project_id = custom_project_structures.project_id 
            AND membre.user_id = auth.uid()
        )
        OR 
        -- Accès si l'utilisateur fait partie des intervenants assignés (nouveau format tableau)
        EXISTS (
            SELECT 1 FROM task_assignments 
            WHERE task_assignments.project_id = custom_project_structures.project_id 
            AND auth.uid() = ANY(task_assignments.assigned_to)
        )
        OR
        -- Accès pour les admins
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
        OR (auth.jwt() ->> 'email' = 'admin@aps.com')
    );

-- 5. Recréer la fonction RPC avec le nouveau type de retour (assigned_to UUID[])
CREATE OR REPLACE FUNCTION get_task_assignments_with_projects(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    project_name TEXT,
    phase_id TEXT,
    section_id TEXT,
    subsection_id TEXT,
    task_name TEXT,
    assigned_to UUID[],
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
    WHERE (p_user_id IS NULL OR p_user_id = ANY(ta.assigned_to))
    ORDER BY ta.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ajouter un index GIN pour optimiser les recherches dans le tableau
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_to_array ON task_assignments USING GIN (assigned_to);
