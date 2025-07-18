# 🔧 Guide de Résolution - Upload Fichiers AutoCAD

## 🚨 Problème Identifié

L'erreur indique que Supabase rejette les fichiers AutoCAD avec les types MIME :
- `application/dwg` (non supporté)
- `application/octet-stream` (non supporté)
- `image/jpeg` (incorrect pour les fichiers DWG)

## ✅ Solution Appliquée

### 1. **Correction du Code Frontend** ✅
Le fichier `src/pages/TaskDetails.tsx` a été modifié pour :
- Utiliser les vrais types MIME AutoCAD (`application/acad` pour DWG)
- Supprimer la tentative de contournement avec `image/jpeg`
- Gérer correctement les types MIME non reconnus

### 2. **Configuration Supabase** ⚠️ **À FAIRE**

Vous devez exécuter le script SQL pour configurer le bucket Supabase :

#### Étape 1 : Accéder à Supabase
1. Connectez-vous à votre dashboard Supabase
2. Allez dans l'onglet "SQL Editor"

#### Étape 2 : Exécuter le Script
1. Copiez le contenu du fichier `fix_autocad_mime_types.sql`
2. Collez-le dans l'éditeur SQL
3. Cliquez sur "Run"

#### Étape 3 : Vérifier la Configuration
Le script va :
- Mettre à jour le bucket `task_submissions` pour accepter les types MIME AutoCAD
- Créer les politiques RLS nécessaires
- Afficher la configuration mise à jour

## 🧪 Test de la Solution

### Test Automatique
1. Ouvrez la console du navigateur (F12)
2. Copiez le contenu du fichier `test_autocad_upload_fixed.js`
3. Collez-le dans la console et appuyez sur Entrée
4. Exécutez : `runAutoCADTest()`

### Test Manuel
1. Allez dans votre application
2. Essayez d'uploader un fichier DWG
3. Vérifiez que l'upload fonctionne sans erreur

## 📋 Types MIME Supportés

Après la configuration, le bucket acceptera :
- `application/acad` - Fichiers AutoCAD DWG
- `application/dxf` - Fichiers AutoCAD DXF
- `application/revit` - Fichiers Revit
- `application/sketchup` - Fichiers SketchUp
- `application/pdf` - Fichiers PDF
- `image/*` - Images (JPG, PNG, GIF, WEBP)
- `application/zip` - Archives ZIP
- `application/octet-stream` - Types non reconnus

## 🔍 Diagnostic

Si le problème persiste après avoir appliqué les corrections :

### 1. Vérifier la Configuration Supabase
```sql
SELECT * FROM storage.buckets WHERE id = 'task_submissions';
```

### 2. Vérifier les Politiques RLS
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

### 3. Test avec le Script de Diagnostic
Exécutez dans la console du navigateur :
```javascript
checkBucketConfiguration();
```

## 🆘 Dépannage

### Erreur "mime type not supported"
- Vérifiez que le script SQL a été exécuté
- Vérifiez que les types MIME AutoCAD sont dans la liste autorisée

### Erreur "bucket not found"
- Vérifiez que le bucket `task_submissions` existe
- Créez-le manuellement si nécessaire

### Erreur "permission denied"
- Vérifiez que les politiques RLS sont créées
- Vérifiez que l'utilisateur est authentifié

## 📞 Support

Si le problème persiste :
1. Exécutez le script de diagnostic complet
2. Collectez les logs d'erreur
3. Vérifiez la configuration Supabase
4. Contactez l'équipe technique avec les détails

---

**Note** : Cette solution utilise les vrais types MIME AutoCAD au lieu de contourner les restrictions, ce qui est plus propre et plus fiable. 