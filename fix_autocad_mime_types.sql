-- Configuration du bucket task_submissions pour accepter les vrais types MIME AutoCAD
-- Ce script résout les problèmes de types MIME pour les fichiers AutoCAD

-- 1. Mettre à jour le bucket task_submissions pour accepter les types MIME AutoCAD
UPDATE storage.buckets 
SET 
  file_size_limit = 52428800, -- 50MB en bytes
  allowed_mime_types = ARRAY[
    'application/acad',      -- AutoCAD DWG
    'application/dxf',       -- AutoCAD DXF
    'application/revit',     -- Revit
    'application/sketchup',  -- SketchUp
    'application/pdf',       -- PDF
    'application/msword',    -- Word
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- Word DOCX
    'application/vnd.ms-excel', -- Excel
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- Excel XLSX
    'application/vnd.ms-powerpoint', -- PowerPoint
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', -- PowerPoint PPTX
    'text/plain',            -- TXT
    'image/jpeg',            -- JPG
    'image/png',             -- PNG
    'image/gif',             -- GIF
    'image/webp',            -- WEBP
    'application/zip',       -- ZIP
    'application/octet-stream' -- Fallback pour types non reconnus
  ]
WHERE id = 'task_submissions';

-- 2. Vérifier la configuration mise à jour
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'task_submissions';

-- 3. Vérifier que les politiques RLS existent
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

-- 4. Si les politiques n'existent pas, les créer
DO $$
BEGIN
  -- Politique pour permettre aux utilisateurs authentifiés d'uploader des fichiers
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Users can upload task submissions'
  ) THEN
    CREATE POLICY "Users can upload task submissions" ON storage.objects FOR INSERT 
    WITH CHECK (
      bucket_id = 'task_submissions' AND 
      auth.role() = 'authenticated'
    );
  END IF;

  -- Politique pour permettre aux utilisateurs authentifiés de voir les fichiers
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Users can view task submissions'
  ) THEN
    CREATE POLICY "Users can view task submissions" ON storage.objects FOR SELECT 
    USING (
      bucket_id = 'task_submissions' AND 
      auth.role() = 'authenticated'
    );
  END IF;

  -- Politique pour permettre aux utilisateurs authentifiés de mettre à jour les fichiers
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Users can update task submissions'
  ) THEN
    CREATE POLICY "Users can update task submissions" ON storage.objects FOR UPDATE 
    USING (
      bucket_id = 'task_submissions' AND 
      auth.role() = 'authenticated'
    );
  END IF;

  -- Politique pour permettre aux utilisateurs authentifiés de supprimer les fichiers
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Users can delete task submissions'
  ) THEN
    CREATE POLICY "Users can delete task submissions" ON storage.objects FOR DELETE 
    USING (
      bucket_id = 'task_submissions' AND 
      auth.role() = 'authenticated'
    );
  END IF;
END $$;

-- 5. Afficher un message de confirmation
SELECT 'Configuration terminée. Le bucket task_submissions accepte maintenant les types MIME AutoCAD.' as status; 