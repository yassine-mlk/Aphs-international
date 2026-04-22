-- ============================================================
-- Correction : Supprimer d'abord la fonction existante
-- ============================================================

-- 1. Supprimer la fonction existante si elle existe
DROP FUNCTION IF EXISTS create_snapshots_for_existing_projects();

-- 2. Vérifier et créer les tables snapshot si elles n'existent pas
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

-- Supprimer et recréer les politiques
DROP POLICY IF EXISTS "Allow all authenticated users" ON public.project_sections_snapshot;
DROP POLICY IF EXISTS "Allow all authenticated users" ON public.project_items_snapshot;
DROP POLICY IF EXISTS "Allow all authenticated users" ON public.project_tasks_snapshot;

CREATE POLICY "Allow all authenticated users" ON public.project_sections_snapshot
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated users" ON public.project_items_snapshot
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated users" ON public.project_tasks_snapshot
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 3. Recréer la fonction avec le bon type de retour
CREATE OR REPLACE FUNCTION create_snapshots_for_existing_projects()
RETURNS TABLE (project_id UUID, success BOOLEAN, message TEXT) AS $$
DECLARE
  proj RECORD;
  section_record RECORD;
  item_record RECORD;
  task_record RECORD;
  new_section_id UUID;
  new_item_id UUID;
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
        project_id := proj.id;
        success := false;
        message := 'Pas de structure tenant';
        RETURN NEXT;
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

        -- Copier les items
        FOR item_record IN
          SELECT id, title, order_index
          FROM public.tenant_project_items
          WHERE section_id = section_record.id
        LOOP
          INSERT INTO public.project_items_snapshot (project_id, section_id, title, order_index, tenant_item_id)
          VALUES (proj.id, new_section_id, item_record.title, item_record.order_index, item_record.id)
          RETURNING id INTO new_item_id;

          -- Copier les tâches avec fiches
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

      project_id := proj.id;
      success := true;
      message := 'Snapshot créé avec ' || task_count || ' tâches';
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      project_id := proj.id;
      success := false;
      message := 'Erreur: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Exécuter la création des snapshots
SELECT * FROM create_snapshots_for_existing_projects();

-- 5. Vérifier le résultat
SELECT 
  p.name as project_name,
  (SELECT COUNT(*) FROM public.project_sections_snapshot WHERE project_id = p.id) as sections,
  (SELECT COUNT(*) FROM public.project_items_snapshot WHERE project_id = p.id) as items,
  (SELECT COUNT(*) FROM public.project_tasks_snapshot WHERE project_id = p.id) as tasks
FROM public.projects p
ORDER BY p.created_at DESC
LIMIT 10;
