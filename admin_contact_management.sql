-- =========================================
-- SYSTÈME DE GESTION DES CONTACTS PAR L'ADMIN
-- Script à exécuter dans Supabase Dashboard
-- =========================================

-- =========================================
-- ÉTAPE 1: CRÉATION DE LA TABLE DE GESTION DES CONTACTS
-- =========================================

-- Table pour gérer les permissions de contact entre utilisateurs
CREATE TABLE IF NOT EXISTS user_contact_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- L'utilisateur qui peut voir le contact
    contact_id UUID NOT NULL, -- L'utilisateur qui peut être contacté
    granted_by UUID NOT NULL, -- L'admin qui a accordé la permission
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_by UUID, -- L'admin qui a révoqué la permission (si applicable)
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE, -- Si la permission est active
    notes TEXT, -- Notes de l'admin
    UNIQUE(user_id, contact_id)
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_user_contact_permissions_user_id ON user_contact_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contact_permissions_contact_id ON user_contact_permissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_user_contact_permissions_granted_by ON user_contact_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_user_contact_permissions_is_active ON user_contact_permissions(is_active);

-- =========================================
-- ÉTAPE 2: FONCTIONS RPC POUR L'ADMIN
-- =========================================

-- Fonction pour l'admin : Accorder une permission de contact
CREATE OR REPLACE FUNCTION admin_grant_contact_permission(
    p_user_id UUID, -- L'utilisateur qui peut voir le contact
    p_contact_id UUID, -- L'utilisateur qui peut être contacté
    p_admin_id UUID, -- L'admin qui accorde la permission
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérifier que l'admin existe et a le rôle admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = p_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Seuls les administrateurs peuvent accorder des permissions de contact';
    END IF;
    
    -- Vérifier que les utilisateurs existent
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'Utilisateur non trouvé: %', p_user_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = p_contact_id) THEN
        RAISE EXCEPTION 'Contact non trouvé: %', p_contact_id;
    END IF;
    
    -- Vérifier que l'utilisateur et le contact ne sont pas les mêmes
    IF p_user_id = p_contact_id THEN
        RAISE EXCEPTION 'Un utilisateur ne peut pas se contacter lui-même';
    END IF;
    
    -- Insérer ou mettre à jour la permission
    INSERT INTO user_contact_permissions (user_id, contact_id, granted_by, notes)
    VALUES (p_user_id, p_contact_id, p_admin_id, p_notes)
    ON CONFLICT (user_id, contact_id) 
    DO UPDATE SET 
        granted_by = p_admin_id,
        granted_at = NOW(),
        revoked_by = NULL,
        revoked_at = NULL,
        is_active = TRUE,
        notes = COALESCE(p_notes, user_contact_permissions.notes);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour l'admin : Révoquer une permission de contact
