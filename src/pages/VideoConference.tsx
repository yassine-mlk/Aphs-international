import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoConference } from '@/hooks/useVideoConference';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Calendar, Clock, Plus, Users, Check, X, Play, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useProfiles } from '@/hooks/useProfiles';
import { useWorkGroups } from '@/hooks/useWorkGroups';
import { MultiSelect } from '@/components/ui/multi-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Profile } from '@/types/profile';
import MeetingRoom from '@/components/MeetingRoom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Composant principal pour la gestion des visioconférences
export default function VideoConference() {
  const { user, role } = useAuth();
  const { 
    meetings, 
    effectiveTenantId,
    fetchMeetings,
    createMeeting, 
    updateMeetingStatus, 
    joinMeeting,
    getMeetingDetails,
    updateMeetingParticipants,
    getMeetingParticipants
  } = useVideoConference();
  const { getProfiles, getProfileById } = useProfiles();
  const { workGroups, fetchWorkGroups } = useWorkGroups();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [selectedMeetingDetails, setSelectedMeetingDetails] = useState<any[] | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [meetingToJoin, setMeetingToJoin] = useState<string | null>(null);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    is_recording_enabled: false,
    participants: [] as string[]
  });

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!effectiveTenantId) return;
      const data = await getProfiles({ tenant_id: effectiveTenantId } as any);
      setProfiles(data);
    };

    // Vérifier si une réunion était en cours (après rafraîchissement)
    const savedMeetingId = localStorage.getItem('active_video_meeting');
    if (savedMeetingId) {
      setMeetingToJoin(savedMeetingId);
      setIsJoining(true);
    }

    fetchProfiles();
    fetchWorkGroups();
  }, [getProfiles, fetchWorkGroups, effectiveTenantId, user?.id]);

  const isAdmin = role === 'admin' || user?.email === 'admin@aps.com';

  const handleCreateMeeting = async (status: 'scheduled' | 'active' | 'pending' = 'scheduled') => {
    console.log("handleCreateMeeting triggered with status:", status);
    const meeting = await createMeeting({
      ...newMeeting,
      status,
      scheduled_at: status === 'active' ? new Date().toISOString() : newMeeting.scheduled_at
    });
    
    console.log("createMeeting result:", meeting);
    
    if (meeting) {
      setIsCreateDialogOpen(false);
      setNewMeeting({
        title: '',
        description: '',
        scheduled_at: '',
        is_recording_enabled: false,
        participants: []
      });
      if (status === 'active') {
        setActiveMeetingId(meeting.id);
        localStorage.setItem('active_video_meeting', meeting.id);
      }
    } else {
      console.warn("Meeting creation failed or returned null");
    }
  };

  const handleEditMeeting = async (meeting: any) => {
    const participantIds = await getMeetingParticipants(meeting.id);
    setEditingMeeting({
      ...meeting,
      participants: participantIds
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateMeeting = async () => {
    if (!editingMeeting) return;
    
    // Mettre à jour les participants
    await updateMeetingParticipants(editingMeeting.id, editingMeeting.participants);
    
    // Si la date a changé
    if (editingMeeting.scheduled_at) {
      // On pourrait ajouter une fonction updateMeetingDetails si nécessaire
    }
    
    setIsEditDialogOpen(false);
    setEditingMeeting(null);
  };

  const handleViewDetails = async (meetingId: string) => {
    const details = await getMeetingDetails(meetingId);
    setSelectedMeetingDetails(details);
    setIsDetailsDialogOpen(true);
  };

  const handleWorkGroupSelect = (workgroupId: string) => {
    const wg = workGroups.find(g => g.id === workgroupId);
    if (wg) {
      const memberIds = wg.members.map(m => m.user_id).filter(id => id !== user?.id);
      setNewMeeting(prev => ({
        ...prev,
        participants: Array.from(new Set([...prev.participants, ...memberIds]))
      }));
    }
  };

  const confirmJoin = (meetingId: string) => {
    setMeetingToJoin(meetingId);
    setIsJoining(true);
  };

  const startMeeting = () => {
    if (meetingToJoin) {
      setActiveMeetingId(meetingToJoin);
      localStorage.setItem('active_video_meeting', meetingToJoin);
      setIsJoining(false);
      setMeetingToJoin(null);
    }
  };

  const cancelJoin = () => {
    setIsJoining(false);
    setMeetingToJoin(null);
    localStorage.removeItem('active_video_meeting');
  };

  if (activeMeetingId) {
    return (
      <MeetingRoom 
        roomId={activeMeetingId} 
        onLeave={() => {
          setActiveMeetingId(null);
          localStorage.removeItem('active_video_meeting');
        }} 
        isAdmin={isAdmin}
      />
    );
  }

  const pendingMeetings = meetings.filter(m => m.status === 'pending');
  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'active');
  const pastMeetings = meetings.filter(m => m.status === 'completed' || m.status === 'cancelled');

  const participantOptions = profiles
    .filter(p => p.user_id !== user?.id)
    .map(p => ({
      label: `${p.first_name} ${p.last_name} (${p.company})`,
      value: p.user_id
    }));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visioconférence</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Gérez les visioconférences de votre tenant." : "Demandez et participez à vos réunions vidéo."}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Dialog de confirmation de rejoint */}
          <Dialog open={isJoining} onOpenChange={setIsJoining}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rejoindre la visioconférence</DialogTitle>
                <DialogDescription>
                  Une réunion est en cours ou vous avez été invité. Souhaitez-vous la rejoindre maintenant ?
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={cancelJoin}>Plus tard</Button>
                <Button onClick={startMeeting}>Rejoindre maintenant</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {isAdmin ? "Nouvelle réunion" : "Demander une réunion"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{isAdmin ? "Programmer une réunion" : "Demander une réunion"}</DialogTitle>
                <DialogDescription>
                  Remplissez les détails ci-dessous pour {isAdmin ? "créer" : "demander"} une visioconférence.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Titre</Label>
                  <Input 
                    id="title" 
                    placeholder="Sujet de la réunion" 
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({...newMeeting, title: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optionnel)</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Objectifs de la réunion..." 
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting({...newMeeting, description: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date et heure</Label>
                  <Input 
                    id="date" 
                    type="datetime-local" 
                    value={newMeeting.scheduled_at}
                    onChange={(e) => setNewMeeting({...newMeeting, scheduled_at: e.target.value})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label>Groupes de travail (Charger participants)</Label>
                  <Select onValueChange={handleWorkGroupSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un groupe" />
                    </SelectTrigger>
                    <SelectContent>
                      {workGroups.map(wg => (
                        <SelectItem key={wg.id} value={wg.id}>{wg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Participants</Label>
                  <MultiSelect
                    options={participantOptions}
                    onChange={(values) => setNewMeeting({...newMeeting, participants: values})}
                    selected={newMeeting.participants}
                    placeholder="Sélectionner des participants"
                  />
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enregistrement</Label>
                      <p className="text-xs text-muted-foreground">Enregistrer automatiquement la session</p>
                    </div>
                    <Switch 
                      checked={newMeeting.is_recording_enabled}
                      onCheckedChange={(checked) => setNewMeeting({...newMeeting, is_recording_enabled: checked})}
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                {isAdmin && (
                  <Button variant="outline" onClick={() => handleCreateMeeting('active')} disabled={!newMeeting.title}>
                    <Play className="mr-2 h-4 w-4" /> Lancer maintenant
                  </Button>
                )}
                <Button onClick={() => handleCreateMeeting(isAdmin ? 'scheduled' : 'pending')} disabled={!newMeeting.title}>
                  {isAdmin ? "Programmer" : "Envoyer la demande"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="upcoming">À venir</TabsTrigger>
          {isAdmin && <TabsTrigger value="pending">Demandes ({pendingMeetings.length})</TabsTrigger>}
          {!isAdmin && <TabsTrigger value="requests">Mes demandes</TabsTrigger>}
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingMeetings.length === 0 ? (
                  <Card className="col-span-full py-12">
                    <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                      <Video className="h-12 w-12 text-muted-foreground" />
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">Aucune réunion prévue</h3>
                        <p className="text-muted-foreground">Vous n'avez pas de visioconférences programmées pour le moment.</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  upcomingMeetings.map((meeting) => (
                    <MeetingCard 
                      key={meeting.id} 
                      meeting={meeting} 
                      isAdmin={isAdmin}
                      onJoin={() => {
                        joinMeeting(meeting.id);
                        confirmJoin(meeting.id);
                      }}
                      onComplete={() => updateMeetingStatus(meeting.id, 'completed')}
                      onCancel={() => updateMeetingStatus(meeting.id, 'cancelled')}
                      onEdit={() => handleEditMeeting(meeting)}
                    />
                  ))
                )}
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="pending" className="mt-6">
            <div className="grid gap-4">
              {pendingMeetings.length === 0 ? (
                <Card className="py-12">
                  <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                    <Clock className="h-12 w-12 text-muted-foreground" />
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">Aucune demande en attente</h3>
                      <p className="text-muted-foreground">Toutes les demandes de réunion ont été traitées.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                pendingMeetings.map((meeting) => (
                  <Card key={meeting.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="space-y-1">
                        <CardTitle>{meeting.title}</CardTitle>
                        <CardDescription>
                          Demandé par {profiles.find(p => p.user_id === meeting.created_by)?.first_name} le {format(new Date(meeting.created_at), 'PPP', { locale: fr })}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditMeeting(meeting)}>
                          <Users className="h-4 w-4 mr-1" /> Modifier participants
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => updateMeetingStatus(meeting.id, 'cancelled')}>
                          <X className="h-4 w-4 mr-1" /> Refuser
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateMeetingStatus(meeting.id, 'scheduled')}>
                          <Check className="h-4 w-4 mr-1" /> Accepter
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{meeting.description || "Aucune description fournie."}</p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4" />
                        {meeting.scheduled_at ? format(new Date(meeting.scheduled_at), 'PPPp', { locale: fr }) : "Non spécifié"}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        )}

        {/* Dialog d'édition des participants pour l'admin */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier les participants</DialogTitle>
              <DialogDescription>
                Modifiez la liste des participants avant de programmer la réunion.
              </DialogDescription>
            </DialogHeader>
            {editingMeeting && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Participants</Label>
                  <MultiSelect
                    options={participantOptions}
                    onChange={(values) => setEditingMeeting({...editingMeeting, participants: values})}
                    selected={editingMeeting.participants}
                    placeholder="Sélectionner des participants"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleUpdateMeeting}>Enregistrer les modifications</Button>
            </div>
          </DialogContent>
        </Dialog>

        {!isAdmin && (
          <TabsContent value="requests" className="mt-6">
            <div className="grid gap-4">
              {meetings.filter(m => m.created_by === user?.id && m.status === 'pending').length === 0 ? (
                <Card className="py-12">
                  <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                    <MessageSquare className="h-12 w-12 text-muted-foreground" />
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">Aucune demande</h3>
                      <p className="text-muted-foreground">Vous n'avez pas de demandes de réunion en cours.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                meetings.filter(m => m.created_by === user?.id && m.status === 'pending').map((meeting) => (
                  <Card key={meeting.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle>{meeting.title}</CardTitle>
                          <CardDescription>
                            Demandé le {format(new Date(meeting.created_at), 'PPP', { locale: fr })}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          En attente
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{meeting.description || "Aucune description fournie."}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique des réunions</CardTitle>
              <CardDescription>Consultez les enregistrements et les statistiques des réunions passées.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {pastMeetings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun historique disponible.
                    </div>
                  ) : (
                    pastMeetings.map((meeting) => (
                      <div key={meeting.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4">
                        <div className="space-y-1">
                          <p className="font-bold text-lg">{meeting.title}</p>
                          <div className="flex flex-wrap items-center text-xs text-muted-foreground gap-x-4 gap-y-2">
                            <span className="flex items-center bg-secondary/50 px-2 py-1 rounded"><Calendar className="mr-1 h-3 w-3" /> {format(new Date(meeting.created_at), 'dd MMMM yyyy', { locale: fr })}</span>
                            <span className="flex items-center bg-secondary/50 px-2 py-1 rounded"><Clock className="mr-1 h-3 w-3" /> {meeting.duration_minutes || 0} min</span>
                            <span className="flex items-center bg-secondary/50 px-2 py-1 rounded"><Users className="mr-1 h-3 w-3" /> Présences enregistrées</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewDetails(meeting.id)}>
                            <Users className="h-4 w-4 mr-1" /> Détails Présence
                          </Button>
                          {meeting.recording_url && (
                            <Button size="sm" variant="secondary" asChild className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                              <a href={meeting.recording_url} target="_blank" rel="noopener noreferrer">
                                <Play className="h-4 w-4 mr-1" /> Voir l'enregistrement
                              </a>
                            </Button>
                          )}
                          <Badge variant={meeting.status === 'completed' ? 'secondary' : 'destructive'} className="h-8">
                            {meeting.status === 'completed' ? 'Terminée' : 'Annulée'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Détails de présence */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Détails de la réunion</DialogTitle>
            <DialogDescription>
              Pointage des participants (Entrée / Sortie)
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] mt-4">
            <div className="space-y-4">
              {selectedMeetingDetails?.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">Aucun participant enregistré.</p>
              ) : (
                <div className="border rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium">Participant</th>
                        <th className="p-2 text-left font-medium">Arrivée</th>
                        <th className="p-2 text-left font-medium">Départ</th>
                        <th className="p-2 text-left font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMeetingDetails?.map((p: any) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="p-2">
                            <div className="font-medium">{p.profile?.first_name} {p.profile?.last_name}</div>
                            <div className="text-xs text-muted-foreground">{p.profile?.company}</div>
                          </td>
                          <td className="p-2">
                            {p.joined_at ? format(new Date(p.joined_at), 'HH:mm:ss') : '-'}
                          </td>
                          <td className="p-2">
                            {p.left_at ? format(new Date(p.left_at), 'HH:mm:ss') : (p.status === 'present' ? 'En cours' : '-')}
                          </td>
                          <td className="p-2">
                            <Badge variant={p.status === 'present' ? 'default' : (p.status === 'invited' ? 'outline' : 'secondary')}>
                              {p.status === 'present' ? 'Présent' : (p.status === 'invited' ? 'Invité' : p.status)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setIsDetailsDialogOpen(false)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MeetingCard({ meeting, isAdmin, onJoin, onComplete, onCancel, onEdit }: { 
  meeting: any, 
  isAdmin: boolean, 
  onJoin: () => void,
  onComplete: () => void,
  onCancel: () => void,
  onEdit: () => void
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <Badge variant={meeting.status === 'active' ? 'destructive' : 'outline'} className={meeting.status === 'active' ? 'animate-pulse' : ''}>
            {meeting.status === 'active' ? 'EN DIRECT' : 'PROGRAMMÉ'}
          </Badge>
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />
            {meeting.scheduled_at ? format(new Date(meeting.scheduled_at), 'p', { locale: fr }) : "Maintenant"}
          </div>
        </div>
        <CardTitle className="mt-2">{meeting.title}</CardTitle>
        <CardDescription className="line-clamp-2">{meeting.description || "Pas de description"}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center text-sm text-muted-foreground mb-4">
          <Calendar className="mr-2 h-4 w-4" />
          {meeting.scheduled_at ? format(new Date(meeting.scheduled_at), 'PPP', { locale: fr }) : "Aujourd'hui"}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="mr-2 h-4 w-4" />
          Cliquez sur rejoindre pour participer
        </div>
      </CardContent>
      <div className="p-6 pt-0 flex gap-2">
        <Button className="flex-1" onClick={onJoin}>
          Rejoindre
        </Button>
        {isAdmin && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Actions Administrateur</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Button variant="outline" onClick={onEdit}>Modifier les participants</Button>
                <Button variant="outline" onClick={onComplete}>Marquer comme terminée</Button>
                <Button variant="destructive" onClick={onCancel}>Annuler la réunion</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Card>
  );
}

