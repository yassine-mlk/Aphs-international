-- Migration: Add deadline columns to project structure snapshot tables
ALTER TABLE public.project_sections_snapshot ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE public.project_items_snapshot ADD COLUMN IF NOT EXISTS deadline DATE;

COMMENT ON COLUMN public.project_sections_snapshot.deadline IS 'Date d''échéance pour la section';
COMMENT ON COLUMN public.project_items_snapshot.deadline IS 'Date d''échéance pour l''item/sous-étape';
