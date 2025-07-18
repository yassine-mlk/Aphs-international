// Script de diagnostic pour vérifier la configuration du stockage Supabase
// À exécuter dans la console du navigateur

console.log('🔍 Diagnostic de la configuration du stockage Supabase...');

// Fonction pour tester la configuration du bucket
async function testBucketConfiguration() {
  console.log('\n📦 Test de la configuration du bucket task_submissions...');
  
  try {
    // 1. Vérifier si le bucket existe
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
    console.log('📋 Configuration du bucket:', {
      id: taskSubmissionsBucket.id,
      name: taskSubmissionsBucket.name,
      public: taskSubmissionsBucket.public,
      fileSizeLimit: taskSubmissionsBucket.file_size_limit,
      allowedMimeTypes: taskSubmissionsBucket.allowed_mime_types
    });
    
    // 2. Vérifier les types MIME autorisés
    if (!taskSubmissionsBucket.allowed_mime_types || 
        !taskSubmissionsBucket.allowed_mime_types.includes('*/*')) {
      console.warn('⚠️  Le bucket n\'accepte pas tous les types MIME');
      console.log('Types autorisés:', taskSubmissionsBucket.allowed_mime_types);
    } else {
      console.log('✅ Le bucket accepte tous les types MIME');
    }
    
    // 3. Vérifier la limite de taille
    if (taskSubmissionsBucket.file_size_limit < 52428800) { // 50MB
      console.warn('⚠️  La limite de taille est inférieure à 50MB');
      console.log('Limite actuelle:', Math.round(taskSubmissionsBucket.file_size_limit / (1024 * 1024)), 'MB');
    } else {
      console.log('✅ La limite de taille est suffisante pour les fichiers AutoCAD');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test de configuration:', error);
    return false;
  }
}

// Fonction pour tester l'upload d'un fichier factice
async function testFileUpload() {
  console.log('\n📤 Test d\'upload de fichier factice...');
  
  try {
    // Créer un fichier factice DWG
    const testContent = 'Test AutoCAD file content';
    const testFile = new File([testContent], 'test.dwg', { 
      type: 'application/acad' 
    });
    
    console.log('📝 Fichier de test créé:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type
    });
    
    // Test d'upload direct
    const fileName = `test_upload_${Date.now()}.dwg`;
    console.log('📤 Tentative d\'upload direct...');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task_submissions')
      .upload(fileName, testFile, {
        contentType: 'application/acad',
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
    console.error('❌ Erreur lors du test d\'upload:', error);
    return false;
  }
}

// Fonction pour tester les politiques RLS
async function testRLSPolicies() {
  console.log('\n🔒 Test des politiques RLS...');
  
  try {
    // Test de lecture des fichiers
    const { data: files, error: listError } = await supabase.storage
      .from('task_submissions')
      .list('', { limit: 5 });
    
    if (listError) {
      console.error('❌ Erreur lors de la lecture des fichiers:', listError);
      return false;
    }
    
    console.log('✅ Lecture des fichiers autorisée');
    console.log('📁 Fichiers trouvés:', files?.length || 0);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test RLS:', error);
    return false;
  }
}

// Fonction principale de diagnostic
async function runDiagnostic() {
  console.log('🚀 Démarrage du diagnostic complet...');
  
  const results = {
    bucketConfig: false,
    fileUpload: false,
    rlsPolicies: false
  };
  
  // Test 1: Configuration du bucket
  results.bucketConfig = await testBucketConfiguration();
  
  // Test 2: Upload de fichiers
  if (results.bucketConfig) {
    results.fileUpload = await testFileUpload();
  }
  
  // Test 3: Politiques RLS
  results.rlsPolicies = await testRLSPolicies();
  
  // Résumé
  console.log('\n📊 Résumé du diagnostic:');
  console.log('✅ Configuration du bucket:', results.bucketConfig ? 'OK' : 'ÉCHEC');
  console.log('✅ Upload de fichiers:', results.fileUpload ? 'OK' : 'ÉCHEC');
  console.log('✅ Politiques RLS:', results.rlsPolicies ? 'OK' : 'ÉCHEC');
  
  if (results.bucketConfig && results.fileUpload && results.rlsPolicies) {
    console.log('\n🎉 Tous les tests sont passés ! Le stockage est correctement configuré.');
  } else {
    console.log('\n⚠️  Certains tests ont échoué. Vérifiez la configuration Supabase.');
    
    if (!results.bucketConfig) {
      console.log('💡 Solution: Exécutez le script configure_task_submissions_bucket.sql');
    }
    
    if (!results.fileUpload) {
      console.log('💡 Solution: Vérifiez les types MIME autorisés et les limites de taille');
    }
    
    if (!results.rlsPolicies) {
      console.log('💡 Solution: Vérifiez les politiques RLS du bucket');
    }
  }
  
  return results;
}

// Exporter les fonctions pour utilisation
window.storageDiagnostic = {
  runDiagnostic,
  testBucketConfiguration,
  testFileUpload,
  testRLSPolicies
};

console.log('📋 Script de diagnostic chargé. Utilisez storageDiagnostic.runDiagnostic() pour démarrer.'); 