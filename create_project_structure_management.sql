-- =========================================
-- SYSTÈME DE GESTION DE STRUCTURE DE PROJET PERSONNALISÉE
-- Script à exécuter dans Supabase SQL Editor
-- Permet de personnaliser et synchroniser les structures de projet
-- =========================================

-- =========================================
-- 1. TABLE POUR STOCKER LES STRUCTURES PERSONNALISÉES
-- =========================================

CREATE TABLE IF NOT EXISTS custom_project_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id TEXT NOT NULL CHECK (phase_id IN ('conception', 'realisation')),
    section_id TEXT NOT NULL,
    subsection_id TEXT,
    is_deleted BOOLEAN DEFAULT false,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte pour éviter les doublons
    UNIQUE(project_id, phase_id, section_id, subsection_id)
);

-- =========================================
-- 2. INDEX POUR OPTIMISER LES PERFORMANCES
-- =========================================

CREATE INDEX IF NOT EXISTS idx_custom_project_structures_project_id ON custom_project_structures(project_id);
CREATE INDEX IF NOT EXISTS idx_custom_project_structures_phase_id ON custom_project_structures(phase_id);
CREATE INDEX IF NOT EXISTS idx_custom_project_structures_is_deleted ON custom_project_structures(is_deleted);
CREATE INDEX IF NOT EXISTS idx_custom_project_structures_deleted_by ON custom_project_structures(deleted_by);

-- =========================================
-- 3. FONCTIONS POUR GÉRER LES STRUCTURES
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
    -- Supprimer l'entrée de suppression ou la marquer comme non supprimée
    DELETE FROM custom_project_structures
    WHERE project_id = p_project_id
      AND phase_id = p_phase_id
      AND section_id = p_section_id
      AND (subsection_id = p_subsection_id OR (subsection_id IS NULL AND p_subsection_id IS NULL))
      AND is_deleted = true;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour récupérer la structure personnalisée d'un projet
CREATE OR REPLACE FUNCTION get_project_custom_structure(
    p_project_id UUID
)
RETURNS TABLE (
    phase_id TEXT,
    section_id TEXT,
    subsection_id TEXT,
    is_deleted BOOLEAN,
    deleted_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cps.phase_id,
        cps.section_id,
        cps.subsection_id,
        cps.is_deleted,
        cps.deleted_by,
        cps.deleted_at
    FROM custom_project_structures cps
    WHERE cps.project_id = p_project_id
    ORDER BY cps.phase_id, cps.section_id, cps.subsection_id;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- 4. POLITIQUES DE SÉCURITÉ RLS
-- =========================================

-- Activer RLS sur la table
ALTER TABLE custom_project_structures ENABLE ROW LEVEL SECURITY;

-- Politique pour les admins : accès complet
CREATE POLICY "Admins can manage custom project structures" ON custom_project_structures
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND (
                email = 'admin@aphs.com' 
                OR raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- Politique pour les intervenants : lecture seule
CREATE POLICY "Intervenants can view custom project structures" ON custom_project_structures
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM membre 
            WHERE membre.project_id = custom_project_structures.project_id 
            AND membre.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM task_assignments 
            WHERE task_assignments.project_id = custom_project_structures.project_id 
            AND task_assignments.assigned_to = auth.uid()
        )
    );

-- =========================================
-- 5. MIGRATION DES DONNÉES EXISTANTES
-- =========================================

-- Cette fonction peut être utilisée pour migrer les suppressions existantes
-- si nécessaire (à adapter selon les besoins)

-- =========================================
-- 6. TRIGGERS POUR METTRE À JOUR LES TIMESTAMPS
-- =========================================

CREATE OR REPLACE FUNCTION update_custom_project_structures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_custom_project_structures_updated_at
    BEFORE UPDATE ON custom_project_structures
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_project_structures_updated_at();

-- =========================================
-- 7. COMMENTAIRES POUR LA DOCUMENTATION
-- =========================================

COMMENT ON TABLE custom_project_structures IS 'Stocke les personnalisations de structure de projet (sections/sous-sections supprimées)';
COMMENT ON COLUMN custom_project_structures.project_id IS 'ID du projet concerné';
COMMENT ON COLUMN custom_project_structures.phase_id IS 'Phase du projet (conception ou realisation)';
COMMENT ON COLUMN custom_project_structures.section_id IS 'ID de la section (A, B, C, etc.)';
COMMENT ON COLUMN custom_project_structures.subsection_id IS 'ID de la sous-section (A1, A2, etc.) - NULL si suppression de section complète';
COMMENT ON COLUMN custom_project_structures.is_deleted IS 'Indique si l''élément est supprimé (true) ou restauré (false)';
COMMENT ON COLUMN custom_project_structures.deleted_by IS 'ID de l''utilisateur qui a effectué la suppression';
COMMENT ON COLUMN custom_project_structures.deleted_at IS 'Timestamp de la suppression'; 