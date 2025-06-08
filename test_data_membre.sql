-- Script SQL pour ajouter des données test dans la table membre
-- À exécuter après avoir créé la table membre

-- Supposons que nous avons les IDs suivants (à adapter selon votre base de données) :
-- PROJECT_ID : Remplacer par l'ID d'un projet existant
-- USER_ID : Remplacer par l'ID d'un utilisateur intervenant

-- Exemple d'insertion de données test
-- ATTENTION : Remplacez les valeurs par les vrais IDs de votre base de données

-- Récupérer un projet existant (remplacez par une valeur réelle)
-- INSERT INTO membre (project_id, user_id, role, added_by, added_at)
-- VALUES (
--   'VOTRE_PROJECT_ID_ICI',  -- Remplacer par un ID de projet réel
--   'VOTRE_USER_ID_ICI',     -- Remplacer par un ID d'utilisateur réel
--   'membre',
--   'VOTRE_ADMIN_ID_ICI',    -- Remplacer par un ID d'admin réel
--   now()
-- );

-- Pour trouver les IDs existants, utilisez ces requêtes :

-- 1. Lister les projets existants
SELECT id, name FROM projects LIMIT 5;

-- 2. Lister les utilisateurs (via auth.users - nécessite des privilèges admin)
-- SELECT id, email FROM auth.users WHERE email NOT LIKE '%admin%' LIMIT 5;

-- 3. Exemple d'insertion avec des valeurs réelles (à adapter)
-- Remplacez les UUID par des valeurs réelles de votre base de données

/*
INSERT INTO membre (project_id, user_id, role, added_by, added_at)
VALUES (
  '12345678-1234-1234-1234-123456789abc',  -- ID du projet
  '87654321-4321-4321-4321-cba987654321',  -- ID de l'intervenant
  'membre',
  '11111111-1111-1111-1111-111111111111',  -- ID de l'admin qui ajoute
  now()
);
*/

-- Vérifier les données existantes dans la table membre
SELECT * FROM membre;

-- Vérifier que les projets et utilisateurs existent
SELECT 
  m.*,
  p.name as project_name
FROM membre m
LEFT JOIN projects p ON m.project_id = p.id; 