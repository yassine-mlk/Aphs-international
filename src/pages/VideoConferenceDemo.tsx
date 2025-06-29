import React, { useState, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  Video, 
  Plus, 
  Users, 
  Copy, 
  ExternalLink,
  Zap,
  Shield,
  Wifi,
  Play
} from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import OptimizedVideoCall from '../components/OptimizedVideoCall';
import { useAuth } from '../contexts/AuthContext';

const VideoConferenceDemo: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState('');

  // Générer un identifiant de room aléatoire
  const generateRoomId = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, []);

  // Créer une nouvelle room
  const createRoom = useCallback(() => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    toast({
      title: "Room créée",
      description: `Nouvelle room générée: ${newRoomId}`,
    });
  }, [generateRoomId, toast]);

  // Rejoindre une room
  const joinRoom = useCallback(() => {
    if (!roomId.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un ID de room",
        variant: "destructive",
      });
      return;
    }

    setCurrentRoomId(roomId.trim().toUpperCase());
    setIsInMeeting(true);
  }, [roomId, toast]);

  // Quitter la room
  const leaveRoom = useCallback(() => {
    setIsInMeeting(false);
    setCurrentRoomId('');
    toast({
      title: "Room quittée",
      description: "Vous avez quitté la vidéoconférence",
    });
  }, [toast]);

  // Copier l'ID de room
  const copyRoomId = useCallback((id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "ID copié",
      description: `${id} copié dans le presse-papiers`,
    });
  }, [toast]);

  // Si l'utilisateur est en réunion, afficher le composant de vidéoconférence
  if (isInMeeting && currentRoomId) {
    return (
      <OptimizedVideoCall
        roomId={currentRoomId}
        userName={userName || user?.email?.split('@')[0] || 'Utilisateur'}
        onLeave={leaveRoom}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <Video className="h-10 w-10 text-blue-600" />
            Vidéoconférence Simple Peer + Supabase
          </h1>
          <p className="text-gray-600 text-lg">
            Solution optimisée pour des vidéoconférences WebRTC robustes
          </p>
        </div>

        {/* Avantages */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Rapide</h3>
                  <p className="text-sm text-gray-600">Connexions P2P directes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Sécurisé</h3>
                  <p className="text-sm text-gray-600">Signalisation Supabase</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Wifi className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Fiable</h3>
                  <p className="text-sm text-gray-600">Gestion des erreurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interface principale */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Créer une room */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Créer une room
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userName">Votre nom (optionnel)</Label>
                <Input
                  id="userName"
                  placeholder="Entrez votre nom"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>ID de room généré</Label>
                <div className="flex gap-2">
                  <Input
                    value={roomId}
                    readOnly
                    placeholder="Cliquez sur 'Générer' pour créer une room"
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyRoomId(roomId)}
                    disabled={!roomId}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={createRoom} className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  Générer une room
                </Button>
                <Button 
                  onClick={joinRoom}
                  disabled={!roomId}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Démarrer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rejoindre une room */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Rejoindre une room
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userNameJoin">Votre nom (optionnel)</Label>
                <Input
                  id="userNameJoin"
                  placeholder="Entrez votre nom"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roomIdJoin">ID de la room</Label>
                <Input
                  id="roomIdJoin"
                  placeholder="Entrez l'ID de room (ex: ABC123)"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>

              <Button 
                onClick={joinRoom}
                disabled={!roomId.trim()}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Rejoindre la room
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Informations techniques */}
        <Card>
          <CardHeader>
            <CardTitle>Caractéristiques techniques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Technologies</h4>
                <div className="space-y-2">
                  <Badge variant="outline" className="mr-2">Simple Peer</Badge>
                  <Badge variant="outline" className="mr-2">Supabase Realtime</Badge>
                  <Badge variant="outline" className="mr-2">WebRTC</Badge>
                  <Badge variant="outline" className="mr-2">React Hooks</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Fonctionnalités</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Connexions peer-to-peer directes</li>
                  <li>• Signalisation via Supabase Realtime</li>
                  <li>• Gestion automatique des participants</li>
                  <li>• Contrôles audio/vidéo</li>
                  <li>• Partage d'écran</li>
                  <li>• Gestion robuste des erreurs</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guide d'utilisation */}
        <Card>
          <CardHeader>
            <CardTitle>Guide d'utilisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">1. Créer une room</h4>
                <p className="text-sm text-gray-600">
                  Cliquez sur "Générer une room" pour créer un nouvel ID de room unique. 
                  Partagez cet ID avec les autres participants.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">2. Rejoindre une room</h4>
                <p className="text-sm text-gray-600">
                  Entrez l'ID de room fourni par l'organisateur et cliquez sur "Rejoindre la room".
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">3. Pendant la réunion</h4>
                <p className="text-sm text-gray-600">
                  Utilisez les contrôles en bas de l'écran pour gérer votre audio, vidéo et partage d'écran. 
                  Les participants s'affichent automatiquement quand ils rejoignent.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">4. Résolution des problèmes</h4>
                <p className="text-sm text-gray-600">
                  Si vous rencontrez des problèmes de connexion, vérifiez que votre navigateur 
                  autorise l'accès à la caméra et au microphone, et que vous êtes sur une connexion stable.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pied de page */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Système de vidéoconférence optimisé pour APHS • 
            Utilise Simple Peer + Supabase pour des connexions WebRTC robustes
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoConferenceDemo; 