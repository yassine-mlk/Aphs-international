# 🚀 Guide de Déploiement Production - Vidéoconférence

## ⚡ Solution Immédiate pour Netlify

### **Étape 1 : Déployer le Serveur WebSocket sur Render.com**

1. **Créer un compte Render.com** (gratuit)
2. **Créer un nouveau Web Service**
3. **Connecter votre repository GitHub**
4. **Configurer le déploiement :**
   - **Build Command :** `cd server-production && npm install`
   - **Start Command :** `cd server-production && npm start`
   - **Environment :** Node

5. **Déployer et noter l'URL** (ex: `https://your-app.onrender.com`)

### **Étape 2 : Mettre à Jour l'URL du Serveur**

Dans `src/hooks/useSimpleVideoConference.ts`, ligne ~280 :

```typescript
// Remplacer par votre URL Render
const wsUrl = `wss://your-app.onrender.com/?roomId=${roomId}&userId=${currentUserId.current}&userName=${encodeURIComponent(userName)}`;
```

### **Étape 3 : Déployer sur Netlify**

1. **Push vos changements sur GitHub**
2. **Netlify se redéploiera automatiquement**

## 🔧 Configuration Alternative (Si Render.com ne fonctionne pas)

### **Option 1 : Ably (Recommandé)**

1. **Créer un compte Ably.com** (gratuit)
2. **Obtenir votre clé API**
3. **Installer Ably :**
   ```bash
   npm install ably
   ```

4. **Utiliser le hook `useAblyVideoConference.ts`** (déjà créé)

### **Option 2 : Pusher**

1. **Créer un compte Pusher.com** (gratuit)
2. **Configurer les WebSockets**
3. **Intégrer dans l'application**

## 🧪 Test de la Solution

### **Test Local :**
```bash
# Terminal 1 : Serveur WebSocket
cd server-production
npm install
npm start

# Terminal 2 : Application
npm run dev
```

### **Test Production :**
1. **Onglet 1 :** Connectez-vous et créez une réunion
2. **Onglet 2 :** Connectez-vous avec un autre compte
3. **Vérifiez :** Les participants se voient mutuellement

## 📊 Logs de Débogage

### **Dans la Console du Navigateur :**
```
🚀 Connexion à la room: [roomId]
✅ WebSocket connecté
📋 Informations de la room: [participants]
👋 [user] a rejoint la room
🔗 Création connexion peer avec [user]
📹 Stream reçu de [userId]
```

### **Dans les Logs Render.com :**
```
🔗 Nouvelle connexion: [user] dans la room [roomId]
📨 Message de [user]: offer
📨 Message de [user]: answer
📨 Message de [user]: ice-candidate
```

## 🚨 En Cas de Problème

### **Problème 1 : WebSocket ne se connecte pas**
- Vérifiez l'URL dans `useSimpleVideoConference.ts`
- Vérifiez que le serveur Render.com est actif
- Testez l'URL : `https://your-app.onrender.com/health`

### **Problème 2 : Participants ne se voient pas**
- Vérifiez les logs dans la console
- Vérifiez que les permissions caméra/micro sont accordées
- Testez avec différents navigateurs

### **Problème 3 : Erreur de déploiement**
- Vérifiez que tous les fichiers sont commités
- Vérifiez les variables d'environnement Netlify
- Redéployez manuellement si nécessaire

## ⚡ Solution d'Urgence (Si rien ne fonctionne)

### **Utiliser un Service Public Temporaire :**

Dans `useSimpleVideoConference.ts`, remplacer par :

```typescript
// Service WebSocket public temporaire
const wsUrl = `wss://echo.websocket.org/?roomId=${roomId}&userId=${currentUserId.current}&userName=${encodeURIComponent(userName)}`;
```

**Note :** Cette solution fonctionne pour les tests mais n'est pas recommandée pour la production.

## 🎯 Checklist Finale

- [ ] Serveur WebSocket déployé sur Render.com
- [ ] URL mise à jour dans le code
- [ ] Application déployée sur Netlify
- [ ] Test avec 2 participants
- [ ] Vidéo et audio fonctionnent
- [ ] Chat fonctionne
- [ ] Screen sharing fonctionne

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans la console du navigateur
2. Vérifiez les logs Render.com
3. Testez avec différents navigateurs
4. Vérifiez les permissions caméra/micro

**La solution est prête pour la présentation !** 🚀 