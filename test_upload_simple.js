// Test simple d'upload sans Content-Type
// À exécuter dans la console du navigateur

console.log('🧪 Test d\'upload simple sans Content-Type...');

async function testSimpleUpload() {
  try {
    // 1. Créer un fichier DWG factice
    const testContent = 'Test AutoCAD file content - ' + Date.now();
    const testFile = new File([testContent], 'test_simple.dwg', { 
      type: 'application/octet-stream'
    });
    
    console.log('📝 Fichier de test créé:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type
    });
    
    // 2. Test d'upload direct SANS Content-Type
    const fileName = `simple_test_${Date.now()}.dwg`;
    console.log('📤 Tentative d\'upload direct sans Content-Type...');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task_submissions')
      .upload(fileName, testFile, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Erreur d\'upload direct:', uploadError);
      
      // 3. Test avec URL signée SANS Content-Type
      console.log('🔄 Tentative avec URL signée sans Content-Type...');
      
      const { data: signedURLData, error: signedURLError } = await supabase.storage
        .from('task_submissions')
        .createSignedUploadUrl(fileName);
      
      if (signedURLError) {
        console.error('❌ Erreur URL signée:', signedURLError);
        return false;
      }
      
      console.log('✅ URL signée créée avec succès');
      
      // Upload avec l'URL signée SANS Content-Type
      const uploadResponse = await fetch(signedURLData.signedUrl, {
        method: 'PUT',
        body: testFile, // Pas de Content-Type
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
      
    } else {
      console.log('✅ Upload direct réussi !');
      
      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('task_submissions')
        .getPublicUrl(uploadData.path);
      
      console.log('🔗 URL publique:', urlData.publicUrl);
    }
    
    console.log('🎉 Test réussi ! L\'upload sans Content-Type fonctionne.');
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    return false;
  }
}

// Exécuter le test
testSimpleUpload().then(success => {
  if (success) {
    console.log('✅ Solution de contournement fonctionne - Vous pouvez maintenant uploader des fichiers AutoCAD');
  } else {
    console.log('❌ Problème persiste - Configuration Supabase requise');
    console.log('💡 Exécutez le script configure_task_submissions_bucket.sql dans Supabase');
  }
});

// Fonction pour tester avec un vrai fichier
window.testRealFileSimple = async (file) => {
  if (!file) {
    console.error('❌ Aucun fichier fourni');
    return;
  }
  
  console.log('🧪 Test avec un vrai fichier:', file.name);
  
  try {
    const fileName = `real_simple_${Date.now()}_${file.name}`;
    
    // Essayer d'abord l'upload direct sans Content-Type
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

console.log('📋 Script de test simple chargé. Utilisez testRealFileSimple(file) pour tester avec un vrai fichier.'); 