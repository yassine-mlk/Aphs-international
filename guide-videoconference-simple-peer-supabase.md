# Guide Vidéoconférence Simple Peer + Supabase

## 🎯 Présentation

Cette solution résout les problèmes de rooms et de gestion des participants dans les vidéoconférences WebRTC en utilisant **Simple Peer** avec **Supabase Realtime** pour la signalisation.

## 🔧 Architecture

### Composants Créés

1. **`useSimplePeerVideoConference.ts`** - Hook personnalisé optimisé
2. **`OptimizedVideoCall.tsx`** - Composant UI simplifié
3. **`VideoConferenceDemo.tsx`** - Page de démonstration
4. **`ImprovedVideoConference.tsx`** - Version complète avec toutes les fonctionnalités

### Technologies

- **Simple Peer** : Gestion WebRTC simplifiée
- **Supabase Realtime** : Signalisation en temps réel
- **React Hooks** : Gestion d'état optimisée
- **TypeScript** : Typage complet

## 🚀 Avantages de cette Solution

### ✅ Résolution des Problèmes

1. **Gestion des rooms robuste**
   - Identification unique des participants
   - Synchronisation automatique des présences
   - Nettoyage automatique des connexions fermées

2. **Connexions peer-to-peer stables**
   - Configuration ICE optimisée
   - Gestion des erreurs améliorée
   - Reconnexion automatique

3. **Signalisation fiable**
   - Messages WebRTC via Supabase Realtime
   - Filtrage des messages par room
   - Gestion des timeouts

### 🎯 Fonctionnalités

- **Vidéo haute qualité** (1280x720, 30fps)
- **Audio optimisé** (echo cancellation, noise suppression)
- **Partage d'écran** avec retour automatique à la caméra
- **Contrôles audio/vidéo** en temps réel
- **Interface responsive** et moderne
- **Gestion des erreurs** complète

## 📋 Guide d'Utilisation

### 1. Installation des Dépendances

```bash
npm install simple-peer
```

### 2. Configuration Supabase

Assurez-vous que Realtime est activé dans votre projet Supabase :

```sql
-- Activer Realtime si nécessaire
ALTER PUBLICATION supabase_realtime ADD TABLE video_meetings;
```

### 3. Utilisation du Hook

```tsx
import { useSimplePeerVideoConference } from '../hooks/useSimplePeerVideoConference';

const MyVideoComponent = () => {
  const {
    localStream,
    participants,
    isConnected,
    connectionStatus,
    disconnectFromRoom,
    toggleAudio,
    toggleVideo
  } = useSimplePeerVideoConference({
    roomId: 'ROOM123',
    userName: 'John Doe',
    onError: (error) => console.error(error)
  });

  // Votre logique UI...
};
```

### 4. Utilisation du Composant Optimisé

```tsx
import OptimizedVideoCall from '../components/OptimizedVideoCall';

const VideoPage = () => {
  return (
    <OptimizedVideoCall
      roomId="ROOM123"
      userName="John Doe"
      onLeave={() => console.log('Left room')}
    />
  );
};
```

## 🔧 Configuration Technique

### Hook `useSimplePeerVideoConference`

#### Props
```typescript 
interface UseSimplePeerVideoConferenceProps {
  roomId: string;           // ID unique de la room
  userName?: string;        // Nom d'affichage (optionnel)
  onError?: (error: Error) => void;  // Callback d'erreur
}
```

#### Retour
```typescript
{
  // États
  localStream: MediaStream | null;
  participants: Participant[];
  isConnected: boolean;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  error: string | null;
  
  // Actions
  disconnectFromRoom: () => Promise<void>;
  toggleAudio: () => boolean;
  toggleVideo: () => boolean;
  replaceVideoTrack: (stream: MediaStream) => Promise<boolean>;
  
  // Utils
  currentUserId: string;
  displayName: string;
  roomId: string;
}
```

### Configuration WebRTC

