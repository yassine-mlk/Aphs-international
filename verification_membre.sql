-- Script de vérification de la table membre et des données

-- 1. Vérifier que la table membre existe et voir sa structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'membre';

-- 2. Compter le nombre total d'entrées dans la table membre
SELECT COUNT(*) as total_membres FROM membre;

-- 3. Voir toutes les données de la table membre
SELECT * FROM membre;

-- 4. Vérifier les données avec les noms des projets
SELECT 
  m.id,
  m.user_id,
  m.project_id,
  m.role,
  p.name as project_name,
  m.added_at
FROM membre m
LEFT JOIN projects p ON m.project_id = p.id
ORDER BY m.added_at DESC;

-- 5. Vérifier pour un utilisateur spécifique (remplacer l'ID)
-- Remplacez '03b96fc9-d2cd-4fec-b719-395a3b06a1b7' par l'ID réel de votre utilisateur
SELECT 
  m.*,
  p.name as project_name,
  p.description as project_description,
  p.status as project_status
FROM membre m
LEFT JOIN projects p ON m.project_id = p.id
WHERE m.user_id = '03b96fc9-d2cd-4fec-b719-395a3b06a1b7';

-- 6. Vérifier que le projet existe bien
SELECT id, name, status, created_at 
FROM projects 
WHERE id = '538e6cae-b55d-418d-ace5-412d6faad224';

-- 7. Statistiques par projet
SELECT 
  p.name as project_name,
  COUNT(m.id) as nombre_membres
FROM projects p
LEFT JOIN membre m ON p.id = m.project_id
GROUP BY p.id, p.name
ORDER BY nombre_membres DESC; 