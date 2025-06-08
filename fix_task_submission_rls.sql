-- Script SQL pour corriger les problèmes RLS et configurer le stockage pour les soumissions de documents
-- À exécuter dans l'éditeur SQL de Supabase

-- ========================================
-- 1. CORRIGER LES POLITIQUES RLS SUR task_assignments
-- ========================================

-- Désactiver RLS sur task_assignments (comme demandé initialement)
ALTER TABLE task_assignments DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques RLS existantes sur task_assignments
DROP POLICY IF EXISTS "task_assignments_select_policy" ON task_assignments;
DROP POLICY IF EXISTS "task_assignments_insert_policy" ON task_assignments;
DROP POLICY IF EXISTS "task_assignments_update_policy" ON task_assignments;
DROP POLICY IF EXISTS "task_assignments_delete_policy" ON task_assignments;
DROP POLICY IF EXISTS "Users can view their own assignments" ON task_assignments;
DROP POLICY IF EXISTS "Users can update their own assignments" ON task_assignments;
DROP POLICY IF EXISTS "Admins can manage all assignments" ON task_assignments;

-- ========================================
-- 2. CRÉER LE BUCKET DE STOCKAGE task_submissions
-- ========================================

-- Insérer le bucket dans storage.buckets (approche directe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'task_submissions',
    'task_submissions', 
    true,  -- Public pour permettre l'accès aux URLs
    52428800,  -- 50MB de limite
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/zip',
        'application/x-zip-compressed',
        'application/x-autocad',
        'image/vnd.dwg'
    ]
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ========================================
-- 3. CONFIGURER LES POLITIQUES DE STOCKAGE
-- ========================================

-- Supprimer les anciennes politiques de stockage
DROP POLICY IF EXISTS "task_submissions_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "task_submissions_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "task_submissions_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "task_submissions_delete_policy" ON storage.objects;

-- Créer des politiques de stockage permissives pour task_submissions
CREATE POLICY "task_submissions_select_policy" ON storage.objects
    FOR SELECT USING (bucket_id = 'task_submissions');

CREATE POLICY "task_submissions_insert_policy" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'task_submissions');

CREATE POLICY "task_submissions_update_policy" ON storage.objects
    FOR UPDATE USING (bucket_id = 'task_submissions');

CREATE POLICY "task_submissions_delete_policy" ON storage.objects
    FOR DELETE USING (bucket_id = 'task_submissions');

-- ========================================
-- 4. VÉRIFIER ET CORRIGER task_info_sheets
-- ========================================

-- Désactiver RLS sur task_info_sheets aussi (cohérence)
ALTER TABLE task_info_sheets DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques RLS sur task_info_sheets
DROP POLICY IF EXISTS "task_info_sheets_select_policy" ON task_info_sheets;
DROP POLICY IF EXISTS "task_info_sheets_insert_policy" ON task_info_sheets;
DROP POLICY IF EXISTS "task_info_sheets_update_policy" ON task_info_sheets;
DROP POLICY IF EXISTS "task_info_sheets_delete_policy" ON task_info_sheets;

-- ========================================
-- 5. VÉRIFIER LES AUTRES TABLES
-- ========================================

-- Désactiver RLS sur projects (cohérence avec les autres tables)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques RLS sur projects
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;

-- Désactiver RLS sur profiles (cohérence)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques RLS sur profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Désactiver RLS sur membre (cohérence)
ALTER TABLE membre DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques RLS sur membre
DROP POLICY IF EXISTS "membre_select_policy" ON membre;
DROP POLICY IF EXISTS "membre_insert_policy" ON membre;
DROP POLICY IF EXISTS "membre_update_policy" ON membre;
DROP POLICY IF EXISTS "membre_delete_policy" ON membre;

-- Désactiver RLS sur companies (cohérence)
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques RLS sur companies
DROP POLICY IF EXISTS "companies_select_policy" ON companies;
DROP POLICY IF EXISTS "companies_insert_policy" ON companies;
DROP POLICY IF EXISTS "companies_update_policy" ON companies;
DROP POLICY IF EXISTS "companies_delete_policy" ON companies;

-- ========================================
-- 6. AFFICHER LES RÉSULTATS
-- ========================================

-- Vérifier que les buckets existent
SELECT 'Buckets de stockage:' as info;
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE name IN ('task_submissions', 'project-images')
ORDER BY name;

-- Vérifier les tables sans RLS
SELECT 'Tables sans RLS:' as info;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('task_assignments', 'task_info_sheets', 'projects', 'profiles', 'membre', 'companies')
  AND schemaname = 'public'
ORDER BY tablename;

-- Vérifier les politiques de stockage
SELECT 'Politiques de stockage pour task_submissions:' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%task_submissions%'
ORDER BY policyname;

-- Message de confirmation
SELECT 'Configuration terminée ! Les intervenants peuvent maintenant soumettre des documents.' as message; 