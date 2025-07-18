-- Configuration du bucket task_submissions pour accepter tous les types de fichiers
-- Ce script résout les problèmes CORS et de types MIME pour les fichiers AutoCAD

-- 1. Créer le bucket task_submissions s'il n'existe pas déjà
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task_submissions',
  'task_submissions', 
  true,  -- bucket public pour permettre l'accès direct aux fichiers
  52428800, -- 50MB en bytes (limite pour les fichiers AutoCAD)
  ARRAY['*/*'] -- Accepter tous les types MIME
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['*/*'];

-- 2. Activer RLS sur le bucket task_submissions
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can upload task submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can view task submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can update task submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete task submissions" ON storage.objects;

-- 4. Politique pour permettre aux utilisateurs authentifiés d'uploader des fichiers
CREATE POLICY "Users can upload task submissions" ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'task_submissions' AND 
  auth.role() = 'authenticated'
);

-- 5. Politique pour permettre aux utilisateurs authentifiés de voir les fichiers
CREATE POLICY "Users can view task submissions" ON storage.objects FOR SELECT 
USING (
  bucket_id = 'task_submissions' AND 
  auth.role() = 'authenticated'
);

-- 6. Politique pour permettre aux utilisateurs authentifiés de mettre à jour les fichiers
CREATE POLICY "Users can update task submissions" ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'task_submissions' AND 
  auth.role() = 'authenticated'
);

-- 7. Politique pour permettre aux utilisateurs authentifiés de supprimer les fichiers
CREATE POLICY "Users can delete task submissions" ON storage.objects FOR DELETE 
USING (
  bucket_id = 'task_submissions' AND 
  auth.role() = 'authenticated'
);

-- 8. Vérifier la configuration
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'task_submissions';

-- 9. Vérifier les politiques créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%task_submissions%'; 