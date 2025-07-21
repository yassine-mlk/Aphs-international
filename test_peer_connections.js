// =========================================
// TEST CONNEXIONS PEER-TO-PEER
// Script pour diagnostiquer les connexions entre participants
// =========================================

console.log('🔗 Test des connexions peer-to-peer...');

// =========================================
// 1. VÉRIFIER L'ÉTAT DES CONNEXIONS
// =========================================

function checkPeerConnections() {
  console.log('🔍 Vérification des connexions peer...');
  
  // Vérifier si le hook est disponible
  if (typeof window.useRobustVideoConference === 'undefined') {
    console.log('❌ Hook useRobustVideoConference non disponible');
    return;
  }
  
  // Vérifier les connexions RTCPeerConnection
  const peerConnections = [];
  for (let i = 0; i < 10; i++) {
    try {
      const pc = new RTCPeerConnection();
      peerConnections.push(pc);
      pc.close();
    } catch (e) {
      console.log(`❌ RTCPeerConnection ${i} failed:`, e);
    }
  }
  
  console.log(`✅ ${peerConnections.length} connexions RTCPeerConnection testées`);
}

// =========================================
// 2. SIMULER UNE CONNEXION PEER-TO-PEER
// =========================================

async function simulatePeerConnection() {
  console.log('🎭 Simulation d\'une connexion peer-to-peer...');
  
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
    
    // Écouter les changements d'état
    peer1.onconnectionstatechange = () => {
      console.log('🔗 Peer1 connection state:', peer1.connectionState);
    };
    
    peer2.onconnectionstatechange = () => {
      console.log('🔗 Peer2 connection state:', peer2.connectionState);
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
    console.error('❌ Erreur simulation peer:', error);
  }
}

// =========================================
// 3. VÉRIFIER LES SIGNALS SUPABASE
// =========================================

function checkSupabaseSignals() {
  console.log('📡 Vérification des signaux Supabase...');
  
  // Vérifier si Supabase est disponible
  if (typeof window.supabase === 'undefined') {
    console.log('❌ Client Supabase non disponible');
    return;
  }
  
  console.log('✅ Client Supabase disponible');
  
  // Vérifier les variables d'environnement
  console.log('🔧 Variables d\'environnement:');
  console.log('- VITE_SUPABASE_URL:', import.meta.env?.VITE_SUPABASE_URL);
  console.log('- VITE_SUPABASE_ANON_KEY:', import.meta.env?.VITE_SUPABASE_ANON_KEY ? '✅ Configurée' : '❌ Manquante');
  console.log('- VITE_USE_REALTIME:', import.meta.env?.VITE_USE_REALTIME);
}

// =========================================
// 4. DIAGNOSTIC DES PARTICIPANTS
// =========================================

function diagnoseParticipants() {
  console.log('👥 Diagnostic des participants...');
  
  // Vérifier si nous sommes dans une vidéoconférence
  const videoElements = document.querySelectorAll('video');
  console.log(`📹 Éléments vidéo trouvés: ${videoElements.length}`);
  
  videoElements.forEach((video, index) => {
    console.log(`📹 Vidéo ${index + 1}:`, {
      srcObject: !!video.srcObject,
      readyState: video.readyState,
      paused: video.paused,
      muted: video.muted,
      autoplay: video.autoplay,
      playsInline: video.playsInline
    });
  });
  
  // Chercher les éléments de participant
  const participantElements = document.querySelectorAll('[data-participant-id]');
  console.log(`👤 Éléments participant trouvés: ${participantElements.length}`);
  
  // Chercher les messages d'état
  const waitingElements = document.querySelectorAll('*:contains("En attente")');
  console.log(`⏳ Éléments "En attente" trouvés: ${waitingElements.length}`);
}

// =========================================
// 5. TEST DE CONNEXION RÉSEAU
// =========================================

async function testNetworkConnectivity() {
  console.log('🌐 Test de connectivité réseau...');
  
  try {
    // Test de connexion internet
    const response = await fetch('https://httpbin.org/get');
    console.log('✅ Connexion internet: OK');
    
    // Test de connexion WebRTC
    const pc = new RTCPeerConnection();
    const offer = await pc.createOffer();
    console.log('✅ WebRTC: OK');
    pc.close();
    
  } catch (error) {
    console.error('❌ Erreur connectivité:', error);
  }
}

// =========================================
// 6. FONCTIONS UTILITAIRES
// =========================================

// Fonction pour forcer la reconnexion
window.forceReconnect = () => {
  console.log('🔄 Forçage de la reconnexion...');
  
  // Recharger la page
  window.location.reload();
};

// Fonction pour nettoyer les connexions
window.cleanupConnections = () => {
  console.log('🧹 Nettoyage des connexions...');
  
  // Fermer toutes les connexions RTCPeerConnection
  const connections = [];
  for (let i = 0; i < 10; i++) {
    try {
      const pc = new RTCPeerConnection();
      connections.push(pc);
    } catch (e) {
      break;
    }
  }
  
  connections.forEach(pc => pc.close());
  console.log(`🛑 ${connections.length} connexions fermées`);
};

// Fonction pour diagnostiquer une room spécifique
window.diagnoseRoom = (roomId) => {
  console.log(`🏠 Diagnostic de la room: ${roomId}`);
  
  // Vérifier les logs de connexion
  console.log('📝 Vérifiez les logs de connexion dans la console');
  
  // Vérifier les participants
  diagnoseParticipants();
  
  // Vérifier les signaux
  checkSupabaseSignals();
};

// =========================================
// 7. EXÉCUTION AUTOMATIQUE
// =========================================

async function runAllPeerTests() {
  console.log('🚀 Démarrage des tests peer-to-peer...');
  
  checkPeerConnections();
  await simulatePeerConnection();
  checkSupabaseSignals();
  diagnoseParticipants();
  await testNetworkConnectivity();
  
  console.log('✅ Tests terminés. Utilisez:');
  console.log('- forceReconnect() pour recharger la page');
  console.log('- cleanupConnections() pour nettoyer les connexions');
  console.log('- diagnoseRoom("room-id") pour diagnostiquer une room');
}

// Exécuter les tests
runAllPeerTests();

console.log('🔗 Script de test peer-to-peer chargé.'); 