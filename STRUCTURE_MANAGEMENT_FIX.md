# Fix pour la Gestion de Structure de Projet

## Problème identifié

La gestion de la structure de projet avait deux problèmes majeurs :

1. **Persistance** : Les suppressions d'étapes/sous-étapes étaient stockées uniquement dans l'état local et perdues après déconnexion/reconnexion
2. **Synchronisation** : Les intervenants ne voyaient pas les modifications faites par l'admin car ils utilisaient la structure statique

## Solution implémentée

### 1. Base de données

**IMPORTANT : Exécutez le script SQL suivant dans Supabase SQL Editor :**

```sql
-- Voir le contenu complet dans create_project_structure_management.sql
```

Le script crée :
- Table `custom_project_structures` pour stocker les personnalisations
- Fonctions `delete_project_section()` et `delete_project_subsection()`
- Fonction `restore_project_structure()` pour restaurer si nécessaire
- Politiques de sécurité RLS appropriées

### 2. Hook personnalisé

Créé `src/hooks/useProjectStructure.ts` qui :
- Charge les structures personnalisées depuis la base de données
- Applique les suppressions aux structures par défaut
- Fournit des méthodes pour supprimer/restaurer des éléments
- Synchronise automatiquement les changements

### 3. Composants mis à jour

**Admin (`ProjectDetails.tsx`) :**
- Utilise `useProjectStructure` au lieu de l'état local
- Sauvegarde les suppressions en base de données
- Supprime automatiquement les tâches associées

**Intervenants (`IntervenantProjectDetails.tsx`) :**
- Utilise la même structure personnalisée que l'admin
- Synchronisé automatiquement avec les modifications admin

## Utilisation

### Pour l'admin :
1. Ouvrir la page de détails d'un projet
2. Aller dans l'onglet "Gestion Structure"
3. Cliquer sur l'icône poubelle pour supprimer une section/sous-section
4. La suppression est sauvegardée en base de données
5. Les tâches associées sont automatiquement supprimées

### Pour les intervenants :
1. Ouvrir la page de détails d'un projet
2. Voir la structure personnalisée (sans les éléments supprimés par l'admin)
3. La structure reste synchronisée même après déconnexion/reconnexion

## Fonctionnalités

- ✅ Persistance des suppressions en base de données
- ✅ Synchronisation admin ↔ intervenants
- ✅ Suppression automatique des tâches associées
- ✅ Politiques de sécurité RLS
- ✅ Possibilité de restaurer des éléments supprimés (via fonction SQL)
- ✅ Support des phases conception et réalisation

## Tests à effectuer

1. **Admin** : Supprimer une section → vérifier persistence après déconnexion
2. **Intervenant** : Vérifier que les sections supprimées n'apparaissent pas
3. **Synchronisation** : Modifications admin visibles immédiatement par intervenants
4. **Tâches** : Vérifier que les tâches sont supprimées avec les sections

## Fichiers modifiés

- `create_project_structure_management.sql` (nouveau)
- `src/hooks/useProjectStructure.ts` (nouveau)
- `src/pages/ProjectDetails.tsx` (modifié)
- `src/pages/IntervenantProjectDetails.tsx` (modifié)

## Notes importantes

- Le script SQL DOIT être exécuté avant d'utiliser la fonctionnalité
- Les structures par défaut restent inchangées dans les fichiers statiques
- Seules les personnalisations sont stockées en base de données
- La restauration est possible via la fonction SQL `restore_project_structure()` 