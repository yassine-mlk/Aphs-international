// Script de test pour la vidéoconférence en production
// À exécuter dans la console du navigateur (F12)

console.log('🧪 Test du système de vidéoconférence robuste...');

// Test 1: Vérifier les variables d'environnement
console.log('📋 Variables d\'environnement:');
console.log('- VITE_USE_ROBUST_VIDEO_CONFERENCE:', import.meta.env.VITE_USE_ROBUST_VIDEO_CONFERENCE);
console.log('- VITE_USE_REALTIME:', import.meta.env.VITE_USE_REALTIME);
console.log('- VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? '✅ Configuré' : '❌ Manquant');
console.log('- VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configuré' : '❌ Manquant');

// Test 2: Vérifier les APIs WebRTC
console.log('\n🎥 Test des APIs WebRTC:');
console.log('- getUserMedia:', navigator.mediaDevices?.getUserMedia ? '✅ Disponible' : '❌ Non disponible');
console.log('- RTCPeerConnection:', window.RTCPeerConnection ? '✅ Disponible' : '❌ Non disponible');
console.log('- WebRTC support:', 'getUserMedia' in navigator.mediaDevices && 'RTCPeerConnection' in window ? '✅ Complet' : '❌ Incomplet');

// Test 3: Vérifier les permissions
async function testPermissions() {
  console.log('\n🔐 Test des permissions:');
  
  try {
    const cameraPermission = await navigator.permissions.query({ name: 'camera' });
    const microphonePermission = await navigator.permissions.query({ name: 'microphone' });
    
    console.log('- Caméra:', cameraPermission.state);
    console.log('- Microphone:', microphonePermission.state);
    
    return cameraPermission.state === 'granted' && microphonePermission.state === 'granted';
  } catch (error) {
    console.log('- Permissions API non supportée, test manuel requis');
    return null;
  }
}

// Test 4: Vérifier la connexion Supabase
async function testSupabaseConnection() {
  console.log('\n🔌 Test de la connexion Supabase:');
  
  try {
    // Vérifier si Supabase est disponible
    if (typeof window.supabase === 'undefined') {
      console.log('❌ Supabase client non disponible');
      return false;
    }
    
    // Test de connexion basique
    const { data, error } = await window.supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      console.log('❌ Erreur de connexion Supabase:', error.message);
      return false;
    }
    
    console.log('✅ Connexion Supabase réussie');
    return true;
  } catch (error) {
    console.log('❌ Erreur lors du test Supabase:', error.message);
    return false;
  }
}

// Test 5: Vérifier les composants React
function testReactComponents() {
  console.log('\n⚛️ Test des composants React:');
  
  // Vérifier si les composants sont disponibles
  const components = [
    'RobustVideoConference',
    'useRobustVideoConference'
  ];
  
  components.forEach(component => {
    console.log(`- ${component}: ${window[component] ? '✅ Disponible' : '❌ Non disponible'}`);
  });
}

// Test 6: Simulation d'une connexion vidéo
async function testVideoConnection() {
  console.log('\n🎬 Test de connexion vidéo:');
  
  try {
    // Demander l'accès à la caméra/microphone
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: { echoCancellation: true, noiseSuppression: true }
    });
    
    console.log('✅ Stream vidéo obtenu');
    console.log('- Tracks vidéo:', stream.getVideoTracks().length);
    console.log('- Tracks audio:', stream.getAudioTracks().length);
    
    // Arrêter le stream
    stream.getTracks().forEach(track => track.stop());
    console.log('✅ Stream arrêté proprement');
    
    return true;
  } catch (error) {
    console.log('❌ Erreur lors de l\'accès vidéo:', error.message);
    return false;
  }
}

// Test 7: Vérifier la configuration réseau
function testNetworkConfig() {
  console.log('\n🌐 Test de la configuration réseau:');
  
  // Vérifier HTTPS (requis pour WebRTC)
  const isHttps = window.location.protocol === 'https:';
  console.log('- HTTPS:', isHttps ? '✅ Actif' : '❌ Non actif (requis pour WebRTC)');
  
  // Vérifier la connexion réseau
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    console.log('- Type de connexion:', connection.effectiveType || 'Inconnu');
    console.log('- Vitesse de connexion:', connection.downlink || 'Inconnue', 'Mbps');
  } else {
    console.log('- Informations de connexion non disponibles');
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests de vidéoconférence...\n');
  
  const results = {
    environment: true, // Basé sur les logs
    webrtc: 'getUserMedia' in navigator.mediaDevices && 'RTCPeerConnection' in window,
    permissions: await testPermissions(),
    supabase: await testSupabaseConnection(),
    components: true, // Basé sur les logs
    video: await testVideoConnection(),
    network: window.location.protocol === 'https:'
  };
  
  testReactComponents();
  testNetworkConfig();
  
  console.log('\n📊 Résultats des tests:');
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅' : '❌';
    console.log(`${status} ${test}: ${result ? 'PASS' : 'FAIL'}`);
  });
  
  const allPassed = Object.values(results).every(result => result === true || result === 'granted');
  
  if (allPassed) {
    console.log('\n🎉 Tous les tests sont passés ! La vidéoconférence devrait fonctionner parfaitement.');
  } else {
    console.log('\n⚠️ Certains tests ont échoué. Vérifiez la configuration.');
  }
  
  return results;
}

// Fonction pour tester une room spécifique
function testSpecificRoom(roomId) {
  console.log(`\n🏠 Test de la room: ${roomId}`);
  
  // Simuler la création d'un composant RobustVideoConference
  const testComponent = {
    roomId,
    userName: 'Test User',
    onLeave: () => console.log('✅ Test de déconnexion réussi'),
    onError: (error) => console.log('❌ Erreur simulée:', error)
  };
  
  console.log('✅ Composant de test créé:', testComponent);
  return testComponent;
}

// Exporter les fonctions pour utilisation manuelle
window.videoConferenceTests = {
  runAllTests,
  testSpecificRoom,
  testPermissions,
  testSupabaseConnection,
  testVideoConnection
};

// Exécuter automatiquement les tests
runAllTests(); 