// Test de la vidéoconférence réelle
// Copiez ce script dans la console du navigateur

console.log('🎥 Test de la vidéoconférence réelle...');

// Test 1: Vérifier les APIs WebRTC
console.log('\n📡 Test 1: APIs WebRTC');
console.log('RTCPeerConnection:', typeof RTCPeerConnection !== 'undefined' ? '✅' : '❌');
console.log('getUserMedia:', typeof navigator.mediaDevices?.getUserMedia !== 'undefined' ? '✅' : '❌');
console.log('getDisplayMedia:', typeof navigator.mediaDevices?.getDisplayMedia !== 'undefined' ? '✅' : '❌');
console.log('localStorage:', typeof localStorage !== 'undefined' ? '✅' : '❌');

// Test 2: Test d'accès caméra avec haute qualité
console.log('\n📹 Test 2: Accès caméra haute qualité');
const testHighQualityCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    console.log('✅ Caméra haute qualité accessible');
    console.log('Résolution vidéo:', stream.getVideoTracks()[0]?.getSettings());
    console.log('Paramètres audio:', stream.getAudioTracks()[0]?.getSettings());
    
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.log('❌ Erreur caméra haute qualité:', error.message);
    return false;
  }
};

// Test 3: Test RTCPeerConnection avec serveurs STUN
console.log('\n🔗 Test 3: RTCPeerConnection avec STUN');
const testPeerConnection = () => {
  try {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    });
    
    console.log('✅ RTCPeerConnection créé avec serveurs STUN');
    console.log('Serveurs ICE:', peer.getConfiguration().iceServers?.length || 0);
    peer.close();
    return true;
  } catch (error) {
    console.log('❌ Erreur RTCPeerConnection:', error.message);
    return false;
  }
};

// Test 4: Test de signalisation localStorage
console.log('\n💾 Test 4: Signalisation localStorage');
const testLocalStorageSignaling = () => {
  try {
    const roomId = 'test-room-' + Date.now();
    const storageKey = `video_conference_${roomId}`;
    
    // Simuler un message de signalisation
    const testMessage = {
      type: 'offer',
      from: 'user_test_1',
      to: 'user_test_2',
      fromName: 'Test User 1',
      sdp: {
        type: 'offer',
        sdp: 'v=0\r\no=- 1234567890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n'
      },
      roomId,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(`${storageKey}_${Date.now()}`, JSON.stringify(testMessage));
    
    // Vérifier que le message est stocké
    const keys = Object.keys(localStorage);
    const roomKeys = keys.filter(key => key.startsWith(storageKey));
    
    if (roomKeys.length > 0) {
      console.log('✅ Signalisation localStorage fonctionne');
      console.log('Messages stockés:', roomKeys.length);
      
      // Nettoyer
      roomKeys.forEach(key => localStorage.removeItem(key));
      return true;
    } else {
      console.log('❌ Signalisation localStorage échouée');
      return false;
    }
  } catch (error) {
    console.log('❌ Erreur signalisation localStorage:', error.message);
    return false;
  }
};

// Test 5: Test de performance WebRTC
console.log('\n⚡ Test 5: Performance WebRTC');
const testWebRTCPerformance = async () => {
  try {
    const startTime = performance.now();
    
    // Créer plusieurs connexions peer
    const peers = [];
    for (let i = 0; i < 3; i++) {
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peers.push(peer);
    }
    
    const endTime = performance.now();
    console.log(`✅ Création de ${peers.length} connexions peer: ${(endTime - startTime).toFixed(2)}ms`);
    
    // Nettoyer
    peers.forEach(peer => peer.close());
    return true;
  } catch (error) {
    console.log('❌ Erreur performance WebRTC:', error.message);
    return false;
  }
};

// Test 6: Test de compatibilité navigateur
console.log('\n🌐 Test 6: Compatibilité navigateur');
const testBrowserCompatibility = () => {
  const tests = {
    webrtc: typeof RTCPeerConnection !== 'undefined',
    getUserMedia: typeof navigator.mediaDevices?.getUserMedia !== 'undefined',
    getDisplayMedia: typeof navigator.mediaDevices?.getDisplayMedia !== 'undefined',
    localStorage: typeof localStorage !== 'undefined',
    performance: typeof performance !== 'undefined',
    webAudio: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined'
  };
  
  console.log('Compatibilité WebRTC:', tests.webrtc ? '✅' : '❌');
  console.log('Compatibilité getUserMedia:', tests.getUserMedia ? '✅' : '❌');
  console.log('Compatibilité getDisplayMedia:', tests.getDisplayMedia ? '✅' : '❌');
  console.log('Compatibilité localStorage:', tests.localStorage ? '✅' : '❌');
  console.log('Compatibilité Performance API:', tests.performance ? '✅' : '❌');
  console.log('Compatibilité Web Audio:', tests.webAudio ? '✅' : '❌');
  
  return Object.values(tests).every(test => test);
};

// Exécuter tous les tests
const runRealVideoTests = async () => {
  console.log('\n🚀 Exécution des tests vidéoconférence réelle...\n');
  
  const results = {
    webrtc: typeof RTCPeerConnection !== 'undefined',
    camera: await testHighQualityCamera(),
    peerConnection: testPeerConnection(),
    signaling: testLocalStorageSignaling(),
    performance: await testWebRTCPerformance(),
    compatibility: testBrowserCompatibility()
  };
  
  console.log('\n📊 Résultats des tests:');
  console.log('WebRTC APIs:', results.webrtc ? '✅' : '❌');
  console.log('Caméra haute qualité:', results.camera ? '✅' : '❌');
  console.log('RTCPeerConnection STUN:', results.peerConnection ? '✅' : '❌');
  console.log('Signalisation localStorage:', results.signaling ? '✅' : '❌');
  console.log('Performance WebRTC:', results.performance ? '✅' : '❌');
  console.log('Compatibilité navigateur:', results.compatibility ? '✅' : '❌');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 Tous les tests passés ! La vidéoconférence réelle est prête.');
    console.log('\n📝 Instructions pour tester la vidéoconférence réelle:');
    console.log('1. Allez dans Vidéoconférence dans votre application');
    console.log('2. Créez une réunion (notez l\'ID de la room)');
    console.log('3. Ouvrez un autre onglet/onglet privé');
    console.log('4. Rejoignez la même réunion avec un autre nom d\'utilisateur');
    console.log('5. Vous devriez voir et entendre l\'autre participant');
    console.log('\n💡 Fonctionnalités disponibles:');
    console.log('- Vidéo/Audio en temps réel');
    console.log('- Chat intégré');
    console.log('- Partage d\'écran');
    console.log('- Contrôles audio/vidéo');
    console.log('- Connexion peer-to-peer via WebRTC');
  } else {
    console.log('\n⚠️ Certains tests ont échoué.');
    if (!results.camera) {
      console.log('- Accordez les permissions caméra/microphone');
    }
    if (!results.webrtc) {
      console.log('- Votre navigateur ne supporte pas WebRTC');
    }
    if (!results.signaling) {
      console.log('- localStorage n\'est pas disponible');
    }
  }
  
  return results;
};

