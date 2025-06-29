# Setup Simple Peer + Supabase Vidéoconférence

## 🚀 Installation Rapide

### 1. Installation des Dépendances

```bash
# Installer Simple Peer
npm install simple-peer

# Types TypeScript (si nécessaire)
npm install --save-dev @types/simple-peer
```

### 2. Vérification des Fichiers Créés

Assurez-vous que ces fichiers sont présents dans votre projet :

```
src/
├── hooks/
│   └── useSimplePeerVideoConference.ts  ✅ Créé
├── components/
│   ├── OptimizedVideoCall.tsx          ✅ Créé
│   └── ImprovedVideoConference.tsx     ✅ Créé
└── pages/
    └── VideoConferenceDemo.tsx         ✅ Créé
```

### 3. Configuration Supabase

#### 3.1 Vérifier que Realtime est activé

Dans votre dashboard Supabase → Settings → API :
- ✅ Realtime doit être activé
- ✅ Notez votre `anon` key
- ✅ Notez votre URL du projet

#### 3.2 Configuration des variables d'environnement

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Test de la Configuration

#### 4.1 Test Simple

```tsx
// pages/test-video.tsx ou app/test-video/page.tsx
import VideoConferenceDemo from '../components/VideoConferenceDemo';

export default function TestVideoPage() {
  return <VideoConferenceDemo />;
}
```

#### 4.2 Test du Hook Directement

```tsx
// components/TestHook.tsx
import { useSimplePeerVideoConference } from '../hooks/useSimplePeerVideoConference';

export const TestHook = () => {
  const { connectionStatus, isConnected, participants } = useSimplePeerVideoConference({
    roomId: 'TEST123',
    userName: 'Test User'
  });

  return (
    <div>
      <p>Status: {connectionStatus}</p>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>Participants: {participants.length}</p>
    </div>
  );
};
```

## 🔧 Configuration Avancée

### 1. Configuration STUN/TURN Personnalisée

```typescript
// hooks/useSimplePeerVideoConference.ts
// Modifier la configuration ICE selon vos besoins

const peer = new SimplePeer({
  initiator,
  trickle: false,
  stream: localStreamRef.current,
  config: {
    iceServers: [
      // Serveurs STUN publics
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      
      // Serveur TURN si nécessaire (pour réseaux restrictifs)
      {
        urls: 'turn:your-turn-server.com:3478',
        username: 'your-username',
        credential: 'your-password'
      }
    ]
  }
});
```

### 2. Configuration Qualité Vidéo

```typescript
// Modifier dans initializeLocalStream()
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1920, max: 1920 },    // 4K si supporté
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 60, max: 60 }     // 60fps si supporté
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000                     // Haute qualité audio
  }
});
```

### 3. Configuration Sécurité

```typescript
// Ajouter validation des room IDs
const validateRoomId = (roomId: string): boolean => {
  // Accepter seulement des IDs alphanumériques de 6 caractères
  return /^[A-Z0-9]{6}$/.test(roomId);
};

// Limiter le nombre de participants
const MAX_PARTICIPANTS = 8;

// Ajouter timeout pour les connexions
const CONNECTION_TIMEOUT = 30000; // 30 secondes
```

## 🎯 Intégration dans l'Application Existante

### 1. Ajouter la Route

```tsx
// Dans votre router (React Router ou Next.js)

// React Router
import { Route } from 'react-router-dom';
import VideoConferenceDemo from './pages/VideoConferenceDemo';

<Route path="/video-conference" component={VideoConferenceDemo} />

// Next.js (pages router)
// pages/video-conference.tsx
export { default } from '../pages/VideoConferenceDemo';

// Next.js (app router) 
// app/video-conference/page.tsx
export { default } from '../../pages/VideoConferenceDemo';
```

### 2. Ajouter au Menu de Navigation

```tsx
// Dans votre composant de navigation
<li>
  <Link to="/video-conference" className="nav-link">
    <Video className="h-4 w-4 mr-2" />
    Vidéoconférence
  </Link>
</li>
```

### 3. Intégration avec l'Authentification

```tsx
// Modifier le hook pour utiliser votre système d'auth
const { user } = useAuth(); // Votre hook d'auth existant

const currentUserId = user?.id || `anonymous_${Date.now()}`;
const displayName = userName || user?.profile?.full_name || user?.email || 'Utilisateur';
```

## 🧪 Tests et Débogage

### 1. Tests de Base

```bash
# Tester les permissions média
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => console.log('Media access OK'))
  .catch(err => console.error('Media access failed:', err));

# Tester la connexion Supabase
supabase.channel('test').subscribe(console.log);
```

### 2. Debugging Console

Activez les logs détaillés en ajoutant dans votre code :

