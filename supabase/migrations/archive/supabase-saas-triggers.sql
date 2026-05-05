-- ============================================================================
-- TRIGGERS POUR METTRE À JOUR LES COMPTEURS AUTOMATIQUEMENT
-- ============================================================================

-- 1. TRIGGER: Mettre à jour le compteur de projets
CREATE OR REPLACE FUNCTION update_project_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tenants 
        SET current_projects_count = current_projects_count + 1,
            updated_at = NOW()
        WHERE id = NEW.tenant_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tenants 
        SET current_projects_count = GREATEST(current_projects_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.tenant_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_count_trigger ON projects;
CREATE TRIGGER project_count_trigger
    AFTER INSERT OR DELETE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_count();

-- 2. TRIGGER: Mettre à jour le compteur d'intervenants (membre table)
CREATE OR REPLACE FUNCTION update_intervenant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tenants 
        SET current_intervenants_count = current_intervenants_count + 1,
            updated_at = NOW()
        WHERE id = NEW.tenant_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tenants 
        SET current_intervenants_count = GREATEST(current_intervenants_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.tenant_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS intervenant_count_trigger ON membre;
CREATE TRIGGER intervenant_count_trigger
    AFTER INSERT OR DELETE ON membre
    FOR EACH ROW
    EXECUTE FUNCTION update_intervenant_count();

-- 3. TRIGGER: Mettre à jour le compteur de membres de tenant
CREATE OR REPLACE FUNCTION update_tenant_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tenants 
        SET current_intervenants_count = current_intervenants_count + 1,
            updated_at = NOW()
        WHERE id = NEW.tenant_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tenants 
        SET current_intervenants_count = GREATEST(current_intervenants_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.tenant_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_member_count_trigger ON tenant_members;
CREATE TRIGGER tenant_member_count_trigger
    AFTER INSERT OR DELETE ON tenant_members
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_member_count();

-- 4. SYNCHRONISER LES COMPTES ACTUELS (recalculer à partir des données existantes)
-- Mettre à jour les compteurs pour tous les tenants
UPDATE tenants t
SET 
    current_projects_count = (SELECT COUNT(*) FROM projects p WHERE p.tenant_id = t.id),
    current_intervenants_count = COALESCE(
        (SELECT COUNT(*) FROM membre m WHERE m.tenant_id = t.id), 0
    ) + COALESCE(
        (SELECT COUNT(*) FROM tenant_members tm WHERE tm.tenant_id = t.id), 0
    ),
    updated_at = NOW();

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
SELECT 
    name,
    current_projects_count as projets,
    max_projects as projets_max,
    current_intervenants_count as intervenants,
    max_intervenants as intervenants_max
FROM tenants;
