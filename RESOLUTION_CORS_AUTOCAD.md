# 🔧 Résolution des Problèmes CORS et Upload AutoCAD

## 🚨 Problème Identifié

L'erreur CORS indique que Supabase n'accepte pas les fichiers `.dwg` (AutoCAD) par défaut :

```
[Error] Origin http://localhost:8080 is not allowed by Access-Control-Allow-Origin. Status code: 502
[Error] Fetch API cannot load https://vcxcxhgmpcgdjabuxcuv.supabase.co/storage/v1/object/task_submissions/task_0e961586-45b7-47d5-8039-a71de00f6290_1752859893324.dwg
```

## 🔍 Causes du Problème

### **1. Types MIME Non Autorisés**
- ❌ Supabase n'accepte que certains types MIME par défaut
- ❌ Les fichiers `.dwg` ne sont pas dans la liste autorisée
- ❌ Configuration bucket restrictive

### **2. Configuration CORS**
- ❌ Origine `localhost:8080` non autorisée
- ❌ Politiques de sécurité trop restrictives
- ❌ Bucket non configuré pour tous les types de fichiers

### **3. Limites de Taille**
- ❌ Fichiers AutoCAD souvent volumineux (>10MB)
- ❌ Limites Supabase dépassées
- ❌ Timeout lors de l'upload

## ✅ Solution Complète

### **Étape 1: Configuration du Bucket Supabase**

Exécutez le script `configure_task_submissions_bucket.sql` dans votre console SQL Supabase :

```sql
-- Configuration du bucket task_submissions pour accepter tous les types de fichiers
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task_submissions',
  'task_submissions', 
  true,  -- bucket public
  52428800, -- 50MB en bytes
  ARRAY['*/*'] -- Accepter tous les types MIME
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['*/*'];
```

### **Étape 2: Configuration des Politiques RLS**

```sql
-- Politiques pour permettre l'upload et la lecture des fichiers
CREATE POLICY "Users can upload task submissions" ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'task_submissions' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view task submissions" ON storage.objects FOR SELECT 
USING (
  bucket_id = 'task_submissions' AND 
  auth.role() = 'authenticated'
);
```

### **Étape 3: Diagnostic Automatique**

Utilisez le script `diagnostic_storage_config.js` dans la console du navigateur :

```javascript
// Copiez le contenu du fichier diagnostic_storage_config.js
// Puis exécutez :
storageDiagnostic.runDiagnostic();
```

## 🧪 Tests de Vérification

### **Test 1: Configuration du Bucket**
```javascript
// Vérifier la configuration
const { data: buckets } = await supabase.storage.listBuckets();
const taskBucket = buckets.find(b => b.name === 'task_submissions');
console.log('Configuration:', taskBucket);
```

### **Test 2: Upload de Fichier Factice**
```javascript
// Créer un fichier DWG factice
const testFile = new File(['test'], 'test.dwg', { type: 'application/acad' });

// Test d'upload
const { data, error } = await supabase.storage
  .from('task_submissions')
  .upload(`test_${Date.now()}.dwg`, testFile, {
    contentType: 'application/acad'
  });

console.log('Upload result:', { data, error });
```

### **Test 3: Accès aux Fichiers**
```javascript
// Vérifier l'accès aux fichiers existants
const { data: files } = await supabase.storage
  .from('task_submissions')
  .list('', { limit: 5 });

console.log('Files accessible:', files);
```

## 🔧 Configuration Alternative (Si Problème Persiste)

### **Option 1: Bucket Privé avec URL Signée**
```sql
-- Créer un bucket privé
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task_submissions_private',
  'task_submissions_private', 
  false,  -- bucket privé
  52428800,
  ARRAY['*/*']
);
```

### **Option 2: Configuration CORS Personnalisée**
```sql
-- Ajouter des origines CORS spécifiques
UPDATE storage.buckets 
SET cors_origins = ARRAY['http://localhost:8080', 'http://localhost:3000', 'https://yourdomain.com']
WHERE id = 'task_submissions';
```

