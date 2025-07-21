const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Créer le serveur HTTP
const server = http.createServer();

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

  // Ajouter à la room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  const room = rooms.get(roomId);
  room.set(userId, { ws, userName });

  // Envoyer la liste des participants existants
  const participants = Array.from(room.entries())
    .filter(([id]) => id !== userId)
    .map(([id, data]) => ({ id, name: data.userName }));

  ws.send(JSON.stringify({
    type: 'room-info',
    participants,
    roomId
  }));

  // Annoncer le nouveau participant aux autres
  room.forEach((participant, id) => {
    if (id !== userId) {
      participant.ws.send(JSON.stringify({
        type: 'user-joined',
        userId,
        userName,
        roomId
      }));
    }
  });

  // Gérer les messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`📨 Message de ${userName}:`, data.type);

      // Diffuser le message aux autres participants de la room
      room.forEach((participant, id) => {
        if (id !== userId && participant.ws.readyState === WebSocket.OPEN) {
          participant.ws.send(JSON.stringify({
            ...data,
            from: userId,
            fromName: userName
          }));
        }
      });
    } catch (error) {
      console.error('❌ Erreur parsing message:', error);
    }
  });

  // Gérer la déconnexion
  ws.on('close', () => {
    console.log(`🛑 Déconnexion: ${userName} (${userId}) de la room ${roomId}`);
    
    // Retirer de la room
    if (room.has(userId)) {
      room.delete(userId);
    }

    // Annoncer le départ aux autres
    room.forEach((participant, id) => {
      if (participant.ws.readyState === WebSocket.OPEN) {
        participant.ws.send(JSON.stringify({
          type: 'user-left',
          userId,
          userName,
          roomId
        }));
      }
    });

    // Nettoyer la room si vide
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

// Démarrer le serveur
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Serveur WebSocket démarré sur le port ${PORT}`);
  console.log(`📡 URL: ws://localhost:${PORT}`);
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Serveur arrêté proprement');
      process.exit(0);
    });
  });
});

// Exporter pour les tests
module.exports = { server, wss, rooms }; 