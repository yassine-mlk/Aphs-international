// =========================================
// TEST CONFIGURATION GLOBALE
// Script pour vérifier que la configuration est bien chargée
// =========================================

console.log('🔧 Test de la configuration globale...');

// =========================================
// 1. VÉRIFICATION DE LA CONFIGURATION GLOBALE
// =========================================

if (window.VIDEO_CONFERENCE_CONFIG) {
  console.log('✅ Configuration globale disponible:', window.VIDEO_CONFERENCE_CONFIG);
  
  // Vérifier les variables importantes
  console.log('📋 Variables importantes:');
  console.log('- VITE_USE_REALTIME:', window.VIDEO_CONFERENCE_CONFIG.VITE_USE_REALTIME);
  console.log('- VITE_USE_ROBUST_VIDEO_CONFERENCE:', window.VIDEO_CONFERENCE_CONFIG.VITE_USE_ROBUST_VIDEO_CONFERENCE);
  console.log('- VITE_SUPABASE_URL:', window.VIDEO_CONFERENCE_CONFIG.VITE_SUPABASE_URL);
  console.log('- VITE_SUPABASE_ANON_KEY:', window.VIDEO_CONFERENCE_CONFIG.VITE_SUPABASE_ANON_KEY ? '✅ Disponible' : '❌ Manquante');
} else {
  console.error('❌ Configuration globale non disponible!');
  console.log('💡 Vérifiez que le fichier /config.js est bien chargé');
}

// =========================================
// 2. VÉRIFICATION DE SUPABASE
// =========================================

if (window.supabase) {
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
} else {
  console.error('❌ Client Supabase non disponible!');
  console.log('💡 Vérifiez que Supabase est correctement initialisé');
}

// =========================================
// 3. VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT
// =========================================

console.log('🔧 Variables d\'environnement Vite:');
console.log('- VITE_USE_REALTIME:', import.meta.env?.VITE_USE_REALTIME);
console.log('- VITE_USE_ROBUST_VIDEO_CONFERENCE:', import.meta.env?.VITE_USE_ROBUST_VIDEO_CONFERENCE);
console.log('- VITE_SUPABASE_URL:', import.meta.env?.VITE_SUPABASE_URL);

// =========================================
// 4. TEST DE CONFIGURATION CENTRALISÉE
// =========================================

// Vérifier si la configuration centralisée est disponible
if (typeof window !== 'undefined' && window.config) {
  console.log('✅ Configuration centralisée disponible:', window.config);
} else {
  console.log('ℹ️ Configuration centralisée non exposée globalement');
}

// =========================================
// 5. FONCTIONS UTILITAIRES
// =========================================

// Fonction pour forcer la reconnexion
window.forceReconnectGlobal = () => {
  console.log('🔄 Forçage de la reconnexion...');
  if (typeof window.forceVideoReconnect === 'function') {
    window.forceVideoReconnect();
  } else {
    console.log('❌ Fonction de reconnexion non disponible');
    window.location.reload();
  }
};

// Fonction pour afficher l'état complet
window.showGlobalState = () => {
  console.log('📊 État global...');
  
  // Configuration globale
  if (window.VIDEO_CONFERENCE_CONFIG) {
    console.log('✅ Configuration globale: OK');
  } else {
    console.log('❌ Configuration globale: NON DISPONIBLE');
  }
  
  // Supabase
  if (window.supabase) {
    console.log('✅ Supabase: OK');
  } else {
    console.log('❌ Supabase: NON DISPONIBLE');
  }
  
  // Variables d'environnement
  console.log('🔧 Variables Vite:');
  console.log('- VITE_USE_REALTIME:', import.meta.env?.VITE_USE_REALTIME);
  console.log('- VITE_USE_ROBUST_VIDEO_CONFERENCE:', import.meta.env?.VITE_USE_ROBUST_VIDEO_CONFERENCE);
  
  // Conseils
  console.log('💡 Solutions possibles:');
  console.log('1. Vérifiez que /config.js est bien chargé');
  console.log('2. Utilisez forceReconnectGlobal() pour recharger');
  console.log('3. Vérifiez la console pour les erreurs');
};

// =========================================
// 6. EXÉCUTION AUTOMATIQUE
// =========================================

console.log('✅ Test de configuration terminé. Utilisez:');
console.log('- forceReconnectGlobal() pour recharger');
console.log('- showGlobalState() pour voir l\'état complet');

console.log('🔧 Script de test de configuration globale chargé.'); 