// Script de test pour vérifier l'upload de fichiers AutoCAD avec les vrais types MIME
// À exécuter dans la console du navigateur après avoir appliqué les corrections

console.log('🧪 Test de l\'upload AutoCAD avec les vrais types MIME...');

// Fonction pour tester l'upload avec un fichier factice
async function testAutoCADUpload() {
  try {
    // 1. Créer un fichier DWG factice avec le bon type MIME
    const testContent = 'Test AutoCAD file content - ' + Date.now();
    const testFile = new File([testContent], 'test_autocad.dwg', { 
      type: 'application/acad' // Vrai type MIME pour AutoCAD
    });
    
    console.log('📝 Fichier de test créé:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type
    });
    
    // 2. Test d'upload direct
    const fileName = `test_autocad_${Date.now()}.dwg`;
    console.log('📤 Tentative d\'upload direct...');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task_submissions')
      .upload(fileName, testFile, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Erreur d\'upload direct:', uploadError);
      
      // Test avec URL signée
      console.log('🔄 Tentative avec URL signée...');
      const { data: signedURLData, error: signedURLError } = await supabase.storage
        .from('task_submissions')
        .createSignedUploadUrl(fileName);
      
      if (signedURLError) {
        console.error('❌ Erreur URL signée:', signedURLError);
        return false;
      }
      
      console.log('✅ URL signée créée avec succès');
      
      // Upload avec l'URL signée
      const uploadResponse = await fetch(signedURLData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/acad',
        },
        body: testFile,
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Erreur upload avec URL signée:', uploadResponse.status, errorText);
        return false;
      }
      
      console.log('✅ Upload avec URL signée réussi');
      
      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('task_submissions')
        .getPublicUrl(signedURLData.path);
      
      console.log('🔗 URL publique:', urlData.publicUrl);
      
      // Test d'accès au fichier
      const accessResponse = await fetch(urlData.publicUrl);
      if (accessResponse.ok) {
        console.log('✅ Accès au fichier réussi');
      } else {
        console.error('❌ Erreur d\'accès au fichier:', accessResponse.status);
      }
      
    } else {
      console.log('✅ Upload direct réussi');
      
      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('task_submissions')
        .getPublicUrl(uploadData.path);
      
      console.log('🔗 URL publique:', urlData.publicUrl);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    return false;
  }
}

// Fonction pour tester avec un vrai fichier
window.testRealAutoCADFile = async (file) => {
  if (!file) {
    console.error('❌ Aucun fichier fourni');
    return;
  }
  
  console.log('🧪 Test avec un vrai fichier AutoCAD:', file.name);
  
  try {
    const fileName = `real_autocad_${Date.now()}_${file.name}`;
    
    // Déterminer le bon type MIME
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    let contentType = file.type;
    
    if (fileExt === 'dwg') {
      contentType = 'application/acad';
    } else if (fileExt === 'dxf') {
      contentType = 'application/dxf';
    } else if (!contentType || contentType === 'application/octet-stream') {
      const mimeTypes = {
        'dwg': 'application/acad',
        'dxf': 'application/dxf',
        'rvt': 'application/revit',
        'skp': 'application/sketchup'
      };
      contentType = mimeTypes[fileExt] || 'application/octet-stream';
    }
    
    console.log('📋 Type MIME détecté:', contentType);
    
    // Essayer d'abord l'upload direct
    const { data, error } = await supabase.storage
      .from('task_submissions')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Erreur upload direct:', error);
      
      // Essayer avec URL signée
      const { data: signedURLData, error: signedURLError } = await supabase.storage
        .from('task_submissions')
        .createSignedUploadUrl(fileName);
      
      if (signedURLError) {
        console.error('❌ Erreur URL signée:', signedURLError);
        return;
      }
      
      const uploadResponse = await fetch(signedURLData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file,
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Erreur upload avec URL signée:', uploadResponse.status, errorText);
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('task_submissions')
        .getPublicUrl(signedURLData.path);
      
      console.log('✅ Upload réussi avec URL signée !');
      console.log('🔗 URL:', urlData.publicUrl);
      
    } else {
      const { data: urlData } = supabase.storage
        .from('task_submissions')
        .getPublicUrl(data.path);
      
      console.log('✅ Upload direct réussi !');
      console.log('🔗 URL:', urlData.publicUrl);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

// Fonction pour vérifier la configuration du bucket
async function checkBucketConfiguration() {
  console.log('🔍 Vérification de la configuration du bucket...');
  
  try {
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Erreur lors de la vérification des buckets:', bucketsError);
      return false;
    }
    
    const taskSubmissionsBucket = buckets.find(b => b.name === 'task_submissions');
    
    if (!taskSubmissionsBucket) {
      console.error('❌ Le bucket task_submissions n\'existe pas');
      return false;
    }
    
    console.log('✅ Bucket task_submissions trouvé');
    console.log('📋 Configuration:', {
      id: taskSubmissionsBucket.id,
      name: taskSubmissionsBucket.name,
      public: taskSubmissionsBucket.public,
      fileSizeLimit: taskSubmissionsBucket.file_size_limit,
      allowedMimeTypes: taskSubmissionsBucket.allowed_mime_types
    });
    
    // Vérifier si les types MIME AutoCAD sont autorisés
    const autocadTypes = ['application/acad', 'application/dxf', 'application/revit'];
    const hasAutoCADTypes = autocadTypes.some(type => 
      taskSubmissionsBucket.allowed_mime_types?.includes(type)
    );
    
    if (hasAutoCADTypes) {
      console.log('✅ Les types MIME AutoCAD sont autorisés');
    } else {
      console.warn('⚠️  Les types MIME AutoCAD ne sont pas autorisés');
      console.log('Types autorisés:', taskSubmissionsBucket.allowed_mime_types);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    return false;
  }
}

// Fonction principale de test
async function runAutoCADTest() {
  console.log('🚀 Démarrage du test AutoCAD...');
  
  // 1. Vérifier la configuration
  const configOk = await checkBucketConfiguration();
  
  if (!configOk) {
    console.error('❌ Configuration incorrecte. Exécutez le script fix_autocad_mime_types.sql');
    return;
  }
  
  // 2. Test avec fichier factice
  const uploadOk = await testAutoCADUpload();
  
  if (uploadOk) {
    console.log('🎉 Test réussi ! L\'upload AutoCAD fonctionne.');
    console.log('💡 Pour tester avec un vrai fichier, utilisez: testRealAutoCADFile(file)');
  } else {
    console.error('❌ Test échoué. Vérifiez la configuration Supabase.');
  }
}

// Exposer les fonctions globalement
window.runAutoCADTest = runAutoCADTest;
window.testAutoCADUpload = testAutoCADUpload;
window.checkBucketConfiguration = checkBucketConfiguration;

console.log('📋 Script de test AutoCAD chargé. Utilisez runAutoCADTest() pour démarrer le test.'); 