```typescript
// En haut du hook
const DEBUG = process.env.NODE_ENV === 'development';

// Remplacer les console.log par :
if (DEBUG) console.log('Message de debug');
```

### 3. Monitoring des Connexions

```typescript
// Ajouter dans createPeerConnection()
peer.on('signal', (signal) => {
  console.log(`📤 Signal type: ${signal.type}, size: ${JSON.stringify(signal).length} bytes`);
});

peer.on('connect', () => {
  console.log(`✅ Peer connected at ${new Date().toISOString()}`);
});

peer.on('data', (data) => {
  console.log(`📨 Received data: ${data.length} bytes`);
});
```

## 🔍 Résolution des Problèmes Courants

### Problème : "getUserMedia failed"

**Solutions :**
```typescript
// 1. Vérifier les permissions navigateur
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  throw new Error('getUserMedia not supported');
}

// 2. Demander les permissions explicitement
await navigator.permissions.query({ name: 'camera' });
await navigator.permissions.query({ name: 'microphone' });

// 3. Fallback avec contraintes réduites
try {
  return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
} catch {
  return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
}
```

### Problème : "Supabase channel not connecting"

**Solutions :**
```typescript
// 1. Vérifier les variables d'environnement
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// 2. Tester la connexion Supabase
const testConnection = async () => {
  const { data, error } = await supabase.from('profiles').select('id').limit(1);
  if (error) console.error('Supabase connection failed:', error);
  else console.log('Supabase connection OK');
};

// 3. Vérifier Realtime
const testRealtime = () => {
  const channel = supabase.channel('test');
  channel.subscribe((status) => {
    console.log('Realtime status:', status);
  });
};
```

### Problème : "Peers not connecting"

**Solutions :**
```typescript
// 1. Vérifier les serveurs ICE
const testIceServers = async () => {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('ICE candidate:', event.candidate.candidate);
    }
  };
  
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
};

// 2. Ajouter serveur TURN pour NAT restrictif
const turnConfig = {
  urls: 'turn:openrelay.metered.ca:80',
  username: 'openrelayproject',
  credential: 'openrelayproject'
};
```

## 📱 Test Multi-Dispositifs

### 1. Test Local

```bash
# Servir l'application sur le réseau local
npm run dev -- --host 0.0.0.0

# Accéder depuis d'autres appareils
# https://[your-local-ip]:3000/video-conference
```

### 2. Test avec Netlify Deploy Preview

```bash
# Déployer sur Netlify pour tester avec de vrais utilisateurs
netlify deploy --prod

# Ou utiliser les deploy previews pour chaque commit
```

### 3. Test de Charge

```javascript
// Script pour tester avec plusieurs participants
const createMultipleParticipants = (roomId, count) => {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      window.open(`/video-conference?room=${roomId}&user=User${i}`, `_blank${i}`);
    }, i * 1000);
  }
};

// createMultipleParticipants('TEST123', 5);
```

## 🚀 Optimisations de Production

### 1. Code Splitting

```tsx
// Lazy loading du composant vidéo
const OptimizedVideoCall = lazy(() => import('./OptimizedVideoCall'));

// Dans votre composant parent
<Suspense fallback={<div>Chargement de la vidéoconférence...</div>}>
  <OptimizedVideoCall roomId={roomId} />
</Suspense>
```

### 2. Service Worker pour Mise en Cache

```javascript
// public/sw.js
const CACHE_NAME = 'video-conference-v1';
const urlsToCache = [
  '/',
  '/video-conference',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

### 3. Monitoring et Analytics

```typescript
// Ajouter tracking des événements
const trackVideoConferenceEvent = (eventName: string, properties: any) => {
  // Google Analytics, Mixpanel, etc.
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, properties);
  }
};

// Dans le hook
peer.on('connect', () => {
  trackVideoConferenceEvent('peer_connected', {
    roomId,
    participantCount: participants.length
  });
});
```

## ✅ Checklist de Déploiement

- [ ] **Dépendances installées** : Simple Peer ajouté au package.json
- [ ] **Variables d'environnement** : Supabase URL et clé configurées
- [ ] **Permissions navigateur** : HTTPS activé pour getUserMedia
- [ ] **Tests effectués** : Au moins 2 participants simultanés testés
- [ ] **Fallbacks configurés** : Gestion d'erreurs pour échec de connexion
- [ ] **Monitoring ajouté** : Logs et analytics en place
- [ ] **Documentation** : Guide utilisateur créé
- [ ] **Performance validée** : Tests de charge effectués

## 🎉 Prêt pour la Production !

Une fois cette checklist complétée, votre système de vidéoconférence Simple Peer + Supabase sera prêt pour une utilisation en production avec une excellente stabilité et performance. 