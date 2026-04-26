-- =========================================
-- FIX: CASCADE DELETION FOR WORKGROUP CONVERSATIONS
-- =========================================

-- S'assurer que la suppression d'un workgroup supprime sa conversation associée
-- en renforçant la contrainte de clé étrangère avec ON DELETE CASCADE

DO $$
BEGIN
    -- 1. Supprimer l'ancienne contrainte si elle existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_workgroup_id_fkey' 
        AND table_name = 'conversations'
    ) THEN
        ALTER TABLE conversations DROP CONSTRAINT conversations_workgroup_id_fkey;
    END IF;

    -- 2. Ajouter la nouvelle contrainte avec ON DELETE CASCADE
    ALTER TABLE conversations 
    ADD CONSTRAINT conversations_workgroup_id_fkey 
    FOREIGN KEY (workgroup_id) 
    REFERENCES workgroups(id) 
    ON DELETE CASCADE;

    RAISE NOTICE 'Contrainte CASCADE ajoutée avec succès sur conversations.workgroup_id';
END $$;

-- 3. Vérification de sécurité: Trigger de secours si le cascade ne suffit pas
-- (Par exemple si workgroup_id est mis à NULL au lieu d'être supprimé)

CREATE OR REPLACE FUNCTION handle_workgroup_deletion_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    -- Supprimer la conversation de type 'workgroup' associée
    DELETE FROM conversations 
    WHERE workgroup_id = OLD.id 
    AND type = 'workgroup';
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_cleanup_workgroup_conversation ON workgroups;
CREATE TRIGGER trigger_cleanup_workgroup_conversation
    BEFORE DELETE ON workgroups
    FOR EACH ROW
    EXECUTE FUNCTION handle_workgroup_deletion_cleanup();

SELECT '✅ Système de suppression en cascade pour les workgroups mis à jour' as status;
