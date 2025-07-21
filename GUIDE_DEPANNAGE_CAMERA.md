# 🔧 Guide de Dépannage - Caméra en Attente

## 🎯 Problème
La vidéoconférence fonctionne, les participants peuvent accéder à la room, mais la caméra affiche "en attente" au lieu de montrer la vidéo.

## 🔍 Diagnostic Rapide

### 1. Vérifier la Console du Navigateur
1. Ouvrir les **Outils de développement** (F12)
2. Aller dans l'onglet **Console**
3. Chercher les erreurs liées à :
   - `getUserMedia`
   - `MediaStream`
   - `RTCPeerConnection`
   - `Supabase`

### 2. Tester les APIs WebRTC
Exécuter dans la console :
```javascript
// Test rapide des APIs
console.log('getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
console.log('RTCPeerConnection:', !!window.RTCPeerConnection);
console.log('MediaStream:', !!window.MediaStream);
```

### 3. Vérifier les Permissions
```javascript
// Vérifier les permissions caméra/microphone
navigator.permissions.query({ name: 'camera' }).then(result => {
  console.log('Permission caméra:', result.state);
});
navigator.permissions.query({ name: 'microphone' }).then(result => {
  console.log('Permission microphone:', result.state);
});
```

## 🛠️ Solutions par Ordre de Priorité

### Solution 1 : Autoriser l'Accès Caméra/Microphone
**Problème le plus courant**

1. **Vérifier l'icône de caméra** dans la barre d'adresse
2. **Cliquer sur l'icône** et autoriser l'accès
3. **Recharger la page** après autorisation

### Solution 2 : Vérifier les Paramètres du Navigateur
1. Aller dans **Paramètres du navigateur**
2. Chercher **"Caméra"** ou **"Microphone"**
3. Vérifier que le site est **autorisé**
4. **Supprimer les permissions** et les redonner

### Solution 3 : Tester l'Accès Média Directement
Exécuter dans la console :
```javascript
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  console.log('✅ Accès média réussi!');
  console.log('Tracks vidéo:', stream.getVideoTracks().length);
  stream.getTracks().forEach(track => track.stop());
}).catch(error => {
  console.error('❌ Erreur accès média:', error);
});
```

### Solution 4 : Vérifier HTTPS
**WebRTC nécessite HTTPS en production**

1. Vérifier que l'URL commence par `https://`
2. Si en `http://`, demander l'activation HTTPS

### Solution 5 : Vérifier les Variables d'Environnement
```javascript
// Dans la console
console.log('VITE_USE_ROBUST_VIDEO_CONFERENCE:', import.meta.env.VITE_USE_ROBUST_VIDEO_CONFERENCE);
console.log('VITE_USE_REALTIME:', import.meta.env.VITE_USE_REALTIME);
```

## 🎥 Test Complet de la Caméra

### Script de Test Automatique
Copier et coller dans la console :
```javascript
async function testCamera() {
  try {
    console.log('🎥 Test d\'accès caméra...');
    
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
    
    console.log('✅ Caméra accessible!');
    console.log('📊 Détails du stream:');
    console.log('- ID:', stream.id);
    console.log('- Tracks vidéo:', stream.getVideoTracks().length);
    console.log('- Tracks audio:', stream.getAudioTracks().length);
    
    // Afficher les détails des tracks vidéo
    stream.getVideoTracks().forEach((track, index) => {
      console.log(`📹 Track ${index + 1}:`, {
        id: track.id,
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState,
        settings: track.getSettings()
      });
    });
    
    // Créer un élément vidéo de test
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.style.width = '200px';
    video.style.height = '150px';
    video.style.position = 'fixed';
    video.style.top = '10px';
    video.style.right = '10px';
    video.style.zIndex = '9999';
    video.style.border = '2px solid green';
    
    document.body.appendChild(video);
    
    video.play().then(() => {
      console.log('✅ Vidéo de test en lecture!');
      console.log('🎥 Si vous voyez votre caméra dans le coin, tout fonctionne!');
      
      // Arrêter après 5 secondes
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(video);
        console.log('🛑 Test terminé');
      }, 5000);
    });
    
  } catch (error) {
    console.error('❌ Erreur caméra:', error);
    console.log('🔍 Type d\'erreur:', error.name);
    console.log('📝 Message:', error.message);
    
    if (error.name === 'NotAllowedError') {
      console.log('💡 Solution: Autoriser l\'accès à la caméra');
    } else if (error.name === 'NotFoundError') {
      console.log('💡 Solution: Vérifier que la caméra est connectée');
    } else if (error.name === 'NotReadableError') {
      console.log('💡 Solution: La caméra est utilisée par une autre application');
    }
  }
}

// Exécuter le test
testCamera();
```

## 🔧 Solutions Avancées

### Problème de Connexion WebRTC
Si la caméra fonctionne mais pas la connexion entre participants :

```javascript
// Test de connexion peer-to-peer
const peer = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
});

peer.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('🧊 Candidat ICE:', event.candidate.candidate);
  }
};

peer.onconnectionstatechange = () => {
  console.log('🔗 État connexion:', peer.connectionState);
};
```

### Problème de Supabase Realtime
Vérifier la connexion Supabase :
```javascript
// Vérifier si Supabase est connecté
if (window.supabase) {
  console.log('✅ Client Supabase disponible');
} else {
  console.log('❌ Client Supabase non trouvé');
}
```

## 📱 Solutions par Navigateur

### Chrome/Edge
1. Aller dans `chrome://settings/content/camera`
2. Vérifier les permissions pour le site
3. Supprimer et redonner les permissions

### Firefox
1. Aller dans `about:preferences#privacy`
2. Chercher "Permissions"
3. Cliquer sur "Paramètres" pour la caméra

### Safari
1. Préférences > Sites web > Caméra
2. Vérifier les permissions pour le site

## 🚨 Erreurs Courantes et Solutions

| Erreur | Cause | Solution |
|--------|-------|----------|
| `NotAllowedError` | Permissions refusées | Autoriser l'accès caméra/microphone |
| `NotFoundError` | Caméra non trouvée | Vérifier la connexion matérielle |
| `NotReadableError` | Caméra utilisée ailleurs | Fermer les autres applications |
| `OverconstrainedError` | Contraintes trop strictes | Utiliser des contraintes plus souples |
| `SecurityError` | Pas en HTTPS | Activer HTTPS en production |

## 📞 Support

Si le problème persiste :
1. **Sauvegarder les logs** de la console
2. **Noter le navigateur** et sa version
3. **Tester sur un autre navigateur**
4. **Vérifier les paramètres réseau** (proxy, firewall)

---

**💡 Conseil :** Commencez toujours par le test de la caméra direct dans la console. Si ce test échoue, le problème vient des permissions ou du matériel, pas de l'application. 