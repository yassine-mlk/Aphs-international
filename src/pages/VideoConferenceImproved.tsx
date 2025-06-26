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
  Copy,
  Clock,
  X,
  StopCircle,
  Trash2,
  FileVideo,
  FolderOpen,
  Settings,
  AlertCircle
} from 'lucide-react';
import { useVideoMeetingsImproved } from '@/hooks/useVideoMeetingsImproved';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { WebRTCMeeting } from '@/components/WebRTCMeeting';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { useSupabase } from '@/hooks/useSupabase';
import { MeetingRequestFormImproved } from '@/components/MeetingRequestFormImproved';
import { MeetingRecordings } from '@/components/MeetingRecordings';
import { MultiSelect } from '@/components/ui/multi-select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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

const VideoConferenceImproved: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { getUsers, supabase } = useSupabase();
  const [filter, setFilter] = useState("toutes");
  const [copyTooltip, setCopyTooltip] = useState("Copier l'ID");
  const [meetingIdToJoin, setMeetingIdToJoin] = useState("");
  const [newMeetingDialog, setNewMeetingDialog] = useState(false);
  const [activeMeetingRoom, setActiveMeetingRoom] = useState<{roomId: string, meetingId: string, isModerator?: boolean} | null>(null);
  const [users, setUsers] = useState<{id: string, name: string, email: string, role: string}[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [activeTab, setActiveTab] = useState("meetings");
  const [selectedRecordingMeeting, setSelectedRecordingMeeting] = useState<{id: string, title: string} | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    scheduledTime: '',
    selectedParticipants: [] as string[],
    isInstant: false
  });

  const { 
    loading, 
    loadingMeetings,
    meetings,
    projects,
    isAdmin,
    getAllMeetings, 
    getUserMeetings, 
    createMeeting, 
    joinMeeting,
    leaveMeeting,
    endMeeting,
    deleteMeeting
  } = useVideoMeetingsImproved();
  
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
  
  // Charger les réunions au démarrage
  useEffect(() => {
    if (user) {
      if (isAdmin) {
        getAllMeetings();
      } else {
        getUserMeetings();
      }
    }
  }, [user, isAdmin, getAllMeetings, getUserMeetings]);
  
  // Filtrer les réunions
  const filteredMeetings = useMemo(() => {
    if (!meetings || meetings.length === 0) return [];
    
    return meetings.filter(meeting => {
      if (filter === "toutes") return true;
      if (filter === "actives" && meeting.status === "active") return true;
      if (filter === "planifiees" && meeting.status === "scheduled") return true;
      if (filter === "terminees" && meeting.status === "ended") return true;
      return false;
    });
  }, [meetings, filter]);
  
  // Réunion active (s'il y en a une)
  const activeMeeting = useMemo(() => 
    meetings?.find(meeting => meeting.status === "active"),
    [meetings]);

  const formatMeetingTime = (date: Date) => {
    return format(date, 'dd/MM/yyyy à HH:mm', { locale: fr });
  };

  const handleJoinMeeting = async (meetingId: string) => {
    setLoadingAction(true);
    
    try {
      const result = await joinMeeting(meetingId);
      
      if (result) {
        // Déterminer si l'utilisateur est modérateur
        const meeting = meetings?.find(m => m.id === meetingId);
        const isModerator = meeting?.createdBy === user?.id || isAdmin;
        
        setActiveMeetingRoom({
          roomId: result.roomId,
          meetingId,
          isModerator
        });
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejoindre la réunion",
        variant: "destructive"
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleJoinByRoomId = async () => {
    if (!meetingIdToJoin.trim()) {
      toast({
        title: "ID manquant",
        description: "Veuillez saisir l'ID de la réunion",
        variant: "destructive"
      });
      return;
    }

    setLoadingAction(true);
    
    try {
      // Chercher la réunion par room_id
      const { data, error } = await supabase
        .from('video_meetings')
        .select('id')
        .eq('room_id', meetingIdToJoin.trim())
        .single();

      if (error || !data) {
        throw new Error('Réunion introuvable');
      }

      await handleJoinMeeting(data.id);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Réunion introuvable ou inaccessible",
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

    if (!formData.projectId) {
      toast({
        title: "Projet manquant",
        description: "Veuillez sélectionner un projet pour cette réunion",
        variant: "destructive"
      });
      return;
    }
    
    const meetingId = await createMeeting(
      formData.title,
      formData.selectedParticipants,
      {
        description: formData.description,
        projectId: formData.projectId,
        scheduledTime: formData.isInstant ? undefined : new Date(formData.scheduledTime),
        isInstant: formData.isInstant
      }
    );
    
    if (meetingId) {
      setNewMeetingDialog(false);
      setFormData({
        title: '',
        description: '',
        projectId: '',
        scheduledTime: '',
        selectedParticipants: [],
        isInstant: false
      });
      
      // Rafraîchir la liste
      if (isAdmin) {
        await getAllMeetings();
      } else {
        await getUserMeetings();
      }
      
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
    const success = await endMeeting(meetingId);
    
    if (success) {
      if (activeMeetingRoom && activeMeetingRoom.meetingId === meetingId) {
        setActiveMeetingRoom(null);
      }
    }
  };

  const handleDeleteMeeting = async () => {
    if (!meetingToDelete) return;
    
    const success = await deleteMeeting(meetingToDelete);
    if (success) {
      setMeetingToDelete(null);
      
      if (activeMeetingRoom && activeMeetingRoom.meetingId === meetingToDelete) {
        setActiveMeetingRoom(null);
      }
    }
  };

  const handleShowRecordings = (meetingId: string, meetingTitle: string) => {
    setSelectedRecordingMeeting({ id: meetingId, title: meetingTitle });
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
          <h1 className="text-3xl font-bold tracking-tight">Vidéoconférence en cours</h1>
          <div className="flex gap-2">
            {activeMeetingRoom.isModerator && (
              <Button 
                variant="destructive" 
                onClick={() => handleEndMeeting(activeMeetingRoom.meetingId)}
              >
                <StopCircle className="mr-2 h-4 w-4" /> Terminer la réunion
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => handleLeaveMeeting(activeMeetingRoom.meetingId)}
            >
              <X className="mr-2 h-4 w-4" /> Quitter
            </Button>
          </div>
        </div>
        
        {memoizedWebRTCMeeting}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Vidéoconférences</h1>
        <div className="flex gap-2">
          <Button onClick={handleCreateMeeting} className="bg-aphs-teal hover:bg-aphs-navy">
            <Plus className="mr-2 h-4 w-4" /> Nouvelle réunion
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger 
            value="meetings"
            className={activeTab === "meetings" ? "bg-aphs-teal hover:bg-aphs-navy data-[state=active]:bg-aphs-teal" : ""}
          >
            <VideoIcon className="mr-2 h-4 w-4" />
            Mes réunions
          </TabsTrigger>
          <TabsTrigger 
            value="requests"
            className={activeTab === "requests" ? "bg-aphs-teal hover:bg-aphs-navy data-[state=active]:bg-aphs-teal" : ""}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Demandes de réunion
          </TabsTrigger>
        </TabsList>

        {activeTab === "meetings" && (
          <div className="space-y-6">
            {/* Section de connexion rapide */}
            <Card>
              <CardHeader>
                <CardTitle>Rejoindre une réunion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Saisissez l'ID de la réunion"
                    value={meetingIdToJoin}
                    onChange={(e) => setMeetingIdToJoin(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinByRoomId()}
                  />
                  <Button onClick={handleJoinByRoomId} disabled={loadingAction}>
                    {loadingAction ? "Connexion..." : "Rejoindre"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Affichage de la réunion active */}
            {activeMeeting && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      Réunion en cours
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-green-900">{activeMeeting.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-green-700 mt-2">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {activeMeeting.participants.length} participants
                        </span>
                        <span className="flex items-center gap-1">
                          <Copy className="h-4 w-4" />
                          ID: {activeMeeting.roomId}
                        </span>
                        {activeMeeting.projectName && (
                          <span className="flex items-center gap-1">
                            <FolderOpen className="h-4 w-4" />
                            {activeMeeting.projectName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleJoinMeeting(activeMeeting.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Rejoindre
                      </Button>
                      {(isAdmin || activeMeeting.createdBy === user?.id) && (
                        <Button
                          variant="destructive"
                          onClick={() => handleEndMeeting(activeMeeting.id)}
                        >
                          <StopCircle className="mr-2 h-4 w-4" />
                          Terminer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filtres */}
            <div className="flex gap-2">
              <Button
                variant={filter === "toutes" ? "default" : "outline"}
                onClick={() => setFilter("toutes")}
                className={filter === "toutes" ? "bg-aphs-teal" : ""}
              >
                Toutes
              </Button>
              <Button
                variant={filter === "actives" ? "default" : "outline"}
                onClick={() => setFilter("actives")}
                className={filter === "actives" ? "bg-aphs-teal" : ""}
              >
                Actives
              </Button>
              <Button
                variant={filter === "planifiees" ? "default" : "outline"}
                onClick={() => setFilter("planifiees")}
                className={filter === "planifiees" ? "bg-aphs-teal" : ""}
              >
                Planifiées
              </Button>
              <Button
                variant={filter === "terminees" ? "default" : "outline"}
                onClick={() => setFilter("terminees")}
                className={filter === "terminees" ? "bg-aphs-teal" : ""}
              >
                Terminées
              </Button>
            </div>

            {/* Liste des réunions */}
            <div className="grid gap-4">
              {loadingMeetings ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <span className="ml-2">Chargement des réunions...</span>
                </div>
              ) : filteredMeetings.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <VideoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Aucune réunion trouvée
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {filter === "toutes" 
                        ? "Vous n'avez pas encore de réunions programmées."
                        : `Aucune réunion ${filter === "actives" ? "active" : filter === "planifiees" ? "planifiée" : "terminée"} trouvée.`
                      }
                    </p>
                    <Button onClick={handleCreateMeeting} className="bg-aphs-teal hover:bg-aphs-navy">
                      <Plus className="mr-2 h-4 w-4" /> Créer une réunion
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredMeetings.map((meeting) => (
                  <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">{meeting.title}</h3>
                                <Badge 
                                  variant={
                                    meeting.status === 'active' ? 'default' :
                                    meeting.status === 'scheduled' ? 'secondary' :
                                    meeting.status === 'ended' ? 'outline' : 'destructive'
                                  }
                                  className={
                                    meeting.status === 'active' ? 'bg-green-500' :
                                    meeting.status === 'scheduled' ? 'bg-blue-500' :
                                    meeting.status === 'ended' ? 'bg-gray-500' : 'bg-red-500'
                                  }
                                >
                                  {meeting.status === 'active' ? 'En cours' :
                                   meeting.status === 'scheduled' ? 'Planifiée' :
                                   meeting.status === 'ended' ? 'Terminée' : 'Annulée'}
                                </Badge>
                              </div>
                              
                              {meeting.description && (
                                <p className="text-gray-600 mb-3">{meeting.description}</p>
                              )}
                              
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                {meeting.scheduledTime && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatMeetingTime(meeting.scheduledTime)}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {meeting.participants.length} participants
                                </span>
                                <span className="flex items-center gap-1">
                                  <Copy className="h-4 w-4" />
                                  {meeting.roomId}
                                </span>
                                {meeting.projectName && (
                                  <span className="flex items-center gap-1">
                                    <FolderOpen className="h-4 w-4" />
                                    {meeting.projectName}
                                  </span>
                                )}
                                {meeting.recordingAvailable && (
                                  <span className="flex items-center gap-1 text-blue-600">
                                    <FileVideo className="h-4 w-4" />
                                    Enregistrée
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          {meeting.status === 'scheduled' && (
                            <Button
                              onClick={() => handleJoinMeeting(meeting.id)}
                              disabled={loadingAction}
                              className="bg-aphs-teal hover:bg-aphs-navy"
                            >
                              Rejoindre
                            </Button>
                          )}
                          {meeting.status === 'active' && (
                            <>
                              <Button
                                onClick={() => handleJoinMeeting(meeting.id)}
                                disabled={loadingAction}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Rejoindre
                              </Button>
                              {(isAdmin || meeting.createdBy === user?.id) && (
                                <Button
                                  variant="destructive"
                                  onClick={() => handleEndMeeting(meeting.id)}
                                >
                                  <StopCircle className="mr-2 h-4 w-4" />
                                  Terminer
                                </Button>
                              )}
                            </>
                          )}
                          {meeting.recordingAvailable && (
                            <Button
                              variant="outline"
                              onClick={() => handleShowRecordings(meeting.id, meeting.title)}
                            >
                              <FileVideo className="mr-2 h-4 w-4" />
                              Voir
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => handleCopyMeetingId(meeting.roomId)}
                            title={copyTooltip}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setMeetingToDelete(meeting.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "requests" && (
          <div>
            <MeetingRequestFormImproved 
              onRequestSubmitted={() => {
                toast({
                  title: "Demande envoyée",
                  description: "Votre demande a été envoyée à l'administrateur"
                });
              }}
            />
          </div>
        )}
      </Tabs>

      {/* Dialog de création de réunion */}
      <Dialog open={newMeetingDialog} onOpenChange={setNewMeetingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle réunion</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">Titre de la réunion *</Label>
              <Input
                id="meeting-title"
                placeholder="Ex: Réunion d'équipe"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-project">Projet associé *</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData({...formData, projectId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un projet" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            {project.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="meeting-description">Description</Label>
              <Textarea
                id="meeting-description"
                placeholder="Description de la réunion..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="instant-meeting"
                checked={formData.isInstant}
                onCheckedChange={(checked) => setFormData({...formData, isInstant: !!checked})}
              />
              <Label htmlFor="instant-meeting">Réunion instantanée</Label>
            </div>
            
            {!formData.isInstant && (
              <div className="space-y-2">
                <Label htmlFor="meeting-time">Date et heure</Label>
                <Input
                  id="meeting-time"
                  type="datetime-local"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="meeting-participants">Participants</Label>
              <MultiSelect
                placeholder="Sélectionnez des participants..."
                selected={formData.selectedParticipants}
                options={users.map(user => ({ value: user.id, label: user.name }))}
                onChange={(values) => setFormData({...formData, selectedParticipants: values})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMeetingDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmitNewMeeting} 
              disabled={loading || projects.length === 0}
              className="bg-aphs-teal hover:bg-aphs-navy"
            >
              {loading ? "Création..." : formData.isInstant ? "Créer et rejoindre" : "Créer la réunion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de suppression */}
      <AlertDialog open={!!meetingToDelete} onOpenChange={() => setMeetingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Supprimer la réunion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette réunion ? Cette action est irréversible.
              Tous les participants seront notifiés de l'annulation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMeeting}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Composant d'affichage des enregistrements */}
      {selectedRecordingMeeting && (
        <MeetingRecordings
          meetingId={selectedRecordingMeeting.id}
          meetingTitle={selectedRecordingMeeting.title}
          isVisible={true}
          onClose={() => setSelectedRecordingMeeting(null)}
        />
      )}
    </div>
  );
};

export default VideoConferenceImproved; 