// Test de connexion vidéo réelle
// Copiez ce script dans la console du navigateur

console.log('🎥 Test de connexion vidéo réelle...');

// Test 1: Vérifier la création de streams vidéo
console.log('\n📹 Test 1: Création de streams vidéo');
const testVideoStreamCreation = async () => {
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
    
    console.log('✅ Stream vidéo créé');
    console.log('Tracks vidéo:', stream.getVideoTracks().length);
    console.log('Tracks audio:', stream.getAudioTracks().length);
    
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];
    
    console.log('Paramètres vidéo:', videoTrack.getSettings());
    console.log('Paramètres audio:', audioTrack.getSettings());
    
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.log('❌ Erreur création stream vidéo:', error.message);
    return false;
  }
};

// Test 2: Test de connexion peer-to-peer
console.log('\n🔗 Test 2: Connexion peer-to-peer');
const testPeerToPeerConnection = async () => {
  try {
    // Créer deux connexions peer
    const peer1 = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });
    
    const peer2 = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });
    
    // Créer un stream de test
    const testStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: true
    });
    
    // Ajouter le stream au peer1
    testStream.getTracks().forEach(track => {
      peer1.addTrack(track, testStream);
    });
    
    // Écouter les tracks du peer2
    let trackReceived = false;
    peer2.ontrack = (event) => {
      console.log('✅ Track reçue:', event.track.kind, event.track.id);
      trackReceived = true;
    };
    
    // Créer une offre
    const offer = await peer1.createOffer();
    await peer1.setLocalDescription(offer);
    
    // Définir l'offre sur peer2
    await peer2.setRemoteDescription(offer);
    
    // Créer une réponse
    const answer = await peer2.createAnswer();
    await peer2.setLocalDescription(answer);
    
    // Définir la réponse sur peer1
    await peer1.setRemoteDescription(answer);
    
    // Attendre un peu pour la connexion
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('État peer1:', peer1.connectionState);
    console.log('État peer2:', peer2.connectionState);
    console.log('Track reçue:', trackReceived);
    
    // Nettoyer
    testStream.getTracks().forEach(track => track.stop());
    peer1.close();
    peer2.close();
    
    return trackReceived && peer1.connectionState === 'connected' && peer2.connectionState === 'connected';
  } catch (error) {
    console.log('❌ Erreur connexion peer-to-peer:', error.message);
    return false;
  }
};

