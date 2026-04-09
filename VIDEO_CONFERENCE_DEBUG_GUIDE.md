# 🔍 Guide de Debug - Système Vidéoconférence APS

## 🎯 Changements Effectués

### ✅ **Problème Résolu :** Communication entre participants

**Avant :** Les participants ne se voyaient pas entre eux (système localStorage limité)
**Après :** Utilisation de Supabase Realtime pour la vraie communication temps réel

### 🔧 **Modifications Apportées :**

1. **Hook useSocket** → Utilise maintenant Supabase Realtime
2. **Logs détaillés** → Console logs pour debug
3. **Gestion des connexions** → Nettoyage automatique des déconnexions

---

## 🧪 **Tests à Effectuer**

### Test 1 : Connexion Basique
```bash
# 1. Ouvrir la console du navigateur (F12)
# 2. Créer une réunion en tant qu'admin
# 3. Vérifier les logs :
```

**Logs attendus :**
```
🔌 Initializing socket for room: [room-id], user: [nom] ([user-id])
✅ Connected to video room
🔄 Managing participants. Connected: true, Local stream: true
```

### Test 2 : Multi-Participants
```bash
# 1. Admin crée une réunion
# 2. Copier l'ID de réunion
# 3. Ouvrir un autre navigateur/onglet incognito
# 4. Se connecter en tant qu'intervenant
# 5. Rejoindre avec l'ID de réunion
```

**Logs attendus côté admin :**
```
👋 User joined: [intervenant-user-id]
👥 Participants in room: 1 ["intervenant-user-id"]
🤝 Creating peer connection with: [intervenant-user-id]
```

**Logs attendus côté intervenant :**
```
👥 Participants in room: 1 ["admin-user-id"]
🤝 Creating peer connection with: [admin-user-id]
📡 Sending signal to [admin-user-id]: offer
🎥 Received stream from [admin-user-id]
```

---

## 🔍 **Checklist de Debug**

### 1. Vérifier Supabase Realtime

**Dans Supabase Dashboard :**
- Settings → API → Realtime doit être ✅ **Activé**
- Aucune restriction sur les channels

### 2. Vérifier les Logs Console

**Logs de connexion :**
- [x] "🔌 Initializing socket for room"
- [x] "✅ Connected to video room"
- [x] "👥 Participants in room: X"

**Logs de WebRTC :**
- [x] "🤝 Creating peer connection"
- [x] "📡 Sending signal"
- [x] "🎥 Received stream"

### 3. Vérifier les Permissions

**Caméra/Micro :**
- [x] Autorisation accordée dans le navigateur
- [x] Stream local visible ("Vous")

**Réseau :**
- [x] Pas de VPN bloquant WebRTC
- [x] Firewall autorisant WebRTC

---

## ⚠️ **Problèmes Courants**

### Problème 1 : "Aucun participant visible"
**Symptômes :** Je suis seul dans la réunion
**Solutions :**
1. Vérifier que Realtime est activé dans Supabase
2. Ouvrir les outils de développement (F12)
3. Regarder les logs de connexion
4. Tester avec un autre navigateur

### Problème 2 : "Signal ne passe pas"
**Symptômes :** Participants visibles mais pas de vidéo
**Solutions :**
1. Vérifier les logs de signal WebRTC
2. Tester sans VPN
3. Essayer un autre réseau

### Problème 3 : "Réunion ne se charge pas"
**Symptômes :** Erreur de chargement
**Solutions :**
1. Vérifier la connexion Supabase
2. Contrôler les permissions de la base de données
3. Redémarrer l'application

---

## 🧩 **Architecture Technique**

```
┌─────────────────┐    ┌─────────────────┐
│   Participant A │    │   Participant B │
│   (Admin)       │    │   (Intervenant) │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          ├──────────────────────┤
          │   Supabase Realtime  │
          │   (Signaling)        │
          └──────────────────────┘
                     │
          ┌──────────────────────┐
          │   WebRTC P2P         │
          │   (Vidéo/Audio)      │
          └──────────────────────┘
```

### Flux de Connexion :
1. **Participant A** rejoint room → Supabase Presence
2. **Participant B** rejoint room → Détecte A via Presence
3. **WebRTC Signaling** via Supabase Broadcast
4. **Connexion P2P** établie → Échange vidéo/audio

---

## 🚀 **Commandes de Test**

### Test Console (à exécuter dans F12) :
```javascript
// Vérifier l'état du socket
console.log('Socket connecté:', socket?.isConnected);
console.log('Participants:', socket?.participants);

// Vérifier les connexions peer
console.log('Connexions peer:', Object.keys(peersRef.current));

// Vérifier le stream local
console.log('Stream local:', localStream?.getTracks().length, 'tracks');
```

### Test Network (Chrome DevTools) :
1. F12 → Network tab
2. Filter "WS" (WebSocket)
3. Vérifier connexions Supabase Realtime

---

## 📝 **Logs de Débogage**

Activer les logs détaillés en ajoutant dans la console :
```javascript
localStorage.setItem('debug', 'video-conference');
```

Puis recharger la page pour voir tous les logs.

---

## ✅ **Validation Finale**

**Test réussi quand :**
- [x] Admin créé réunion → Voit "Modérateur" badge
- [x] Intervenant rejoint → Voit admin ET devient "Participant"
- [x] Les deux se voient avec vrais noms
- [x] Vidéo/audio fonctionnent des deux côtés
- [x] Chat fonctionne (si activé)

**En cas d'échec :**
1. Copier les logs console complets
2. Vérifier setup Supabase Realtime
3. Tester réseau/permissions navigateur
4. Contacter le support technique

---

🎯 **Objectif :** Système vidéoconférence robuste permettant la communication fluide entre tous les participants du projet APS. 