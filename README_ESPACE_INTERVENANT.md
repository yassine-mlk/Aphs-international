# Espace Intervenant - Documentation

## Vue d'ensemble

Ce document décrit la mise en place de l'espace intervenant permettant aux intervenants de consulter les projets auxquels ils sont assignés.

## Fonctionnalités implémentées

### 1. Table `membre` sans RLS

Une nouvelle table `membre` a été créée pour stocker les intervenants attachés à chaque projet :

- **Nom de la table** : `membre`
- **Sans politiques RLS** : Accès libre pour l'application
- **Colonnes principales** :
  - `id` : Identifiant unique (UUID)
  - `project_id` : Référence vers le projet
  - `user_id` : UUID de l'intervenant
  - `role` : Rôle dans le projet (par défaut : 'membre')
  - `added_by` : Qui a ajouté ce membre
  - `added_at` : Date d'ajout
  - `updated_at` : Date de modification

**Script de création** : `create_membre_table.sql`

### 2. Modification de ProjectDetails.tsx

L'onglet "Membres" dans les détails de projet a été modifié pour utiliser la nouvelle table `membre` au lieu de `project_members` :

- Récupération des membres depuis la table `membre`
- Ajout de nouveaux membres dans la table `membre`
- Suppression de membres de la table `membre`

### 3. Espace Intervenant

#### 3.1 Page de liste des projets (`IntervenantProjects.tsx`)

- **Route** : `/dashboard/intervenant/projets`
- **Fonctionnalités** :
  - Affichage des projets auxquels l'intervenant est assigné
  - Barre de recherche pour filtrer les projets
  - Calcul et affichage de la progression des tâches
  - Badge "Mode Intervenant" pour identifier le contexte
  - Accès en lecture seule

#### 3.2 Page de détails de projet (`IntervenantProjectDetails.tsx`)

- **Route** : `/dashboard/intervenant/projets/:id`
- **Fonctionnalités** :
  - Vérification de l'accès : seuls les membres du projet peuvent y accéder
  - Onglet "Informations" : détails du projet en lecture seule
  - Onglet "Structure" : consultation des étapes, sous-étapes et tâches
  - Affichage des tâches avec statut, assignation, dates et priorité
  - Interface en lecture seule (aucune modification possible)

### 4. Navigation et routage

#### 4.1 Nouvelles routes dans App.tsx

```typescript
// Routes spécifiques aux intervenants
<Route path="intervenant/projets" element={
  <IntervenantRoute>
    <IntervenantProjects />
  </IntervenantRoute>
} />
<Route path="intervenant/projets/:id" element={
  <IntervenantRoute>
    <IntervenantProjectDetails />
  </IntervenantRoute>
} />
```

#### 4.2 Navigation dans DashboardLayout.tsx

- Ajout du lien "Mes Projets" dans la sidebar pour les intervenants
- Mise à jour du titre de page dynamique
- Accès restreint aux intervenants uniquement

## Sécurité et contrôle d'accès

### Vérifications d'accès

1. **Route protection** : `IntervenantRoute` vérifie le rôle utilisateur
2. **Membership check** : Vérification que l'intervenant est membre du projet
3. **Lecture seule** : Aucune action de modification n'est disponible

### Flux de données

1. L'intervenant accède à `/dashboard/intervenant/projets`
2. Le système récupère les projets via la table `membre`
3. Pour chaque projet, calcul des statistiques de tâches
4. L'intervenant peut consulter les détails d'un projet
5. Vérification de l'appartenance au projet avant affichage
6. Consultation en lecture seule de la structure et des tâches

## Structure des données

### Table `membre`
```sql
CREATE TABLE membre (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'membre',
  added_by UUID,
  added_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);
```

### Relations
- `membre.project_id` → `projects.id`
- `membre.user_id` → `profiles.id` (ou auth.users.id)
- `membre.added_by` → `profiles.id`

## Interface utilisateur

### Indicateurs visuels
- Badge "Mode Intervenant" pour contextualiser l'accès
- Badges de statut pour les projets et tâches
- Barres de progression pour le suivi des tâches
- Icônes cohérentes avec le design system

### Responsive design
- Interface adaptée aux différentes tailles d'écran
- Cards responsive pour la liste des projets
- Accordéons pour la navigation dans la structure

## Migration depuis l'ancien système

Si une table `project_members` existait précédemment, voici la migration recommandée :

```sql
-- Migrer les données existantes
INSERT INTO membre (project_id, user_id, role, added_by, added_at)
SELECT project_id, user_id, role, added_by, added_at
FROM project_members;

-- Vérifier la migration
SELECT COUNT(*) FROM membre;
SELECT COUNT(*) FROM project_members;
```

## Points d'attention

1. **Performance** : Les requêtes JOIN entre `membre` et `projects` sont optimisées par les index
2. **Cohérence** : La contrainte `unique_project_user` évite les doublons
3. **Audit** : Les champs `added_by` et `added_at` permettent le suivi
4. **Extensibilité** : Le champ `role` permet d'ajouter des rôles spécifiques aux projets

## Tests recommandés

1. **Test d'accès** : Vérifier qu'un intervenant ne peut accéder qu'à ses projets
2. **Test de navigation** : S'assurer que la navigation fonctionne correctement
3. **Test de performances** : Vérifier les temps de chargement avec de nombreux projets
4. **Test responsive** : Vérifier l'affichage sur mobile et tablette

## Prochaines évolutions possibles

1. **Notifications** : Alertes pour les nouvelles assignations de projet
2. **Commentaires** : Système de commentaires sur les tâches
3. **Timeline** : Historique des modifications de projet
4. **Rapports** : Génération de rapports de progression
5. **Mobile app** : Extension vers une application mobile 