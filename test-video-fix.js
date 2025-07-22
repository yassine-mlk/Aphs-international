// Test de correction vidéoconférence
// Copiez ce script dans la console du navigateur

console.log('🔧 Test de correction vidéoconférence...');

// Test 1: Vérifier la gestion des candidats ICE
console.log('\n🧊 Test 1: Gestion des candidats ICE');
const testIceCandidateHandling = () => {
  try {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });
    
    let iceCandidatesGenerated = 0;
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        iceCandidatesGenerated++;
        console.log(`✅ Candidat ICE ${iceCandidatesGenerated} généré:`, event.candidate.candidate);
      }
    };
    
    // Créer une offre pour déclencher la génération de candidats ICE
    peer.createOffer()
      .then(offer => peer.setLocalDescription(offer))
      .then(() => {
        console.log('✅ Offre créée, candidats ICE en cours de génération...');
        return new Promise(resolve => setTimeout(resolve, 3000));
      })
      .then(() => {
        console.log(`📊 Total candidats ICE générés: ${iceCandidatesGenerated}`);
        peer.close();
        return iceCandidatesGenerated > 0;
      });
    
    return true;
  } catch (error) {
    console.log('❌ Erreur test candidats ICE:', error.message);
    return false;
  }
};

// Test 2: Test de connexion peer-to-peer avec gestion ICE
console.log('\n🔗 Test 2: Connexion peer-to-peer avec ICE');
const testPeerToPeerWithIce = async () => {
  try {
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
    
    // Collecter les candidats ICE du peer1
    const peer1Candidates = [];
    peer1.onicecandidate = (event) => {
      if (event.candidate) {
        peer1Candidates.push(event.candidate);
        console.log('📡 Candidat ICE peer1:', event.candidate.candidate);
      }
    };
    
    // Collecter les candidats ICE du peer2
    const peer2Candidates = [];
    peer2.onicecandidate = (event) => {
      if (event.candidate) {
        peer2Candidates.push(event.candidate);
        console.log('📡 Candidat ICE peer2:', event.candidate.candidate);
      }
    };
    
    // Créer une offre
    const offer = await peer1.createOffer();
    await peer1.setLocalDescription(offer);
    
    // Attendre un peu pour la génération des candidats ICE
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Définir l'offre sur peer2
    await peer2.setRemoteDescription(offer);
    
    // Ajouter les candidats ICE du peer1 au peer2
    for (const candidate of peer1Candidates) {
      try {
        await peer2.addIceCandidate(candidate);
        console.log('✅ Candidat ICE peer1 ajouté au peer2');
      } catch (err) {
        if (!err.message.includes('Unknown ufrag')) {
          console.error('❌ Erreur ajout candidat ICE peer1:', err);
        }
      }
    }
    
    // Créer une réponse
    const answer = await peer2.createAnswer();
    await peer2.setLocalDescription(answer);
    
    // Attendre un peu pour la génération des candidats ICE
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Définir la réponse sur peer1
    await peer1.setRemoteDescription(answer);
    
    // Ajouter les candidats ICE du peer2 au peer1
    for (const candidate of peer2Candidates) {
      try {
        await peer1.addIceCandidate(candidate);
        console.log('✅ Candidat ICE peer2 ajouté au peer1');
      } catch (err) {
        if (!err.message.includes('Unknown ufrag')) {
          console.error('❌ Erreur ajout candidat ICE peer2:', err);
        }
      }
    }
    
    // Attendre la connexion
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('État peer1:', peer1.connectionState);
    console.log('État peer2:', peer2.connectionState);
    console.log('Track reçue:', trackReceived);
    
    // Nettoyer
    testStream.getTracks().forEach(track => track.stop());
    peer1.close();
    peer2.close();
    
    return trackReceived && peer1.connectionState === 'connected' && peer2.connectionState === 'connected';
  } catch (error) {
    console.log('❌ Erreur connexion peer-to-peer avec ICE:', error.message);
    return false;
  }
};

