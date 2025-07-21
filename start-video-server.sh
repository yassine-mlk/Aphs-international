#!/bin/bash

echo "🚀 Démarrage du serveur WebSocket pour vidéoconférence..."

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Aller dans le dossier server
cd server

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Démarrer le serveur
echo "🔧 Démarrage du serveur WebSocket sur le port 3001..."
npm start 