# Résolution des Erreurs RPC 400 - Gestion des Contacts

## Problème Identifié

Les erreurs suivantes apparaissaient dans la console :

```
[Error] Failed to load resource: the server responded with a status of 400 () (get_user_contacts_count, line 0)
[Warning] ⚠️ Erreur pour [email]: – {code: "42703", details: null, hint: null, message: "column u.banned does not exist"}
```

## Cause Racine

Le script SQL `user_contacts_simple.sql` contenait des références à une colonne `u.banned` qui n'existe pas dans la table `auth.users` de Supabase :

```sql
-- PROBLÉMATIQUE (lignes 108 et 125)
AND u.banned = false
```

## Solution Appliquée

### 1. Correction du Script SQL

**Fichier modifié :** `user_contacts_simple.sql`

**Changements :**
- Suppression de la condition `AND u.banned = false` dans la fonction `get_user_contacts`
- Suppression de la condition `AND u.banned = false` dans la fonction `get_user_contacts_count`

**Avant :**
```sql
SELECT COUNT(*) INTO contact_count
FROM user_contacts uc
JOIN auth.users u ON uc.contact_id = u.id
WHERE uc.user_id = p_user_id
AND u.banned = false;  -- ❌ Cette colonne n'existe pas
```

**Après :**
```sql
SELECT COUNT(*) INTO contact_count
FROM user_contacts uc
JOIN auth.users u ON uc.contact_id = u.id
WHERE uc.user_id = p_user_id;  -- ✅ Condition supprimée
```

### 2. Correction de l'Avertissement React

**Fichier modifié :** `src/pages/Intervenants.tsx`

**Problème :** Un `<div>` était imbriqué dans un `<DialogDescription>` (qui est un `<p>`), causant un avertissement de validation DOM.

**Solution :** Déplacement du `<div>` en dehors du `<DialogDescription>`.

**Avant :**
```jsx
<DialogDescription>
  Sélectionnez les intervenants...
  {condition && (
    <div className="...">  {/* ❌ div dans p */}
      Mode temporaire...
    </div>
  )}
</DialogDescription>
```

**Après :**
```jsx
<DialogDescription>
  Sélectionnez les intervenants...
</DialogDescription>
{condition && (
  <div className="...">  {/* ✅ div séparé */}
    Mode temporaire...
  </div>
)}
```

## Étapes pour Déployer la Correction

### 1. Exécuter le Script SQL Corrigé

1. Ouvrir le [Supabase SQL Editor](https://app.supabase.com/project/_/sql)
2. Copier le contenu complet du fichier `user_contacts_simple.sql` (version corrigée)
3. Exécuter le script
4. Vérifier qu'aucune erreur n'apparaît dans la console SQL

### 2. Vérifier les Fonctions Créées

Exécuter cette requête pour confirmer que les fonctions existent :

```sql
SELECT routine_name, routine_schema
FROM information_schema.routines
WHERE routine_name IN (
  'add_user_contact',
  'remove_user_contact', 
  'get_user_contacts',
  'get_user_contacts_count'
);
```

### 3. Tester les Fonctions

Tester manuellement une fonction :

```sql
-- Remplacer par un vrai UUID d'utilisateur
SELECT * FROM get_user_contacts_count(p_user_id := '00000000-0000-0000-0000-000000000000');
```

## Résultat Attendu

Après ces corrections :

- ✅ Les erreurs 400 disparaissent
- ✅ Les fonctions RPC fonctionnent correctement
- ✅ Le nombre de contacts s'affiche correctement
- ✅ L'avertissement React disparaît
- ✅ L'interface reste fonctionnelle même en mode temporaire

## Gestion des Erreurs

Le code frontend inclut déjà une gestion robuste des erreurs :

```typescript
try {
  const { data: count, error } = await supabase
    .rpc('get_user_contacts_count', { p_user_id: intervenant.id });
  
  if (!error) {
    counts[intervenant.id] = count || 0;
  } else {
    console.warn(`⚠️ Erreur pour ${intervenant.email}:`, error);
    counts[intervenant.id] = 0;  // Fallback
  }
} catch (rpcError) {
  console.warn(`⚠️ Fonction RPC non disponible pour ${intervenant.email}`);
  counts[intervenant.id] = 0;  // Fallback
}
```

## Prochaines Étapes

1. **Déployer le script SQL corrigé** dans Supabase
2. **Tester l'interface** pour confirmer que les erreurs ont disparu
3. **Vérifier que les contacts s'affichent correctement** dans la liste des intervenants
4. **Tester l'ajout/suppression de contacts** pour s'assurer que tout fonctionne

---

**Note :** Si des erreurs persistent après le déploiement du script SQL, vérifiez les logs Supabase pour des erreurs supplémentaires. 