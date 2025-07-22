// Script de test pour la vidéoconférence en production
// À exécuter dans la console du navigateur

console.log('🧪 Test de la vidéoconférence en production...');

// Test 1: Vérifier les APIs WebRTC
console.log('📡 Test 1: APIs WebRTC');
console.log('RTCPeerConnection:', typeof RTCPeerConnection !== 'undefined' ? '✅ Disponible' : '❌ Non disponible');
console.log('navigator.mediaDevices:', typeof navigator.mediaDevices !== 'undefined' ? '✅ Disponible' : '❌ Non disponible');
console.log('getUserMedia:', typeof navigator.mediaDevices?.getUserMedia !== 'undefined' ? '✅ Disponible' : '❌ Non disponible');

// Test 2: Vérifier WebSocket
console.log('\n🔌 Test 2: WebSocket');
console.log('WebSocket:', typeof WebSocket !== 'undefined' ? '✅ Disponible' : '❌ Non disponible');

// Test 3: Test de connexion WebSocket
console.log('\n🌐 Test 3: Connexion WebSocket');
const testWebSocket = () => {
  return new Promise((resolve) => {
    // URL de test (remplacer par votre URL Render)
    const wsUrl = 'wss://echo.websocket.org/';
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connecté avec succès');
      ws.close();
      resolve(true);
    };
    
    ws.onerror = (error) => {
      console.log('❌ Erreur WebSocket:', error);
      resolve(false);
    };
    
    // Timeout après 5 secondes
    setTimeout(() => {
      console.log('⏰ Timeout WebSocket');
      resolve(false);
    }, 5000);
  });
};

// Test 4: Test d'accès caméra
console.log('\n📹 Test 4: Accès caméra');
const testCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    console.log('✅ Accès caméra/micro réussi');
    console.log('Tracks vidéo:', stream.getVideoTracks().length);
    console.log('Tracks audio:', stream.getAudioTracks().length);
    
    // Arrêter le stream
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.log('❌ Erreur accès caméra:', error.message);
    return false;
  }
};

// Test 5: Test de création RTCPeerConnection
console.log('\n🔗 Test 5: RTCPeerConnection');
const testPeerConnection = () => {
  try {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });
    console.log('✅ RTCPeerConnection créé avec succès');
    peer.close();
    return true;
  } catch (error) {
    console.log('❌ Erreur RTCPeerConnection:', error.message);
    return false;
  }
};

// Exécuter tous les tests
const runAllTests = async () => {
  console.log('\n🚀 Exécution de tous les tests...\n');
  
  const results = {
    webrtc: typeof RTCPeerConnection !== 'undefined',
    websocket: typeof WebSocket !== 'undefined',
    websocketConnection: await testWebSocket(),
    camera: await testCamera(),
    peerConnection: testPeerConnection()
  };
  
  console.log('\n📊 Résultats des tests:');
  console.log('WebRTC APIs:', results.webrtc ? '✅' : '❌');
  console.log('WebSocket API:', results.websocket ? '✅' : '❌');
  console.log('Connexion WebSocket:', results.websocketConnection ? '✅' : '❌');
  console.log('Accès caméra:', results.camera ? '✅' : '❌');
  console.log('RTCPeerConnection:', results.peerConnection ? '✅' : '❌');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 Tous les tests sont passés ! La vidéoconférence devrait fonctionner.');
    console.log('\n📝 Instructions pour tester:');
    console.log('1. Ouvrez deux onglets de votre application');
    console.log('2. Connectez-vous avec des comptes différents');
    console.log('3. Rejoignez la même réunion');
    console.log('4. Vérifiez que vous pouvez vous voir mutuellement');
  } else {
    console.log('\n⚠️ Certains tests ont échoué. Vérifiez la configuration.');
    console.log('\n🔧 Solutions possibles:');
    if (!results.camera) {
      console.log('- Accordez les permissions caméra/microphone');
    }
    if (!results.websocketConnection) {
      console.log('- Vérifiez l\'URL du serveur WebSocket');
      console.log('- Vérifiez que le serveur Render.com est actif');
    }
  }
  
  return results;
};

// Instructions d'utilisation
console.log('\n📋 Instructions:');
console.log('1. Copiez ce script dans la console du navigateur');
console.log('2. Exécutez: runAllTests()');
console.log('3. Suivez les instructions affichées');

// Exporter la fonction de test
window.runAllTests = runAllTests;
window.testVideoConference = {
  testWebSocket,
  testCamera,
  testPeerConnection,
  runAllTests
};

console.log('\n✅ Script de test chargé. Exécutez runAllTests() pour commencer.'); 