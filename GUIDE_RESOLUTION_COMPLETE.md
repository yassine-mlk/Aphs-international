# 🔧 Guide de Résolution Complète - Upload AutoCAD + Notifications

## 🚨 Problèmes Identifiés

1. **Problème MIME persistant** : Le serveur reçoit encore `application/dwg` au lieu de `application/acad`
2. **Erreur de contrainte de base de données** : Type de notification `task_status_changed` non supporté

## ✅ Solutions Appliquées

### 1. **Correction du Code Frontend** ✅
Le fichier `src/pages/TaskDetails.tsx` a été corrigé pour :
- ✅ Créer un nouveau fichier avec le bon type MIME (`fileWithCorrectType`)
- ✅ Utiliser ce fichier pour tous les uploads (direct et URL signée)
- ✅ Forcer l'override du type MIME du navigateur

### 2. **Scripts SQL à Exécuter** ⚠️ **À FAIRE**

#### Étape 1 : Configuration Supabase Storage
Exécutez le script `fix_autocad_mime_types.sql` dans Supabase SQL Editor :
- Configure le bucket `task_submissions` pour accepter les types MIME AutoCAD
- Crée les politiques RLS nécessaires

#### Étape 2 : Correction des Types de Notifications
Exécutez le script `fix_notification_types.sql` dans Supabase SQL Editor :
- Ajoute le type `task_status_changed` à la contrainte CHECK
- Met à jour tous les types de notifications supportés

## 🧪 Test de la Solution

### Test Automatique
1. Ouvrez la console du navigateur (F12)
2. Copiez le contenu de `test_autocad_upload_fixed.js`
3. Exécutez : `runAutoCADTest()`

### Test Manuel
1. Allez dans votre application
2. Essayez d'uploader un fichier DWG
3. Vérifiez que l'upload fonctionne sans erreur
4. Vérifiez que les notifications sont créées sans erreur

## 📋 Ordre d'Exécution des Scripts

### 1. **fix_autocad_mime_types.sql**
```sql
-- Configuration du bucket task_submissions
-- Accepte les types MIME AutoCAD : application/acad, application/dxf, etc.
```

### 2. **fix_notification_types.sql**
```sql
-- Ajoute le type task_status_changed à la contrainte CHECK
-- Met à jour tous les types de notifications supportés
```

## 🔍 Vérification Post-Correction

### Vérifier la Configuration Storage
```sql
SELECT * FROM storage.buckets WHERE id = 'task_submissions';
```

### Vérifier les Types de Notifications
```sql
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'notifications_type_check';
```

### Tester l'Upload
```javascript
// Dans la console du navigateur
checkBucketConfiguration();
```

## 🆘 Dépannage

### Si l'upload échoue encore
1. Vérifiez que le script `fix_autocad_mime_types.sql` a été exécuté
2. Vérifiez que les types MIME AutoCAD sont dans la liste autorisée
3. Testez avec le script de diagnostic

### Si les notifications échouent encore
1. Vérifiez que le script `fix_notification_types.sql` a été exécuté
2. Vérifiez que `task_status_changed` est dans la contrainte CHECK
3. Vérifiez les politiques RLS de la table notifications

### Erreurs Courantes
- **"mime type not supported"** → Exécutez `fix_autocad_mime_types.sql`
- **"violates check constraint"** → Exécutez `fix_notification_types.sql`
- **"permission denied"** → Vérifiez les politiques RLS

## 📞 Support

Si les problèmes persistent après avoir exécuté tous les scripts :
1. Collectez les logs d'erreur complets
2. Vérifiez la configuration Supabase
3. Testez avec les scripts de diagnostic
4. Contactez l'équipe technique avec les détails

---

**Note** : Cette solution corrige à la fois le problème d'upload AutoCAD et les erreurs de notifications, garantissant un fonctionnement complet du système. 