## 📊 Types MIME Supportés

### **Types AutoCAD**
- `application/acad` - AutoCAD DWG
- `application/dxf` - AutoCAD DXF
- `application/octet-stream` - Fichiers binaires génériques

### **Types Office**
- `application/pdf` - PDF
- `application/msword` - Word
- `application/vnd.ms-excel` - Excel
- `application/vnd.ms-powerpoint` - PowerPoint

### **Types Images**
- `image/jpeg` - JPEG
- `image/png` - PNG
- `image/gif` - GIF
- `image/webp` - WebP

### **Types Archives**
- `application/zip` - ZIP
- `application/x-rar-compressed` - RAR
- `application/x-7z-compressed` - 7Z

## 🚀 Optimisations Recommandées

### **1. Compression des Fichiers**
```javascript
// Recommandation pour les utilisateurs
if (file.size > 25 * 1024 * 1024) {
  alert('Fichier volumineux détecté. Considérez la compression avant upload.');
}
```

### **2. Upload Progressif**
```typescript
// Affichage du progrès en temps réel
const progressTimer = setInterval(() => {
  setUploadProgress(prev => {
    if (prev >= 80) {
      clearInterval(progressTimer);
      return 80;
    }
    return prev + 10;
  });
}, 300);
```

### **3. Retry Automatique**
```typescript
// Logique de retry en cas d'échec
let retryCount = 0;
const maxRetries = 3;

while (retryCount < maxRetries) {
  try {
    // Tentative d'upload
    break;
  } catch (error) {
    retryCount++;
    if (retryCount >= maxRetries) throw error;
    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
  }
}
```

## 🔍 Diagnostic Avancé

### **Logs à Vérifier**
1. **Console navigateur** : Erreurs JavaScript et CORS
2. **Network tab** : Requêtes HTTP échouées
3. **Supabase logs** : Erreurs côté serveur
4. **Storage logs** : Problèmes de bucket

### **Métriques à Surveiller**
- Taux de succès d'upload
- Temps moyen d'upload
- Taille moyenne des fichiers
- Types de fichiers les plus problématiques

## ✅ Checklist de Résolution

- [ ] Exécuter le script `configure_task_submissions_bucket.sql`
- [ ] Vérifier les politiques RLS
- [ ] Tester avec le script de diagnostic
- [ ] Vérifier les types MIME autorisés
- [ ] Tester l'upload d'un fichier factice
- [ ] Vérifier l'accès aux fichiers
- [ ] Tester avec un vrai fichier AutoCAD
- [ ] Vérifier les logs d'erreur

## 🆘 Support et Dépannage

### **Si le Problème Persiste**

1. **Vérifiez la Configuration Supabase**
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'task_submissions';
   ```

2. **Vérifiez les Politiques RLS**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects';
   ```

3. **Testez avec un Fichier Plus Petit**
   - Créez un fichier DWG de test (< 1MB)
   - Testez l'upload

4. **Vérifiez les Logs Supabase**
   - Allez dans le dashboard Supabase
   - Consultez les logs d'erreur

### **Contact Support**
Si le problème persiste après avoir suivi toutes les étapes :
1. Exécutez le script de diagnostic complet
2. Collectez les logs d'erreur
3. Fournissez les détails de configuration
4. Contactez l'équipe technique

## 📚 Ressources Supplémentaires

- [Documentation Supabase Storage](https://supabase.com/docs/guides/storage)
- [Configuration CORS Supabase](https://supabase.com/docs/guides/storage/configuring-cors)
- [Types MIME Supportés](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)
- [Gestion des Erreurs CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

**Note** : Cette solution permet d'accepter tous les types de fichiers dans le bucket `task_submissions`. Pour une sécurité renforcée, vous pouvez limiter les types MIME autorisés selon vos besoins spécifiques. 