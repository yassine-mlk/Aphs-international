-- Migration for Subscription Plans and Limits
-- Added on 2026-05-03

-- Étape 1 — Ajouter la formule sur la table tenants
DO $$
BEGIN
    -- Update existing plan column if it exists, or add it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'plan') THEN
        ALTER TABLE tenants ALTER COLUMN plan TYPE text;
        ALTER TABLE tenants ALTER COLUMN plan SET DEFAULT 'starter';
    ELSE
        ALTER TABLE tenants ADD COLUMN plan text DEFAULT 'starter';
    END IF;

    -- Add check constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'tenants' AND constraint_name = 'tenants_plan_check') THEN
        ALTER TABLE tenants ADD CONSTRAINT tenants_plan_check CHECK (plan IN ('starter', 'pro', 'business'));
    END IF;
END $$;

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS plan_limits jsonb DEFAULT '{ 
   "max_intervenants_per_project": 10, 
   "max_projects": null, 
   "task_types": ["standard"], 
   "videoconference": false, 
   "storage_per_project_gb": 5, 
   "max_file_size_gb": 0.5, 
   "email_notifications": false, 
   "groups": true, 
   "esignature": false, 
   "api_access": false, 
   "custom_structure": false, 
   "advanced_fiches": false 
 }'; 

-- Étape 2 — Fonction SQL pour récupérer les limites 
 
 CREATE OR REPLACE FUNCTION get_plan_limits(plan_name text) 
 RETURNS jsonb AS $$ 
 BEGIN 
   CASE plan_name 
     WHEN 'starter' THEN 
       RETURN '{ 
         "max_intervenants_per_project": 10, 
         "task_types": ["standard"], 
         "videoconference": false, 
         "storage_per_project_gb": 5, 
         "max_file_size_gb": 0.5, 
         "email_notifications": false, 
         "groups": true, 
         "esignature": false, 
         "api_access": false, 
         "custom_structure": false, 
         "advanced_fiches": false 
       }'::jsonb; 
     WHEN 'pro' THEN 
       RETURN '{ 
         "max_intervenants_per_project": 30, 
         "task_types": ["standard", "sequential"], 
         "videoconference": true, 
         "storage_per_project_gb": 50, 
         "max_file_size_gb": 2, 
         "email_notifications": true, 
         "groups": true, 
         "esignature": false, 
         "api_access": false, 
         "custom_structure": false, 
         "advanced_fiches": false 
       }'::jsonb; 
     WHEN 'business' THEN 
       RETURN '{ 
         "max_intervenants_per_project": -1, 
         "task_types": ["standard", "sequential"], 
         "videoconference": true, 
         "storage_per_project_gb": -1, 
         "max_file_size_gb": -1, 
         "email_notifications": true, 
         "groups": true, 
         "esignature": true, 
         "api_access": true, 
         "custom_structure": true, 
         "advanced_fiches": true 
       }'::jsonb; 
     ELSE 
       RETURN '{ 
         "max_intervenants_per_project": 10, 
         "task_types": ["standard"], 
         "videoconference": false, 
         "storage_per_project_gb": 5, 
         "max_file_size_gb": 0.5, 
         "email_notifications": false, 
         "groups": true, 
         "esignature": false, 
         "api_access": false, 
         "custom_structure": false, 
         "advanced_fiches": false 
       }'::jsonb; 
   END CASE; 
 END; 
 $$ LANGUAGE plpgsql; 
 
 -- Trigger : quand le superadmin change le plan, 
 -- mettre à jour plan_limits automatiquement 
 CREATE OR REPLACE FUNCTION sync_plan_limits() 
 RETURNS TRIGGER AS $$ 
 BEGIN 
   NEW.plan_limits := get_plan_limits(NEW.plan); 
   RETURN NEW; 
 END; 
 $$ LANGUAGE plpgsql; 
 
 DROP TRIGGER IF EXISTS trigger_sync_plan_limits ON tenants; 
 CREATE TRIGGER trigger_sync_plan_limits 
 BEFORE INSERT OR UPDATE OF plan ON tenants 
 FOR EACH ROW EXECUTE FUNCTION sync_plan_limits(); 

-- Update existing tenants to have correct limits
UPDATE tenants SET plan = plan;
