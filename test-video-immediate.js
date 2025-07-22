// Test immédiat de la vidéoconférence
// Copiez ce script dans la console du navigateur

console.log('🧪 Test immédiat de la vidéoconférence...');

// Test 1: Vérifier les APIs
console.log('\n📡 Test 1: APIs WebRTC');
console.log('RTCPeerConnection:', typeof RTCPeerConnection !== 'undefined' ? '✅' : '❌');
console.log('getUserMedia:', typeof navigator.mediaDevices?.getUserMedia !== 'undefined' ? '✅' : '❌');
console.log('WebSocket:', typeof WebSocket !== 'undefined' ? '✅' : '❌');

// Test 2: Test d'accès caméra
console.log('\n📹 Test 2: Accès caméra');
const testCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    console.log('✅ Caméra/micro accessible');
    console.log('Tracks vidéo:', stream.getVideoTracks().length);
    console.log('Tracks audio:', stream.getAudioTracks().length);
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.log('❌ Erreur caméra:', error.message);
    return false;
  }
};

// Test 3: Test WebSocket
console.log('\n🔌 Test 3: WebSocket');
const testWebSocket = () => {
  return new Promise((resolve) => {
    const ws = new WebSocket('wss://echo.websocket.org/');
    ws.onopen = () => {
      console.log('✅ WebSocket connecté');
      ws.close();
      resolve(true);
    };
    ws.onerror = () => {
      console.log('❌ Erreur WebSocket');
      resolve(false);
    };
    setTimeout(() => resolve(false), 5000);
  });
};

// Exécuter les tests
const runTests = async () => {
  console.log('\n🚀 Exécution des tests...\n');
  
  const results = {
    webrtc: typeof RTCPeerConnection !== 'undefined',
    camera: await testCamera(),
    websocket: await testWebSocket()
  };
  
  console.log('\n📊 Résultats:');
  console.log('WebRTC:', results.webrtc ? '✅' : '❌');
  console.log('Caméra:', results.camera ? '✅' : '❌');
  console.log('WebSocket:', results.websocket ? '✅' : '❌');
  
  if (results.webrtc && results.camera && results.websocket) {
    console.log('\n🎉 Tous les tests passés ! La vidéoconférence devrait fonctionner.');
    console.log('\n📝 Pour tester:');
    console.log('1. Allez dans Vidéoconférence');
    console.log('2. Créez une réunion');
    console.log('3. Ouvrez un autre onglet et rejoignez la même réunion');
  } else {
    console.log('\n⚠️ Certains tests ont échoué.');
    if (!results.camera) {
      console.log('- Accordez les permissions caméra/microphone');
    }
  }
};

// Instructions
console.log('\n📋 Instructions:');
console.log('1. Exécutez: runTests()');
console.log('2. Suivez les instructions affichées');

// Exporter
window.runTests = runTests;
window.testCamera = testCamera;
window.testWebSocket = testWebSocket;

console.log('\n✅ Script chargé. Exécutez runTests() pour commencer.'); 