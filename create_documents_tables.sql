-- Création des tables pour le système de documents avec signature électronique

-- Table pour les documents de projet
CREATE TABLE IF NOT EXISTS project_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    uploaded_by_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour le filtrage par tenant
CREATE INDEX IF NOT EXISTS idx_project_documents_tenant_id ON project_documents(tenant_id);

-- Table pour les destinataires de documents (signature)
CREATE TABLE IF NOT EXISTS document_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'rejected')),
    signed_at TIMESTAMP WITH TIME ZONE,
    signature_url TEXT,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_by ON project_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_document_recipients_document_id ON document_recipients(document_id);
CREATE INDEX IF NOT EXISTS idx_document_recipients_user_id ON document_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_document_recipients_status ON document_recipients(status);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_project_documents_updated_at ON project_documents;
CREATE TRIGGER update_project_documents_updated_at
    BEFORE UPDATE ON project_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_recipients_updated_at ON document_recipients;
CREATE TRIGGER update_document_recipients_updated_at
    BEFORE UPDATE ON document_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Politiques RLS pour project_documents
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all documents" ON project_documents;
CREATE POLICY "Admins can manage all documents"
    ON project_documents
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.is_super_admin = true)
    ));

DROP POLICY IF EXISTS "Project members can view documents" ON project_documents;
CREATE POLICY "Project members can view documents"
    ON project_documents
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM membre
        WHERE membre.project_id = project_documents.project_id
        AND membre.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM document_recipients
        WHERE document_recipients.document_id = project_documents.id
        AND document_recipients.user_id = auth.uid()
    ));

-- Politiques RLS pour document_recipients
ALTER TABLE document_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all recipients" ON document_recipients;
CREATE POLICY "Admins can manage all recipients"
    ON document_recipients
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.is_super_admin = true)
    ));

DROP POLICY IF EXISTS "Users can view their own recipients" ON document_recipients;
CREATE POLICY "Users can view their own recipients"
    ON document_recipients
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own signature" ON document_recipients;
CREATE POLICY "Users can update their own signature"
    ON document_recipients
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Note: Les fichiers sont stockés dans Cloudflare R2 (pas dans Supabase Storage)
-- Les URLs des fichiers sont stockées dans la colonne file_url de project_documents
