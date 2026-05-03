-- =======================================================
-- FIX DOUBLONS NOTIFICATIONS ET CRON JOB TÂCHES EN RETARD
-- =======================================================

-- 1. Ajouter la colonne reference_id (sans index unique pour l'instant)
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS reference_id text; 

-- 2. Tenter de peupler le reference_id pour les notifications existantes
-- On le fait AVANT de créer l'index unique pour éviter les erreurs de duplication pendant l'update
UPDATE notifications 
SET reference_id = 'late_task_' || (regexp_match(link, '/tasks/([a-z0-9-]+)'))[1]
WHERE type = 'task_overdue' AND reference_id IS NULL AND link IS NOT NULL;

UPDATE notifications 
SET reference_id = 'late_task_admin_' || (regexp_match(link, '/tasks/([a-z0-9-]+)'))[1]
WHERE type = 'task_overdue_admin' AND reference_id IS NULL AND link IS NOT NULL;

-- 3. Supprimer TOUS les doublons basés sur le contenu ou la référence
-- On garde l'ID le plus ancien pour chaque groupe
DELETE FROM notifications 
WHERE id NOT IN (
  SELECT (array_agg(id ORDER BY created_at ASC))[1]
  FROM notifications 
  GROUP BY user_id, type, COALESCE(reference_id, title || message)
);

-- 4. Maintenant que la table est propre, on peut créer l'index unique
-- Cela empêchera toute duplication future
DROP INDEX IF EXISTS notifications_reference_unique;
CREATE UNIQUE INDEX notifications_reference_unique 
ON notifications(user_id, reference_id) 
WHERE reference_id IS NOT NULL; 

-- 5. Fonction pour vérifier les tâches en retard pour tous les utilisateurs
CREATE OR REPLACE FUNCTION check_late_tasks_for_all_users()
RETURNS void AS $$
DECLARE
    task_record RECORD;
    admin_record RECORD;
    executor_id uuid;
BEGIN
    -- Pour chaque tâche en retard non clôturée/validée
    FOR task_record IN 
        SELECT id, task_name, deadline, assigned_to, tenant_id 
        FROM task_assignments_view 
        WHERE deadline < NOW() 
        AND status NOT IN ('approved', 'vso', 'vao', 'closed')
    LOOP
        -- a. Notifier l'admin du tenant
        FOR admin_record IN 
            SELECT user_id FROM profiles 
            WHERE tenant_id = task_record.tenant_id AND role = 'admin'
        LOOP
            INSERT INTO notifications (user_id, type, title, message, reference_id, link)
            VALUES (
                admin_record.user_id, 
                'task_overdue_admin', 
                '⚠️ Tâche en retard — ' || task_record.task_name,
                'La deadline du ' || to_char(task_record.deadline, 'DD/MM/YYYY') || ' est dépassée.',
                'late_task_admin_' || task_record.id,
                '/dashboard/tasks/' || task_record.id
            )
            ON CONFLICT (user_id, reference_id) DO NOTHING;
        END LOOP;

        -- b. Notifier les exécuteurs
        IF task_record.assigned_to IS NOT NULL THEN
            FOREACH executor_id IN ARRAY task_record.assigned_to
            LOOP
                INSERT INTO notifications (user_id, type, title, message, reference_id, link)
                VALUES (
                    executor_id, 
                    'task_overdue', 
                    '⚠️ Tâche en retard — ' || task_record.task_name,
                    'La deadline du ' || to_char(task_record.deadline, 'DD/MM/YYYY') || ' est dépassée.',
                    'late_task_' || task_record.id,
                    '/dashboard/tasks/' || task_record.id
                )
                ON CONFLICT (user_id, reference_id) DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Activer pg_cron et planifier la tâche
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprimer l'ancienne planification si elle existe pour éviter les doublons de cron
SELECT cron.unschedule('check-late-tasks') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-late-tasks');

SELECT cron.schedule(
  'check-late-tasks',
  '0 8 * * *', -- Tous les jours à 8h
  'SELECT check_late_tasks_for_all_users();'
);
