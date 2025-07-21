// =========================================
// TEST VIDÉOCONFÉRENCE PRODUCTION
// Script à exécuter dans la console du navigateur
// =========================================

console.log('🧪 Démarrage du test vidéoconférence production...');

// =========================================
// 1. VÉRIFIER LES APIs WEBRTC
// =========================================

console.log('🔍 Vérification des APIs WebRTC...');

const webrtcTests = {
  // Vérifier les APIs de base
  getUserMedia: typeof navigator.mediaDevices?.getUserMedia === 'function',
  RTCPeerConnection: typeof RTCPeerConnection === 'function',
  RTCSessionDescription: typeof RTCSessionDescription === 'function',
  RTCIceCandidate: typeof RTCIceCandidate === 'function',
  
  // Vérifier les APIs de contraintes
  MediaTrackConstraints: typeof MediaTrackConstraints === 'function',
  
  // Vérifier les APIs de stream
  MediaStream: typeof MediaStream === 'function',
  MediaStreamTrack: typeof MediaStreamTrack === 'function'
};

console.table(webrtcTests);

const allWebRTCAvailable = Object.values(webrtcTests).every(Boolean);
console.log(`✅ WebRTC APIs disponibles: ${allWebRTCAvailable ? 'OUI' : 'NON'}`);

if (!allWebRTCAvailable) {
  console.error('❌ WebRTC non supporté dans ce navigateur');
}

// =========================================
// 2. VÉRIFIER LA CONNEXION SUPABASE
// =========================================

console.log('🔍 Vérification de la connexion Supabase...');

// Récupérer les variables d'environnement
const supabaseUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:54321' 
  : 'https://your-project.supabase.co'; // Remplacer par votre URL

const supabaseKey = 'your-anon-key'; // Remplacer par votre clé

console.log('📡 URL Supabase:', supabaseUrl);
console.log('🔑 Clé Supabase:', supabaseKey ? '✅ Configurée' : '❌ Manquante');

// =========================================
// 3. TEST D'ACCÈS MÉDIA
// =========================================

console.log('🎥 Test d\'accès aux médias...');

async function testMediaAccess() {
  try {
    console.log('🎥 Demande d\'accès caméra/microphone...');
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
      }
    });
    
    console.log('✅ Accès média réussi!');
    console.log('📊 Informations du stream:');
    console.log('- ID du stream:', stream.id);
    console.log('- Tracks vidéo:', stream.getVideoTracks().length);
    console.log('- Tracks audio:', stream.getAudioTracks().length);
    
    // Afficher les détails des tracks
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
    
    stream.getAudioTracks().forEach((track, index) => {
      console.log(`🎤 Track audio ${index + 1}:`, {
        id: track.id,
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted
      });
    });
    
    // Arrêter le stream de test
    stream.getTracks().forEach(track => track.stop());
    console.log('🛑 Stream de test arrêté');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur d\'accès média:', error);
    console.log('🔍 Type d\'erreur:', error.name);
    console.log('📝 Message:', error.message);
    
    if (error.name === 'NotAllowedError') {
      console.log('💡 Solution: Autoriser l\'accès à la caméra/microphone');
    } else if (error.name === 'NotFoundError') {
      console.log('💡 Solution: Vérifier que la caméra/microphone sont connectés');
    } else if (error.name === 'NotReadableError') {
      console.log('💡 Solution: La caméra/microphone sont utilisés par une autre application');
    }
    
    return false;
  }
}

// =========================================
// 4. TEST DE CONNEXION PEER-TO-PEER
// =========================================

console.log('🔗 Test de connexion peer-to-peer...');

async function testPeerConnection() {
  try {
    console.log('🔗 Création d\'une connexion peer de test...');
    
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    });
    
    console.log('✅ RTCPeerConnection créée');
    
    // Écouter les candidats ICE
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Candidat ICE généré:', event.candidate.candidate);
      } else {
        console.log('✅ Tous les candidats ICE ont été générés');
      }
    };
    
    // Écouter les changements d'état de connexion
    peerConnection.onconnectionstatechange = () => {
      console.log('🔗 État de connexion:', peerConnection.connectionState);
    };
    
    // Écouter les changements d'état ICE
    peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 État de connexion ICE:', peerConnection.iceConnectionState);
    };
    
    // Créer une offre de test
    const offer = await peerConnection.createOffer();
    console.log('📤 Offre créée:', offer.type);
    
    await peerConnection.setLocalDescription(offer);
    console.log('✅ Description locale définie');
    
    // Fermer la connexion de test
    peerConnection.close();
    console.log('🛑 Connexion peer de test fermée');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion peer:', error);
    return false;
  }
}

