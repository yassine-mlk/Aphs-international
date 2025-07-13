-- Script pour ajouter les colonnes de traduction à la table notifications
-- Exécuter ce script dans l'éditeur SQL de Supabase

-- Ajouter les colonnes pour les clés de traduction
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS title_key TEXT,
ADD COLUMN IF NOT EXISTS message_key TEXT,
ADD COLUMN IF NOT EXISTS title_params JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS message_params JSONB DEFAULT '{}';

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN notifications.title_key IS 'Clé de traduction pour le titre de la notification';
COMMENT ON COLUMN notifications.message_key IS 'Clé de traduction pour le message de la notification';
COMMENT ON COLUMN notifications.title_params IS 'Paramètres JSON pour le formatage du titre traduit';
COMMENT ON COLUMN notifications.message_params IS 'Paramètres JSON pour le formatage du message traduit';

-- Mettre à jour les notifications existantes avec les clés de traduction
UPDATE notifications 
SET 
  title_key = type,
  message_key = type,
  title_params = '{}',
  message_params = '{}'
WHERE title_key IS NULL OR message_key IS NULL;

-- Créer un index pour améliorer les performances des requêtes sur les clés de traduction
CREATE INDEX IF NOT EXISTS idx_notifications_title_key ON notifications(title_key);
CREATE INDEX IF NOT EXISTS idx_notifications_message_key ON notifications(message_key);

-- Afficher un message de succès
SELECT 'Schéma de la table notifications mis à jour avec succès pour les traductions' AS message; 