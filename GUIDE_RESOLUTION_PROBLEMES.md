# Guide de résolution des problèmes

## 🔧 Problèmes corrigés

### 1. Page projets de l'espace intervenant vide
**Problème** : La page ne montre aucun projet même si l'intervenant est membre de projets

**Causes possibles** :
- ✅ **Statut des tâches incorrect** : Corrigé 'completed' → 'validated'
- ⚠️ **Table `membre` vide** : Besoin de données
- ⚠️ **Table `membre` inexistante** : Besoin d'exécuter le script SQL

**Solutions** :
1. **Créer la table `membre`** : Exécuter `create_membre_table.sql`
2. **Ajouter des données test** : Utiliser `test_data_membre.sql`
3. **Vérifier les logs** : Ouvrir la console développeur pour voir les messages

### 2. Bouton "Modifier projet" erreur 404
**Problème** : Le bouton essayait d'aller vers une page qui n'existe pas

**Solution** : ✅ **Corrigé** - Maintenant redirige vers la liste des projets où le modal d'édition existe

---

## 📋 Actions à effectuer

### Étape 1 : Créer la table membre
```sql
-- Exécuter dans l'éditeur SQL de Supabase
-- Copier tout le contenu de create_membre_table.sql
```

### Étape 2 : Ajouter des données test (OPTIONNEL)
1. Ouvrir `test_data_membre.sql`
2. Remplacer les IDs par des valeurs réelles
3. Exécuter les requêtes

### Étape 3 : Tester la fonctionnalité
1. **Test espace intervenant** :
   - Se connecter en tant qu'intervenant
   - Aller dans "Mes Projets"
   - Vérifier la console développeur (F12)

2. **Test bouton modifier** :
   - Se connecter en tant qu'admin
   - Aller dans un projet
   - Cliquer sur "Modifier" → doit aller vers la liste

---

## 🐛 Debugging

### Console développeur
Ouvrir la console (F12) pour voir :
- `Récupération des projets pour l'utilisateur: [USER_ID]`
- `Données membres récupérées: [...]`
- `IDs des projets à récupérer: [...]`
- `Projets récupérés: [...]`

### Requêtes SQL de vérification
```sql
-- Vérifier si la table existe
SELECT * FROM membre LIMIT 1;

-- Vérifier les données pour un utilisateur
SELECT * FROM membre WHERE user_id = 'VOTRE_USER_ID';

-- Joindre avec les projets
SELECT 
  m.*,
  p.name as project_name
FROM membre m
LEFT JOIN projects p ON m.project_id = p.id;
```

---

## ⚡ Solutions rapides

### Problème : "Aucun projet assigné"
**Cause** : Table membre vide
**Solution** : Ajouter des données via l'onglet "Membres" d'un projet en tant qu'admin

### Problème : "Table or view 'membre' doesn't exist"
**Cause** : Table pas encore créée
**Solution** : Exécuter `create_membre_table.sql`

### Problème : Console affiche des erreurs
**Cause** : Permissions ou requête incorrecte
**Solution** : Vérifier les logs et les permissions RLS

---

## 📊 Résumé des modifications

### Fichiers modifiés :
- ✅ `IntervenantProjects.tsx` : Statut 'validated' + debugging
- ✅ `ProjectDetails.tsx` : Bouton modifier corrigé
- ✅ `ProjectDetails.tsx` : Utilise table 'membre' au lieu de 'project_members'

### Fichiers créés :
- ✅ `create_membre_table.sql` : Script de création de table
- ✅ `test_data_membre.sql` : Données de test
- ✅ `IntervenantProjects.tsx` : Page liste projets intervenant
- ✅ `IntervenantProjectDetails.tsx` : Page détails projet intervenant

### Routes ajoutées :
- ✅ `/dashboard/intervenant/projets` : Liste projets intervenant
- ✅ `/dashboard/intervenant/projets/:id` : Détails projet intervenant 