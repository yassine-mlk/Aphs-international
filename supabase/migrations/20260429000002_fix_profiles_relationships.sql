-- ============================================================
-- FIX : RELATIONS ENTRE TABLES ET PROFILES POUR POSTGREST
-- Ce script ajoute des contraintes FK vers la table profiles
-- pour permettre les jointures automatiques dans l'API Supabase.
-- ============================================================

-- 1. S'assurer que profiles.user_id a une contrainte UNIQUE (nécessaire pour FK)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_user_id_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- 2. Ajouter FK de task_revisions vers profiles
ALTER TABLE public.task_revisions DROP CONSTRAINT IF EXISTS fk_task_revisions_executor_profile;
ALTER TABLE public.task_revisions 
ADD CONSTRAINT fk_task_revisions_executor_profile 
FOREIGN KEY (executor_id) REFERENCES public.profiles(user_id);

-- 3. Ajouter FK de task_assignments vers profiles
ALTER TABLE public.task_assignments DROP CONSTRAINT IF EXISTS fk_task_assignments_user_profile;
ALTER TABLE public.task_assignments 
ADD CONSTRAINT fk_task_assignments_user_profile 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- 4. Ajouter FK de task_reviews vers profiles (via assignment_id jointure)
-- Note: task_reviews référence task_assignments, qui référence maintenant profiles.

-- 5. Vérifier la table task_visa_workflows (exécuteur)
ALTER TABLE public.task_visa_workflows DROP CONSTRAINT IF EXISTS fk_task_visa_executor_profile;
ALTER TABLE public.task_visa_workflows 
ADD CONSTRAINT fk_task_visa_executor_profile 
FOREIGN KEY (executor_id) REFERENCES public.profiles(user_id);

-- 6. Recréer la vue task_assignments_view pour s'assurer qu'elle est à jour
-- (Optionnel mais recommandé pour rafraîchir le cache PostgREST)
NOTIFY pgrst, 'reload schema';
