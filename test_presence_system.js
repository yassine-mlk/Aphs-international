// =========================================
// TEST SYSTÈME DE PRÉSENCES SUPABASE
// Script pour diagnostiquer le comptage des participants
// =========================================

console.log('👥 Test du système de présences Supabase...');

// =========================================
// 1. VÉRIFIER LA CONNEXION SUPABASE
// =========================================

function checkSupabaseConnection() {
  console.log('🔍 Vérification de la connexion Supabase...');
  
  if (typeof window.supabase === 'undefined') {
    console.log('❌ Client Supabase non disponible');
    return false;
  }
  
  console.log('✅ Client Supabase disponible');
  console.log('📡 URL:', window.supabase.supabaseUrl);
  console.log('🔑 Clé anonyme configurée:', !!window.supabase.supabaseKey);
  
  return true;
}

// =========================================
// 2. SIMULER UN SYSTÈME DE PRÉSENCES
// =========================================

async function simulatePresenceSystem() {
  console.log('🎭 Simulation du système de présences...');
  
  if (!window.supabase) {
    console.log('❌ Supabase non disponible pour la simulation');
    return;
  }
  
  try {
    // Créer un canal de test
    const testChannel = window.supabase.channel('test_presence_channel', {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: `test_user_${Date.now()}` }
      }
    });
    
    console.log('✅ Canal de test créé');
    
    // S'abonner au canal
    await testChannel.subscribe();
    console.log('✅ Abonnement au canal réussi');
    
    // Se présenter
    await testChannel.track({
      id: `test_user_${Date.now()}`,
      name: 'Test User',
      joinedAt: new Date().toISOString()
    });
    console.log('✅ Présence envoyée');
    
    // Vérifier l'état de présence
    setTimeout(() => {
      const state = testChannel.presenceState();
      console.log('👥 État de présence:', state);
      console.log('📊 Nombre de participants:', Object.keys(state).length);
      
      // Se désabonner
      testChannel.unsubscribe();
      console.log('🛑 Canal fermé');
    }, 2000);
    
  } catch (error) {
    console.error('❌ Erreur simulation présences:', error);
  }
}

// =========================================
// 3. DIAGNOSTIC DU COMPTEUR DE PARTICIPANTS
// =========================================

function diagnoseParticipantCounter() {
  console.log('🔢 Diagnostic du compteur de participants...');
  
  // Chercher les éléments qui affichent le nombre de participants
  const participantElements = document.querySelectorAll('*');
  const participantCounters = [];
  
  participantElements.forEach(element => {
    const text = element.textContent || '';
    if (text.includes('participant') || text.includes('Participant')) {
      participantCounters.push({
        element: element,
        text: text,
        tagName: element.tagName,
        className: element.className
      });
    }
  });
  
  console.log(`🔍 Éléments contenant "participant": ${participantCounters.length}`);
  participantCounters.forEach((counter, index) => {
    console.log(`📊 Compteur ${index + 1}:`, {
      text: counter.text,
      tag: counter.tagName,
      class: counter.className
    });
  });
  
  // Chercher les badges avec des nombres
  const badges = document.querySelectorAll('[class*="badge"]');
  console.log(`🏷️ Badges trouvés: ${badges.length}`);
  
  badges.forEach((badge, index) => {
    const text = badge.textContent || '';
    if (text.match(/\d+/)) {
      console.log(`🏷️ Badge ${index + 1}:`, {
        text: text,
        class: badge.className
      });
    }
  });
}

// =========================================
// 4. VÉRIFIER LES VARIABLES D'ENVIRONNEMENT
// =========================================

