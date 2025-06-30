# Résolution du problème d'upload d'avatars

## Problème rencontré
```
StorageApiError: new row violates row-level security policy
```

## Cause
Le bucket `avatars` et ses politiques de sécurité RLS (Row Level Security) ne sont pas configurés dans Supabase Storage.

## Solutions

### Option 1: Politique sécurisée (recommandée)
Exécutez le script `setup_avatars_storage_policies.sql` dans votre console SQL Supabase.
Cette option permet uniquement aux utilisateurs de gérer leurs propres avatars.

### Option 2: Politique simplifiée (pour tests)
Si l'option 1 ne fonctionne pas, utilisez `simple_avatars_storage_policies.sql`.
Cette option permet à tous les utilisateurs authentifiés de gérer tous les avatars.

## Instructions d'exécution

1. **Connectez-vous à votre dashboard Supabase**
2. **Allez dans l'onglet "SQL Editor"**
3. **Copiez-collez le contenu d'un des fichiers SQL**
4. **Cliquez sur "Run"**

## Vérification

Après avoir exécuté le script, vous devriez voir:
- Le bucket `avatars` dans la section Storage
- Les politiques dans Storage → Settings → Policies

## Test

1. Allez dans `/dashboard/parametres`
2. Cliquez sur l'onglet "Profil" 
3. Essayez d'uploader une photo de profil
4. Vérifiez que l'upload fonctionne sans erreur

## Format des fichiers

Les avatars sont stockés avec le format: `{user_id}_{timestamp}.{extension}`
Exemple: `123e4567-e89b-12d3-a456-426614174000_1703123456789.jpg`

## Sécurité

- Taille maximum: 2MB
- Types autorisés: JPEG, PNG, GIF, WEBP
- Accès en lecture: Public
- Upload/modification/suppression: Utilisateurs authentifiés uniquement 