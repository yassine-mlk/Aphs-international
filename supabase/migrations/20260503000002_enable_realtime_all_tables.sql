-- =======================================================
-- ACTIVATION DU REALTIME POUR LES TABLES CLÉS (FIX SYNTAXE)
-- =======================================================

-- 1. Recréer la publication pour inclure toutes les tables nécessaires
-- C'est la méthode la plus propre pour s'assurer que toutes les tables sont présentes
-- sans se soucier des erreurs "already exists" ou de syntaxe IF NOT EXISTS non supportée ici.

DROP PUBLICATION IF EXISTS supabase_realtime;

CREATE PUBLICATION supabase_realtime FOR TABLE 
    standard_tasks,
    standard_task_assignments,
    standard_task_submissions,
    standard_task_reviews,
    workflow_tasks,
    workflow_task_assignments,
    workflow_task_submissions,
    workflow_task_reviews,
    task_history,
    messages,
    conversations,
    notifications,
    video_meetings,
    video_meeting_participants,
    projects,
    membre,
    profiles;
