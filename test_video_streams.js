// =========================================
// TEST FLUX VIDÉO ENTRE PARTICIPANTS
// Script pour diagnostiquer les problèmes de vidéo
// =========================================

console.log('🎥 Test des flux vidéo entre participants...');

// =========================================
// 1. VÉRIFIER LES STREAMS LOCAUX
// =========================================

async function testLocalStreams() {
  console.log('🎥 Test des streams locaux...');
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    console.log('✅ Stream local obtenu');
    console.log('📊 Détails du stream:');
    console.log('- ID:', stream.id);
    console.log('- Actif:', stream.active);
    console.log('- Tracks vidéo:', stream.getVideoTracks().length);
    console.log('- Tracks audio:', stream.getAudioTracks().length);
    
    // Afficher les détails des tracks vidéo
    stream.getVideoTracks().forEach((track, index) => {
      console.log(`📹 Track vidéo ${index + 1}:`, {
        id: track.id,
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted,
        settings: track.getSettings()
      });
    });
    
    // Créer un élément vidéo de test
    const testVideo = document.createElement('video');
    testVideo.srcObject = stream;
    testVideo.muted = true;
    testVideo.style.width = '200px';
    testVideo.style.height = '150px';
    testVideo.style.position = 'fixed';
    testVideo.style.top = '10px';
    testVideo.style.left = '10px';
    testVideo.style.zIndex = '9999';
    testVideo.style.border = '2px solid green';
    
    document.body.appendChild(testVideo);
    
    testVideo.play().then(() => {
      console.log('✅ Vidéo locale de test en lecture!');
      
      // Arrêter après 5 secondes
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(testVideo);
        console.log('🛑 Test vidéo locale terminé');
      }, 5000);
    });
    
    return stream;
  } catch (error) {
    console.error('❌ Erreur stream local:', error);
    return null;
  }
}

// =========================================
// 2. TEST DE CONNEXION PEER-TO-PEER
// =========================================

async function testPeerToPeerStreams() {
  console.log('🔗 Test de connexion peer-to-peer...');
  
  try {
    // Créer deux connexions peer
    const peer1 = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    const peer2 = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    console.log('✅ Deux connexions peer créées');
    
    // Écouter les candidats ICE
    peer1.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Peer1 ICE candidate:', event.candidate.candidate);
        peer2.addIceCandidate(event.candidate);
      }
    };
    
    peer2.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Peer2 ICE candidate:', event.candidate.candidate);
        peer1.addIceCandidate(event.candidate);
      }
    };
    
    // Écouter les streams distants
    peer2.ontrack = (event) => {
      console.log('🎥 Stream distant reçu par Peer2:', event.streams[0]);
      console.log('- Stream actif:', event.streams[0].active);
      console.log('- Tracks vidéo:', event.streams[0].getVideoTracks().length);
      
      // Créer un élément vidéo pour le stream distant
      const remoteVideo = document.createElement('video');
      remoteVideo.srcObject = event.streams[0];
      remoteVideo.style.width = '200px';
      remoteVideo.style.height = '150px';
      remoteVideo.style.position = 'fixed';
      remoteVideo.style.top = '10px';
      remoteVideo.style.right = '10px';
      remoteVideo.style.zIndex = '9999';
      remoteVideo.style.border = '2px solid red';
      
      document.body.appendChild(remoteVideo);
      
      remoteVideo.play().then(() => {
        console.log('✅ Vidéo distante de test en lecture!');
      });
    };
    
    // Créer une offre
    const offer = await peer1.createOffer();
    await peer1.setLocalDescription(offer);
    console.log('📤 Offre créée par Peer1');
    
    // Traiter l'offre avec Peer2
    await peer2.setRemoteDescription(offer);
    const answer = await peer2.createAnswer();
    await peer2.setLocalDescription(answer);
    console.log('📤 Réponse créée par Peer2');
    
    // Traiter la réponse avec Peer1
    await peer1.setRemoteDescription(answer);
    console.log('✅ Échange d\'offre/réponse terminé');
    
    // Attendre un peu pour voir l'état de connexion
    setTimeout(() => {
      console.log('📊 État final des connexions:');
      console.log('- Peer1:', peer1.connectionState, peer1.iceConnectionState);
      console.log('- Peer2:', peer2.connectionState, peer2.iceConnectionState);
      
      // Nettoyer
      peer1.close();
      peer2.close();
      console.log('🛑 Connexions fermées');
    }, 3000);
    
  } catch (error) {
    console.error('❌ Erreur connexion peer:', error);
  }
}

