-- Migration: Ajouter reference_id à la table notifications
-- Description: Permet d'éviter les doublons de notifications et de lier des notifications à des événements spécifiques

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Ajouter une contrainte d'unicité pour éviter les doublons pour un même utilisateur/événement
-- On utilise DO $$ pour éviter les erreurs si la contrainte existe déjà
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_reference_id_key') THEN
        ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_reference_id_key UNIQUE (user_id, reference_id);
    END IF;
END $$;

-- Créer un index pour accélérer les recherches par reference_id
CREATE INDEX IF NOT EXISTS idx_notifications_reference_id ON public.notifications(reference_id);