// Test 3: Test de signalisation localStorage
console.log('\n💾 Test 3: Signalisation localStorage');
const testLocalStorageSignaling = () => {
  try {
    const roomId = 'test-video-room-' + Date.now();
    const storageKey = `video_conference_${roomId}`;
    
    // Simuler un message de join
    const joinMessage = {
      type: 'join',
      from: 'user_test_1',
      fromName: 'Test User 1',
      roomId,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(`${storageKey}_${Date.now()}`, JSON.stringify(joinMessage));
    
    // Simuler une offre
    const offerMessage = {
      type: 'offer',
      from: 'user_test_1',
      to: 'user_test_2',
      fromName: 'Test User 1',
      sdp: {
        type: 'offer',
        sdp: 'v=0\r\no=- 1234567890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=msid-semantic: WMS\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\nc=IN IP4 0.0.0.0\r\na=mid:0\r\na=sendonly\r\na=rtpmap:96 H264/90000\r\n'
      },
      roomId,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(`${storageKey}_${Date.now()}`, JSON.stringify(offerMessage));
    
    // Vérifier les messages
    const keys = Object.keys(localStorage);
    const roomKeys = keys.filter(key => key.startsWith(storageKey));
    
    console.log('Messages stockés:', roomKeys.length);
    roomKeys.forEach(key => {
      const message = JSON.parse(localStorage.getItem(key) || '{}');
      console.log('Message:', message.type, 'de', message.fromName);
    });
    
    // Nettoyer
    roomKeys.forEach(key => localStorage.removeItem(key));
    
    return roomKeys.length >= 2;
  } catch (error) {
    console.log('❌ Erreur signalisation localStorage:', error.message);
    return false;
  }
};

// Test 4: Test de performance vidéo
console.log('\n⚡ Test 4: Performance vidéo');
const testVideoPerformance = async () => {
  try {
    const startTime = performance.now();
    
    // Créer plusieurs streams vidéo
    const streams = [];
    for (let i = 0; i < 3; i++) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      streams.push(stream);
    }
    
    const endTime = performance.now();
    console.log(`✅ Création de ${streams.length} streams: ${(endTime - startTime).toFixed(2)}ms`);
    
    // Nettoyer
    streams.forEach(stream => stream.getTracks().forEach(track => track.stop()));
    
    return true;
  } catch (error) {
    console.log('❌ Erreur performance vidéo:', error.message);
    return false;
  }
};

// Exécuter tous les tests
const runVideoConnectionTests = async () => {
  console.log('\n🚀 Exécution des tests de connexion vidéo...\n');
  
  const results = {
    streamCreation: await testVideoStreamCreation(),
    peerToPeer: await testPeerToPeerConnection(),
    signaling: testLocalStorageSignaling(),
    performance: await testVideoPerformance()
  };
  
  console.log('\n📊 Résultats des tests:');
  console.log('Création de streams:', results.streamCreation ? '✅' : '❌');
  console.log('Connexion peer-to-peer:', results.peerToPeer ? '✅' : '❌');
  console.log('Signalisation localStorage:', results.signaling ? '✅' : '❌');
  console.log('Performance vidéo:', results.performance ? '✅' : '❌');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 Tous les tests passés ! La vidéoconférence devrait fonctionner parfaitement.');
    console.log('\n📝 Instructions pour tester la vidéoconférence:');
    console.log('1. Allez dans Vidéoconférence dans votre application');
    console.log('2. Créez une réunion');
    console.log('3. Ouvrez un autre onglet/onglet privé');
    console.log('4. Rejoignez la même réunion avec un autre nom');
    console.log('5. Vous devriez voir et entendre l\'autre participant');
    console.log('\n💡 Si les participants ne se voient pas:');
    console.log('- Vérifiez les permissions caméra/microphone');
    console.log('- Vérifiez la console pour les erreurs');
    console.log('- Essayez de rafraîchir la page');
  } else {
    console.log('\n⚠️ Certains tests ont échoué.');
    if (!results.streamCreation) {
      console.log('- Accordez les permissions caméra/microphone');
    }
    if (!results.peerToPeer) {
      console.log('- Problème de connexion WebRTC');
    }
    if (!results.signaling) {
      console.log('- Problème de signalisation localStorage');
    }
  }
  
  return results;
};

// Test de simulation de participants réels
const simulateRealVideoParticipants = () => {
  console.log('\n👥 Simulation de participants vidéo réels...');
  
  const roomId = 'video-test-room-' + Date.now();
  const storageKey = `video_conference_${roomId}`;
  
  // Simuler plusieurs participants qui rejoignent
  const participants = [
    { id: 'user_video_1', name: 'Alice Video' },
    { id: 'user_video_2', name: 'Bob Video' },
    { id: 'user_video_3', name: 'Charlie Video' }
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
      console.log(`✅ ${participant.name} a rejoint la room vidéo`);
    }, index * 1000);
  });
  
  return roomId;
};

// Instructions
console.log('\n📋 Instructions:');
console.log('1. Exécutez: runVideoConnectionTests() - pour tester la connexion vidéo');
console.log('2. Exécutez: simulateRealVideoParticipants() - pour simuler des participants');
console.log('3. Testez la vidéoconférence avec plusieurs onglets');

// Exporter
window.runVideoConnectionTests = runVideoConnectionTests;
window.simulateRealVideoParticipants = simulateRealVideoParticipants;
window.testVideoStreamCreation = testVideoStreamCreation;
window.testPeerToPeerConnection = testPeerToPeerConnection;
window.testLocalStorageSignaling = testLocalStorageSignaling;
window.testVideoPerformance = testVideoPerformance;

console.log('\n✅ Script de test connexion vidéo chargé. Exécutez runVideoConnectionTests() pour commencer.'); 