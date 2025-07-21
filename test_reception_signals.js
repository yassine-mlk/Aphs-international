// =========================================
// TEST RÉCEPTION DES SIGNALS - POUR L'AUTRE PARTICIPANT
// Script à exécuter sur l'autre participant qui ne reçoit pas les signaux
// =========================================

console.log('🔍 Test de réception des signaux - Participant qui ne reçoit pas...');

// =========================================
// 1. VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT
// =========================================

console.log('🔧 Variables d\'environnement:');
console.log('VITE_USE_REALTIME:', import.meta.env?.VITE_USE_REALTIME);
console.log('VITE_USE_ROBUST_VIDEO_CONFERENCE:', import.meta.env?.VITE_USE_ROBUST_VIDEO_CONFERENCE);

if (!import.meta.env?.VITE_USE_REALTIME || import.meta.env?.VITE_USE_REALTIME !== 'true') {
  console.error('❌ VITE_USE_REALTIME n\'est pas activé!');
  console.log('💡 Ajoutez VITE_USE_REALTIME=true dans votre .env.local');
}

if (!import.meta.env?.VITE_USE_ROBUST_VIDEO_CONFERENCE || import.meta.env?.VITE_USE_ROBUST_VIDEO_CONFERENCE !== 'true') {
  console.error('❌ VITE_USE_ROBUST_VIDEO_CONFERENCE n\'est pas activé!');
  console.log('💡 Ajoutez VITE_USE_ROBUST_VIDEO_CONFERENCE=true dans votre .env.local');
}

// =========================================
// 2. VÉRIFICATION DE SUPABASE
// =========================================

if (typeof window.supabase === 'undefined') {
  console.error('❌ Client Supabase non disponible!');
  console.log('💡 Vérifiez que Supabase est correctement initialisé');
} else {
  console.log('✅ Client Supabase disponible');
  console.log('URL:', window.supabase.supabaseUrl);
}

// =========================================
// 3. VÉRIFICATION DES LOGS DE CONNEXION
// =========================================

console.log('📝 Vérifiez ces logs dans la console:');
console.log('- ✅ Canal Supabase souscrit');
console.log('- ✅ Présence envoyée dans la room');
console.log('- ✅ Connected to video room');
console.log('- 📨 Signal WebRTC reçu');

// =========================================
// 4. TEST DE RECONNEXION
// =========================================

console.log('🔄 Test de reconnexion...');

if (typeof window.forceVideoReconnect === 'function') {
  console.log('✅ Fonction de reconnexion disponible');
  console.log('💡 Utilisez forceVideoReconnect() pour forcer la reconnexion');
} else {
  console.log('❌ Fonction de reconnexion non disponible');
}

// =========================================
// 5. TEST DE CANAL SUPABASE
// =========================================

async function testSupabaseChannel() {
  console.log('📡 Test de canal Supabase...');
  
  if (!window.supabase) {
    console.log('❌ Supabase non disponible');
    return;
  }
  
  try {
    // Créer un canal de test
    const testChannel = window.supabase.channel('test_reception_channel', {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: `test_${Date.now()}` }
      }
    });
    
    console.log('✅ Canal de test créé');
    
    // Écouter les signaux
    testChannel.on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
      console.log('📨 Signal de test reçu:', payload);
    });
    
    // S'abonner
    await testChannel.subscribe();
    console.log('✅ Abonnement au canal réussi');
    
    // Envoyer un signal de test
    const testSignal = {
      type: 'webrtc-signal',
      payload: {
        signal: { type: 'test', data: 'reception_test' },
        from: `test_${Date.now()}`,
        to: 'broadcast',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('📤 Envoi d\'un signal de test:', testSignal);
    
    await testChannel.send(testSignal);
    console.log('✅ Signal de test envoyé');
    
    // Attendre un peu puis se désabonner
    setTimeout(() => {
      testChannel.unsubscribe();
      console.log('🛑 Canal de test fermé');
    }, 3000);
    
  } catch (error) {
    console.error('❌ Erreur test canal:', error);
  }
}

// =========================================
// 6. FONCTIONS UTILITAIRES
// =========================================

// Forcer la reconnexion
window.forceReconnectTest = () => {
  console.log('🔄 Forçage de la reconnexion...');
  if (typeof window.forceVideoReconnect === 'function') {
    window.forceVideoReconnect();
  } else {
    console.log('❌ Fonction de reconnexion non disponible');
    window.location.reload();
  }
};

// Afficher l'état complet
window.showReceptionState = () => {
  console.log('📊 État de réception...');
  
  // Variables d'environnement
  console.log('🔧 Variables:');
  console.log('- VITE_USE_REALTIME:', import.meta.env?.VITE_USE_REALTIME);
  console.log('- VITE_USE_ROBUST_VIDEO_CONFERENCE:', import.meta.env?.VITE_USE_ROBUST_VIDEO_CONFERENCE);
  
  // Supabase
  if (window.supabase) {
    console.log('✅ Supabase: OK');
  } else {
    console.log('❌ Supabase: NON DISPONIBLE');
  }
  
  // Éléments vidéo
  const videos = document.querySelectorAll('video');
  console.log(`📹 Vidéos: ${videos.length}`);
  
  // Conseils
  console.log('💡 Solutions possibles:');
  console.log('1. Vérifiez .env.local avec VITE_USE_REALTIME=true');
  console.log('2. Utilisez forceReconnectTest() pour recharger');
  console.log('3. Vérifiez la connexion internet');
  console.log('4. Vérifiez les logs de Supabase Realtime');
};

// =========================================
// 7. EXÉCUTION AUTOMATIQUE
// =========================================

async function runReceptionTests() {
  console.log('🚀 Tests de réception...');
  
  await testSupabaseChannel();
  
  console.log('✅ Tests terminés. Utilisez:');
  console.log('- forceReconnectTest() pour recharger');
  console.log('- showReceptionState() pour voir l\'état');
}

// Exécuter les tests
runReceptionTests();

console.log('🔍 Script de test de réception chargé.'); 