// =========================================
// 3. DIAGNOSTIC DES VIDÉOS DANS L'APP
// =========================================

function diagnoseAppVideos() {
  console.log('🔍 Diagnostic des vidéos dans l\'application...');
  
  // Vérifier les éléments vidéo
  const videoElements = document.querySelectorAll('video');
  console.log(`📹 Éléments vidéo trouvés: ${videoElements.length}`);
  
  videoElements.forEach((video, index) => {
    console.log(`📹 Vidéo ${index + 1}:`, {
      srcObject: !!video.srcObject,
      readyState: video.readyState,
      paused: video.paused,
      muted: video.muted,
      autoplay: video.autoplay,
      playsInline: video.playsInline,
      currentTime: video.currentTime,
      duration: video.duration,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight
    });
    
    // Vérifier le stream attaché
    if (video.srcObject) {
      const stream = video.srcObject;
      console.log(`📹 Stream de la vidéo ${index + 1}:`, {
        id: stream.id,
        active: stream.active,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
    }
  });
  
  // Chercher les éléments "En attente"
  const waitingElements = document.querySelectorAll('*');
  const waitingTexts = [];
  
  waitingElements.forEach(element => {
    const text = element.textContent || '';
    if (text.includes('En attente') || text.includes('Connexion en cours')) {
      waitingTexts.push({
        text: text,
        tagName: element.tagName,
        className: element.className
      });
    }
  });
  
  console.log(`⏳ Éléments d'attente trouvés: ${waitingTexts.length}`);
  waitingTexts.forEach((item, index) => {
    console.log(`⏳ Attente ${index + 1}:`, item);
  });
}

// =========================================
// 4. VÉRIFIER LES CONNEXIONS WEBRTC
// =========================================

function checkWebRTCConnections() {
  console.log('🔗 Vérification des connexions WebRTC...');
  
  // Vérifier les APIs WebRTC
  const webrtcAPIs = {
    RTCPeerConnection: typeof RTCPeerConnection === 'function',
    RTCSessionDescription: typeof RTCSessionDescription === 'function',
    RTCIceCandidate: typeof RTCIceCandidate === 'function',
    MediaStream: typeof MediaStream === 'function'
  };
  
  console.table(webrtcAPIs);
  
  // Vérifier les serveurs ICE
  const iceServers = [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302'
  ];
  
  console.log('🧊 Serveurs ICE configurés:', iceServers);
}

// =========================================
// 5. FONCTIONS UTILITAIRES
// =========================================

// Fonction pour forcer la reconnexion des streams
window.forceReconnectStreams = () => {
  console.log('🔄 Forçage de la reconnexion des streams...');
  
  // Recharger la page
  window.location.reload();
};

// Fonction pour afficher l'état des streams
window.showStreamsState = () => {
  console.log('📊 État des streams...');
  
  // Vérifier les éléments vidéo
  const videos = document.querySelectorAll('video');
  console.log(`📹 Vidéos: ${videos.length}`);
  
  videos.forEach((video, index) => {
    const hasStream = !!video.srcObject;
    const streamActive = hasStream ? video.srcObject.active : false;
    
    console.log(`📹 Vidéo ${index + 1}:`, {
      hasStream,
      streamActive,
      readyState: video.readyState,
      paused: video.paused
    });
  });
};

// Fonction pour diagnostiquer un participant spécifique
window.diagnoseParticipant = (participantId) => {
  console.log(`👤 Diagnostic du participant: ${participantId}`);
  
  // Vérifier l'élément vidéo
  const videoElement = document.querySelector(`[data-participant-id="${participantId}"] video`);
  if (videoElement) {
    console.log('📹 Élément vidéo trouvé:', {
      srcObject: !!videoElement.srcObject,
      readyState: videoElement.readyState,
      paused: videoElement.paused
    });
  } else {
    console.log('❌ Élément vidéo non trouvé');
  }
};

// =========================================
// 6. EXÉCUTION AUTOMATIQUE
// =========================================

async function runAllVideoTests() {
  console.log('🚀 Démarrage des tests de flux vidéo...');
  
  await testLocalStreams();
  await testPeerToPeerStreams();
  diagnoseAppVideos();
  checkWebRTCConnections();
  
  console.log('✅ Tests terminés. Utilisez:');
  console.log('- forceReconnectStreams() pour recharger');
  console.log('- showStreamsState() pour voir l\'état des streams');
  console.log('- diagnoseParticipant("id") pour diagnostiquer un participant');
}

// Exécuter les tests
runAllVideoTests();

console.log('🎥 Script de test des flux vidéo chargé.'); 