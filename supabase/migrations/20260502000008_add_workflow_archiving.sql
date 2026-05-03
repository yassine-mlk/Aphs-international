-- Migration: Archivage des révisions et avis lors de la relance du workflow
-- Description: Ajoute is_archived et crée la fonction d'archivage

-- 1. Ajouter les colonnes is_archived
ALTER TABLE public.workflow_task_submissions 
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

ALTER TABLE public.workflow_task_reviews 
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- 2. Fonction pour archiver les révisions et avis d'une tâche
CREATE OR REPLACE FUNCTION public.archive_task_reviews(p_task_id uuid) 
RETURNS void AS $$ 
BEGIN 
  -- Archiver les avis liés aux soumissions de cette tâche
  UPDATE public.workflow_task_reviews 
  SET is_archived = true 
  WHERE submission_id IN ( 
    SELECT id FROM public.workflow_task_submissions WHERE task_id = p_task_id 
  ); 
  
  -- Archiver les soumissions de cette tâche
  UPDATE public.workflow_task_submissions 
  SET is_archived = true 
  WHERE task_id = p_task_id; 
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.archive_task_reviews TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_task_reviews TO anon;
