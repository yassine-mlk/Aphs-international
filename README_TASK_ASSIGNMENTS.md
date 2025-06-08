# Documentation Task Assignments

## Vue d'ensemble

Le système d'assignement de tâches permet aux administrateurs d'assigner des tâches spécifiques des projets aux intervenants, avec un système de validation complet basé sur la structure existante des projets dans `ProjectDetails.tsx`.

## Table `task_assignments`

### Structure de la table

La table `task_assignments` stocke les assignements de tâches sans politique RLS (Row Level Security) comme demandé :

```sql
CREATE TABLE task_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL,
    phase_id TEXT NOT NULL CHECK (phase_id IN ('conception', 'realisation')),
    section_id TEXT NOT NULL,
    subsection_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    assigned_to UUID NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    validation_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    validators TEXT[] NOT NULL DEFAULT '{}',
    file_extension TEXT NOT NULL DEFAULT 'pdf',
    comment TEXT,
    status task_status NOT NULL DEFAULT 'assigned',
    file_url TEXT,
    validation_comment TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE,
    validated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### Colonnes principales

- **`id`** : Identifiant unique de l'assignement
- **`project_id`** : Référence au projet (UUID)
- **`phase_id`** : Phase du projet (`'conception'` ou `'realisation'`)
- **`section_id`** : ID de la section (`'A'`, `'B'`, `'C'`, etc.)
- **`subsection_id`** : ID de la sous-section (`'A1'`, `'A2'`, `'B1'`, etc.)
- **`task_name`** : Nom de la tâche à réaliser
- **`assigned_to`** : UUID de l'intervenant assigné
- **`deadline`** : Date limite de remise
- **`validation_deadline`** : Date limite de validation
- **`validators`** : Array des UUIDs des validateurs
- **`file_extension`** : Extension du fichier attendu (`'pdf'`, `'doc'`, `'dwg'`, etc.)
- **`comment`** : Commentaire optionnel sur l'assignement
- **`status`** : Statut de la tâche (voir section Statuts)

### Statuts des tâches

```typescript
type TaskStatus = 'assigned' | 'in_progress' | 'submitted' | 'validated' | 'rejected';
```

- **`assigned`** : Tâche assignée, en attente de démarrage
- **`in_progress`** : Tâche en cours de réalisation
- **`submitted`** : Tâche soumise, en attente de validation
- **`validated`** : Tâche validée par un validateur
- **`rejected`** : Tâche rejetée, nécessite une révision

## Fichiers créés

### 1. Scripts SQL

#### `supabase/migrations/create_task_assignments_table.sql`
Migration Supabase pour créer la table avec :
- Structure complète de la table
- Index de performance
- Contraintes de validation
- Trigger automatique pour `updated_at`

#### `create_task_assignments_table.sql`
Script direct pour exécution immédiate avec :
- Même structure que la migration
- Commentaires détaillés sur chaque colonne
- Données d'exemple commentées
- Requêtes de vérification

### 2. Types TypeScript

#### `src/types/taskAssignment.ts`
Types complets pour l'assignement de tâches :

```typescript
// Types principaux
export interface TaskAssignment { /* ... */ }
export interface CreateTaskAssignmentData { /* ... */ }
export interface UpdateTaskAssignmentData { /* ... */ }
export interface TaskAssignmentStats { /* ... */ }

// Fonctions utilitaires
export const validateTaskAssignment = (data: CreateTaskAssignmentData): string[]
export const isTaskOverdue = (assignment: TaskAssignment): boolean
export const isTaskDueSoon = (assignment: TaskAssignment): boolean
export const calculateTaskStats = (assignments: TaskAssignment[]): TaskAssignmentStats
```

### 3. Hook React

#### `src/hooks/useTaskAssignments.ts`
Hook complet pour la gestion des assignements :

```typescript
export const useTaskAssignments = () => {
  return {
    // État
    taskAssignments,
    loading,
    error,
    
    // Actions de base
    fetchAllTaskAssignments,
    fetchProjectTaskAssignments,
    fetchUserTaskAssignments,
    createTaskAssignment,
    updateTaskAssignment,
    deleteTaskAssignment,
    
    // Actions spécifiques
    markTaskInProgress,
    submitTask,
    validateTask,
    rejectTask,
    
    // Données enrichies
    fetchTaskAssignmentsWithDetails,
    
    // Utilitaires
    getTaskAssignmentStats,
    getOverdueTasks,
    getTasksDueSoon,
    checkTaskExists
  };
};
```

## Utilisation

### 1. Installation

```bash
# Exécuter la migration Supabase
supabase migration run

# OU exécuter le script direct dans votre interface PostgreSQL
psql -f create_task_assignments_table.sql
```

### 2. Utilisation dans un composant React

```typescript
import { useTaskAssignments } from '@/hooks/useTaskAssignments';
import { CreateTaskAssignmentData } from '@/types/taskAssignment';

