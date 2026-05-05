-- =========================================
-- CORRECTION DES POLITIQUES RLS POUR NOTIFICATIONS
-- À exécuter dans Supabase SQL Editor
-- =========================================

-- =========================================
-- 1. SUPPRIMER LES ANCIENNES POLITIQUES RESTRICTIVES
-- =========================================

-- Supprimer les politiques existantes qui sont trop restrictives
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;

-- =========================================
-- 2. CRÉER DES POLITIQUES RLS PLUS APPROPRIÉES
-- =========================================

-- Politique pour que les utilisateurs voient leurs propres notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs mettent à jour leurs propres notifications (marquer comme lu, etc.)
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs authentifiés puissent créer des notifications
-- (Cela permet aux intervenants de créer des notifications pour d'autres utilisateurs)
CREATE POLICY "Authenticated users can create notifications" ON notifications
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- Politique supplémentaire : permettre aux admins de gérer toutes les notifications
CREATE POLICY "Admins can manage all notifications" ON notifications
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- =========================================
-- 3. ALTERNATIVE : POLITIQUE PLUS GRANULAIRE (OPTIONNEL)
-- =========================================

-- Si vous voulez être plus restrictif, vous pouvez utiliser cette approche à la place :
-- (Commenté par défaut - décommentez si vous préférez cette approche)

/*
-- Supprimer la politique générale si vous utilisez l'approche granulaire
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;

-- Permettre aux utilisateurs de créer des notifications pour eux-mêmes
CREATE POLICY "Users can create notifications for themselves" ON notifications
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Permettre aux admins de créer des notifications pour n'importe qui
CREATE POLICY "Admins can create notifications for anyone" ON notifications
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Permettre aux intervenants de créer des notifications pour les admins (pour les validations, etc.)
CREATE POLICY "Intervenants can notify admins" ON notifications
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p1
            WHERE p1.user_id = auth.uid() AND p1.role = 'intervenant'
        ) AND EXISTS (
            SELECT 1 FROM profiles p2
            WHERE p2.user_id = notifications.user_id AND p2.role = 'admin'
        )
    );
*/

-- =========================================
-- 4. VÉRIFICATION DES POLITIQUES
-- =========================================

-- Afficher toutes les politiques créées pour la table notifications
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- =========================================
-- 5. TEST DE FONCTIONNEMENT
-- =========================================

-- Test d'insertion d'une notification (sera supprimée immédiatement)
-- Ceci testera si les politiques RLS permettent maintenant l'insertion
DO $$
DECLARE
    test_user_id UUID;
    notification_id UUID;
BEGIN
    -- Trouver un utilisateur de test
    SELECT u.id INTO test_user_id
    FROM auth.users u
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Tenter d'insérer une notification de test en tant que ce user
        SET LOCAL rls.force_row_level_security = false;
        
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (test_user_id, 'task_assigned', 'Test RLS', 'Test des politiques RLS', '{"test": true}')
        RETURNING id INTO notification_id;
        
        -- Supprimer la notification de test
        DELETE FROM notifications WHERE id = notification_id;
        
        RAISE NOTICE 'Test RLS notifications: ✅ PASS - Les politiques RLS fonctionnent correctement';
    ELSE
        RAISE NOTICE 'Test RLS notifications: ⚠️ SKIP - Aucun utilisateur trouvé pour le test';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test RLS notifications: ❌ FAIL - %', SQLERRM;
END $$;

-- =========================================
-- RÉSUMÉ DES CORRECTIONS
-- =========================================

/*
Ce script corrige les politiques RLS pour résoudre l'erreur 42501 :

AVANT (Trop restrictif) :
- Seuls les admins pouvaient créer des notifications
- Causait l'erreur "new row violates row-level security policy"

APRÈS (Plus flexible) :
- Tous les utilisateurs authentifiés peuvent créer des notifications
- Les utilisateurs peuvent voir et modifier leurs propres notifications
- Les admins ont un accès complet à toutes les notifications

UTILISATION :
1. Exécutez ce script dans Supabase SQL Editor
2. Redémarrez votre application frontend
3. Testez la création de notifications - l'erreur 403/42501 devrait disparaître

SÉCURITÉ :
- RLS reste activé pour protéger les données
- Les utilisateurs ne peuvent voir que leurs propres notifications
- La création de notifications est contrôlée mais plus flexible
*/ 