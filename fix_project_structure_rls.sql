-- =========================================
-- CORRECTION DES POLITIQUES RLS POUR CUSTOM_PROJECT_STRUCTURES
-- Script à exécuter dans Supabase SQL Editor
-- =========================================

-- Supprimer les anciennes politiques défectueuses
DROP POLICY IF EXISTS "Admins can manage custom project structures" ON custom_project_structures;
DROP POLICY IF EXISTS "Intervenants can view custom project structures" ON custom_project_structures;

-- =========================================
-- POLITIQUES RLS CORRIGÉES
-- =========================================

-- Politique pour les admins : accès complet
CREATE POLICY "Admins can manage custom project structures" ON custom_project_structures
    FOR ALL USING (
        -- Vérifier si l'utilisateur est admin via les profiles
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
        OR 
        -- Vérifier si l'utilisateur est admin via les métadonnées
        (auth.jwt() ->> 'email' = 'admin@aphs.com')
    );

-- Politique pour les intervenants : lecture seule
CREATE POLICY "Intervenants can view custom project structures" ON custom_project_structures
    FOR SELECT USING (
        -- Vérifier si l'utilisateur est membre du projet
        EXISTS (
            SELECT 1 FROM membre 
            WHERE membre.project_id = custom_project_structures.project_id 
            AND membre.user_id = auth.uid()
        )
        OR 
        -- Vérifier si l'utilisateur a des tâches assignées dans ce projet
        EXISTS (
            SELECT 1 FROM task_assignments 
            WHERE task_assignments.project_id = custom_project_structures.project_id 
            AND task_assignments.assigned_to = auth.uid()
        )
        OR
        -- Permettre l'accès aux admins aussi
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
        OR 
        (auth.jwt() ->> 'email' = 'admin@aphs.com')
    );

-- =========================================
-- POLITIQUE ALTERNATIVE SI PROFILES N'EXISTE PAS
-- =========================================

-- Si la table profiles n'existe pas, utiliser cette version simplifiée
-- Décommentez si nécessaire :

/*
-- Supprimer les politiques ci-dessus
DROP POLICY IF EXISTS "Admins can manage custom project structures" ON custom_project_structures;
DROP POLICY IF EXISTS "Intervenants can view custom project structures" ON custom_project_structures;

-- Politique simplifiée pour les admins
CREATE POLICY "Admins can manage custom project structures" ON custom_project_structures
    FOR ALL USING (
        auth.jwt() ->> 'email' = 'admin@aphs.com'
        OR 
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- Politique simplifiée pour les intervenants
CREATE POLICY "Intervenants can view custom project structures" ON custom_project_structures
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM membre 
            WHERE membre.project_id = custom_project_structures.project_id 
            AND membre.user_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM task_assignments 
            WHERE task_assignments.project_id = custom_project_structures.project_id 
            AND task_assignments.assigned_to = auth.uid()
        )
        OR
        auth.jwt() ->> 'email' = 'admin@aphs.com'
        OR 
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );
*/

-- =========================================
-- VÉRIFICATION DES POLITIQUES
-- =========================================

-- Vérifier que les politiques sont créées
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'custom_project_structures';

-- =========================================
-- TESTS DE PERMISSIONS
-- =========================================

-- Test : Vérifier l'accès à la table
SELECT COUNT(*) FROM custom_project_structures;

-- Test : Vérifier l'utilisateur actuel
SELECT 
    auth.uid() as user_id,
    auth.jwt() ->> 'email' as email,
    auth.jwt() -> 'user_metadata' ->> 'role' as role; 