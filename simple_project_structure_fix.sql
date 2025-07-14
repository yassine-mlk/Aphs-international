-- =========================================
-- SOLUTION SIMPLE POUR LA GESTION DE STRUCTURE DE PROJET
-- Script alternatif pour éviter les problèmes de permissions RLS
-- =========================================

-- Supprimer la table existante si elle existe
DROP TABLE IF EXISTS custom_project_structures CASCADE;

-- =========================================
-- 1. CRÉER LA TABLE SANS RLS (PLUS SIMPLE)
-- =========================================

CREATE TABLE custom_project_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id TEXT NOT NULL CHECK (phase_id IN ('conception', 'realisation')),
    section_id TEXT NOT NULL,
    subsection_id TEXT,
    is_deleted BOOLEAN DEFAULT false,
    deleted_by UUID NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte pour éviter les doublons
    UNIQUE(project_id, phase_id, section_id, subsection_id)
);

-- =========================================
-- 2. CRÉER LES INDEX
-- =========================================

CREATE INDEX idx_custom_project_structures_project_id ON custom_project_structures(project_id);
CREATE INDEX idx_custom_project_structures_phase_id ON custom_project_structures(phase_id);
CREATE INDEX idx_custom_project_structures_is_deleted ON custom_project_structures(is_deleted);
CREATE INDEX idx_custom_project_structures_deleted_by ON custom_project_structures(deleted_by);

-- =========================================
-- 3. FONCTIONS SIMPLIFIÉES
-- =========================================

-- Fonction pour supprimer une section complète
CREATE OR REPLACE FUNCTION delete_project_section(
    p_project_id UUID,
    p_phase_id TEXT,
    p_section_id TEXT,
    p_deleted_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Marquer la section comme supprimée
    INSERT INTO custom_project_structures (
        project_id, phase_id, section_id, subsection_id, 
        is_deleted, deleted_by, deleted_at
    )
    VALUES (
        p_project_id, p_phase_id, p_section_id, NULL,
        true, p_deleted_by, NOW()
    )
    ON CONFLICT (project_id, phase_id, section_id, subsection_id)
    DO UPDATE SET
        is_deleted = true,
        deleted_by = p_deleted_by,
        deleted_at = NOW(),
        updated_at = NOW();
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour supprimer une sous-section
CREATE OR REPLACE FUNCTION delete_project_subsection(
    p_project_id UUID,
    p_phase_id TEXT,
    p_section_id TEXT,
    p_subsection_id TEXT,
    p_deleted_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Marquer la sous-section comme supprimée
    INSERT INTO custom_project_structures (
        project_id, phase_id, section_id, subsection_id, 
        is_deleted, deleted_by, deleted_at
    )
    VALUES (
        p_project_id, p_phase_id, p_section_id, p_subsection_id,
        true, p_deleted_by, NOW()
    )
    ON CONFLICT (project_id, phase_id, section_id, subsection_id)
    DO UPDATE SET
        is_deleted = true,
        deleted_by = p_deleted_by,
        deleted_at = NOW(),
        updated_at = NOW();
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour restaurer une section ou sous-section
CREATE OR REPLACE FUNCTION restore_project_structure(
    p_project_id UUID,
    p_phase_id TEXT,
    p_section_id TEXT,
    p_subsection_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Supprimer l'entrée de suppression
    DELETE FROM custom_project_structures
    WHERE project_id = p_project_id
      AND phase_id = p_phase_id
      AND section_id = p_section_id
      AND (subsection_id = p_subsection_id OR (subsection_id IS NULL AND p_subsection_id IS NULL))
      AND is_deleted = true;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- 4. ACCORDER LES PERMISSIONS COMPLÈTES
-- =========================================

-- Accorder tous les droits à tous les utilisateurs authentifiés
GRANT ALL ON custom_project_structures TO authenticated;
GRANT ALL ON custom_project_structures TO anon;

-- Accorder les droits d'exécution sur les fonctions
GRANT EXECUTE ON FUNCTION delete_project_section(UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_project_subsection(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_project_structure(UUID, TEXT, TEXT, TEXT) TO authenticated;

GRANT EXECUTE ON FUNCTION delete_project_section(UUID, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION delete_project_subsection(UUID, TEXT, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION restore_project_structure(UUID, TEXT, TEXT, TEXT) TO anon;

-- =========================================
-- 5. DÉSACTIVER RLS (TEMPORAIREMENT)
-- =========================================

-- Désactiver RLS pour éviter les problèmes de permissions
ALTER TABLE custom_project_structures DISABLE ROW LEVEL SECURITY;

-- =========================================
-- 6. TRIGGER POUR METTRE À JOUR LES TIMESTAMPS
-- =========================================

CREATE OR REPLACE FUNCTION update_custom_project_structures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_custom_project_structures_updated_at ON custom_project_structures;
CREATE TRIGGER trigger_update_custom_project_structures_updated_at
    BEFORE UPDATE ON custom_project_structures
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_project_structures_updated_at();

-- =========================================
-- 7. TESTS DE FONCTIONNEMENT
-- =========================================

-- Test d'insertion
INSERT INTO custom_project_structures (project_id, phase_id, section_id, subsection_id, is_deleted, deleted_by)
VALUES ('00000000-0000-0000-0000-000000000000', 'conception', 'TEST', 'TEST1', true, '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

-- Test de suppression
DELETE FROM custom_project_structures WHERE section_id = 'TEST';

-- Afficher le statut
SELECT 'Table custom_project_structures créée avec succès' as status;

-- =========================================
-- 8. COMMENTAIRES
-- =========================================

COMMENT ON TABLE custom_project_structures IS 'Stocke les personnalisations de structure de projet (sections/sous-sections supprimées) - Version simplifiée sans RLS';
COMMENT ON COLUMN custom_project_structures.project_id IS 'ID du projet concerné';
COMMENT ON COLUMN custom_project_structures.phase_id IS 'Phase du projet (conception ou realisation)';
COMMENT ON COLUMN custom_project_structures.section_id IS 'ID de la section (A, B, C, etc.)';
COMMENT ON COLUMN custom_project_structures.subsection_id IS 'ID de la sous-section (A1, A2, etc.) - NULL si suppression de section complète';
COMMENT ON COLUMN custom_project_structures.is_deleted IS 'Indique si l''élément est supprimé (true) ou restauré (false)';
COMMENT ON COLUMN custom_project_structures.deleted_by IS 'ID de l''utilisateur qui a effectué la suppression';
COMMENT ON COLUMN custom_project_structures.deleted_at IS 'Timestamp de la suppression'; 