function checkEnvironmentVariables() {
  console.log('🔧 Vérification des variables d\'environnement...');
  
  const envVars = {
    'VITE_SUPABASE_URL': import.meta.env?.VITE_SUPABASE_URL,
    'VITE_SUPABASE_ANON_KEY': import.meta.env?.VITE_SUPABASE_ANON_KEY ? '✅ Configurée' : '❌ Manquante',
    'VITE_USE_REALTIME': import.meta.env?.VITE_USE_REALTIME,
    'VITE_USE_ROBUST_VIDEO_CONFERENCE': import.meta.env?.VITE_USE_ROBUST_VIDEO_CONFERENCE
  };
  
  console.table(envVars);
  
  // Vérifier si Realtime est activé
  if (envVars['VITE_USE_REALTIME'] !== 'true') {
    console.warn('⚠️ VITE_USE_REALTIME n\'est pas activé!');
  }
  
  if (envVars['VITE_USE_ROBUST_VIDEO_CONFERENCE'] !== 'true') {
    console.warn('⚠️ VITE_USE_ROBUST_VIDEO_CONFERENCE n\'est pas activé!');
  }
}

// =========================================
// 5. ANALYSER LES LOGS DE CONSOLE
// =========================================

function analyzeConsoleLogs() {
  console.log('📝 Analyse des logs de console...');
  
  // Vérifier si nous sommes dans une vidéoconférence
  const videoElements = document.querySelectorAll('video');
  console.log(`📹 Éléments vidéo trouvés: ${videoElements.length}`);
  
  // Chercher les éléments de participant
  const participantElements = document.querySelectorAll('[data-participant-id], [class*="participant"]');
  console.log(`👤 Éléments participant trouvés: ${participantElements.length}`);
  
  // Chercher les éléments de room
  const roomElements = document.querySelectorAll('[data-room-id], [class*="room"]');
  console.log(`🏠 Éléments room trouvés: ${roomElements.length}`);
  
  console.log('💡 Conseils pour le debugging:');
  console.log('1. Vérifiez les logs avec emojis 👥 🤝 📡');
  console.log('2. Cherchez les erreurs de connexion Supabase');
  console.log('3. Vérifiez les événements de présence');
  console.log('4. Contrôlez les variables d\'environnement');
}

// =========================================
// 6. FONCTIONS UTILITAIRES
// =========================================

// Fonction pour forcer la mise à jour des participants
window.forceUpdateParticipants = () => {
  console.log('🔄 Forçage de la mise à jour des participants...');
  
  // Recharger la page
  window.location.reload();
};

// Fonction pour afficher l'état actuel
window.showCurrentState = () => {
  console.log('📊 État actuel de la vidéoconférence...');
  
  // Vérifier les éléments vidéo
  const videos = document.querySelectorAll('video');
  console.log(`📹 Vidéos: ${videos.length}`);
  
  // Vérifier les participants
  const participants = document.querySelectorAll('[class*="participant"]');
  console.log(`👤 Participants: ${participants.length}`);
  
  // Vérifier les connexions
  if (window.RTCPeerConnection) {
    console.log('🔗 RTCPeerConnection disponible');
  }
  
  // Vérifier Supabase
  if (window.supabase) {
    console.log('📡 Supabase disponible');
  }
};

// Fonction pour diagnostiquer une room spécifique
window.diagnoseRoom = (roomId) => {
  console.log(`🏠 Diagnostic de la room: ${roomId}`);
  
  // Vérifier les logs de présence
  console.log('📝 Vérifiez les logs de présence dans la console');
  
  // Vérifier les participants
  diagnoseParticipantCounter();
  
  // Vérifier les variables
  checkEnvironmentVariables();
};

// =========================================
// 7. EXÉCUTION AUTOMATIQUE
// =========================================

async function runAllPresenceTests() {
  console.log('🚀 Démarrage des tests de présences...');
  
  checkSupabaseConnection();
  await simulatePresenceSystem();
  diagnoseParticipantCounter();
  checkEnvironmentVariables();
  analyzeConsoleLogs();
  
  console.log('✅ Tests terminés. Utilisez:');
  console.log('- forceUpdateParticipants() pour recharger');
  console.log('- showCurrentState() pour voir l\'état actuel');
  console.log('- diagnoseRoom("room-id") pour diagnostiquer une room');
}

// Exécuter les tests
runAllPresenceTests();

console.log('👥 Script de test des présences chargé.'); 