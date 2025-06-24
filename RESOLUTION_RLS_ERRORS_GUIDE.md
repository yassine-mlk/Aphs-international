# Guide de résolution : Erreur RLS 403 lors de l'ajout de participants

## 🚨 Problème identifié

**Erreur**: `[Error] Erreur sauvegarde enregistrement: – {statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy"}`

**Cause**: Problème avec les politiques de sécurité RLS (Row Level Security) dans Supabase.

## 🔧 Solution

### Étape 1: Exécuter le script de correction

Exécutez le script SQL suivant dans **Supabase SQL Editor** :

```sql
-- Script dans le fichier: fix_meeting_recordings_rls.sql
```

### Étape 2: Vérifier les tables nécessaires

Assurez-vous que ces tables existent avec les bonnes structures :

1. **meeting_recordings** - avec la colonne `meeting_id`
2. **video_meeting_request_participants** - avec les bonnes politiques RLS
3. **profiles** - table des profils utilisateurs

### Étape 3: Tester la correction

1. **Connectez-vous** en tant qu'intervenant
2. **Créez une demande** de vidéoconférence avec des participants
3. **Vérifiez** qu'aucune erreur 403 n'apparaît

## 🔍 Diagnostic des problèmes

### Commandes de diagnostic

```sql
-- Vérifier l'état des politiques RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('meeting_recordings', 'video_meeting_request_participants');

-- Vérifier les politiques existantes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('meeting_recordings', 'video_meeting_request_participants');

-- Diagnostiquer pour un utilisateur spécifique
SELECT * FROM diagnose_rls_issues(auth.uid());
```

### Tests de fonctionnement

```sql
-- Test 1: Vérifier l'accès aux enregistrements
SELECT * FROM meeting_recordings WHERE recorded_by = auth.uid();

-- Test 2: Vérifier l'accès aux participants de demandes
SELECT * FROM video_meeting_request_participants WHERE user_id = auth.uid();

-- Test 3: Vérifier les profils
SELECT * FROM profiles WHERE user_id = auth.uid();
```

## ⚠️ Points importants

### 1. Structure modifiée

- **meeting_recordings** : Ajout de `meeting_id` pour lier aux réunions
- **Suppression** de la contrainte problématique `auth.users(id)`
- **Politiques** simplifiées pour éviter les blocages

### 2. Politiques corrigées

- **Enregistrements** : Autorise les utilisateurs à créer leurs propres enregistrements
- **Participants** : Permet aux utilisateurs d'ajouter des participants à leurs demandes
- **Admins** : Conservent tous les droits de gestion

### 3. Groupes de travail

Les intervenants peuvent maintenant :
- ✅ Ajouter des participants depuis leur groupe de travail
- ✅ Créer des demandes de réunion sans erreur 403
- ✅ Enregistrer leurs réunions

## 🔄 Étapes de vérification

1. **Exécuter** `fix_meeting_recordings_rls.sql`
2. **Redémarrer** l'application frontend si nécessaire
3. **Tester** la création d'une demande avec participants
4. **Vérifier** qu'aucune erreur 403 n'apparaît dans la console

## 🛠️ Si le problème persiste

1. **Vérifiez** que l'utilisateur a un profil dans la table `profiles`
2. **Contrôlez** que les politiques RLS sont bien activées
3. **Testez** les requêtes de diagnostic ci-dessus
4. **Consultez** les logs Supabase pour plus de détails

## 📋 Logs à surveiller

- **Console navigateur** : Erreurs JavaScript côté client
- **Supabase Logs** : Erreurs de politique RLS
- **Network tab** : Réponses 403 des API calls

## ✅ Validation finale

Le problème est résolu quand :
- ✅ Plus d'erreur 403 dans la console
- ✅ Les participants s'ajoutent correctement aux demandes
- ✅ Les enregistrements se créent sans problème
- ✅ L'interface fonctionne normalement

---

**Note**: Ce guide résout spécifiquement l'erreur RLS 403 lors de l'ajout de participants depuis les groupes de travail dans les demandes de vidéoconférence. 