```typescript
const peer = new SimplePeer({
  initiator,
  trickle: false,  // Attendre tous les candidats ICE
  stream: localStream,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  }
});
```

### Configuration Supabase Realtime

```typescript
const channel = supabase.channel(`simple_video_room_${roomId}`, {
  config: {
    broadcast: { self: false, ack: false },
    presence: { key: currentUserId }
  }
});
```

## 🐛 Résolution des Problèmes

### Problème : Participants ne se voient pas

**Solutions :**
1. Vérifier que les permissions caméra/micro sont accordées
2. Contrôler les serveurs STUN/TURN
3. Vérifier la connectivité réseau (NAT/firewall)

```typescript
// Diagnostic des connexions
peer.on('error', (err) => {
  console.error('Peer error:', err);
  // Logique de reconnexion
});
```

### Problème : Connexion instable

**Solutions :**
1. Implémenter une logique de reconnexion
2. Ajouter des serveurs TURN pour les réseaux restrictifs
3. Optimiser la qualité vidéo selon la bande passante

```typescript
// Configuration adaptative
const getVideoConstraints = (bandwidth) => ({
  width: { ideal: bandwidth > 1000 ? 1280 : 640 },
  height: { ideal: bandwidth > 1000 ? 720 : 480 },
  frameRate: { ideal: bandwidth > 500 ? 30 : 15 }
});
```

### Problème : Room avec participants fantômes

**Solutions :**
1. Nettoyage automatique des présences
2. Timeout sur les connexions inactives
3. Heartbeat pour vérifier la connectivité

```typescript
// Nettoyage automatique
const cleanupInactiveParticipants = () => {
  participants.forEach(participant => {
    if (!participant.isConnected && 
        Date.now() - participant.joinedAt.getTime() > 30000) {
      cleanupPeer(participant.id);
    }
  });
};
```

## 🔒 Sécurité

### Bonnes Pratiques

1. **Validation des room IDs**
```typescript
const isValidRoomId = (roomId: string) => {
  return /^[A-Z0-9]{6}$/.test(roomId);
};
```

2. **Filtrage des messages**
```typescript
const handleWebRTCSignal = (message) => {
  // Vérifier l'origine du message
  if (message.roomId !== currentRoomId) return;
  if (message.from === currentUserId) return;
  
  // Traiter le signal...
};
```

3. **Limitation du nombre de participants**
```typescript
const MAX_PARTICIPANTS = 8;

if (participants.length >= MAX_PARTICIPANTS) {
  throw new Error('Room pleine');
}
```

## 📊 Monitoring et Analytics

### Métriques à Suivre

```typescript
// Qualité de connexion
const trackConnectionQuality = (peer, participantId) => {
  peer.on('connect', () => {
    console.log(`Connection established with ${participantId}`);
    // Envoyer métrique de succès
  });
  
  peer.on('error', (error) => {
    console.error(`Connection failed with ${participantId}:`, error);
    // Envoyer métrique d'erreur
  });
};

// Performance réseau
const trackBandwidth = () => {
  navigator.connection?.addEventListener('change', () => {
    console.log('Network changed:', navigator.connection.effectiveType);
    // Adapter la qualité vidéo
  });
};
```

## 🎨 Personnalisation UI

### Thèmes et Styles

```tsx
// Personnaliser l'apparence
const VideoCall = ({ theme = 'dark' }) => {
  const themeClasses = {
    dark: 'bg-gray-900 text-white',
    light: 'bg-white text-gray-900'
  };
  
  return (
    <div className={`${themeClasses[theme]} min-h-screen`}>
      {/* Votre contenu */}
    </div>
  );
};
```

### Layouts Adaptatifs

```tsx
// Layout en grille adaptative
const getGridLayout = (participantCount) => {
  if (participantCount <= 1) return 'grid-cols-1';
  if (participantCount <= 4) return 'grid-cols-2';
  if (participantCount <= 9) return 'grid-cols-3';
  return 'grid-cols-4';
};
```

