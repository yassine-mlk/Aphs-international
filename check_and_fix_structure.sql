-- ============================================================
-- Vérification et correction de la structure des projets
-- ============================================================

-- 1. Vérifier si les tables snapshot existent
DO $$
BEGIN
  -- Créer les tables si elles n'existent pas
  CREATE TABLE IF NOT EXISTS public.project_sections_snapshot (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    phase           TEXT NOT NULL CHECK (phase IN ('conception','realisation')),
    order_index     INTEGER NOT NULL DEFAULT 0,
    tenant_section_id UUID
  );

  CREATE TABLE IF NOT EXISTS public.project_items_snapshot (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    section_id      UUID NOT NULL REFERENCES public.project_sections_snapshot(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    order_index     INTEGER NOT NULL DEFAULT 0,
    tenant_item_id  UUID
  );

  CREATE TABLE IF NOT EXISTS public.project_tasks_snapshot (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    item_id         UUID NOT NULL REFERENCES public.project_items_snapshot(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    order_index     INTEGER NOT NULL DEFAULT 0,
    tenant_task_id  UUID,
    info_sheet      TEXT NOT NULL DEFAULT ''
  );

  -- Index
  CREATE INDEX IF NOT EXISTS idx_pss_proj ON public.project_sections_snapshot(project_id, phase);
  CREATE INDEX IF NOT EXISTS idx_pis_sec ON public.project_items_snapshot(section_id);
  CREATE INDEX IF NOT EXISTS idx_pts_item ON public.project_tasks_snapshot(item_id);
  CREATE INDEX IF NOT EXISTS idx_pts_proj ON public.project_tasks_snapshot(project_id);

  -- RLS
  ALTER TABLE public.project_sections_snapshot ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.project_items_snapshot ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.project_tasks_snapshot ENABLE ROW LEVEL SECURITY;

  -- Supprimer les anciennes politiques si elles existent
  DROP POLICY IF EXISTS "Allow all authenticated users" ON public.project_sections_snapshot;
  DROP POLICY IF EXISTS "Allow all authenticated users" ON public.project_items_snapshot;
  DROP POLICY IF EXISTS "Allow all authenticated users" ON public.project_tasks_snapshot;

  -- Créer les politiques
  CREATE POLICY "Allow all authenticated users" ON public.project_sections_snapshot
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

  CREATE POLICY "Allow all authenticated users" ON public.project_items_snapshot
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

  CREATE POLICY "Allow all authenticated users" ON public.project_tasks_snapshot
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

END $$;

-- 2. Fonction pour créer des snapshots pour tous les projets existants sans snapshot
CREATE OR REPLACE FUNCTION create_snapshots_for_existing_projects()
RETURNS TABLE (project_id UUID, success BOOLEAN, message TEXT) AS $$
DECLARE
  proj RECORD;
  section_record RECORD;
  item_record RECORD;
  task_record RECORD;
  new_section_id UUID;
  new_item_id UUID;
  info_sheet_text TEXT;
  task_count INTEGER := 0;
BEGIN
  FOR proj IN 
    SELECT p.id, p.tenant_id 
    FROM public.projects p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.project_sections_snapshot s WHERE s.project_id = p.id
    )
  LOOP
    BEGIN
      -- Vérifier si le tenant a une structure
      IF NOT EXISTS (SELECT 1 FROM public.tenant_project_sections WHERE tenant_id = proj.tenant_id LIMIT 1) THEN
        RETURN QUERY SELECT proj.id, false, 'Pas de structure tenant pour ce projet'::TEXT;
        CONTINUE;
      END IF;

      task_count := 0;

      -- Copier les sections
      FOR section_record IN 
        SELECT id, title, phase, order_index 
        FROM public.tenant_project_sections 
        WHERE tenant_id = proj.tenant_id
      LOOP
        INSERT INTO public.project_sections_snapshot (project_id, title, phase, order_index, tenant_section_id)
        VALUES (proj.id, section_record.title, section_record.phase, section_record.order_index, section_record.id)
        RETURNING id INTO new_section_id;

        -- Copier les items de cette section
        FOR item_record IN
          SELECT id, title, order_index
          FROM public.tenant_project_items
          WHERE section_id = section_record.id
        LOOP
          INSERT INTO public.project_items_snapshot (project_id, section_id, title, order_index, tenant_item_id)
          VALUES (proj.id, new_section_id, item_record.title, item_record.order_index, item_record.id)
          RETURNING id INTO new_item_id;

          -- Copier les tâches de cet item avec leurs fiches
          FOR task_record IN
            SELECT t.id, t.title, t.order_index, s.info_sheet
            FROM public.tenant_project_tasks t
            LEFT JOIN public.tenant_task_info_sheets s ON s.tenant_task_id = t.id
            WHERE t.item_id = item_record.id
          LOOP
            INSERT INTO public.project_tasks_snapshot (project_id, item_id, title, order_index, tenant_task_id, info_sheet)
            VALUES (proj.id, new_item_id, task_record.title, task_record.order_index, task_record.id, COALESCE(task_record.info_sheet, ''));
            
            task_count := task_count + 1;
          END LOOP;
        END LOOP;
      END LOOP;

      RETURN QUERY SELECT proj.id, true, ('Snapshot créé avec ' || task_count || ' tâches')::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT proj.id, false, ('Erreur: ' || SQLERRM)::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Exécuter la création des snapshots pour les projets existants
SELECT * FROM create_snapshots_for_existing_projects();

-- 4. Vérifier le résultat
SELECT 
  p.name as project_name,
  (SELECT COUNT(*) FROM public.project_sections_snapshot WHERE project_id = p.id) as sections,
  (SELECT COUNT(*) FROM public.project_items_snapshot WHERE project_id = p.id) as items,
  (SELECT COUNT(*) FROM public.project_tasks_snapshot WHERE project_id = p.id) as tasks
FROM public.projects p
ORDER BY p.created_at DESC
LIMIT 10;
