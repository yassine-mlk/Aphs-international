-- Désactiver les RLS (Row Level Security) sur la table task_info_sheets

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "All users can view task info sheets" ON public.task_info_sheets;
DROP POLICY IF EXISTS "Only admins can insert task info sheets" ON public.task_info_sheets;
DROP POLICY IF EXISTS "Only admins can update task info sheets" ON public.task_info_sheets;
DROP POLICY IF EXISTS "Only admins can delete task info sheets" ON public.task_info_sheets;
DROP POLICY IF EXISTS "All authenticated users can view task info sheets" ON public.task_info_sheets;
DROP POLICY IF EXISTS "Only admins can create or update task info sheets" ON public.task_info_sheets;

-- Désactiver complètement les RLS sur cette table
ALTER TABLE public.task_info_sheets DISABLE ROW LEVEL SECURITY;

-- Politique par défaut: tout le monde peut tout faire (désactivée par la ligne précédente)
-- Cette politique sera effective seulement si les RLS sont réactivées plus tard
CREATE POLICY "Allow all operations for all users" 
ON public.task_info_sheets
FOR ALL
USING (true)
WITH CHECK (true); 