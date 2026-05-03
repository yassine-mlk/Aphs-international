-- =========================================
-- MISE À JOUR DU SYSTÈME DE NOTIFICATIONS
-- =========================================

-- 1. Table system_settings pour les paramètres globaux
CREATE TABLE IF NOT EXISTS system_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email_notifications_enabled boolean DEFAULT true,
    updated_at timestamptz DEFAULT now()
);

-- Insérer les paramètres par défaut s'ils n'existent pas
INSERT INTO system_settings (email_notifications_enabled)
SELECT true WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- Activer RLS pour system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les paramètres
DROP POLICY IF EXISTS "Anyone can read system settings" ON system_settings;
CREATE POLICY "Anyone can read system settings" 
ON system_settings FOR SELECT 
USING (true);

-- Seuls les admins peuvent modifier les paramètres
DROP POLICY IF EXISTS "Admins can update system settings" ON system_settings;
CREATE POLICY "Admins can update system settings" 
ON system_settings FOR UPDATE 
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- 2. Recréer/Ajuster la table notifications
-- On supprime l'ancienne si elle existe pour repartir sur la structure demandée
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications ( 
   id uuid DEFAULT gen_random_uuid() PRIMARY KEY, 
   user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE, 
   tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
   type text NOT NULL, 
   title text NOT NULL, 
   message text NOT NULL, 
   link text,        -- lien vers la page concernée 
   data jsonb DEFAULT '{}'::jsonb, -- données additionnelles (ex: task_id, submission_id)
   is_read boolean DEFAULT false, 
   created_at timestamptz DEFAULT now() 
); 

-- Activer RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY; 

-- Politique : les utilisateurs ne voient que leurs notifications
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id); 

-- Politique : les utilisateurs peuvent marquer leurs notifications comme lues
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Politique : RLS pour tenant
DROP POLICY IF EXISTS "Tenant isolation for notifications" ON notifications;
CREATE POLICY "Tenant isolation for notifications"
ON notifications FOR ALL
USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));

-- Politique : permettre l'insertion par le système (via service_role ou si on est authentifié)
DROP POLICY IF EXISTS "Allow authenticated to insert notifications" ON notifications;
CREATE POLICY "Allow authenticated to insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (true);

-- 3. Activer Realtime pour notifications
-- Vérifier si la publication existe déjà
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Ajouter la table à la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
