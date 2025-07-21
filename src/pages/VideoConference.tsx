import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  VideoIcon, 
  Calendar, 
  Users, 
  Plus, 
  Search,
  Filter,
  Clock,
  Copy,
  X,
  StopCircle,
  History,
  Settings,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoMeetings } from '@/hooks/useVideoMeetings';
import { SimpleVideoConference } from '@/components/SimpleVideoConference';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../lib/translations';
import { MeetingRequestFormImproved } from '@/components/MeetingRequestFormImproved';
import { MeetingRequestsManagerImproved } from '@/components/MeetingRequestsManagerImproved';

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

// Fonction pour formater l'heure des réunions
const formatMeetingTime = (date: Date) => {
  return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr });
};

// Fonction pour vérifier si une réunion peut être rejointe
const canJoinMeeting = (meeting: any, isAdmin: boolean) => {
  // Les admins peuvent toujours rejoindre
  if (isAdmin) return true;
  
  // Si la réunion est active, on peut la rejoindre
  if (meeting.status === 'active') return true;
  
  // Si la réunion n'est pas planifiée, on peut la rejoindre
  if (meeting.status !== 'scheduled') return true;
  
  // Si la réunion n'a pas d'heure de début, on peut la rejoindre
  if (!meeting.scheduledTime) return true;
  
  // Vérifier si l'heure de début est passée (avec une marge de 10 minutes avant)
  const now = new Date();
  const scheduledTime = new Date(meeting.scheduledTime);
  const tenMinutesBefore = new Date(scheduledTime.getTime() - 10 * 60 * 1000);
  
  return now >= tenMinutesBefore;
};

