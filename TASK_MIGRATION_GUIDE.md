# Guide de Migration - Correction des Erreurs de Tâches

## Problèmes résolus

### 1. Erreur 404 - Table `task_assignments` introuvable
**Problème** : L'ancienne structure utilisait une table `task_assignments` qui n'existe pas.
**Solution** : Migration vers la nouvelle table `project_tasks` avec un système de compatibilité.

### 2. Erreur 500 - Récursion infinie dans les politiques RLS
**Problème** : Les politiques RLS pour `project_members` causaient une récursion infinie.
**Solution** : Réécriture complète des politiques RLS avec des fonctions d'aide.

## Étapes de correction

### Étape 1 : Exécuter le script de correction des politiques RLS

Exécutez ce script dans votre console Supabase SQL :

```sql
-- Contenu du fichier: supabase/fix_rls_policies.sql
-- (Voir le fichier pour le script complet)
```

### Étape 2 : Exécuter le script de structure complète

Si pas encore fait, exécutez le script de structure :

```sql
-- Contenu du fichier: supabase/complete_project_structure.sql
-- (Voir le fichier pour le script complet)
```

### Étape 3 : Vérification des tables

Vérifiez que les tables suivantes existent :

```sql
-- Vérifier les tables
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'project_tasks', 'project_task_history', 'project_members')
ORDER BY table_name;

-- Vérifier les colonnes de projects
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;
```

## Structure des nouvelles tables

### Table `projects` (mise à jour)
- `start_date` : DATE NOT NULL - Date de début obligatoire
- `end_date` : DATE - Date de fin optionnelle  
- `status` : TEXT - Statut du projet (active, completed, paused, cancelled)
- `company_id` : UUID - Lien vers l'entreprise

### Table `project_tasks` (nouvelle)
- Gestion complète des tâches avec assignation et validation
- Support des fichiers via Supabase Storage
- Système de priorités et commentaires
- Historique automatique via triggers

### Table `project_members` (nouvelle)
- Gestion des membres par projet
- Rôles : owner, manager, member, viewer
- Permissions selon le rôle

### Table `project_task_history` (nouvelle)
- Historique complet de toutes les actions
- Déclencheurs automatiques
- Traçabilité complète des rejets/validations

## Permissions par rôle

### Project Members (Intervenants)
- **Lecture** : Accès complet à la structure du projet
- **Interdictions** : 
  - Pas de création de tâches
  - Pas de modification des paramètres
  - Pas de suppression
  - Pas d'assignation

### Owners & Managers
- **Lecture** : Accès complet
- **Écriture** : Création et assignation de tâches
- **Suppression** : Selon le rôle (owners uniquement)

### Assigned Users
- **Soumission** : Peuvent soumettre des fichiers pour leurs tâches
- **Modification limitée** : Seulement leurs propres soumissions

### Validators
- **Validation** : Peuvent valider/rejeter les tâches assignées
- **Commentaires** : Ajout de commentaires de validation

## API de Migration

### Hook `useTaskMigration`

```typescript
const { 
  fetchTasksForUser,    // Récupère les tâches d'un utilisateur
  fetchAllTasks,        // Récupère toutes les tâches
  updateTaskStatus,     // Met à jour le statut d'une tâche
  loading,              // État de chargement
  error                 // Erreurs éventuelles
} = useTaskMigration();
```

### Conversion Legacy

```typescript
import { convertProjectTaskToLegacy, convertLegacyToProjectTask } from '../types/legacy-migration';

// Convertir ProjectTask vers format legacy pour compatibilité
const legacyTask = convertProjectTaskToLegacy(projectTask);

// Convertir format legacy vers ProjectTask
const projectTask = convertLegacyToProjectTask(legacyTask);
```

## Fonctionnalités ajoutées

### 1. Gestion des entreprises avec employés
- Bouton "Voir les employés" sur chaque carte d'entreprise
- Dialogue modal avec liste complète des employés
- Informations : nom, email, rôle, date d'embauche

### 2. Système de tâches complet
- Création avec assignation multiple
- Upload de fichiers via Supabase Storage
- Système de validation/rejet
- Historique complet automatique
- Gestion des priorités

### 3. Projets avec dates
- Date de début obligatoire
- Date de fin optionnelle
- Validation des cohérences de dates
- Statuts de projet

## Validation post-migration

### Vérifications à effectuer

1. **Connexion utilisateur** : Vérifier que les utilisateurs peuvent se connecter
2. **Accès aux projets** : Vérifier l'affichage des projets avec dates
3. **Liste des tâches** : Vérifier que les tâches s'affichent correctement
4. **Entreprises** : Vérifier l'affichage des employés
5. **Permissions** : Tester les droits selon les rôles

### Commandes de diagnostic

```sql
-- Vérifier les politiques RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('project_tasks', 'project_task_history', 'project_members')
ORDER BY tablename, policyname;

-- Vérifier les triggers
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('project_tasks');

-- Vérifier les buckets de stockage
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id IN ('project-images', 'task-files');
```

## Support et dépannage

### Erreurs communes

1. **403 Forbidden** : Problème de politiques RLS
   - Solution : Vérifier les politiques avec le script de diagnostic

2. **Colonnes manquantes** : Tables non mises à jour
   - Solution : Exécuter le script de structure complète

3. **Fichiers non uploadés** : Problème de buckets
   - Solution : Vérifier les politiques de stockage

### Contact

En cas de problème persistant, vérifiez :
1. Les logs Supabase pour les erreurs détaillées
2. La console réseau pour les erreurs 404/500
3. Les permissions utilisateur dans l'interface Supabase 