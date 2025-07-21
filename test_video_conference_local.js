// Script de test pour la vidéoconférence locale
console.log('🧪 Test de la vidéoconférence locale...');

// 1. Vérifier les APIs WebRTC
console.log('\n1. Vérification des APIs WebRTC:');
console.log('RTCPeerConnection:', typeof RTCPeerConnection);
console.log('navigator.mediaDevices:', typeof navigator.mediaDevices);
console.log('getUserMedia:', typeof navigator.mediaDevices?.getUserMedia);

// 2. Vérifier les permissions média
async function checkMediaPermissions() {
  console.log('\n2. Vérification des permissions média:');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    console.log('✅ Accès caméra/micro autorisé');
    console.log('Tracks vidéo:', stream.getVideoTracks().length);
    console.log('Tracks audio:', stream.getAudioTracks().length);
    
    // Arrêter le stream de test
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    console.error('❌ Erreur accès média:', err);
    return false;
  }
}

// 3. Vérifier localStorage
console.log('\n3. Vérification localStorage:');
console.log('localStorage disponible:', typeof localStorage !== 'undefined');
console.log('localStorage fonctionnel:', (() => {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return true;
  } catch (err) {
    return false;
  }
})());

// 4. Vérifier les participants actuels
console.log('\n4. Participants actuels:');
const participants = document.querySelectorAll('[data-participant-id]');
console.log('Participants trouvés dans le DOM:', participants.length);

// 5. Vérifier les streams vidéo
console.log('\n5. Streams vidéo:');
const videos = document.querySelectorAll('video');
console.log('Éléments vidéo trouvés:', videos.length);
videos.forEach((video, index) => {
  console.log(`Vidéo ${index + 1}:`, {
    srcObject: !!video.srcObject,
    readyState: video.readyState,
    paused: video.paused,
    muted: video.muted,
    width: video.videoWidth,
    height: video.videoHeight
  });
});

// 6. Vérifier les messages localStorage
console.log('\n6. Messages localStorage récents:');
const localStorageKeys = Object.keys(localStorage);
const videoKeys = localStorageKeys.filter(key => key.includes('msg_') || key.includes('ice_'));
console.log('Clés vidéoconférence trouvées:', videoKeys.length);
videoKeys.slice(-5).forEach(key => {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    console.log(`${key}:`, data.type, data.from, data.to);
  } catch (err) {
    console.log(`${key}: Erreur parsing`);
  }
});

// 7. Test de création d'un RTCPeerConnection
console.log('\n7. Test RTCPeerConnection:');
try {
  const peer = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  });
  console.log('✅ RTCPeerConnection créé avec succès');
  console.log('ICE servers configurés:', peer.getConfiguration().iceServers.length);
  peer.close();
} catch (err) {
  console.error('❌ Erreur création RTCPeerConnection:', err);
}

// 8. Instructions pour tester
console.log('\n8. Instructions pour tester avec plusieurs onglets:');
console.log('1. Ouvrez un nouvel onglet avec la même URL');
console.log('2. Connectez-vous avec un compte différent');
console.log('3. Rejoignez la même réunion');
console.log('4. Vérifiez que les participants se voient mutuellement');

// Exécuter les tests
checkMediaPermissions().then(hasPermissions => {
  console.log('\n📊 Résumé:');
  console.log('Permissions média:', hasPermissions ? '✅' : '❌');
  console.log('WebRTC disponible:', typeof RTCPeerConnection !== 'undefined' ? '✅' : '❌');
  console.log('localStorage fonctionnel:', typeof localStorage !== 'undefined' ? '✅' : '❌');
  console.log('Participants dans DOM:', participants.length);
  console.log('Vidéos actives:', videos.length);
  
  if (!hasPermissions) {
    console.log('\n⚠️ Pour résoudre les problèmes de permissions:');
    console.log('1. Vérifiez que le site est en HTTPS ou localhost');
    console.log('2. Autorisez l\'accès à la caméra/microphone');
    console.log('3. Vérifiez les paramètres du navigateur');
  }
});

// Fonction pour forcer la reconnexion
window.forceVideoReconnect = () => {
  console.log('🔄 Forçage de la reconnexion vidéo...');
  localStorage.clear();
  window.location.reload();
};

// Fonction pour simuler un participant
window.simulateParticipant = (name = 'Participant Test') => {
  console.log(`👤 Simulation d'un participant: ${name}`);
  const message = {
    type: 'join',
    from: `sim_${Date.now()}`,
    userName: name,
    roomId: 'test-room',
    timestamp: new Date().toISOString()
  };
  localStorage.setItem(`msg_test_${Date.now()}`, JSON.stringify(message));
  console.log('✅ Message de simulation envoyé');
};

console.log('\n🔧 Fonctions de debug disponibles:');
console.log('- window.forceVideoReconnect() : Force la reconnexion');
console.log('- window.simulateParticipant("Nom") : Simule un participant'); 