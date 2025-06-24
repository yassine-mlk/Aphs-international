# Guide de Mise à Jour du Code Frontend

## Corrections nécessaires après l'exécution du script SQL

### 1. Mise à jour du hook MeetingRequestForm.tsx

Le problème avec `profiles.id` peut être résolu en utilisant `user_id` à la place :

**Fichier :** `src/components/MeetingRequestForm.tsx` (ligne ~49)

**Ancien code :**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('id, first_name, last_name, email')
  .order('first_name');
```

**Nouveau code :**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('user_id, first_name, last_name, email')
  .order('first_name');

if (data) {
  const formattedUsers = data.map(user => ({
    value: user.user_id, // Utiliser user_id au lieu de id
    label: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
  }));
  setUsers(formattedUsers);
}
```

### 2. Mise à jour du hook useIntervenantStats.ts

Le problème de relation peut être résolu en utilisant la fonction RPC créée :

**Fichier :** `src/hooks/useIntervenantStats.ts` (lignes ~31 et ~77)

**Ancien code :**
```typescript
const { data, error } = await supabase
  .from('task_assignments')
  .select(`
    *,
    projects!inner(name)
  `)
  .eq('assigned_to', user.id)
  .order('created_at', { ascending: false });
```

**Nouveau code :**
```typescript
// Utiliser la fonction RPC qui gère les relations correctement
const { data, error } = await supabase
  .rpc('get_task_assignments_with_projects', { p_user_id: user.id });

if (error) throw error;

return (data || []).map(task => ({
  ...task,
  project_name: task.project_name || 'Projet inconnu'
}));
```

### 3. Alternative : Utiliser des requêtes séparées

Si vous préférez ne pas utiliser les fonctions RPC, vous pouvez séparer les requêtes :

```typescript
// Récupérer d'abord les task_assignments
const { data: tasks, error: taskError } = await supabase
  .from('task_assignments')
  .select('*')
  .eq('assigned_to', user.id)
  .order('created_at', { ascending: false });

if (taskError) throw taskError;

// Récupérer les projets séparément
const projectIds = [...new Set(tasks?.map(t => t.project_id).filter(Boolean))];
const { data: projects, error: projectError } = await supabase
  .from('projects')
  .select('id, name')
  .in('id', projectIds);

if (projectError) throw projectError;

// Combiner les données
const projectMap = new Map(projects?.map(p => [p.id, p.name]) || []);
return (tasks || []).map(task => ({
  ...task,
  project_name: projectMap.get(task.project_id) || 'Projet inconnu'
}));
```

### 4. Mise à jour pour l'utilisation de la fonction get_profiles_with_id

Si vous voulez utiliser la fonction RPC pour les profils :

```typescript
// Au lieu de :
const { data, error } = await supabase
  .from('profiles')
  .select('id, ...')

// Utiliser :
const { data, error } = await supabase
  .rpc('get_profiles_with_id');
```

### 5. Vérification des politiques RLS

Assurez-vous que votre utilisateur a les bonnes permissions. Si vous rencontrez des erreurs d'autorisation, vous pourriez avoir besoin d'ajuster les politiques RLS ou de vérifier que l'utilisateur est bien authentifié.

## Instructions d'exécution

1. **Exécuter le script SQL** : Copiez et exécutez le contenu de `fix_database_schema_issues.sql` dans Supabase SQL Editor
2. **Mettre à jour le code frontend** : Appliquez les corrections ci-dessus dans les fichiers concernés
3. **Tester l'application** : Vérifiez que toutes les erreurs ont été résolues
4. **Supprimer les données de test** : Supprimez les notifications de test si nécessaire

## Vérification que les corrections fonctionnent

Après avoir appliqué ces corrections, vous devriez voir :
- ✅ Plus d'erreur "table notifications does not exist"
- ✅ Plus d'erreur "column projects.deadline does not exist" 
- ✅ Plus d'erreur "column profiles.id does not exist"
- ✅ Plus d'erreur de relation entre task_assignments et projects

## Notes importantes

- Les fonctions RPC créées (`get_task_assignments_with_projects` et `get_profiles_with_id`) sont des solutions robustes qui gèrent automatiquement les jointures
- Si vous utilisez TypeScript, vous pourriez avoir besoin de mettre à jour vos types pour refléter les changements
- Les politiques RLS garantissent que les utilisateurs n'accèdent qu'à leurs propres données 