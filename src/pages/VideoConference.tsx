import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../lib/translations';
import { 
  Video as VideoIcon, 
  Plus, 
  Calendar, 
  Users, 
  Copy,
  Clock,
  X,
  StopCircle,
  Trash2,
  History
} from 'lucide-react';
import { useVideoMeetings, VideoMeeting } from '@/hooks/useVideoMeetings';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { WebRTCMeeting } from '@/components/WebRTCMeeting';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { useSupabase } from '@/hooks/useSupabase';
import { MeetingRequestForm } from '@/components/MeetingRequestForm';
import { MeetingRequestsManager } from '@/components/MeetingRequestsManager';

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

// Fonction pour formater la date d'une réunion
const formatMeetingTime = (date: Date) => {
  return format(date, "EEEE d MMMM 'à' HH'h'mm", { locale: fr });
};

const VideoConference: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations].videoConference;
  const { getUsers, supabase } = useSupabase();
  const [filter, setFilter] = useState("toutes");
  const [copyTooltip, setCopyTooltip] = useState("Copier l'ID");
  const [meetingIdToJoin, setMeetingIdToJoin] = useState("");
  const [newMeetingDialog, setNewMeetingDialog] = useState(false);
  const [activeMeetingRoom, setActiveMeetingRoom] = useState<{roomId: string, meetingId: string, isModerator?: boolean} | null>(null);
  const [users, setUsers] = useState<{id: string, name: string, email: string, role: string}[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [activeTab, setActiveTab] = useState("meetings");
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledTime: '',
    selectedParticipants: [] as string[],
    isInstant: false
  });

  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.user_metadata?.role === 'admin' || user?.email === 'admin@aphs.com';
  
  const { 
    loading, 
    loadingMeetings,
    meetings,
    getAllMeetings, 
    getUserMeetings, 
    createMeeting, 
    joinMeeting,
    leaveMeeting,
    endMeeting,
    deleteMeeting,
    clearCompletedMeetings
  } = useVideoMeetings();
  
  // Charger la liste des intervenants au chargement du composant
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userData = await getUsers() as UserData;
        if (userData && userData.users) {
          const formattedUsers = userData.users
            .filter(u => u.user_metadata?.role !== 'admin')
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
    if (!meetings || meetings.length === 0) return [];
    
    return meetings.filter(meeting => {
      if (filter === "toutes") return true;
      if (filter === "actives" && meeting.status === "active") return true;
      if (filter === "planifiees" && meeting.status === "scheduled") return true;
      return false;
    });
  }, [meetings, filter]);
  
  // Réunion active (s'il y en a une)
  const activeMeeting = useMemo(() => 
    meetings?.find(meeting => meeting.status === "active"),
  [meetings]);
  
  const handleJoinMeeting = async (meetingId: string) => {
    if (!user) return;
    setLoadingAction(true);
    
    try {
      const result = await joinMeeting(meetingId);
      
      if (result) {
        setActiveMeetingRoom({
          roomId: result.roomId,
          meetingId,
          isModerator: result.isModerator
        });
      }
    } catch (error: any) {
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
      const { data, error } = await supabase
        .from('video_meetings')
        .select('id')
        .eq('room_id', meetingIdToJoin.trim())
        .maybeSingle();
      
      if (error) throw error;

      if (data) {
        await handleJoinMeeting(data.id);
      } else {
        toast({
          title: "Réunion introuvable",
          description: "Aucune réunion ne correspond à cet ID",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de rejoindre la réunion",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(false);
      setMeetingIdToJoin("");
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
    
    if (!formData.isInstant && !formData.scheduledTime) {
      toast({
        title: "Date manquante",
        description: "Veuillez sélectionner une date pour la réunion programmée",
        variant: "destructive"
      });
      return;
    }
    
    const meetingId = await createMeeting(
      formData.title,
      formData.selectedParticipants,
      {
        description: formData.description,
        scheduledTime: formData.isInstant ? undefined : new Date(formData.scheduledTime),
        isInstant: formData.isInstant
      }
    );
    
    if (meetingId) {
      setNewMeetingDialog(false);
      setFormData({
        title: '',
        description: '',
        scheduledTime: '',
        selectedParticipants: [],
        isInstant: false
      });
      
      if (formData.isInstant) {
        await handleJoinMeeting(meetingId);
      }
    }
  };
  
  const handleCopyMeetingId = (meetingId: string) => {
    navigator.clipboard.writeText(meetingId);
    setCopyTooltip("Copié !");
    setTimeout(() => setCopyTooltip("Copier l'ID"), 2000);
  };
  
  const handleLeaveMeeting = async (meetingId: string) => {
    console.log(`🚪 Leaving meeting: ${meetingId}`);
    
    try {
      const success = await leaveMeeting(meetingId);
      
      // Toujours quitter l'interface, même si la BD a eu un problème
      if (activeMeetingRoom && activeMeetingRoom.meetingId === meetingId) {
        console.log(`✅ Closing meeting room interface`);
        setActiveMeetingRoom(null);
      }
      
      // Rafraîchir la liste des réunions
      if (isAdmin) {
        await getAllMeetings();
      } else {
        await getUserMeetings();
      }
      
    } catch (error) {
      console.error('Error leaving meeting:', error);
      // En cas d'erreur, fermer quand même l'interface
      if (activeMeetingRoom && activeMeetingRoom.meetingId === meetingId) {
        console.log(`🔄 Force closing meeting room due to error`);
        setActiveMeetingRoom(null);
      }
      
      toast({
        title: "Attention",
        description: "Vous avez quitté la réunion mais il y a eu un problème technique",
        variant: "default"
      });
    }
  };

  const handleEndMeeting = async (meetingId: string) => {
    console.log(`🔚 Ending meeting: ${meetingId}`);
    setLoadingAction(true);
    
    try {
      const success = await endMeeting(meetingId);
      
      if (success) {
        // Fermer l'interface si c'est la réunion active
        if (activeMeetingRoom && activeMeetingRoom.meetingId === meetingId) {
          console.log(`✅ Closing active meeting room interface`);
          setActiveMeetingRoom(null);
        }
        
        // Rafraîchir OBLIGATOIREMENT la liste des réunions
        console.log(`🔄 Refreshing meetings list for admin`);
        if (isAdmin) {
          await getAllMeetings();
        } else {
          await getUserMeetings();
        }
        
        // Notification de succès
        toast({
          title: "Réunion terminée",
          description: "La réunion a été terminée et la liste a été mise à jour",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error ending meeting:', error);
      toast({
        title: "Erreur",
        description: "Problème lors de la fermeture de la réunion",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(false);
    }
  };

  // Supprimer une réunion individuelle
  const handleDeleteMeeting = async (meetingId: string) => {
    console.log(`🗑️ Deleting meeting: ${meetingId}`);
    setLoadingAction(true);
    
    try {
      const success = await deleteMeeting(meetingId);
      
      if (success) {
        // Rafraîchir la liste des réunions
        if (isAdmin) {
          await getAllMeetings();
        } else {
          await getUserMeetings();
        }
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
    } finally {
      setLoadingAction(false);
    }
  };

  // Nettoyer l'historique des réunions terminées
  const handleClearHistory = async () => {
    console.log(`🧹 Clearing completed meetings history`);
    setLoadingAction(true);
    
    try {
      const success = await clearCompletedMeetings();
      
      if (success) {
        // Rafraîchir la liste des réunions après nettoyage
        if (isAdmin) {
          await getAllMeetings();
        } else {
          await getUserMeetings();
        }
      }
    } catch (error) {
      console.error('Error clearing history:', error);
    } finally {
      setLoadingAction(false);
    }
  };

  // Utiliser useMemo pour stabiliser le composant WebRTC et éviter les rerenders
  const memoizedWebRTCMeeting = useMemo(() => {
    if (!activeMeetingRoom) return null;
    
    return (
      <WebRTCMeeting 
        roomId={activeMeetingRoom.roomId}
        displayName={user?.email || 'Utilisateur'}
        email={user?.email}
        onClose={() => setActiveMeetingRoom(null)}
        isModerator={activeMeetingRoom.isModerator}
        onError={(error) => {
          toast({
            title: "Erreur de visioconférence",
            description: error.message || "Une erreur est survenue avec la visioconférence",
            variant: "destructive"
          });
          
          setTimeout(() => {
            setActiveMeetingRoom(null);
          }, 2000);
        }}
      />
    );
  }, [activeMeetingRoom, user, toast]);

  // Si une réunion WebRTC est active
  if (activeMeetingRoom) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">{t.currentMeeting}</h1>
          <div className="flex gap-2">
            {activeMeetingRoom.isModerator && (
              <Button 
                variant="destructive" 
                onClick={() => handleEndMeeting(activeMeetingRoom.meetingId)}
              >
                <StopCircle className="mr-2 h-4 w-4" /> {t.endMeeting}
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => handleLeaveMeeting(activeMeetingRoom.meetingId)}
            >
                              <X className="mr-2 h-4 w-4" /> {t.leave}
            </Button>
          </div>
        </div>
        
        {memoizedWebRTCMeeting}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground">
          {t.subtitle}
        </p>
      </div>
      
      {/* Navigation par onglets */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button 
          variant={activeTab === "meetings" ? "default" : "outline"}
          onClick={() => setActiveTab("meetings")}
          className={activeTab === "meetings" ? "bg-aphs-teal hover:bg-aphs-navy" : ""}
        >
          <VideoIcon className="mr-2 h-4 w-4" /> {t.myMeetings}
        </Button>
        {!isAdmin && (
          <Button 
            variant={activeTab === "request" ? "default" : "outline"}
            onClick={() => setActiveTab("request")}
            className={activeTab === "request" ? "bg-aphs-teal hover:bg-aphs-navy" : ""}
          >
            <Calendar className="mr-2 h-4 w-4" /> {t.requestMeeting}
          </Button>
        )}
        {isAdmin && (
          <Button 
            variant={activeTab === "requests" ? "default" : "outline"}
            onClick={() => setActiveTab("requests")}
            className={activeTab === "requests" ? "bg-aphs-teal hover:bg-aphs-navy" : ""}
          >
            <Users className="mr-2 h-4 w-4" /> {t.meetingRequests}
          </Button>
        )}
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === "meetings" && (
        <div>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <div className="flex gap-2">
              {isAdmin && (
                <>
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
                  <Button 
                    variant="destructive" 
                    className="flex-1 md:flex-none"
                    onClick={handleClearHistory}
                    disabled={loadingAction}
                  >
                    <History className="mr-2 h-4 w-4" /> Nettoyer l'historique
                  </Button>
                </>
              )}
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
            <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-r from-green-50 to-teal-50 mb-6">
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
                
                {(isAdmin || activeMeeting.createdBy === user?.id) && (
                  <Button 
                    variant="destructive"
                    onClick={() => handleEndMeeting(activeMeeting.id)}
                  >
                    <StopCircle className="mr-2 h-4 w-4" /> Terminer
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}
          
          <div>
            <Tabs defaultValue="toutes" className="w-full" onValueChange={setFilter}>
              <TabsList className="w-full justify-start bg-gray-100 p-0 h-auto mb-4">
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
              <div className="grid gap-4">
                {filteredMeetings.filter(meeting => meeting.id !== activeMeeting?.id).map((meeting) => (
                  <Card key={meeting.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {meeting.status === "scheduled" && <Badge variant="outline">Programmée</Badge>}
                          {meeting.status === "active" && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>}
                          {meeting.status === "ended" && <Badge variant="secondary">Terminée</Badge>}
                          {meeting.title}
                        </CardTitle>
                        {meeting.scheduledTime && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatMeetingTime(meeting.scheduledTime)}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3 pt-0">
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
                    <CardFooter className="flex justify-between pt-0">
                      <div className="flex gap-2">
                        <Button 
                          className="bg-aphs-teal hover:bg-aphs-navy"
                          onClick={() => handleJoinMeeting(meeting.id)}
                        >
                          <VideoIcon className="mr-2 h-4 w-4" /> Rejoindre
                        </Button>
                        
                        {(meeting.status === 'active') && 
                         (isAdmin || meeting.createdBy === user?.id) && (
                          <Button 
                            variant="destructive"
                            onClick={() => handleEndMeeting(meeting.id)}
                            disabled={loadingAction}
                          >
                            <StopCircle className="mr-2 h-4 w-4" /> Terminer
                          </Button>
                        )}
                      </div>

                      {/* Bouton supprimer pour les réunions terminées/annulées */}
                      {(meeting.status === 'ended' || meeting.status === 'cancelled') && 
                       (isAdmin || meeting.createdBy === user?.id) && (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          disabled={loadingAction}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
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
                {isAdmin && (
                  <Button 
                    className="mt-4 bg-aphs-teal hover:bg-aphs-navy"
                    onClick={handleCreateMeeting}
                  >
                    Planifier une réunion
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet pour faire une demande de réunion (non-admins) */}
      {activeTab === "request" && !isAdmin && (
        <div className="max-w-2xl mx-auto">
          <MeetingRequestForm 
            onRequestSubmitted={() => {
              toast({
                title: "Demande envoyée",
                description: "Votre demande de réunion a été envoyée à l'administrateur",
              });
              setActiveTab("meetings");
            }}
          />
        </div>
      )}

      {/* Onglet pour gérer les demandes de réunion (admins) */}
      {activeTab === "requests" && isAdmin && (
        <div>
          <MeetingRequestsManager />
        </div>
      )}
      
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