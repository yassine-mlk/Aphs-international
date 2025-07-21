// =========================================
// TEST RÉCEPTION DES SIGNALS WEBRTC
// Script pour diagnostiquer la réception des signaux
// =========================================

console.log('📡 Test de réception des signaux WebRTC...');

// =========================================
// 1. VÉRIFIER L'ÉTAT DU CANAL SUPABASE
// =========================================

function checkSupabaseChannel() {
  console.log('🔍 Vérification du canal Supabase...');
  
  if (typeof window.supabase === 'undefined') {
    console.log('❌ Client Supabase non disponible');
    return false;
  }
  
  console.log('✅ Client Supabase disponible');
  
  // Vérifier si nous sommes dans une vidéoconférence
  const videoElements = document.querySelectorAll('video');
  console.log(`📹 Éléments vidéo trouvés: ${videoElements.length}`);
  
  if (videoElements.length === 0) {
    console.log('❌ Pas d\'éléments vidéo trouvés - pas dans une vidéoconférence');
    return false;
  }
  
  return true;
}

// =========================================
// 2. SIMULER L'ENVOI ET RÉCEPTION DE SIGNALS
// =========================================

async function testSignalReception() {
  console.log('🎭 Test d\'envoi et réception de signaux...');
  
  if (!window.supabase) {
    console.log('❌ Supabase non disponible');
    return;
  }
  
  try {
    // Créer un canal de test
    const testChannel = window.supabase.channel('test_signal_channel', {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: `test_user_${Date.now()}` }
      }
    });
    
    console.log('✅ Canal de test créé');
    
    // Écouter les signaux
    testChannel.on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
      console.log('📨 Signal reçu dans le test:', payload);
    });
    
    // S'abonner au canal
    await testChannel.subscribe();
    console.log('✅ Abonnement au canal réussi');
    
    // Envoyer un signal de test
    const testSignal = {
      type: 'webrtc-signal',
      payload: {
        signal: { type: 'test', data: 'test' },
        from: `test_user_${Date.now()}`,
        to: 'all',
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
    }, 2000);
    
  } catch (error) {
    console.error('❌ Erreur test signal:', error);
  }
}

// =========================================
// 3. DIAGNOSTIC DES SIGNALS EN COURS
// =========================================

function diagnoseCurrentSignals() {
  console.log('🔍 Diagnostic des signaux en cours...');
  
  // Chercher les logs de signaux dans la console
  console.log('📝 Vérifiez les logs suivants dans la console:');
  console.log('- 📡 Broadcasting RTC signal');
  console.log('- 📨 Signal WebRTC reçu');
  console.log('- ✅ Signal sent successfully');
  console.log('- ❌ Failed to send signal');
  
  // Vérifier les variables d'environnement
  console.log('🔧 Variables d\'environnement:');
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
}

// =========================================
// 4. FONCTIONS UTILITAIRES
// =========================================

// Fonction pour forcer la reconnexion
window.forceReconnectSignals = () => {
  console.log('🔄 Forçage de la reconnexion des signaux...');
  window.location.reload();
};

// Fonction pour afficher l'état des signaux
window.showSignalsState = () => {
  console.log('📊 État des signaux...');
  
  // Vérifier les éléments vidéo
  const videos = document.querySelectorAll('video');
  console.log(`📹 Vidéos: ${videos.length}`);
  
  // Vérifier les participants
  const participants = document.querySelectorAll('[class*="participant"]');
  console.log(`👤 Participants: ${participants.length}`);
  
  // Vérifier Supabase
  if (window.supabase) {
    console.log('📡 Supabase disponible');
  }
  
  console.log('💡 Conseils:');
  console.log('1. Vérifiez que les deux participants sont dans la même room');
  console.log('2. Vérifiez que les signaux sont envoyés et reçus');
  console.log('3. Vérifiez que les connexions peer sont établies');
};

// =========================================
// 5. EXÉCUTION AUTOMATIQUE
// =========================================

async function runAllSignalTests() {
  console.log('🚀 Démarrage des tests de signaux...');
  
  checkSupabaseChannel();
  await testSignalReception();
  diagnoseCurrentSignals();
  
  console.log('✅ Tests terminés. Utilisez:');
  console.log('- forceReconnectSignals() pour recharger');
  console.log('- showSignalsState() pour voir l\'état des signaux');
}

// Exécuter les tests
runAllSignalTests();

console.log('📡 Script de test des signaux chargé.'); 