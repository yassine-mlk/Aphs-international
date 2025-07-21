// =========================================
// DIAGNOSTIC SIGNALS WEBRTC - POUR L'AUTRE PARTICIPANT
// Script à exécuter sur l'autre participant qui ne reçoit pas les signaux
// =========================================

console.log('🔍 Diagnostic des signaux WebRTC - Participant qui ne reçoit pas...');

// =========================================
// 1. VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT
// =========================================

console.log('🔧 Variables d\'environnement:');
console.log('VITE_USE_REALTIME:', import.meta.env?.VITE_USE_REALTIME);
console.log('VITE_USE_ROBUST_VIDEO_CONFERENCE:', import.meta.env?.VITE_USE_ROBUST_VIDEO_CONFERENCE);
console.log('VITE_SUPABASE_URL:', import.meta.env?.VITE_SUPABASE_URL);

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
  
  // Test de connexion Supabase
  window.supabase.from('video_meetings').select('count').limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Erreur de connexion Supabase:', error);
      } else {
        console.log('✅ Connexion Supabase OK');
      }
    })
    .catch(error => {
      console.error('❌ Erreur de test Supabase:', error);
    });
}

// =========================================
// 3. VÉRIFICATION DES CANAUX REALTIME
// =========================================

function checkRealtimeChannels() {
  console.log('📡 Vérification des canaux Realtime...');
  
  if (!window.supabase) {
    console.log('❌ Supabase non disponible pour les canaux');
    return;
  }
  
  // Vérifier si nous sommes dans une vidéoconférence
  const videoElements = document.querySelectorAll('video');
  console.log(`📹 Éléments vidéo trouvés: ${videoElements.length}`);
  
  if (videoElements.length === 0) {
    console.log('❌ Pas d\'éléments vidéo - pas dans une vidéoconférence');
    return;
  }
  
  // Chercher les logs de connexion
  console.log('📝 Vérifiez ces logs dans la console:');
  console.log('- ✅ Canal Supabase souscrit');
  console.log('- ✅ Présence envoyée dans la room');
  console.log('- ✅ Connected to video room');
  console.log('- 📨 Signal WebRTC reçu');
  
  // Test de création d'un canal
  try {
    const testChannel = window.supabase.channel('test_debug_channel', {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: `debug_${Date.now()}` }
      }
    });
    
    console.log('✅ Test de création de canal réussi');
    
    // Écouter les signaux
    testChannel.on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
      console.log('📨 Signal de test reçu:', payload);
    });
    
    // S'abonner
    testChannel.subscribe()
      .then(() => {
        console.log('✅ Test d\'abonnement au canal réussi');
        
        // Envoyer un signal de test
        return testChannel.send({
          type: 'webrtc-signal',
          payload: {
            signal: { type: 'test', data: 'debug' },
            from: `debug_${Date.now()}`,
            to: 'all',
            timestamp: new Date().toISOString()
          }
        });
      })
      .then(() => {
        console.log('✅ Test d\'envoi de signal réussi');
        
        // Se désabonner après 2 secondes
        setTimeout(() => {
          testChannel.unsubscribe();
          console.log('🛑 Canal de test fermé');
        }, 2000);
      })
      .catch(error => {
        console.error('❌ Erreur test canal:', error);
      });
    
  } catch (error) {
    console.error('❌ Erreur création canal de test:', error);
  }
}

// =========================================
// 4. VÉRIFICATION DES LOGS DE RÉCEPTION
// =========================================

function checkReceptionLogs() {
  console.log('📨 Vérification des logs de réception...');
  
  // Chercher les logs dans la console
  console.log('🔍 Cherchez ces logs dans la console:');
  console.log('- 📨 Signal WebRTC reçu');
  console.log('- 📥 Processing offer from');
  console.log('- 📥 Processing answer from');
  console.log('- 📥 Processing ice-candidate from');
  
  // Si aucun de ces logs n'apparaît, le problème est la réception
  console.log('💡 Si vous ne voyez AUCUN de ces logs, le problème est:');
  console.log('1. Variables d\'environnement manquantes');
  console.log('2. Canal Supabase non connecté');
  console.log('3. Problème de réseau/Realtime');
}

// =========================================
// 5. FONCTIONS UTILITAIRES
// =========================================

// Forcer la reconnexion
window.forceReconnectVideo = () => {
  console.log('🔄 Forçage de la reconnexion vidéo...');
  window.location.reload();
};

// Afficher l'état complet
window.showVideoState = () => {
  console.log('📊 État complet de la vidéoconférence...');
  
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
  
  // Participants
  const participants = document.querySelectorAll('[class*="participant"]');
  console.log(`👤 Participants: ${participants.length}`);
  
  // Conseils
  console.log('💡 Solutions possibles:');
  console.log('1. Vérifiez .env.local avec VITE_USE_REALTIME=true');
  console.log('2. Redémarrez le serveur de développement');
  console.log('3. Vérifiez la connexion internet');
  console.log('4. Vérifiez les logs de Supabase Realtime');
};

// =========================================
// 6. EXÉCUTION AUTOMATIQUE
// =========================================

function runCompleteDiagnostic() {
  console.log('🚀 Diagnostic complet des signaux...');
  
  checkRealtimeChannels();
  checkReceptionLogs();
  
  console.log('✅ Diagnostic terminé. Utilisez:');
  console.log('- forceReconnectVideo() pour recharger');
  console.log('- showVideoState() pour voir l\'état complet');
}

// Exécuter le diagnostic
runCompleteDiagnostic();

console.log('🔍 Script de diagnostic des signaux chargé.'); 