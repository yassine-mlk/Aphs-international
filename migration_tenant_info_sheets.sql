-- ============================================================
-- Migration : fiches informatives liées aux tâches tenant
-- et snapshot par projet
-- ============================================================

-- 1. Fiches informatives maîtres (tenant level)
--    Liées directement à tenant_project_tasks via UUID
CREATE TABLE IF NOT EXISTS public.tenant_task_info_sheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_task_id  UUID NOT NULL REFERENCES public.tenant_project_tasks(id) ON DELETE CASCADE,
  info_sheet      TEXT NOT NULL DEFAULT '',
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_task_id)
);

-- 2. Snapshot de structure par projet (copié à la création)
CREATE TABLE IF NOT EXISTS public.project_sections_snapshot (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  phase           TEXT NOT NULL CHECK (phase IN ('conception','realisation')),
  order_index     INTEGER NOT NULL DEFAULT 0,
  tenant_section_id UUID  -- référence d'origine (non contrainte, peut être supprimé)
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
  tenant_task_id  UUID,  -- référence d'origine pour lier la fiche copiée
  info_sheet      TEXT NOT NULL DEFAULT ''  -- fiche copiée au snapshot
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ttis_task  ON public.tenant_task_info_sheets(tenant_task_id);
CREATE INDEX IF NOT EXISTS idx_pss_proj   ON public.project_sections_snapshot(project_id, phase);
CREATE INDEX IF NOT EXISTS idx_pis_sec    ON public.project_items_snapshot(section_id);
CREATE INDEX IF NOT EXISTS idx_pts_item   ON public.project_tasks_snapshot(item_id);
CREATE INDEX IF NOT EXISTS idx_pts_proj   ON public.project_tasks_snapshot(project_id);

-- RLS (adapter selon votre politique existante)
ALTER TABLE public.tenant_task_info_sheets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sections_snapshot  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_items_snapshot     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks_snapshot     ENABLE ROW LEVEL SECURITY;

-- Politiques permissives pour les admins (à affiner selon vos besoins)
CREATE POLICY "admins_all_tenant_info_sheets" ON public.tenant_task_info_sheets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "admins_all_project_sections_snapshot" ON public.project_sections_snapshot
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "admins_all_project_items_snapshot" ON public.project_items_snapshot
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "admins_all_project_tasks_snapshot" ON public.project_tasks_snapshot
  FOR ALL USING (true) WITH CHECK (true);
