-- ============================================================
-- Création de la table task_info_sheets manquante
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_info_sheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id        TEXT NOT NULL,
  section_id      TEXT NOT NULL,
  subsection_id   TEXT NOT NULL,
  task_name       TEXT NOT NULL,
  info_sheet      TEXT NOT NULL DEFAULT '',
  language        TEXT NOT NULL DEFAULT 'fr',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (phase_id, section_id, subsection_id, task_name, language)
);

-- Index pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_task_info_sheets_lookup 
  ON public.task_info_sheets(phase_id, section_id, subsection_id, task_name, language);

-- Enable RLS
ALTER TABLE public.task_info_sheets ENABLE ROW LEVEL SECURITY;

-- Politique permissive pour tous les utilisateurs authentifiés
CREATE POLICY "Allow all authenticated users" ON public.task_info_sheets
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.task_info_sheets IS 'Fiches informatives des tâches par phase/section/sous-section/nom de tâche et langue';
