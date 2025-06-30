-- Configuration du stockage pour les avatars des utilisateurs
-- Ce script crée le bucket et les politiques de sécurité nécessaires

-- 1. Créer le bucket avatars s'il n'existe pas déjà
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

-- 2. Activer RLS sur le bucket avatars
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Politique pour permettre à tous les utilisateurs authentifiés de voir les avatars
CREATE POLICY "Public Avatar Access" ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- 4. Politique pour permettre aux utilisateurs d'uploader leur propre avatar
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = split_part(name, '_', 1)
);

-- 5. Politique pour permettre aux utilisateurs de mettre à jour leur propre avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = split_part(name, '_', 1)
);

-- 6. Politique pour permettre aux utilisateurs de supprimer leur propre avatar
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = split_part(name, '_', 1)
);

-- Note: Le nom du fichier doit commencer par l'ID de l'utilisateur suivi d'un underscore
-- Format attendu: {user_id}_{timestamp}.{ext} 