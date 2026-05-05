-- Configuration simplifiée du stockage pour les avatars des utilisateurs
-- Version alternative avec politiques plus permissives

-- 1. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- 2. Créer le bucket avatars s'il n'existe pas déjà
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,  -- bucket public pour permettre l'accès direct aux images
  false,
  2097152, -- 2MB en bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Activer RLS sur le bucket avatars
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Politique simple pour permettre à tous de voir les avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- 5. Politique pour permettre aux utilisateurs authentifiés d'uploader des avatars
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- 6. Politique pour permettre aux utilisateurs authentifiés de mettre à jour des avatars
CREATE POLICY "Authenticated users can update avatars" ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- 7. Politique pour permettre aux utilisateurs authentifiés de supprimer des avatars
CREATE POLICY "Authenticated users can delete avatars" ON storage.objects FOR DELETE 
USING (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- Note: Cette version est plus permissive mais plus simple à déboguer
-- Tous les utilisateurs authentifiés peuvent gérer tous les avatars 