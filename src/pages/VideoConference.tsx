import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { 
  Video as VideoIcon, 
  Plus, 
  Calendar, 
  Users, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  ScreenShare,
  Phone,
  Settings,
  MessageSquare,
  Copy,
  Clock,
  X,
  StopCircle
} from 'lucide-react';
import { useVideoMeetings, VideoMeeting } from '@/hooks/useVideoMeetings';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';
import { JitsiMeeting } from '@/components/JitsiMeeting';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { useSupabase } from '@/hooks/useSupabase';

// Interface pour le format de retour de getUsers
interface UserData {
  users: Array<{
    id: string;
    email?: string;
    user_metadata?: {
      first_name?: string;
      last_name?: string;
      role?: string;
    };
  }>;
}

// Données d'exemple pour les réunions
const meetingsData = [
  {
    id: 1,
    title: "Réunion hebdomadaire équipe Projet Alpha",
    scheduled: "2025-05-06T14:00:00",
    duration: 60,
    type: "scheduled",
    participants: [
      { id: 1, name: "Martin Dupont", avatar: "", organizer: true },
      { id: 2, name: "Julie Martin", avatar: "", organizer: false },
      { id: 3, name: "Thomas Bernard", avatar: "", organizer: false },
      { id: 4, name: "Sophie Leroux", avatar: "", organizer: false }
    ],
    meetingId: "alpha-123-456",
    password: "123456"
  },
  {
    id: 2,
    title: "Point d'avancement Projet Beta",
    scheduled: "2025-05-07T10:30:00",
    duration: 30,
    type: "scheduled",
    participants: [
      { id: 2, name: "Julie Martin", avatar: "", organizer: true },
      { id: 4, name: "Sophie Leroux", avatar: "", organizer: false },
      { id: 5, name: "Pierre Dubois", avatar: "", organizer: false }
    ],
    meetingId: "beta-789-012",
    password: "654321"
  },
  {
    id: 3,
    title: "Présentation client Entreprise XYZ",
    scheduled: "2025-05-08T15:00:00",
    duration: 90,
    type: "scheduled",
    participants: [
      { id: 1, name: "Martin Dupont", avatar: "", organizer: true },
      { id: 2, name: "Julie Martin", avatar: "", organizer: false },
      { id: 6, name: "Jean Client", avatar: "", organizer: false },
      { id: 7, name: "Anne Cliente", avatar: "", organizer: false }
    ],
    meetingId: "xyz-345-678",
    password: "888999"
  },
  {
    id: 4,
    title: "Réunion Équipe Marketing Digital (active)",
    scheduled: "2025-05-05T09:00:00",
    duration: 45,
    type: "active",
    participants: [
      { id: 5, name: "Pierre Dubois", avatar: "", organizer: true, camera: true, mic: true },
      { id: 6, name: "Emma Richard", avatar: "", organizer: false, camera: false, mic: true },
      { id: 7, name: "Lucas Petit", avatar: "", organizer: false, camera: true, mic: false }
    ],
    meetingId: "mkt-901-234",
    password: "112233",
    timeElapsed: 23
  }
];

// Fonction pour formater la date d'une réunion
const formatMeetingTime = (date: Date) => {
  return format(date, "EEEE d MMMM 'à' HH'h'mm", { locale: fr });
};