// Fonction pour obtenir le message d'erreur pour une réunion non accessible
const getJoinErrorMessage = (meeting: any) => {
  if (meeting.status === 'scheduled' && meeting.scheduledTime) {
    const scheduledTime = new Date(meeting.scheduledTime);
    const tenMinutesBefore = new Date(scheduledTime.getTime() - 10 * 60 * 1000);
    return `Cette réunion ne peut être rejointe qu'à partir de ${formatMeetingTime(tenMinutesBefore)}`;
  }
  return "Cette réunion n'est pas encore disponible";
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
    
    // Vérifier si la réunion peut être rejointe
    const meeting = meetings?.find(m => m.id === meetingId);
    if (meeting && !canJoinMeeting(meeting, isAdmin)) {
      toast({
        title: "Accès refusé",
        description: getJoinErrorMessage(meeting),
        variant: "destructive"
      });
      return;
    }
    
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
    } catch (error) {
      console.error('Erreur lors de la connexion à la réunion:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejoindre la réunion",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(false);
    }
  };
  
  const handleJoinWithId = async () => {
    if (!meetingIdToJoin.trim()) return;
    
    setLoadingAction(true);
    try {
      const result = await joinMeeting(meetingIdToJoin);
      
      if (result) {
        setActiveMeetingRoom({
          roomId: result.roomId,
          meetingId: meetingIdToJoin,
          isModerator: result.isModerator
        });
        setMeetingIdToJoin("");
      }
    } catch (error) {
      console.error('Erreur lors de la connexion à la réunion:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejoindre la réunion avec cet ID",
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
    if (!formData.title.trim()) {
      toast({
        title: "Titre manquant",
        description: "Veuillez saisir un titre pour la réunion",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.isInstant && !formData.scheduledTime) {
      toast({
        title: "Heure manquante",
        description: "Veuillez sélectionner une heure pour la réunion planifiée",
        variant: "destructive"
      });
      return;
    }
    
    setLoadingAction(true);
    try {
      const scheduledTime = formData.isInstant ? undefined : new Date(formData.scheduledTime);
      
      const result = await createMeeting(
        formData.title,
        formData.selectedParticipants,
        {
          description: formData.description,
          scheduledTime,
          isInstant: formData.isInstant
        }
      );
      
      if (result) {
        setNewMeetingDialog(false);
        setFormData({
          title: '',
          description: '',
          scheduledTime: '',
          selectedParticipants: [],
          isInstant: false
        });
        
        if (formData.isInstant) {
          // Rejoindre automatiquement la réunion instantanée
          setActiveMeetingRoom({
            roomId: result,
            meetingId: result,
            isModerator: true
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la création de la réunion:', error);
    } finally {
      setLoadingAction(false);
    }
  };
  
  const handleCopyMeetingId = (meetingId: string) => {
    navigator.clipboard.writeText(meetingId);
    setCopyTooltip("Copié!");
    setTimeout(() => setCopyTooltip("Copier l'ID"), 2000);
  };
  
  const handleLeaveMeeting = async (meetingId: string) => {
    setLoadingAction(true);
    try {
      await leaveMeeting(meetingId);
      setActiveMeetingRoom(null);
      toast({
        title: "Réunion quittée",
        description: "Vous avez quitté la réunion"
      });
    } catch (error) {
      console.error('Erreur lors de la sortie de la réunion:', error);
      toast({
        title: "Erreur",
        description: "Impossible de quitter la réunion",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(false);
    }
  };
  
  const handleEndMeeting = async (meetingId: string) => {
    setLoadingAction(true);
    try {
      await endMeeting(meetingId);
      setActiveMeetingRoom(null);
      toast({
        title: "Réunion terminée",
        description: "La réunion a été terminée avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la fin de la réunion:', error);
      toast({
        title: "Erreur",
        description: "Impossible de terminer la réunion",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(false);
    }
  };
  
  const handleDeleteMeeting = async (meetingId: string) => {
    setLoadingAction(true);
    try {
      await deleteMeeting(meetingId);
      toast({
        title: "Réunion supprimée",
        description: "La réunion a été supprimée"
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de la réunion:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la réunion",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(false);
    }
  };
  
  const handleClearHistory = async () => {
    setLoadingAction(true);
    try {
      await clearCompletedMeetings();
      toast({
        title: "Historique nettoyé",
        description: "Les réunions terminées ont été supprimées"
      });
    } catch (error) {
      console.error('Erreur lors du nettoyage de l\'historique:', error);
      toast({
        title: "Erreur",
        description: "Impossible de nettoyer l'historique",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(false);
    }
  };
  
  const memoizedVideoCall = useMemo(() => {
    if (!activeMeetingRoom) return null;
    
    return (
      <SimpleVideoConference 
        roomId={activeMeetingRoom.roomId}
        userName={`${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || user?.email || 'Utilisateur'}
        onError={(error) => {
          toast({
            title: "Erreur de vidéoconférence",
            description: error,
            variant: "destructive"
          });
        }}
      />
    );
  }, [activeMeetingRoom, user, toast]);
  
  // Charger les réunions au montage
  useEffect(() => {
    if (isAdmin) {
      getAllMeetings();
    } else {
      getUserMeetings();
    }
  }, [isAdmin, getAllMeetings, getUserMeetings]);
  
  // Si l'utilisateur est dans une réunion, afficher seulement l'interface de vidéoconférence
  if (activeMeetingRoom) {
    return (
      <div className="min-h-screen bg-gray-50 space-y-6">
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
        
        {memoizedVideoCall}
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
      
      {/* Navigation par onglets - Seul "Mes réunions" pour les intervenants */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button 
          variant={activeTab === "meetings" ? "default" : "outline"}
          onClick={() => setActiveTab("meetings")}
          className={activeTab === "meetings" ? "bg-aphs-teal hover:bg-aphs-navy" : ""}
        >
          <VideoIcon className="mr-2 h-4 w-4" /> {t.myMeetings}
        </Button>
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
                {filteredMeetings.filter(meeting => meeting.id !== activeMeeting?.id).map((meeting) => {
                  const canJoin = canJoinMeeting(meeting, isAdmin);
                  
                  return (
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
                        
                        {/* Affichage d'un avertissement pour les réunions non accessibles */}
                        {!canJoin && (
                          <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
                            <div className="flex items-center gap-2 text-orange-800">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">Réunion non accessible</span>
                            </div>
                            <p className="text-sm text-orange-700 mt-1">
                              {getJoinErrorMessage(meeting)}
                            </p>
                          </div>
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
                            disabled={!canJoin}
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
                          
                          {isAdmin && (
                            <Button 
                              variant="outline"
                              onClick={() => handleDeleteMeeting(meeting.id)}
                              disabled={loadingAction}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                            </Button>
                          )}
                        </div>
                        
                        {meeting.status === 'scheduled' && (
                          <div className="text-xs text-gray-500">
                            Programmée pour le {formatMeetingTime(meeting.scheduledTime)}
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
                
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
            )}
          </div>
        </div>
      )}

      {/* Onglet pour gérer les demandes de réunion (admins seulement) */}
      {activeTab === "requests" && isAdmin && (
        <div>
          <MeetingRequestsManagerImproved />
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