## 🚦 États de Connexion

### Machine d'États

```typescript
type ConnectionState = 
  | 'idle'       // Initial
  | 'connecting' // En cours de connexion
  | 'connected'  // Connecté et prêt
  | 'error';     // Erreur de connexion

const connectionStateMachine = {
  idle: { connect: 'connecting' },
  connecting: { success: 'connected', error: 'error' },
  connected: { disconnect: 'idle', error: 'error' },
  error: { retry: 'connecting', reset: 'idle' }
};
```

## 📱 Compatibilité

### Navigateurs Supportés

- ✅ Chrome 70+
- ✅ Firefox 68+
- ✅ Safari 14+
- ✅ Edge 79+
- ❌ IE (non supporté)

### Plateformes

- ✅ Desktop (Windows, macOS, Linux)
- ✅ Mobile (iOS Safari, Android Chrome)
- ⚠️ WebView (support limité)

## 🔄 Migration depuis l'Ancien Système

### Étapes de Migration

1. **Remplacer les imports**
```tsx
// Ancien
import { WebRTCMeeting } from './WebRTCMeeting';

// Nouveau
import OptimizedVideoCall from './OptimizedVideoCall';
```

2. **Adapter les props**
```tsx
// Ancien
<WebRTCMeeting 
  roomId={roomId}
  displayName={name}
  onClose={handleClose}
  isModerator={isHost}
/>

// Nouveau
<OptimizedVideoCall
  roomId={roomId}
  userName={name}
  onLeave={handleClose}
/>
```

3. **Mettre à jour la logique**
```tsx
// Utiliser le nouveau hook si besoin de logique personnalisée
const conference = useSimplePeerVideoConference({
  roomId,
  userName,
  onError: handleError
});
```

## 📈 Performance

### Optimisations Implémentées

1. **Refs pour éviter les rerenders**
2. **Cleanup automatique des ressources**
3. **Debouncing des événements**
4. **Lazy loading des streams**
5. **Memoization des composants**

### Métriques de Performance

```typescript
// Mesurer les temps de connexion
const connectionStartTime = Date.now();

peer.on('connect', () => {
  const connectionTime = Date.now() - connectionStartTime;
  console.log(`Connection established in ${connectionTime}ms`);
});
```

## 🎯 Exemple Complet d'Utilisation

```tsx
import React, { useState } from 'react';
import OptimizedVideoCall from './OptimizedVideoCall';

const MyVideoApp = () => {
  const [roomId, setRoomId] = useState('');
  const [inCall, setInCall] = useState(false);

  const joinCall = () => {
    if (roomId.trim()) {
      setInCall(true);
    }
  };

  const leaveCall = () => {
    setInCall(false);
    setRoomId('');
  };

  if (inCall) {
    return (
      <OptimizedVideoCall
        roomId={roomId}
        userName="John Doe"
        onLeave={leaveCall}
      />
    );
  }

  return (
    <div className="p-8">
      <h1>Vidéoconférence APHS</h1>
      <input
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="Entrez l'ID de room"
        className="border p-2 mr-2"
      />
      <button onClick={joinCall} className="bg-blue-500 text-white p-2">
        Rejoindre
      </button>
    </div>
  );
};

export default MyVideoApp;
```

## 🎉 Conclusion

Cette solution Simple Peer + Supabase offre :

- ✅ **Stabilité** : Gestion robuste des connexions
- ✅ **Performance** : Connexions P2P directes
- ✅ **Simplicité** : API simple et hook réutilisable
- ✅ **Fiabilité** : Gestion d'erreurs complète
- ✅ **Scalabilité** : Architecture modulaire

La combinaison de Simple Peer pour WebRTC et Supabase pour la signalisation résout efficacement les problèmes de rooms et de participants tout en maintenant une excellente expérience utilisateur. 