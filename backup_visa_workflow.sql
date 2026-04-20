-- ============================================
-- BACKUP PRE-VISA WORKFLOW
-- Date: 2025-04-20
-- Projet: APHS International
-- ============================================

-- Ce fichier contient la structure actuelle des tables liées aux tâches
-- à sauvegarder avant migration visa workflow

-- Tables concernées:
-- - task_assignments (structure actuelle)
-- - custom_project_structures
-- - projects
-- - profiles

-- Commande pour backup depuis Supabase Dashboard:
-- 1. Aller dans Database > Backup
-- 2. Ou utiliser: supabase db dump --data-only > backup_$(date +%Y%m%d).sql

-- Commande pour restore si nécessaire:
-- psql $DATABASE_URL -f backup_visa_workflow.sql