const VideoConference: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { getUsers, supabase } = useSupabase();
  const [filter, setFilter] = useState("toutes");
  const [copyTooltip, setCopyTooltip] = useState("Copier l'ID");
  const [meetingIdToJoin, setMeetingIdToJoin] = useState("");
  const [newMeetingDialog, setNewMeetingDialog] = useState(false);
  const [activeJitsiRoom, setActiveJitsiRoom] = useState<{roomId: string, meetingId: string, isModerator?: boolean} | null>(null);
  const [users, setUsers] = useState<{id: string, name: string, email: string, role: string}[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledTime: '',
    selectedParticipants: [] as string[],
    isInstant: false
  });
  
  const { 
    loading, 
    loadingMeetings,
    meetings,
    getAllMeetings, 
    getUserMeetings, 
    createMeeting, 
    joinMeeting,
    endMeeting
  } = useVideoMeetings();
  
  // Charger la liste des intervenants au chargement du composant
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userData = await getUsers() as UserData;
        if (userData && userData.users) {
          // Convertir les données des utilisateurs au format nécessaire
          const formattedUsers = userData.users
            .filter(u => u.user_metadata?.role !== 'admin') // Exclure les admins si souhaité
            .map(u => ({
              id: u.id,
              name: `${u.user_metadata?.first_name || ''} ${u.user_metadata?.last_name || ''}`.trim() || u.email || 'Utilisateur sans nom',
              email: u.email || '',
              role: u.user_metadata?.role || 'intervenant'
            }));
          setUsers(formattedUsers);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger la liste des participants",
          variant: "destructive"
        });
      }
    };
    
    loadUsers();
  }, [getUsers, toast]);
  
  // Filtrer les réunions
  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      if (filter === "toutes") return true;
      if (filter === "actives" && meeting.status === "active") return true;
      if (filter === "planifiees" && meeting.status === "scheduled") return true;
      return false;
    });
  }, [meetings, filter]);
  
  // Réunion active (s'il y en a une)
  const activeMeeting = useMemo(() => 
    meetings.find(meeting => meeting.status === "active"),
  [meetings]);
  
  const handleJoinMeeting = async (meetingId: string) => {
    if (!user) return;
    setLoadingAction(true);
    
    try {
      console.log(`Attempting to join meeting: ${meetingId}`);
      const result = await joinMeeting(meetingId);
      
      if (result) {
        console.log(`Successfully joined meeting with roomId: ${result.roomId}`);
        setActiveJitsiRoom({
          roomId: result.roomId,
          meetingId,
          isModerator: result.isModerator
        });
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de rejoindre la réunion",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(false);
    }
  };
  
  const handleJoinWithId = async () => {
    if (!meetingIdToJoin.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un ID de réunion valide",
        variant: "destructive"
      });
      return;
    }
    
    setLoadingAction(true);
    
    try {
      // Chercher la réunion par son room_id
      const { data, error } = await supabase
        .from('video_meetings')
        .select('id')
        .eq('room_id', meetingIdToJoin.trim())
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Réunion introuvable",
          description: "Aucune réunion trouvée avec cet identifiant",
          variant: "destructive"
        });
        return;
      }
      
      // Utiliser l'ID de la réunion trouvée
      const result = await joinMeeting(data.id);
      
      if (result) {
        setActiveJitsiRoom({
          roomId: result.roomId,
          meetingId: data.id,
          isModerator: result.isModerator
        });
        setMeetingIdToJoin("");
      }
    } catch (error) {
      console.error('Error joining meeting by ID:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de rejoindre la réunion",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(false);
    }
  };
  
  const handleCreateMeeting = () => {
    setNewMeetingDialog(true);
  };
  
  const handleSubmitNewMeeting = async () => {
    if (!formData.title) {
      toast({
        title: "Titre manquant",
        description: "Veuillez saisir un titre pour la réunion",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const options = {
        description: formData.description,
        scheduledTime: formData.scheduledTime ? new Date(formData.scheduledTime) : undefined,
        isInstant: formData.isInstant
      };
      
      const meetingId = await createMeeting(formData.title, formData.selectedParticipants, options);
      
      if (meetingId) {
        setNewMeetingDialog(false);
        
        // Si c'est une réunion instantanée, la rejoindre immédiatement
        if (formData.isInstant) {
          const result = await joinMeeting(meetingId);
          if (result) {
            setActiveJitsiRoom({
              roomId: result.roomId,
              meetingId,
              isModerator: true // Creator is always a moderator
            });
          }
        }
        
        // Réinitialiser le formulaire
        setFormData({
          title: '',
          description: '',
          scheduledTime: '',
          selectedParticipants: [],
          isInstant: false
        });
      }
    } catch (error) {
      console.error("Erreur lors de la création de la réunion:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la réunion",
        variant: "destructive"
      });
    }
  };
  
  const handleCopyMeetingId = (meetingId: string) => {
    navigator.clipboard.writeText(meetingId);
    setCopyTooltip("Copié !");
    setTimeout(() => setCopyTooltip("Copier l'ID"), 2000);
    
    toast({
      title: "ID de réunion copié",
      description: "L'identifiant a été copié dans le presse-papier.",
    });
  };
  
  const formatMinutes = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs > 0 ? `${hrs}h` : ''}${mins < 10 ? '0' : ''}${mins}m`;
  };

  // Fonction pour terminer une réunion
  const handleEndMeeting = async (meetingId: string) => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour terminer une réunion",
        variant: "destructive"
      });
      return;
    }
    
    // Demander confirmation avant de terminer la réunion
    if (!window.confirm("Êtes-vous sûr de vouloir terminer cette réunion pour tous les participants ?")) {
      return;
    }
    
    const success = await endMeeting(meetingId);
    
    if (success) {
      // Si nous sommes actuellement dans cette réunion, quitter l'interface Jitsi
      if (activeJitsiRoom && activeJitsiRoom.meetingId === meetingId) {
        setActiveJitsiRoom(null);
      }
      
      // Actualiser la liste des réunions
      if (user.user_metadata?.role === 'admin') {
        await getAllMeetings();
      } else {
        await getUserMeetings();
      }
      
      toast({
        title: "Réunion terminée",
        description: "La réunion a été terminée avec succès"
      });
    }
  };

  // Utiliser useMemo pour stabiliser le composant JitsiMeeting et éviter les rerenders
  const memoizedJitsiMeeting = useMemo(() => {
    if (!activeJitsiRoom) return null;
    
    return (
      <JitsiMeeting 
        roomName={activeJitsiRoom.roomId}
        displayName={user?.email || 'Utilisateur'}
        email={user?.email}
        onClose={() => setActiveJitsiRoom(null)}
        isModerator={activeJitsiRoom.isModerator}
        onError={(error) => {
          console.error('Jitsi meeting error:', error);
          
          // Check for specific error messages with more robust detection
          const errorMsg = error.message.toLowerCase();
          
          if (errorMsg.includes('membersonly') || errorMsg.includes('members only') || errorMsg.includes('conference.connectionerror.membersonly')) {
            toast({
              title: "Accès réservé",
              description: "Cette salle est réservée aux modérateurs. Attendez que l'hôte rejoigne la réunion.",
              variant: "destructive"
            });
          } else if (errorMsg.includes('password') || errorMsg.includes('connection.passwordrequired')) {
            toast({
              title: "Mot de passe requis",
              description: "Cette réunion est protégée par un mot de passe. Attendez que l'hôte vous invite.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Erreur de visioconférence",
              description: error.message || "Une erreur est survenue avec la visioconférence",
              variant: "destructive"
            });
          }
          
          // Close the meeting view on critical errors
          setTimeout(() => {
            setActiveJitsiRoom(null);
          }, 2000);
        }}
      />
    );
  }, [activeJitsiRoom, user, toast]);

  // Si une réunion Jitsi est active
  if (activeJitsiRoom) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Vidéoconférence en cours</h1>
          <div className="flex gap-2">
            {activeJitsiRoom.isModerator && (
              <Button 
                variant="destructive" 
                onClick={() => handleEndMeeting(activeJitsiRoom.meetingId)}
              >
                <StopCircle className="mr-2 h-4 w-4" /> Terminer la réunion
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => {
                setActiveJitsiRoom(null);
              }}
            >
              <X className="mr-2 h-4 w-4" /> Quitter
            </Button>
          </div>
        </div>
        
        {memoizedJitsiMeeting}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vidéoconférence</h1>
        <p className="text-muted-foreground">
          Participez à des réunions en direct ou planifiez vos visioconférences
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex gap-2">
          <Button 
            className="bg-aphs-teal hover:bg-aphs-navy flex-1 md:flex-none" 
            onClick={handleCreateMeeting}
          >
            <Plus className="mr-2 h-4 w-4" /> Créer une réunion
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 md:flex-none"
            onClick={handleCreateMeeting}
          >
            <Calendar className="mr-2 h-4 w-4" /> Planifier
          </Button>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Saisir l'ID de réunion..."
            className="max-w-xs"
            value={meetingIdToJoin}
            onChange={(e) => setMeetingIdToJoin(e.target.value)}
          />
          <Button onClick={handleJoinWithId}>Rejoindre</Button>
        </div>
      </div>
      
      {activeMeeting && (
        <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-r from-green-50 to-teal-50">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">En cours</Badge>
                {activeMeeting.title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-0">
            <div className="flex items-center gap-1 text-gray-600 text-sm mb-2">
              <Users className="h-4 w-4" />
              <span>{activeMeeting.participants.length} participants</span>
              <span className="mx-2">•</span>
              <span>ID: {activeMeeting.roomId}</span>
              <button 
                onClick={() => handleCopyMeetingId(activeMeeting.roomId)}
                className="ml-1 hover:text-aphs-teal"
                title={copyTooltip}
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between py-3 border-t bg-white">
            <Button 
              className="bg-aphs-teal hover:bg-aphs-navy"
              onClick={() => handleJoinMeeting(activeMeeting.id)}
            >
              <VideoIcon className="mr-2 h-4 w-4" /> Rejoindre la réunion
            </Button>
            
            {/* Bouton pour terminer la réunion si l'utilisateur est admin ou le créateur */}
            {(user?.user_metadata?.role === 'admin' || activeMeeting.createdBy === user?.id) && (
              <Button 
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEndMeeting(activeMeeting.id);
                }}
              >
                <StopCircle className="mr-2 h-4 w-4" /> Terminer
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
      
      <div>
        <Tabs defaultValue="toutes" className="w-full" onValueChange={setFilter}>
          <TabsList className="w-full justify-start bg-gray-100 p-0 h-auto">
            <TabsTrigger value="toutes" className="flex-1 sm:flex-none py-2 data-[state=active]:bg-white">
              Toutes
            </TabsTrigger>
            <TabsTrigger value="actives" className="flex-1 sm:flex-none py-2 data-[state=active]:bg-white">
              Actives
            </TabsTrigger>
            <TabsTrigger value="planifiees" className="flex-1 sm:flex-none py-2 data-[state=active]:bg-white">
              Planifiées
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {loadingMeetings ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aphs-teal mx-auto mb-4"></div>
            <p className="text-gray-500">Chargement des réunions...</p>
          </div>
        ) : (
          <div className="grid gap-6 mt-4 md:grid-cols-2">
            {filteredMeetings
              .filter(meeting => meeting.id !== (activeMeeting?.id || ''))
              .map(meeting => (
                <Card key={meeting.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-lg">{meeting.title}</CardTitle>
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                        {meeting.status === 'scheduled' ? 'Planifiée' : meeting.status === 'active' ? 'Active' : meeting.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3 pt-0">
                    {meeting.scheduledTime && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-4">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatMeetingTime(meeting.scheduledTime)}</span>
                      </div>
                    )}
                    
                    {meeting.description && (
                      <p className="text-sm text-gray-700 mb-4">{meeting.description}</p>
                    )}
                    
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-4">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>Participants ({meeting.participants.length}):</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {meeting.participants.map(participant => (
                        <div key={participant.id} className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs bg-aphs-navy text-white">
                              {participant.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{participant.name}</span>
                          {participant.role === 'host' && (
                            <Badge variant="outline" className="ml-1 text-[0.6rem] h-4 bg-blue-50 text-blue-700 hover:bg-blue-50">
                              Hôte
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-xs text-gray-500">ID de réunion:</p>
                      <div className="flex items-center justify-between mt-1">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{meeting.roomId}</code>
                        <button 
                          onClick={() => handleCopyMeetingId(meeting.roomId)}
                          className="text-gray-500 hover:text-aphs-teal"
                          title={copyTooltip}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end pt-0">
                    <Button 
                      className="bg-aphs-teal hover:bg-aphs-navy"
                      onClick={() => handleJoinMeeting(meeting.id)}
                    >
                      <VideoIcon className="mr-2 h-4 w-4" /> Rejoindre
                    </Button>
                    
                    {/* Ajouter le bouton pour terminer la réunion si l'utilisateur est admin ou créateur */}
                    {(meeting.status === 'active') && 
                     (user?.user_metadata?.role === 'admin' || meeting.createdBy === user?.id) && (
                      <Button 
                        variant="destructive"
                        className="ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEndMeeting(meeting.id);
                        }}
                      >
                        <StopCircle className="mr-2 h-4 w-4" /> Terminer
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
          </div>
        )}
        
        {!loadingMeetings && filteredMeetings.length === (activeMeeting ? 1 : 0) && (
          <div className="text-center py-12">
            <VideoIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <h3 className="text-lg font-medium mb-2">Aucune réunion trouvée</h3>
            <p className="text-gray-500">Vous n'avez pas de réunions {filter === "planifiees" ? "planifiées" : filter === "actives" ? "actives" : ""}</p>
            <Button 
              className="mt-4 bg-aphs-teal hover:bg-aphs-navy"
              onClick={handleCreateMeeting}
            >
              Planifier une réunion
            </Button>
          </div>
        )}
      </div>
      
      {/* Modal de création de réunion */}
      <Dialog open={newMeetingDialog} onOpenChange={setNewMeetingDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouvelle visioconférence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de la réunion *</Label>
              <Input
                id="title"
                placeholder="Réunion d'équipe..."
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Ordre du jour, informations importantes..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox 
                  id="instant" 
                  checked={formData.isInstant} 
                  onCheckedChange={(checked) => 
                    setFormData({...formData, isInstant: checked as boolean})
                  }
                />
                <label
                  htmlFor="instant"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Démarrer immédiatement
                </label>
              </div>
            </div>
            
            {!formData.isInstant && (
              <div className="space-y-2">
                <Label htmlFor="scheduledTime">Date et heure</Label>
                <Input
                  id="scheduledTime"
                  type="datetime-local"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="participants">Participants</Label>
              <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                {users.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Aucun intervenant disponible</p>
                ) : (
                  users.map(user => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`user-${user.id}`}
                        checked={formData.selectedParticipants.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              selectedParticipants: [...formData.selectedParticipants, user.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedParticipants: formData.selectedParticipants.filter(id => id !== user.id)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`user-${user.id}`} className="flex-1 flex items-center space-x-2 cursor-pointer">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <p>{user.name}</p>
                          <p className="text-gray-500 text-xs">{user.email}</p>
                        </div>
                      </Label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-sm text-gray-500">
                {formData.selectedParticipants.length} participant(s) sélectionné(s)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMeetingDialog(false)}>
              Annuler
            </Button>
            <Button className="bg-aphs-teal hover:bg-aphs-navy" onClick={handleSubmitNewMeeting}>
              {formData.isInstant ? "Démarrer maintenant" : "Programmer la réunion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoConference;
