-- Ajouter les colonnes nécessaires pour la signature électronique par email

-- Token unique pour le lien de signature
ALTER TABLE document_recipients 
ADD COLUMN IF NOT EXISTS signature_token VARCHAR(255);

-- Date d'expiration du token
ALTER TABLE document_recipients 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;

-- Méthode de signature (email_link, platform)
ALTER TABLE document_recipients 
ADD COLUMN IF NOT EXISTS signature_method VARCHAR(50);

-- IP du signataire (pour traçabilité légale)
ALTER TABLE document_recipients 
ADD COLUMN IF NOT EXISTS signature_ip VARCHAR(45);

-- User agent du signataire
ALTER TABLE document_recipients 
ADD COLUMN IF NOT EXISTS signature_user_agent TEXT;

-- Index sur signature_token pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_document_recipients_signature_token 
ON document_recipients(signature_token) 
WHERE signature_token IS NOT NULL;

-- Politique RLS pour permettre l'accès public via token
CREATE POLICY "Allow public access via signature token" ON document_recipients
    FOR SELECT
    TO anon, authenticated
    USING (signature_token IS NOT NULL AND token_expires_at > NOW());

-- Commentaires
COMMENT ON COLUMN document_recipients.signature_token IS 'Token unique pour le lien de signature par email';
COMMENT ON COLUMN document_recipients.token_expires_at IS 'Date d expiration du lien de signature';
COMMENT ON COLUMN document_recipients.signature_method IS 'Methode de signature: email_link ou platform';
COMMENT ON COLUMN document_recipients.signature_ip IS 'Adresse IP du signataire pour traçabilité';
COMMENT ON COLUMN document_recipients.signature_user_agent IS 'User agent du signataire pour traçabilité';
