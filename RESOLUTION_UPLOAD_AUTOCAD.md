# 🔧 Résolution des Problèmes d'Upload AutoCAD

## 🚨 Problème Identifié

L'upload de fichiers AutoCAD (.dwg) échoue avec une erreur 400 à 80% de progression.

### **Erreur Typique :**
```
[Error] Failed to load resource: the server responded with a status of 400 ()
[Error] Erreur lors de la soumission de la tâche: Error: Upload failed with status: 400
```

## 🔍 Causes Possibles

### **1. Taille de Fichier**
- ❌ Fichiers AutoCAD trop volumineux (>50MB)
- ❌ Limites Supabase dépassées
- ❌ Timeout lors de l'upload

### **2. Type MIME Incorrect**
- ❌ `application/octet-stream` au lieu de `application/acad`
- ❌ Type non reconnu par Supabase
- ❌ Configuration bucket incorrecte

### **3. Configuration Supabase**
- ❌ Politiques RLS restrictives
- ❌ Bucket non configuré pour les fichiers AutoCAD
- ❌ Permissions insuffisantes

## ✅ Solutions Implémentées

### **1. Gestion Améliorée des Types MIME**

```typescript
// Déterminer le Content-Type approprié
let contentType = selectedFile.type;
if (fileExt === 'dwg') {
  contentType = 'application/acad'; // Type MIME pour AutoCAD
} else if (!contentType || contentType === 'application/octet-stream') {
  // Fallback pour les types non reconnus
  const mimeTypes: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'zip': 'application/zip',
    'dwg': 'application/acad'
  };
  contentType = mimeTypes[fileExt] || 'application/octet-stream';
}
```

### **2. Vérification de la Taille**

```typescript
// Vérifier la taille du fichier (limite à 50MB pour les fichiers AutoCAD)
const maxSize = selectedFile.name.toLowerCase().endsWith('.dwg') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
if (selectedFile.size > maxSize) {
  throw new Error(`Le fichier est trop volumineux. Taille maximale : ${Math.round(maxSize / (1024 * 1024))}MB`);
}
```

### **3. Upload Hybride (Direct + URL Signée)**

```typescript
// Essayer d'abord l'upload direct pour les petits fichiers
let fileUrl: string;
let uploadSuccess = false;

if (selectedFile.size <= 5 * 1024 * 1024) { // 5MB
  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task_submissions')
      .upload(fileName, selectedFile, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false
      });
    
    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('task_submissions')
        .getPublicUrl(uploadData.path);
      
      fileUrl = urlData.publicUrl;
      uploadSuccess = true;
    }
  } catch (directUploadError) {
    console.log('Upload direct échoué, passage à l\'URL signée...');
  }
}

// Si l'upload direct échoue, utiliser l'URL signée
if (!uploadSuccess) {
  // Logique d'upload avec URL signée
}
```

### **4. Gestion d'Erreur Améliorée**

```typescript
if (!uploadResponse.ok) {
  const errorText = await uploadResponse.text();
  console.error('Upload response error:', uploadResponse.status, errorText);
  throw new Error(`Upload failed with status: ${uploadResponse.status} - ${errorText}`);
}
```

## 🧪 Tests de Diagnostic

### **Script de Test**
Utilisez le fichier `test_autocad_upload.js` dans la console :

```javascript
// Tests automatiques
runAutoCADTests();

// Tests individuels
testAutoCADUpload();
testFileSizeLimits();
testMimeTypes();
```

### **Vérifications Manuelles**

1. **Vérifier la Configuration Supabase**
   ```sql
   -- Vérifier les politiques RLS
   SELECT * FROM storage.policies WHERE bucket_id = 'task_submissions';
   ```

2. **Vérifier les Limites de Taille**
   ```javascript
   // Dans la console
   console.log('Taille max DWG:', 50 * 1024 * 1024, 'bytes');
   console.log('Taille max autres:', 10 * 1024 * 1024, 'bytes');
   ```

3. **Vérifier les Types MIME**
   ```javascript
   // Tester un fichier
   const file = new File(['test'], 'test.dwg', { type: 'application/acad' });
   console.log('Type MIME:', file.type);
   ```

## 🔧 Configuration Supabase

### **1. Politiques RLS pour task_submissions**

```sql
-- Politique d'insertion
CREATE POLICY "Users can upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'task_submissions' AND
  auth.role() = 'authenticated'
);

-- Politique de lecture
CREATE POLICY "Users can view files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'task_submissions' AND
  auth.role() = 'authenticated'
);

-- Politique de mise à jour
CREATE POLICY "Users can update files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'task_submissions' AND
  auth.role() = 'authenticated'
);
```

### **2. Configuration du Bucket**

```sql
-- Vérifier la configuration
SELECT * FROM storage.buckets WHERE id = 'task_submissions';

-- Mettre à jour si nécessaire
UPDATE storage.buckets 
SET file_size_limit = 52428800, -- 50MB
    allowed_mime_types = ARRAY['application/acad', 'application/pdf', 'application/msword', 'image/*']
WHERE id = 'task_submissions';
```

## 📊 Limites Recommandées

### **Tailles de Fichiers**
| Type | Taille Max | Recommandé |
|------|------------|------------|
| **AutoCAD (.dwg)** | 50MB | < 25MB |
| **PDF** | 10MB | < 5MB |
| **Word/Excel** | 10MB | < 5MB |
| **Images** | 10MB | < 2MB |

### **Types MIME Supportés**
- `application/acad` - AutoCAD
- `application/pdf` - PDF
- `application/msword` - Word
- `application/vnd.ms-excel` - Excel
- `image/jpeg`, `image/png` - Images
- `application/zip` - Archives

## 🚀 Optimisations

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
1. **Console navigateur** : Erreurs JavaScript
2. **Network tab** : Requêtes HTTP échouées
3. **Supabase logs** : Erreurs côté serveur
4. **Storage logs** : Problèmes de bucket

### **Métriques à Surveiller**
- Taux de succès d'upload
- Temps moyen d'upload
- Taille moyenne des fichiers
- Types de fichiers les plus problématiques

## ✅ Checklist de Résolution

- [ ] Vérifier la taille du fichier (< 50MB pour DWG)
- [ ] Vérifier le type MIME (`application/acad`)
- [ ] Tester l'upload avec le script de diagnostic
- [ ] Vérifier les politiques RLS Supabase
- [ ] Vérifier la configuration du bucket
- [ ] Tester avec un fichier plus petit
- [ ] Vérifier les logs d'erreur détaillés

## 📞 Support

Si le problème persiste :
1. Exécuter le script de diagnostic
2. Vérifier les logs Supabase
3. Tester avec un fichier factice
4. Contacter l'équipe technique avec les logs 