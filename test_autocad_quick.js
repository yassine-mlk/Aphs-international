// Test rapide pour vérifier l'upload de fichiers AutoCAD
// À exécuter dans la console du navigateur après avoir configuré le bucket

console.log('🧪 Test rapide d\'upload AutoCAD...');

async function quickAutoCADTest() {
  try {
    // 1. Créer un fichier DWG factice
    const testContent = 'Test AutoCAD file content - ' + Date.now();
    const testFile = new File([testContent], 'test_autocad.dwg', { 
      type: 'application/octet-stream' // Type générique accepté
    });
    
    console.log('📝 Fichier de test créé:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type
    });
    
    // 2. Test d'upload direct
    const fileName = `quick_test_${Date.now()}.dwg`;
    console.log('📤 Tentative d\'upload direct...');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task_submissions')
      .upload(fileName, testFile, {
        contentType: 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Erreur d\'upload direct:', uploadError);
      
      // 3. Test avec URL signée
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
          'Content-Type': 'application/octet-stream',
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
      
    } else {
      console.log('✅ Upload direct réussi !');
      
      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('task_submissions')
        .getPublicUrl(uploadData.path);
      
      console.log('🔗 URL publique:', urlData.publicUrl);
    }
    
    console.log('🎉 Test réussi ! L\'upload de fichiers AutoCAD fonctionne.');
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    return false;
  }
}

// Exécuter le test
quickAutoCADTest().then(success => {
  if (success) {
    console.log('✅ Configuration correcte - Vous pouvez maintenant uploader des fichiers AutoCAD');
  } else {
    console.log('❌ Problème détecté - Vérifiez la configuration Supabase');
  }
});

// Fonction pour tester avec un vrai fichier
window.testRealAutoCAD = async (file) => {
  if (!file) {
    console.error('❌ Aucun fichier fourni');
    return;
  }
  
  console.log('🧪 Test avec un vrai fichier AutoCAD:', file.name);
  
  try {
    const fileName = `real_test_${Date.now()}_${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('task_submissions')
      .upload(fileName, file, {
        contentType: 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Erreur upload:', error);
      return;
    }
    
    const { data: urlData } = supabase.storage
      .from('task_submissions')
      .getPublicUrl(data.path);
    
    console.log('✅ Upload réussi !');
    console.log('🔗 URL:', urlData.publicUrl);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

console.log('📋 Script de test chargé. Utilisez testRealAutoCAD(file) pour tester avec un vrai fichier.'); 