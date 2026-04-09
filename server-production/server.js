const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const cors = require('cors');

// Créer le serveur HTTP
const server = http.createServer();

// Configurer CORS pour la production
const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser toutes les origines en production
    callback(null, true);
  },
  credentials: true
};

// Créer le serveur WebSocket
const wss = new WebSocket.Server({ server });

// Stocker les connexions par room
const rooms = new Map();

// Gérer les connexions WebSocket
wss.on('connection', (ws, req) => {
  const { query } = url.parse(req.url, true);
  const roomId = query.roomId;
  const userId = query.userId;
  const userName = query.userName;

  console.log(`🔗 Nouvelle connexion: ${userName} (${userId}) dans la room ${roomId}`);

  // Initialiser la room si elle n'existe pas
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }

  const room = rooms.get(roomId);
  
  // Ajouter l'utilisateur à la room
  room.set(userId, {
    ws,
    userName,
    joinedAt: new Date()
  });

  // Envoyer les informations de la room au nouveau participant
  const roomParticipants = Array.from(room.entries()).map(([id, user]) => ({
    id,
    name: user.userName
  }));

  ws.send(JSON.stringify({
    type: 'room-info',
    participants: roomParticipants,
    roomId
  }));

  // Informer les autres participants
  room.forEach((user, id) => {
    if (id !== userId && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(JSON.stringify({
        type: 'user-joined',
        from: userId,
        fromName: userName,
        roomId
      }));
    }
  });

  // Gérer les messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 Message de ${userName}:`, message.type);

      // Diffuser le message aux autres participants de la room
      room.forEach((user, id) => {
        if (id !== userId && user.ws.readyState === WebSocket.OPEN) {
          user.ws.send(JSON.stringify({
            ...message,
            from: userId,
            fromName: userName,
            roomId
          }));
        }
      });
    } catch (error) {
      console.error('❌ Erreur parsing message:', error);
    }
  });

  // Gérer la déconnexion
  ws.on('close', () => {
    console.log(`👋 Déconnexion: ${userName} (${userId}) de la room ${roomId}`);
    
    // Retirer l'utilisateur de la room
    room.delete(userId);

    // Informer les autres participants
    room.forEach((user, id) => {
      if (user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(JSON.stringify({
          type: 'user-left',
          from: userId,
          fromName: userName,
          roomId
        }));
      }
    });

    // Supprimer la room si elle est vide
    if (room.size === 0) {
      rooms.delete(roomId);
      console.log(`🗑️ Room ${roomId} supprimée (vide)`);
    }
  });

  // Gérer les erreurs
  ws.on('error', (error) => {
    console.error(`❌ Erreur WebSocket pour ${userName}:`, error);
  });
});

// Route de santé pour les vérifications de déploiement
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      rooms: rooms.size,
      connections: Array.from(rooms.values()).reduce((total, room) => total + room.size, 0)
    }));
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Video Conference WebSocket Server - APS');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Démarrer le serveur
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Serveur WebSocket démarré sur le port ${PORT}`);
  console.log(`📡 URL: ws://localhost:${PORT}`);
  console.log(`🌐 Mode: ${process.env.NODE_ENV || 'development'}`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
}); 