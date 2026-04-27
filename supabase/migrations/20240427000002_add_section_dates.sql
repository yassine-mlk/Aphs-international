-- ============================================================
-- AJOUT DES DATES DE DÉBUT ET DE FIN POUR LES ÉTAPES ET SOUS-ÉTAPES
-- ============================================================

-- 1. Ajouter les colonnes aux tables de structure tenant (structure de base)
ALTER TABLE public.tenant_project_sections 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

ALTER TABLE public.tenant_project_items 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- 2. S'assurer que les snapshots ont aussi ces colonnes (déjà fait normalement, mais par sécurité)
ALTER TABLE public.project_sections_snapshot 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

ALTER TABLE public.project_items_snapshot 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- 3. Mettre à jour la fonction de création de snapshot pour copier ces dates
CREATE OR REPLACE FUNCTION create_snapshots_for_existing_projects()
RETURNS TABLE (project_id UUID, created BOOLEAN) AS $$
DECLARE
  proj RECORD;
  tenant_id UUID;
  section_record RECORD;
  item_record RECORD;
  task_record RECORD;
  new_section_id UUID;
  new_item_id UUID;
  info_sheet_text TEXT;
BEGIN
  FOR proj IN SELECT id, tenant_id as tid FROM public.projects 
    WHERE NOT EXISTS (SELECT 1 FROM public.project_sections_snapshot WHERE project_sections_snapshot.project_id = projects.id)
  LOOP
    BEGIN
      -- Vérifier si le tenant a une structure
      IF NOT EXISTS (SELECT 1 FROM public.tenant_project_sections WHERE tenant_id = proj.tid LIMIT 1) THEN
        RETURN QUERY SELECT proj.id, false;
        CONTINUE;
      END IF;

      -- Copier les sections
      FOR section_record IN 
        SELECT id, title, phase, order_index, start_date, end_date
        FROM public.tenant_project_sections 
        WHERE tenant_id = proj.tid
      LOOP
        INSERT INTO public.project_sections_snapshot (project_id, title, phase, order_index, tenant_section_id, start_date, end_date)
        VALUES (proj.id, section_record.title, section_record.phase, section_record.order_index, section_record.id, section_record.start_date, section_record.end_date)
        RETURNING id INTO new_section_id;

        -- Copier les items de cette section
        FOR item_record IN
          SELECT id, title, order_index, start_date, end_date
          FROM public.tenant_project_items
          WHERE section_id = section_record.id
        LOOP
          INSERT INTO public.project_items_snapshot (project_id, section_id, title, order_index, tenant_item_id, start_date, end_date)
          VALUES (proj.id, new_section_id, item_record.title, item_record.order_index, item_record.id, item_record.start_date, item_record.end_date)
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
          END LOOP;
        END LOOP;
      END LOOP;

      RETURN QUERY SELECT proj.id, true;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT proj.id, false;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
