// Test de la vidéoconférence localStorage
// Copiez ce script dans la console du navigateur

console.log('🧪 Test de la vidéoconférence localStorage...');

// Test 1: Vérifier les APIs
console.log('\n📡 Test 1: APIs WebRTC');
console.log('RTCPeerConnection:', typeof RTCPeerConnection !== 'undefined' ? '✅' : '❌');
console.log('getUserMedia:', typeof navigator.mediaDevices?.getUserMedia !== 'undefined' ? '✅' : '❌');
console.log('localStorage:', typeof localStorage !== 'undefined' ? '✅' : '❌');

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

// Test 3: Test localStorage
console.log('\n💾 Test 3: localStorage');
const testLocalStorage = () => {
  try {
    const testKey = 'test_video_conference';
    const testValue = JSON.stringify({ test: 'data' });
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    if (retrieved === testValue) {
      console.log('✅ localStorage fonctionne');
      return true;
    } else {
      console.log('❌ localStorage ne fonctionne pas');
      return false;
    }
  } catch (error) {
    console.log('❌ Erreur localStorage:', error.message);
    return false;
  }
};

// Test 4: Test RTCPeerConnection
console.log('\n🔗 Test 4: RTCPeerConnection');
const testPeerConnection = () => {
  try {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    console.log('✅ RTCPeerConnection créé');
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
    camera: await testCamera(),
    localStorage: testLocalStorage(),
    peerConnection: testPeerConnection()
  };
  
  console.log('\n📊 Résultats:');
  console.log('WebRTC APIs:', results.webrtc ? '✅' : '❌');
  console.log('Caméra:', results.camera ? '✅' : '❌');
  console.log('localStorage:', results.localStorage ? '✅' : '❌');
  console.log('RTCPeerConnection:', results.peerConnection ? '✅' : '❌');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 Tous les tests passés ! La vidéoconférence devrait fonctionner.');
    console.log('\n📝 Pour tester:');
    console.log('1. Allez dans Vidéoconférence');
    console.log('2. Créez une réunion');
    console.log('3. Ouvrez un autre onglet et rejoignez la même réunion');
    console.log('4. Vérifiez que vous pouvez vous voir mutuellement');
    console.log('\n💡 Note: Cette solution utilise localStorage pour la signalisation');
    console.log('   Elle fonctionne parfaitement pour les tests et démonstrations !');
  } else {
    console.log('\n⚠️ Certains tests ont échoué.');
    if (!results.camera) {
      console.log('- Accordez les permissions caméra/microphone');
    }
    if (!results.localStorage) {
      console.log('- Vérifiez que localStorage est activé');
    }
  }
  
  return results;
};

// Test de simulation de participants
const simulateParticipants = () => {
  console.log('\n👥 Simulation de participants...');
  
  const roomId = 'test-room-' + Date.now();
  const storageKey = `video_conference_${roomId}`;
  
  // Simuler un participant qui rejoint
  const joinMessage = {
    type: 'join',
    from: 'user_test_1',
    fromName: 'Test User 1',
    roomId,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem(`${storageKey}_${Date.now()}`, JSON.stringify(joinMessage));
  console.log('✅ Message de join simulé');
  
  // Simuler un message de chat
  setTimeout(() => {
    const chatMessage = {
      type: 'chat',
      from: 'user_test_1',
      fromName: 'Test User 1',
      message: 'Bonjour ! Test de la vidéoconférence.',
      roomId,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(`${storageKey}_${Date.now()}`, JSON.stringify(chatMessage));
    console.log('✅ Message de chat simulé');
  }, 1000);
  
  return roomId;
};

// Instructions
console.log('\n📋 Instructions:');
console.log('1. Exécutez: runAllTests() - pour tester les APIs');
console.log('2. Exécutez: simulateParticipants() - pour simuler des participants');
console.log('3. Suivez les instructions affichées');

// Exporter
window.runAllTests = runAllTests;
window.simulateParticipants = simulateParticipants;
window.testCamera = testCamera;
window.testLocalStorage = testLocalStorage;
window.testPeerConnection = testPeerConnection;

console.log('\n✅ Script chargé. Exécutez runAllTests() pour commencer.'); 