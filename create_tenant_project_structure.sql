-- Tables pour la structure de projet personnalisée par tenant
-- Exécuter dans Supabase SQL Editor

-- 1. Sections (étapes principales ex: A, B, C...)
CREATE TABLE IF NOT EXISTS public.tenant_project_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phase       TEXT NOT NULL CHECK (phase IN ('conception', 'realisation')),
  title       TEXT NOT NULL,
  original_id TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Items (sous-étapes ex: A1, A2...)
CREATE TABLE IF NOT EXISTS public.tenant_project_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID NOT NULL REFERENCES public.tenant_project_sections(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  original_id TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tasks (tâches feuilles)
CREATE TABLE IF NOT EXISTS public.tenant_project_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES public.tenant_project_items(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_tps_tenant_phase ON public.tenant_project_sections(tenant_id, phase);
CREATE INDEX IF NOT EXISTS idx_tpi_section ON public.tenant_project_items(section_id);
CREATE INDEX IF NOT EXISTS idx_tpt_item ON public.tenant_project_tasks(item_id);

-- RLS
ALTER TABLE public.tenant_project_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_project_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_project_tasks    ENABLE ROW LEVEL SECURITY;

-- Sections: admin du même tenant peut tout faire
CREATE POLICY "tenant_sections_admin_all" ON public.tenant_project_sections
  FOR ALL
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Items: admin du même tenant
CREATE POLICY "tenant_items_admin_all" ON public.tenant_project_items
  FOR ALL
  USING (
    section_id IN (
      SELECT s.id FROM public.tenant_project_sections s
      INNER JOIN public.profiles p ON p.tenant_id = s.tenant_id
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Tasks: admin du même tenant
CREATE POLICY "tenant_tasks_admin_all" ON public.tenant_project_tasks
  FOR ALL
  USING (
    item_id IN (
      SELECT i.id FROM public.tenant_project_items i
      INNER JOIN public.tenant_project_sections s ON s.id = i.section_id
      INNER JOIN public.profiles p ON p.tenant_id = s.tenant_id
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Lecture pour tous les membres du tenant (intervenants, maitre_ouvrage)
CREATE POLICY "tenant_sections_members_read" ON public.tenant_project_sections
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_items_members_read" ON public.tenant_project_items
  FOR SELECT
  USING (
    section_id IN (
      SELECT s.id FROM public.tenant_project_sections s
      INNER JOIN public.profiles p ON p.tenant_id = s.tenant_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_tasks_members_read" ON public.tenant_project_tasks
  FOR SELECT
  USING (
    item_id IN (
      SELECT i.id FROM public.tenant_project_items i
      INNER JOIN public.tenant_project_sections s ON s.id = i.section_id
      INNER JOIN public.profiles p ON p.tenant_id = s.tenant_id
      WHERE p.user_id = auth.uid()
    )
  );
