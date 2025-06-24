const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configuration CORS pour permettre les connexions depuis votre frontend
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Route de santé pour vérifier que le serveur fonctionne
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount
  });
});

// Stockage en mémoire des rooms et participants
const rooms = new Map();

// Fonction utilitaire pour nettoyer les rooms vides
function cleanupEmptyRooms() {
  for (const [roomId, participants] of rooms.entries()) {
    if (participants.size === 0) {
      rooms.delete(roomId);
      console.log(`🗑️ Room ${roomId} supprimée (vide)`);
    }
  }
}

io.on('connection', (socket) => {
  console.log(`🔌 Nouvelle connexion: ${socket.id}`);
  
  let currentRoom = null;
  let userInfo = null;

  // Rejoindre une room
  socket.on('join', (data) => {
    const { roomId, userName, userId } = data;
    
    // Quitter l'ancienne room si nécessaire
    if (currentRoom) {
      socket.leave(currentRoom);
      if (rooms.has(currentRoom)) {
        rooms.get(currentRoom).delete(socket.id);
      }
    }
    
    // Rejoindre la nouvelle room
    socket.join(roomId);
    currentRoom = roomId;
    userInfo = { userName, userId, socketId: socket.id };
    
    // Ajouter à la liste des participants
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    rooms.get(roomId).set(socket.id, userInfo);
    
    console.log(`👤 ${userName} (${userId}) a rejoint la room ${roomId}`);
    
    // Notifier les autres participants
    socket.to(roomId).emit('user-joined', {
      userId,
      userName,
      socketId: socket.id,
      timestamp: Date.now()
    });
    
    // Envoyer la liste des participants existants au nouveau participant
    const participants = Array.from(rooms.get(roomId).values())
      .filter(p => p.socketId !== socket.id)
      .map(p => ({ userId: p.userId, userName: p.userName, socketId: p.socketId }));
    
    socket.emit('existing-participants', participants);
    
    console.log(`📊 Room ${roomId}: ${rooms.get(roomId).size} participants`);
  });

  // Gérer les signaux WebRTC
  socket.on('signal', (data) => {
    const { signal, to, roomId } = data;
    
    if (currentRoom === roomId && rooms.has(roomId)) {
      // Transmettre le signal au participant cible
      if (to) {
        // Signal direct à un participant spécifique
        io.to(to).emit('signal', {
          signal,
          from: socket.id,
          fromUser: userInfo
        });
      } else {
        // Broadcast à tous les participants de la room
        socket.to(roomId).emit('signal', {
          signal,
          from: socket.id,
          fromUser: userInfo
        });
      }
      
      console.log(`📡 Signal WebRTC de ${userInfo?.userName} vers ${to || 'tous'} dans ${roomId}`);
    }
  });

  // Messages de chat
  socket.on('chat', (data) => {
    const { message, userName, roomId } = data;
    
    if (currentRoom === roomId) {
      // Transmettre le message à tous les participants de la room
      socket.to(roomId).emit('chat', {
        message,
        userName,
        timestamp: Date.now(),
        from: socket.id
      });
      
      console.log(`💬 Message de ${userName} dans ${roomId}: ${message.substring(0, 50)}...`);
    }
  });

  // Début d'enregistrement
  socket.on('recording-start', (data) => {
    const { roomId } = data;
    
    if (currentRoom === roomId) {
      socket.to(roomId).emit('recording-started', {
        by: userInfo?.userName,
        timestamp: Date.now()
      });
      
      console.log(`🎥 Enregistrement démarré par ${userInfo?.userName} dans ${roomId}`);
    }
  });

  // Fin d'enregistrement
  socket.on('recording-stop', (data) => {
    const { roomId } = data;
    
    if (currentRoom === roomId) {
      socket.to(roomId).emit('recording-stopped', {
        by: userInfo?.userName,
        timestamp: Date.now()
      });
      
      console.log(`⏹️ Enregistrement arrêté par ${userInfo?.userName} dans ${roomId}`);
    }
  });

  // Partage d'écran
  socket.on('screen-share-start', (data) => {
    const { roomId } = data;
    
    if (currentRoom === roomId) {
      socket.to(roomId).emit('screen-share-started', {
        by: userInfo?.userName,
        socketId: socket.id,
        timestamp: Date.now()
      });
      
      console.log(`🖥️ Partage d'écran démarré par ${userInfo?.userName} dans ${roomId}`);
    }
  });

  socket.on('screen-share-stop', (data) => {
    const { roomId } = data;
    
    if (currentRoom === roomId) {
      socket.to(roomId).emit('screen-share-stopped', {
        by: userInfo?.userName,
        socketId: socket.id,
        timestamp: Date.now()
      });
      
      console.log(`🖥️ Partage d'écran arrêté par ${userInfo?.userName} dans ${roomId}`);
    }
  });

  // Déconnexion
  socket.on('disconnect', () => {
    console.log(`🔌 Déconnexion: ${socket.id} (${userInfo?.userName || 'Inconnu'})`);
    
    if (currentRoom && rooms.has(currentRoom)) {
      // Retirer de la room
      rooms.get(currentRoom).delete(socket.id);
      
      // Notifier les autres participants
      socket.to(currentRoom).emit('user-left', {
        userId: userInfo?.userId,
        userName: userInfo?.userName,
        socketId: socket.id,
        timestamp: Date.now()
      });
      
      console.log(`👋 ${userInfo?.userName} a quitté la room ${currentRoom}`);
      console.log(`📊 Room ${currentRoom}: ${rooms.get(currentRoom).size} participants restants`);
    }
    
    // Nettoyer les rooms vides toutes les minutes
    setTimeout(cleanupEmptyRooms, 60000);
  });

  // Quitter explicitement une room
  socket.on('leave', (data) => {
    const { roomId } = data;
    
    if (currentRoom === roomId && rooms.has(roomId)) {
      socket.leave(roomId);
      rooms.get(roomId).delete(socket.id);
      
      socket.to(roomId).emit('user-left', {
        userId: userInfo?.userId,
        userName: userInfo?.userName,
        socketId: socket.id,
        timestamp: Date.now()
      });
      
      console.log(`🚪 ${userInfo?.userName} a quitté la room ${roomId}`);
      currentRoom = null;
      userInfo = null;
    }
  });
});

// Nettoyage périodique des rooms vides
setInterval(cleanupEmptyRooms, 5 * 60 * 1000); // Toutes les 5 minutes

// Statistiques en temps réel
setInterval(() => {
  const totalRooms = rooms.size;
  const totalParticipants = Array.from(rooms.values())
    .reduce((sum, participants) => sum + participants.size, 0);
  
  if (totalRooms > 0) {
    console.log(`📈 Statistiques: ${totalRooms} room(s) actives, ${totalParticipants} participant(s) connectés`);
  }
}, 2 * 60 * 1000); // Toutes les 2 minutes

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Serveur Socket.IO démarré sur le port ${PORT}`);
  console.log(`🌐 Frontend autorisé: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur Socket.IO...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
}); 