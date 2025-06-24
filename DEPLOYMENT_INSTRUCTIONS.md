# 🚀 Instructions de Déploiement - Système WebRTC APHS

## 📁 **Structure du Projet**

```
aphs-animate-build-view/
├── src/                    # Frontend React/TypeScript
├── server/                 # Serveur Socket.IO
├── create_recording_tables.sql
└── DEPLOYMENT_INSTRUCTIONS.md
```

## 🔧 **1. Déploiement du Serveur Socket.IO**

### Installation des dépendances
```bash
cd server/
npm install
```

### Variables d'environnement
Créer un fichier `.env` dans le dossier `server/` :
```env
PORT=3001
FRONTEND_URL=https://votre-frontend-url.com
NODE_ENV=production
```

### Démarrage du serveur
```bash
# Mode développement
npm run dev

# Mode production
npm start
```

### Test du serveur
```bash
curl http://localhost:3001/health
```

Réponse attendue :
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "connections": 0
}
```

## 🌐 **2. Configuration du Frontend**

### Variables d'environnement
Ajouter dans votre fichier `.env` (racine du projet) :
```env
# Pour le développement local (utilisera la simulation localStorage)
# VITE_SOCKET_URL=

# Pour la production (utilisera le vrai serveur Socket.IO)
VITE_SOCKET_URL=https://votre-serveur-socketio.com
```

### Build du frontend
```bash
npm run build
```

## 🗄️ **3. Configuration de la Base de Données**

### Exécuter le script SQL
```sql
-- Exécuter dans votre console Supabase ou psql
\i create_recording_tables.sql
```

### Vérifier les tables créées
```sql
-- Vérifier la table
\d meeting_recordings

-- Vérifier le bucket de stockage
SELECT * FROM storage.buckets WHERE name = 'meeting-recordings';
```

## 🚀 **4. Options de Déploiement**

### Option A : Serveur VPS/Dédié
```bash
# Installation Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone et installation
git clone [votre-repo]
cd server/
npm install --production
npm start
```

### Option B : Docker
Créer `server/Dockerfile` :
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

Build et run :
```bash
cd server/
docker build -t aphs-signaling .
docker run -p 3001:3001 -e FRONTEND_URL=https://votre-frontend.com aphs-signaling
```

### Option C : Services Cloud

#### Heroku
```bash
# Dans le dossier server/
echo "web: npm start" > Procfile
git init
git add .
git commit -m "Initial commit"
heroku create aphs-signaling
git push heroku main
```

#### Vercel
```json
// server/vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.js"
    }
  ]
}
```

#### Railway
```bash
# Connecter votre repo GitHub à Railway
# Railway détectera automatiquement le package.json
```

## 🔒 **5. Sécurité et Configuration**

### CORS (Très Important)
Dans `server/index.js`, configurez les origines autorisées :
```javascript
const io = socketIo(server, {
  cors: {
    origin: [
      "https://votre-frontend.com",
      "https://www.votre-frontend.com",
      "http://localhost:5173" // Pour le dev uniquement
    ],
    methods: ["GET", "POST"]
  }
});
```

### Limites de rate limiting (Optionnel)
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite chaque IP à 100 requêtes par fenêtre
});

app.use(limiter);
```

## 📊 **6. Monitoring et Logs**

### Logs basiques
Le serveur affiche automatiquement :
- 🔌 Connexions/déconnexions
- 👤 Entrées/sorties de rooms
- 📡 Signaux WebRTC
- 💬 Messages de chat
- 🎥 Événements d'enregistrement

### Monitoring de production
Pour un monitoring avancé, ajouter :
```bash
npm install winston morgan
```

## 🧪 **7. Tests**

### Test de charge simple
```bash
# Installer Artillery
npm install -g artillery

# Créer un test basic
echo '
config:
  target: "http://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Health check"
    requests:
      - get:
          url: "/health"
' > artillery-test.yml

# Lancer le test
artillery run artillery-test.yml
```

## 🚀 **8. Commandes de Déploiement Rapide**

### Script de déploiement complet
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Déploiement du système WebRTC APHS"

# 1. Build du frontend
echo "📦 Build du frontend..."
npm run build

# 2. Déploiement du serveur
echo "🌐 Déploiement du serveur Socket.IO..."
cd server/
npm install --production

# 3. Démarrage du serveur
echo "▶️ Démarrage du serveur..."
npm start &

# 4. Test de santé
echo "🏥 Test de santé..."
sleep 5
curl http://localhost:3001/health

echo "✅ Déploiement terminé !"
```

## 📋 **9. Checklist de Déploiement**

- [ ] Serveur Socket.IO déployé et accessible
- [ ] Variable `VITE_SOCKET_URL` configurée dans le frontend
- [ ] Tables de base de données créées
- [ ] Bucket Supabase `meeting-recordings` configuré
- [ ] CORS configuré correctement
- [ ] Tests de connexion validés
- [ ] Frontend buildé et déployé
- [ ] Health check fonctionnel

## 🆘 **10. Troubleshooting**

### Problème : Connexions Socket.IO échouent
**Solution :** Vérifier les CORS et l'URL du serveur

### Problème : Enregistrements ne s'uploadent pas
**Solution :** Vérifier les permissions Supabase Storage et RLS

### Problème : Pas de vidéo/audio
**Solution :** Vérifier que le site est en HTTPS (obligatoire pour WebRTC)

### Problème : Messages de chat ne passent pas
**Solution :** Vérifier la console du serveur Socket.IO pour les logs

## 🎯 **URLs Importantes**

- **Serveur Socket.IO :** `https://votre-serveur:3001`
- **Health Check :** `https://votre-serveur:3001/health`
- **Frontend :** `https://votre-frontend.com`
- **Supabase Dashboard :** `https://app.supabase.com`

---

**💡 Note :** En mode développement sans `VITE_SOCKET_URL`, le système utilisera automatiquement la simulation localStorage qui fonctionne parfaitement pour les tests locaux. 