// Test de simulation de participants réels
const simulateRealParticipants = () => {
  console.log('\n👥 Simulation de participants réels...');
  
  const roomId = 'real-test-room-' + Date.now();
  const storageKey = `video_conference_${roomId}`;
  
  // Simuler plusieurs participants qui rejoignent
  const participants = [
    { id: 'user_real_1', name: 'Alice' },
    { id: 'user_real_2', name: 'Bob' },
    { id: 'user_real_3', name: 'Charlie' }
  ];
  
  participants.forEach((participant, index) => {
    setTimeout(() => {
      const joinMessage = {
        type: 'join',
        from: participant.id,
        fromName: participant.name,
        roomId,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(`${storageKey}_${Date.now()}`, JSON.stringify(joinMessage));
      console.log(`✅ ${participant.name} a rejoint la room`);
    }, index * 1000);
  });
  
  // Simuler des messages de chat
  setTimeout(() => {
    const chatMessage = {
      type: 'chat',
      from: 'user_real_1',
      fromName: 'Alice',
      message: 'Bonjour tout le monde ! Comment allez-vous ?',
      roomId,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(`${storageKey}_${Date.now()}`, JSON.stringify(chatMessage));
    console.log('✅ Message de chat simulé');
  }, 4000);
  
  return roomId;
};

// Instructions
console.log('\n📋 Instructions:');
console.log('1. Exécutez: runRealVideoTests() - pour tester les APIs');
console.log('2. Exécutez: simulateRealParticipants() - pour simuler des participants');
console.log('3. Testez la vidéoconférence réelle avec plusieurs onglets');

// Exporter
window.runRealVideoTests = runRealVideoTests;
window.simulateRealParticipants = simulateRealParticipants;
window.testHighQualityCamera = testHighQualityCamera;
window.testPeerConnection = testPeerConnection;
window.testLocalStorageSignaling = testLocalStorageSignaling;
window.testWebRTCPerformance = testWebRTCPerformance;
window.testBrowserCompatibility = testBrowserCompatibility;

console.log('\n✅ Script de test vidéoconférence réelle chargé. Exécutez runRealVideoTests() pour commencer.'); 