const MyComponent = () => {
  const { 
    createTaskAssignment, 
    fetchProjectTaskAssignments,
    loading 
  } = useTaskAssignments();

  const assignTask = async () => {
    const taskData: CreateTaskAssignmentData = {
      project_id: 'project-uuid',
      phase_id: 'conception',
      section_id: 'A',
      subsection_id: 'A1',
      task_name: 'ETUDE PRÉALABLE',
      assigned_to: 'intervenant-uuid',
      deadline: '2024-01-15T10:00:00Z',
      validation_deadline: '2024-01-18T10:00:00Z',
      validators: ['validator1-uuid', 'validator2-uuid'],
      file_extension: 'pdf',
      comment: 'Première étude à réaliser'
    };

    await createTaskAssignment(taskData);
  };

  // ...
};
```

### 3. Récupération des assignements

```typescript
// Tous les assignements
const allTasks = await fetchAllTaskAssignments();

// Assignements d'un projet
const projectTasks = await fetchProjectTaskAssignments(projectId);

// Assignements d'un utilisateur
const userTasks = await fetchUserTaskAssignments(userId);

// Avec filtres
const filteredTasks = await fetchAllTaskAssignments({
  status: 'assigned',
  deadline_from: '2024-01-01',
  deadline_to: '2024-01-31'
});
```

### 4. Gestion du cycle de vie d'une tâche

```typescript
// 1. Assigner une tâche
await createTaskAssignment(taskData);

// 2. Marquer en cours
await markTaskInProgress(taskId);

// 3. Soumettre un fichier
await submitTask(taskId, fileUrl);

// 4. Valider (admin)
await validateTask(taskId, validatorId, 'Travail excellent');

// OU rejeter (admin)
await rejectTask(taskId, validatorId, 'Nécessite des corrections');
```

## Intégration avec l'existant

### Correction du problème des intervenants

Le problème signalé (zéro intervenant affiché) a été corrigé en modifiant la fonction `fetchIntervenants` dans `ProjectDetails.tsx` pour utiliser la même logique que la page des intervenants :

```typescript
// Avant (ne fonctionnait pas)
const data = await fetchData('profiles', {
  filters: [{ column: 'role', operator: 'eq', value: 'intervenant' }]
});

// Après (corrigé)
const userData = await getUsers();
const formattedUsers = userData.users
  .filter(user => !user.user_metadata?.role === 'admin' && !user.banned)
  .map(user => ({ /* transformation */ }));
```

### Structure des projets

Le système utilise la structure de projet existante :

#### Phase Conception
- Sections : A, B, C, D, E, F, G, H
- Sous-sections : A1, A2, B1, B2, etc.
- Tâches définies dans `projectStructure`

#### Phase Réalisation  
- Sections : I, J, K, L, M, N, O
- Sous-sections : I1, I2, J1, J2, etc.
- Tâches définies dans `realizationStructure`

## Fonctionnalités avancées

### 1. Statistiques

```typescript
const stats = getTaskAssignmentStats();
// Retourne: { total, assigned, in_progress, submitted, validated, rejected, overdue, due_soon }
```

### 2. Tâches en retard

```typescript
const overdueTasks = getOverdueTasks();
const tasksDueSoon = getTasksDueSoon(); // Dans les 3 prochains jours
```

### 3. Données enrichies

```typescript
const enrichedAssignments = await fetchTaskAssignmentsWithDetails();
// Inclut les détails de l'assigné, du projet et des validateurs
```

### 4. Validation des données

```typescript
const errors = validateTaskAssignment(taskData);
if (errors.length > 0) {
  console.log('Erreurs de validation:', errors);
}
```

## Index et performance

La table inclut plusieurs index pour optimiser les performances :

- `idx_task_assignments_project_id` : Recherche par projet
- `idx_task_assignments_assigned_to` : Recherche par assigné
- `idx_task_assignments_status` : Recherche par statut
- `idx_task_assignments_deadline` : Tri par date limite
- `idx_task_assignments_unique_task` : Unicité des tâches

## Contraintes

- **Ordre des dates** : `validation_deadline >= deadline`
- **Statuts cohérents** : Les champs `submitted_at`, `validated_at`, etc. correspondent aux statuts
- **Unicité** : Une seule assignation par tâche de projet
- **Validation** : L'assigné ne peut pas être validateur

## Sécurité

⚠️ **Important** : La table `task_assignments` n'a **AUCUNE politique RLS** comme demandé. Elle est accessible sans restrictions à tous les utilisateurs authentifiés.

Si vous souhaitez ajouter des restrictions plus tard :

```sql
-- Activer RLS
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Politique d'exemple (à adapter selon vos besoins)
CREATE POLICY "Users can view their own assignments" ON task_assignments
  FOR SELECT USING (assigned_to = auth.uid());
```

## Support et maintenance

Pour toute question ou problème :

1. Vérifiez les logs de la console pour les erreurs de récupération
2. Assurez-vous que les intervenants sont créés avec `getUsers()` 
3. Vérifiez que la table `task_assignments` existe
4. Consultez la documentation des types pour l'usage correct des interfaces

## Exemples d'extension

Le système peut être étendu pour :

- Notifications par email lors d'assignements
- Historique des modifications
- Commentaires multiples par tâche
- Pièces jointes multiples
- Workflow de validation complexe
- Intégration avec un système de fichiers

---

**Note** : Cette implémentation est basée sur l'analyse des formulaires et hooks existants dans la page détails projet, onglet structure, et respecte l'architecture existante de l'application. 