// =========================================
// 5. VÉRIFIER LES PERMISSIONS
// =========================================

console.log('🔐 Vérification des permissions...');

async function checkPermissions() {
  try {
    // Vérifier les permissions pour la caméra
    const cameraPermission = await navigator.permissions.query({ name: 'camera' });
    console.log('📹 Permission caméra:', cameraPermission.state);
    
    // Vérifier les permissions pour le microphone
    const microphonePermission = await navigator.permissions.query({ name: 'microphone' });
    console.log('🎤 Permission microphone:', microphonePermission.state);
    
    return {
      camera: cameraPermission.state,
      microphone: microphonePermission.state
    };
  } catch (error) {
    console.log('⚠️ Impossible de vérifier les permissions:', error.message);
    return { camera: 'unknown', microphone: 'unknown' };
  }
}

// =========================================
// 6. EXÉCUTER TOUS LES TESTS
// =========================================

async function runAllTests() {
  console.log('🚀 Démarrage de tous les tests...');
  
  const results = {
    webrtc: allWebRTCAvailable,
    media: await testMediaAccess(),
    peer: await testPeerConnection(),
    permissions: await checkPermissions()
  };
  
  console.log('📊 Résultats des tests:');
  console.table(results);
  
  const allTestsPassed = results.webrtc && results.media && results.peer;
  
  if (allTestsPassed) {
    console.log('🎉 Tous les tests sont passés! La vidéoconférence devrait fonctionner.');
  } else {
    console.log('⚠️ Certains tests ont échoué. Vérifiez les erreurs ci-dessus.');
  }
  
  return results;
}

// =========================================
// 7. FONCTIONS UTILITAIRES
// =========================================

// Fonction pour tester la vidéoconférence dans une room spécifique
window.testVideoConference = async (roomId = 'test-room-' + Date.now()) => {
  console.log(`🎥 Test de vidéoconférence dans la room: ${roomId}`);
  
  // Vérifier que l'application est chargée
  if (typeof window.useRobustVideoConference === 'undefined') {
    console.error('❌ Hook useRobustVideoConference non trouvé');
    return;
  }
  
  console.log('✅ Hook vidéoconférence disponible');
};

// Fonction pour diagnostiquer les problèmes
window.diagnoseVideoIssues = () => {
  console.log('🔍 Diagnostic des problèmes vidéo...');
  
  // Vérifier les erreurs dans la console
  console.log('📝 Vérifiez les erreurs dans la console ci-dessus');
  
  // Vérifier les variables d'environnement
  console.log('🔧 Variables d\'environnement:');
  console.log('- VITE_USE_ROBUST_VIDEO_CONFERENCE:', import.meta.env?.VITE_USE_ROBUST_VIDEO_CONFERENCE);
  console.log('- VITE_USE_REALTIME:', import.meta.env?.VITE_USE_REALTIME);
  console.log('- VITE_SUPABASE_URL:', import.meta.env?.VITE_SUPABASE_URL);
  
  // Vérifier la connexion réseau
  console.log('🌐 Test de connexion réseau...');
  fetch('https://httpbin.org/get')
    .then(response => {
      console.log('✅ Connexion internet: OK');
    })
    .catch(error => {
      console.error('❌ Problème de connexion internet:', error);
    });
};

// =========================================
// 8. EXÉCUTION AUTOMATIQUE
// =========================================

// Exécuter les tests automatiquement
runAllTests().then(results => {
  console.log('✅ Tests terminés. Utilisez:');
  console.log('- testVideoConference("room-id") pour tester une room spécifique');
  console.log('- diagnoseVideoIssues() pour diagnostiquer les problèmes');
});

console.log('🧪 Script de test chargé. Utilisez les fonctions globales pour des tests supplémentaires.'); 