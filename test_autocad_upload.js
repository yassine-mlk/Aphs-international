// Script de test pour diagnostiquer les problèmes d'upload de fichiers AutoCAD
// À exécuter dans la console du navigateur

// Test des uploads de fichiers
async function testAutoCADUpload() {
  console.log('🧪 Test des uploads de fichiers AutoCAD...');
  
  try {
    // Vérifier la configuration du bucket
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Erreur lors de la vérification des buckets:', bucketsError);
      return;
    }
    
    console.log('✅ Buckets disponibles:', buckets.map(b => b.name));
    
    // Vérifier le bucket task_submissions
    const { data: files, error: filesError } = await supabase.storage
      .from('task_submissions')
      .list('', { limit: 5 });
    
    if (filesError) {
      console.error('❌ Erreur lors de la vérification du bucket task_submissions:', filesError);
      return;
    }
    
    console.log('✅ Fichiers dans task_submissions:', files?.length || 0);
    
    // Vérifier les politiques RLS
    console.log('🔍 Vérification des politiques RLS...');
    
    // Test de création d'URL signée
    const testFileName = `test_autocad_${Date.now()}.dwg`;
    console.log('📝 Test de création d\'URL signée pour:', testFileName);
    
    const { data: signedURLData, error: signedURLError } = await supabase.storage
      .from('task_submissions')
      .createSignedUploadUrl(testFileName);
    
    if (signedURLError) {
      console.error('❌ Erreur lors de la création de l\'URL signée:', signedURLError);
      return;
    }
    
    console.log('✅ URL signée créée avec succès');
    console.log('📋 Détails de l\'URL signée:', {
      signedUrl: signedURLData.signedUrl.substring(0, 100) + '...',
      path: signedURLData.path,
      token: signedURLData.token ? 'Présent' : 'Absent'
    });
    
    // Test d'upload avec un fichier factice
    console.log('📤 Test d\'upload avec fichier factice...');
    
    // Créer un fichier factice (1KB de données)
    const fakeFile = new File(['A'.repeat(1024)], 'test.dwg', { type: 'application/acad' });
    
    const uploadResponse = await fetch(signedURLData.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/acad',
        'Cache-Control': '3600'
      },
      body: fakeFile,
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Upload échoué:', uploadResponse.status, errorText);
      return;
    }
    
    console.log('✅ Upload réussi avec le fichier factice');
    
    // Vérifier que le fichier est accessible
    const { data: urlData } = supabase.storage
      .from('task_submissions')
      .getPublicUrl(signedURLData.path);
    
    console.log('✅ URL publique générée:', urlData.publicUrl);
    
    // Nettoyer le fichier de test
    const { error: deleteError } = await supabase.storage
      .from('task_submissions')
      .remove([signedURLData.path]);
    
    if (deleteError) {
      console.warn('⚠️ Erreur lors du nettoyage:', deleteError);
    } else {
      console.log('✅ Fichier de test supprimé');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Test des limites de taille
async function testFileSizeLimits() {
  console.log('📏 Test des limites de taille...');
  
  try {
    // Créer des fichiers de différentes tailles
    const sizes = [
      { name: 'small.dwg', size: 1024 * 1024 }, // 1MB
      { name: 'medium.dwg', size: 5 * 1024 * 1024 }, // 5MB
      { name: 'large.dwg', size: 10 * 1024 * 1024 }, // 10MB
      { name: 'xlarge.dwg', size: 50 * 1024 * 1024 }, // 50MB
    ];
    
    for (const fileInfo of sizes) {
      console.log(`📤 Test avec ${fileInfo.name} (${Math.round(fileInfo.size / (1024 * 1024))}MB)...`);
      
      const fakeFile = new File(['A'.repeat(fileInfo.size)], fileInfo.name, { type: 'application/acad' });
      
      // Test d'upload direct
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('task_submissions')
          .upload(`test_${Date.now()}_${fileInfo.name}`, fakeFile, {
            contentType: 'application/acad',
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          console.log(`❌ Upload direct échoué pour ${fileInfo.name}:`, uploadError.message);
        } else {
          console.log(`✅ Upload direct réussi pour ${fileInfo.name}`);
          
          // Nettoyer
          await supabase.storage
            .from('task_submissions')
            .remove([uploadData.path]);
        }
      } catch (error) {
        console.log(`❌ Erreur pour ${fileInfo.name}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test des limites:', error);
  }
}

// Test des types MIME
async function testMimeTypes() {
  console.log('🎯 Test des types MIME...');
  
  const mimeTests = [
    { name: 'test.dwg', type: 'application/acad', expected: 'application/acad' },
    { name: 'test.dwg', type: 'application/octet-stream', expected: 'application/acad' },
    { name: 'test.dwg', type: '', expected: 'application/acad' },
    { name: 'test.pdf', type: 'application/pdf', expected: 'application/pdf' },
    { name: 'test.doc', type: 'application/msword', expected: 'application/msword' },
  ];
  
  for (const test of mimeTests) {
    console.log(`📝 Test: ${test.name} avec type "${test.type}"`);
    
    const fakeFile = new File(['test'], test.name, { type: test.type });
    
    // Déterminer le Content-Type approprié
    let contentType = fakeFile.type;
    const fileExt = test.name.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'dwg') {
      contentType = 'application/acad';
    } else if (!contentType || contentType === 'application/octet-stream') {
      const mimeTypes = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'dwg': 'application/acad'
      };
      contentType = mimeTypes[fileExt] || 'application/octet-stream';
    }
    
    console.log(`  → Type détecté: ${contentType}`);
    console.log(`  → Attendu: ${test.expected}`);
    console.log(`  → ${contentType === test.expected ? '✅' : '❌'} Match`);
  }
}

// Fonction principale de test
async function runAutoCADTests() {
  console.log('🚀 Démarrage des tests AutoCAD...');
  
  await testAutoCADUpload();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testFileSizeLimits();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testMimeTypes();
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('🎉 Tests terminés');
}

// Exporter les fonctions pour utilisation manuelle
window.testAutoCADUpload = testAutoCADUpload;
window.testFileSizeLimits = testFileSizeLimits;
window.testMimeTypes = testMimeTypes;
window.runAutoCADTests = runAutoCADTests;

// Exécuter les tests automatiquement
runAutoCADTests(); 