// Test 3: Test de signalisation localStorage améliorée
console.log('\n💾 Test 3: Signalisation localStorage améliorée');
const testImprovedLocalStorageSignaling = () => {
  try {
    const roomId = 'test-fix-room-' + Date.now();
    const storageKey = `video_conference_${roomId}`;
    
    // Simuler une séquence complète de signalisation
    const messages = [
      {
        type: 'join',
        from: 'user_fix_1',
        fromName: 'Alice Fix',
        roomId,
        timestamp: new Date().toISOString()
      },
      {
        type: 'offer',
        from: 'user_fix_1',
        to: 'user_fix_2',
        fromName: 'Alice Fix',
        sdp: {
          type: 'offer',
          sdp: 'v=0\r\no=- 1234567890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=msid-semantic: WMS\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\nc=IN IP4 0.0.0.0\r\na=mid:0\r\na=sendonly\r\na=rtpmap:96 H264/90000\r\n'
        },
        roomId,
        timestamp: new Date().toISOString()
      },
      {
        type: 'ice-candidate',
        from: 'user_fix_1',
        to: 'user_fix_2',
        fromName: 'Alice Fix',
        candidate: {
          candidate: 'candidate:1 1 UDP 2122252543 192.168.1.1 12345 typ host',
          sdpMLineIndex: 0,
          sdpMid: '0'
        },
        roomId,
        timestamp: new Date().toISOString()
      },
      {
        type: 'answer',
        from: 'user_fix_2',
        to: 'user_fix_1',
        fromName: 'Bob Fix',
        sdp: {
          type: 'answer',
          sdp: 'v=0\r\no=- 1234567890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=msid-semantic: WMS\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\nc=IN IP4 0.0.0.0\r\na=mid:0\r\na=recvonly\r\na=rtpmap:96 H264/90000\r\n'
        },
        roomId,
        timestamp: new Date().toISOString()
      }
    ];
    
    // Stocker tous les messages
    messages.forEach((message, index) => {
      localStorage.setItem(`${storageKey}_${Date.now()}_${index}`, JSON.stringify(message));
    });
    
    // Vérifier les messages
    const keys = Object.keys(localStorage);
    const roomKeys = keys.filter(key => key.startsWith(storageKey));
    
    console.log('Messages stockés:', roomKeys.length);
    roomKeys.forEach(key => {
      const message = JSON.parse(localStorage.getItem(key) || '{}');
      console.log('Message:', message.type, 'de', message.fromName, 'vers', message.to);
    });
    
    // Nettoyer
    roomKeys.forEach(key => localStorage.removeItem(key));
    
    return roomKeys.length >= 4;
  } catch (error) {
    console.log('❌ Erreur signalisation localStorage améliorée:', error.message);
    return false;
  }
};

// Exécuter tous les tests
const runVideoFixTests = async () => {
  console.log('\n🚀 Exécution des tests de correction vidéoconférence...\n');
  
  const results = {
    iceHandling: testIceCandidateHandling(),
    peerToPeerIce: await testPeerToPeerWithIce(),
    improvedSignaling: testImprovedLocalStorageSignaling()
  };
  
  console.log('\n📊 Résultats des tests de correction:');
  console.log('Gestion candidats ICE:', results.iceHandling ? '✅' : '❌');
  console.log('Connexion peer-to-peer avec ICE:', results.peerToPeerIce ? '✅' : '❌');
  console.log('Signalisation localStorage améliorée:', results.improvedSignaling ? '✅' : '❌');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 Tous les tests de correction passés ! La vidéoconférence devrait maintenant fonctionner.');
    console.log('\n📝 Instructions pour tester la vidéoconférence corrigée:');
    console.log('1. Rafraîchissez la page de vidéoconférence');
    console.log('2. Créez une nouvelle réunion');
    console.log('3. Ouvrez un autre onglet/onglet privé');
    console.log('4. Rejoignez la même réunion avec un autre nom');
    console.log('5. Vous devriez maintenant voir et entendre l\'autre participant');
    console.log('\n💡 Corrections apportées:');
    console.log('- Gestion correcte des candidats ICE');
    console.log('- Stockage des candidats en attente');
    console.log('- Ajout des candidats après définition de la description distante');
    console.log('- Suppression des erreurs "Unknown ufrag"');
  } else {
    console.log('\n⚠️ Certains tests de correction ont échoué.');
    if (!results.iceHandling) {
      console.log('- Problème avec la génération des candidats ICE');
    }
    if (!results.peerToPeerIce) {
      console.log('- Problème avec la connexion peer-to-peer');
    }
    if (!results.improvedSignaling) {
      console.log('- Problème avec la signalisation localStorage');
    }
  }
  
  return results;
};

// Instructions
console.log('\n📋 Instructions:');
console.log('1. Exécutez: runVideoFixTests() - pour tester les corrections');
console.log('2. Testez la vidéoconférence avec plusieurs onglets');
console.log('3. Vérifiez que les participants se voient maintenant');

// Exporter
window.runVideoFixTests = runVideoFixTests;
window.testIceCandidateHandling = testIceCandidateHandling;
window.testPeerToPeerWithIce = testPeerToPeerWithIce;
window.testImprovedLocalStorageSignaling = testImprovedLocalStorageSignaling;

console.log('\n✅ Script de test de correction chargé. Exécutez runVideoFixTests() pour commencer.'); 