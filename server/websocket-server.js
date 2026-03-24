const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Créer le serveur HTTP
const server = http.createServer();

// Créer le serveur WebSocket
const wss = new WebSocket.Server({ server });

// Stocker les connexions par room
const rooms = new Map();

const safeJsonParse = (message) => {
  try {
    return JSON.parse(message);
  } catch {
    return null;
  }
};

const sendJson = (ws, payload) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
};

// Gérer les connexions WebSocket
wss.on('connection', (ws, req) => {
  const { query } = url.parse(req.url, true);
  const roomId = query.roomId;
  const userId = query.userId;
  const userName = query.userName;

  console.log(`🔗 Nouvelle connexion: ${userName} (${userId}) dans la room ${roomId}`);

  if (!roomId || !userId) {
    console.log('❌ Connexion refusée (roomId/userId manquant)');
    ws.close(1008, 'roomId/userId required');
    return;
  }

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

  sendJson(ws, {
    type: 'room-info',
    participants,
    roomId
  });

  // Annoncer le nouveau participant aux autres
  room.forEach((participant, id) => {
    if (id !== userId) {
      sendJson(participant.ws, {
        type: 'user-joined',
        from: userId,
        fromName: userName,
        userId,
        userName,
        roomId
      });
    }
  });

  // Gérer les messages
  ws.on('message', (message) => {
    const data = safeJsonParse(message);
    if (!data) {
      console.error('❌ Erreur parsing message: JSON invalide');
      return;
    }

    console.log(`📨 Message de ${userName}:`, data.type);

    const enriched = {
      ...data,
      roomId,
      from: userId,
      fromName: userName
    };

    if (data.to && room.has(data.to)) {
      const target = room.get(data.to);
      sendJson(target.ws, enriched);
      return;
    }

    // Diffuser le message aux autres participants de la room
    room.forEach((participant, id) => {
      if (id !== userId) {
        sendJson(participant.ws, enriched);
      }
    });
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
      sendJson(participant.ws, {
        type: 'user-left',
        from: userId,
        fromName: userName,
        userId,
        userName,
        roomId
      });
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
