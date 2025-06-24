# Résolution de l'Erreur 403 - Notifications RLS

## 🚨 Problème Identifié

Vous rencontrez cette erreur :
```
[Error] Failed to load resource: the server responded with a status of 403 () (notifications, line 0)
[Error] new row violates row-level security policy for table "notifications"
```

## 🔍 Cause du Problème

Les politiques de sécurité RLS (Row Level Security) créées pour la table `notifications` sont **trop restrictives**. Elles ne permettaient qu'aux admins de créer des notifications, mais le code frontend essaie de créer des notifications depuis tous types d'utilisateurs.

## ✅ Solution Complète

### Étape 1 : Corriger les Politiques RLS

**Exécutez le script** `fix_notifications_rls_policies.sql` dans Supabase SQL Editor.

Ce script va :
- ✅ Supprimer les politiques trop restrictives
- ✅ Créer des politiques plus flexibles
- ✅ Permettre à tous les utilisateurs authentifiés de créer des notifications
- ✅ Maintenir la sécurité (chacun ne voit que ses notifications)

### Étape 2 : Redémarrer l'Application

```bash
# Arrêtez votre serveur de développement
Ctrl + C

# Redémarrez l'application
npm run dev
# ou
yarn dev
# ou
bun dev
```

### Étape 3 : Tester les Notifications

Testez ces fonctionnalités qui devraient maintenant fonctionner :
- ✅ Assignation de tâches (notifications aux intervenants)
- ✅ Validation de tâches (notifications aux admins)
- ✅ Ajout à des projets (notifications aux intervenants)
- ✅ Demandes de réunion (notifications aux admins)

## 🔧 Nouvelles Politiques RLS

### Politiques Après Correction :

1. **"Users can view their own notifications"**
   - Les utilisateurs voient uniquement leurs propres notifications

2. **"Users can update their own notifications"**
   - Les utilisateurs peuvent marquer leurs notifications comme lues

3. **"Authenticated users can create notifications"**
   - Tous les utilisateurs authentifiés peuvent créer des notifications

4. **"Admins can manage all notifications"**
   - Les admins ont un accès complet à toutes les notifications

## 🔒 Sécurité Maintenue

Même avec les politiques corrigées, la sécurité reste assurée :

- ❌ **Un utilisateur NE PEUT PAS** voir les notifications d'un autre utilisateur
- ❌ **Un utilisateur NE PEUT PAS** modifier les notifications d'autrui
- ✅ **Seuls les admins** peuvent voir toutes les notifications
- ✅ **RLS reste activé** - la protection est maintenue

## 🧪 Vérification du Fonctionnement

### Après avoir appliqué les corrections, vérifiez :

1. **Console développeur** - Plus d'erreur 403
2. **Dashboard** - Les notifications s'affichent
3. **Assignation de tâches** - Les notifications sont créées
4. **Actions admin** - Les notifications pour admins fonctionnent

### Commandes de Vérification SQL (Optionnel) :

```sql
-- Voir les politiques actuelles
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'notifications';

-- Tester une insertion
INSERT INTO notifications (user_id, type, title, message) 
VALUES (auth.uid(), 'task_assigned', 'Test', 'Test notification');
```

## 🔄 Si le Problème Persiste

### Scénarios possibles :

**1. Cache du navigateur :**
```bash
# Videz le cache ou utilisez mode incognito
Ctrl + Shift + Delete (Chrome)
Cmd + Shift + Delete (Mac)
```

**2. Session Supabase :**
```typescript
// Vérifiez que l'utilisateur est bien connecté
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
```

**3. Vérification des permissions :**
```sql
-- Dans Supabase SQL Editor
SELECT auth.uid(); -- Doit retourner l'ID de l'utilisateur connecté
```

## 📋 Résumé des Corrections Appliquées

### Changements SQL :
- ✅ **Politiques RLS corrigées** - Plus flexibles mais sécurisées
- ✅ **Test automatique** inclus dans le script

### Changements Frontend :
- ✅ **useNotificationTriggers.ts** - Utilise `user_id` au lieu de `id`
- ✅ **Compatibilité** avec la structure de base existante

### Résultat Attendu :
- ✅ **Erreur 403 résolue**
- ✅ **Notifications fonctionnelles**
- ✅ **Sécurité maintenue**
- ✅ **Performance optimisée**

---

## 🎯 Actions Immédiates

1. **Exécutez** `fix_notifications_rls_policies.sql`
2. **Redémarrez** votre application
3. **Testez** les notifications
4. **Vérifiez** qu'il n'y a plus d'erreurs 403

**Temps estimé :** 5 minutes
**Impact :** Résolution complète du problème de notifications 