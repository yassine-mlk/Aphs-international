
-- Création de la table pour les tickets de support
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'feature_request')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    admin_notes TEXT
);

-- Activation de RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité
-- 1. Les utilisateurs peuvent voir leurs propres tickets
CREATE POLICY "Users can view their own tickets" 
ON public.support_tickets FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Les utilisateurs peuvent créer leurs propres tickets
CREATE POLICY "Users can create their own tickets" 
ON public.support_tickets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Les super-administrateurs peuvent tout voir et tout modifier
CREATE POLICY "Super admins can manage all tickets" 
ON public.support_tickets FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND is_super_admin = true
    )
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
