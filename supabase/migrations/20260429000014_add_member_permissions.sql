-- Migration: Add member permissions for info sheets and project details
ALTER TABLE public.membre ADD COLUMN IF NOT EXISTS can_view_info_sheets BOOLEAN DEFAULT false;
ALTER TABLE public.membre ADD COLUMN IF NOT EXISTS can_view_project_details BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.membre.can_view_info_sheets IS 'Permet au membre de voir l''onglet des fiches informatives';
COMMENT ON COLUMN public.membre.can_view_project_details IS 'Permet au membre de voir les détails complets du projet (Gantt, etc.)';