CREATE OR REPLACE FUNCTION admin_revoke_contact_permission(
    p_user_id UUID, -- L'utilisateur qui ne peut plus voir le contact
    p_contact_id UUID, -- L'utilisateur qui ne peut plus être contacté
    p_admin_id UUID -- L'admin qui révoque la permission
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérifier que l'admin existe et a le rôle admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = p_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Seuls les administrateurs peuvent révoquer des permissions de contact';
    END IF;
    
    -- Mettre à jour la permission pour la révoquer
    UPDATE user_contact_permissions 
    SET 
        revoked_by = p_admin_id,
        revoked_at = NOW(),
        is_active = FALSE
    WHERE user_id = p_user_id 
    AND contact_id = p_contact_id
    AND is_active = TRUE;
    
    -- Vérifier si une ligne a été mise à jour
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Permission de contact non trouvée ou déjà révoquée';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour l'admin : Obtenir toutes les permissions de contact
CREATE OR REPLACE FUNCTION admin_get_all_contact_permissions()
RETURNS TABLE (
    permission_id UUID,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    contact_id UUID,
    contact_email TEXT,
    contact_name TEXT,
    granted_by UUID,
    granted_by_email TEXT,
    granted_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID,
    revoked_by_email TEXT,
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ucp.id as permission_id,
        ucp.user_id,
        u.email as user_email,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as user_name,
        ucp.contact_id,
        c.email as contact_email,
        CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as contact_name,
        ucp.granted_by,
        g.email as granted_by_email,
        ucp.granted_at,
        ucp.revoked_by,
        r.email as revoked_by_email,
        ucp.revoked_at,
        ucp.is_active,
        ucp.notes
    FROM user_contact_permissions ucp
    LEFT JOIN profiles u ON ucp.user_id = u.user_id
    LEFT JOIN profiles c ON ucp.contact_id = c.user_id
    LEFT JOIN profiles g ON ucp.granted_by = g.user_id
    LEFT JOIN profiles r ON ucp.revoked_by = r.user_id
    ORDER BY ucp.granted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour l'admin : Obtenir les permissions d'un utilisateur spécifique
CREATE OR REPLACE FUNCTION admin_get_user_contact_permissions(p_user_id UUID)
RETURNS TABLE (
    permission_id UUID,
    contact_id UUID,
    contact_email TEXT,
    contact_name TEXT,
    granted_by UUID,
    granted_by_email TEXT,
    granted_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID,
    revoked_by_email TEXT,
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ucp.id as permission_id,
        ucp.contact_id,
        c.email as contact_email,
        CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as contact_name,
        ucp.granted_by,
        g.email as granted_by_email,
        ucp.granted_at,
        ucp.revoked_by,
        r.email as revoked_by_email,
        ucp.revoked_at,
        ucp.is_active,
        ucp.notes
    FROM user_contact_permissions ucp
    LEFT JOIN profiles c ON ucp.contact_id = c.user_id
    LEFT JOIN profiles g ON ucp.granted_by = g.user_id
    LEFT JOIN profiles r ON ucp.revoked_by = r.user_id
    WHERE ucp.user_id = p_user_id
    ORDER BY ucp.granted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- ÉTAPE 3: MODIFICATION DE LA FONCTION GET_AVAILABLE_CONTACTS
-- =========================================

-- Nouvelle fonction pour obtenir les contacts disponibles (avec gestion admin)
CREATE OR REPLACE FUNCTION get_available_contacts_admin(p_user_id UUID)
RETURNS TABLE (
    contact_id UUID,
    contact_email TEXT,
    contact_first_name TEXT,
    contact_last_name TEXT,
    contact_role TEXT,
    contact_specialty TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.user_id as contact_id,
        p.email as contact_email,
        p.first_name as contact_first_name,
        p.last_name as contact_last_name,
        p.role as contact_role,
        p.specialty as contact_specialty
    FROM profiles p
    INNER JOIN user_contact_permissions ucp ON p.user_id = ucp.contact_id
    WHERE ucp.user_id = p_user_id
    AND ucp.is_active = TRUE
    AND p.status = 'active'
    AND p.user_id != p_user_id
    ORDER BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- ÉTAPE 4: FONCTIONS UTILITAIRES
-- =========================================

-- Fonction pour obtenir les utilisateurs disponibles pour l'admin
CREATE OR REPLACE FUNCTION admin_get_all_users_for_contact_management()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT,
    specialty TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.email,
        p.first_name,
        p.last_name,
        p.role,
        p.specialty,
        p.status
    FROM profiles p
    WHERE p.role != 'admin' -- Exclure les admins
    AND p.status = 'active'
    ORDER BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques de permissions
CREATE OR REPLACE FUNCTION admin_get_contact_permissions_stats()
RETURNS TABLE (
    total_permissions INTEGER,
    active_permissions INTEGER,
    revoked_permissions INTEGER,
    total_users INTEGER,
    users_with_permissions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM user_contact_permissions) as total_permissions,
        (SELECT COUNT(*) FROM user_contact_permissions WHERE is_active = TRUE) as active_permissions,
        (SELECT COUNT(*) FROM user_contact_permissions WHERE is_active = FALSE) as revoked_permissions,
        (SELECT COUNT(*) FROM profiles WHERE role != 'admin' AND status = 'active') as total_users,
        (SELECT COUNT(DISTINCT user_id) FROM user_contact_permissions WHERE is_active = TRUE) as users_with_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- ÉTAPE 5: POLITIQUES DE SÉCURITÉ (RLS)
-- =========================================

-- Activer RLS sur la table
ALTER TABLE user_contact_permissions ENABLE ROW LEVEL SECURITY;

-- Politique : Seuls les admins peuvent voir toutes les permissions
CREATE POLICY "Admins can view all contact permissions" ON user_contact_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Politique : Seuls les admins peuvent insérer des permissions
CREATE POLICY "Admins can insert contact permissions" ON user_contact_permissions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Politique : Seuls les admins peuvent mettre à jour des permissions
CREATE POLICY "Admins can update contact permissions" ON user_contact_permissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Politique : Les utilisateurs peuvent voir leurs propres permissions actives
CREATE POLICY "Users can view their own active permissions" ON user_contact_permissions
    FOR SELECT USING (
        user_id = auth.uid() AND is_active = TRUE
    );

-- =========================================
-- ÉTAPE 6: TRIGGERS POUR LA MAINTENANCE
-- =========================================

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_user_contact_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.granted_at = COALESCE(NEW.granted_at, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_contact_permissions_updated_at
    BEFORE INSERT OR UPDATE ON user_contact_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_contact_permissions_updated_at();

-- =========================================
-- ÉTAPE 7: DONNÉES DE TEST (OPTIONNEL)
-- =========================================

-- Insérer quelques permissions de test (à adapter selon vos besoins)
-- INSERT INTO user_contact_permissions (user_id, contact_id, granted_by, notes)
-- SELECT 
--     u1.user_id,
--     u2.user_id,
--     (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1),
--     'Permission de test'
-- FROM profiles u1
-- CROSS JOIN profiles u2
-- WHERE u1.role != 'admin' 
-- AND u2.role != 'admin'
-- AND u1.user_id != u2.user_id
-- AND u1.status = 'active'
-- AND u2.status = 'active'
-- LIMIT 10;

-- =========================================
-- MESSAGE DE CONFIRMATION
-- =========================================

DO $$
BEGIN
    RAISE NOTICE '✅ Système de gestion des contacts par admin installé avec succès!';
    RAISE NOTICE '📋 Tables créées: user_contact_permissions';
    RAISE NOTICE '🔧 Fonctions RPC créées:';
    RAISE NOTICE '   - admin_grant_contact_permission()';
    RAISE NOTICE '   - admin_revoke_contact_permission()';
    RAISE NOTICE '   - admin_get_all_contact_permissions()';
    RAISE NOTICE '   - admin_get_user_contact_permissions()';
    RAISE NOTICE '   - get_available_contacts_admin()';
    RAISE NOTICE '   - admin_get_all_users_for_contact_management()';
    RAISE NOTICE '   - admin_get_contact_permissions_stats()';
    RAISE NOTICE '🔐 Politiques RLS configurées';
    RAISE NOTICE '⚡ Triggers installés';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Prochaines étapes:';
    RAISE NOTICE '1. Créer l''interface admin pour gérer les contacts';
    RAISE NOTICE '2. Modifier le hook useMessages pour utiliser get_available_contacts_admin()';
    RAISE NOTICE '3. Tester le système avec quelques permissions';
END $$; 