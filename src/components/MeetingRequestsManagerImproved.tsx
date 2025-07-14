import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, Check, X, Users, Info, Clock, FolderOpen, RefreshCw } from 'lucide-react';
import { useVideoMeetingRequests } from '@/hooks/useVideoMeetingRequests';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MultiSelect } from '@/components/ui/multi-select';
import { useSupabase } from '@/hooks/useSupabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export function MeetingRequestsManagerImproved() {
  const { toast } = useToast();
  const { loading, requests, getMeetingRequests, respondToMeetingRequest } = useVideoMeetingRequests();
  const { supabase } = useSupabase();
  const [responseDialog, setResponseDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [users, setUsers] = useState<{value: string, label: string}[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [respondingState, setRespondingState] = useState<'idle' | 'approving' | 'rejecting'>('idle');
  const [processing, setProcessing] = useState(false);
  
  // Charger les utilisateurs pour la sélection des participants
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .order('first_name');
          
        if (error) throw error;
        
        if (data && Array.isArray(data)) {
          const formattedUsers = data.map(user => ({
            value: user.user_id,
            label: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
          }));
          setUsers(formattedUsers);
        } else {
          setUsers([]);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs:", error);
        setUsers([]);
        toast({
          title: "Erreur",
          description: "Impossible de charger la liste des participants",
          variant: "destructive"
        });
      } finally {
        setLoadingUsers(false);
      }
    };
    
    loadUsers();
  }, [supabase, toast]);

  const handleOpenResponse = (request: any, approving: boolean) => {
    setSelectedRequest(request);
    setResponseDialog(true);
    setRespondingState(approving ? 'approving' : 'rejecting');
    setResponseMessage('');
    setSelectedParticipants([]);
    
    // Pré-remplir avec la date demandée si on approuve
    if (approving && request.scheduledTime) {
      setScheduledTime(format(request.scheduledTime, 'yyyy-MM-dd\'T\'HH:mm'));
    } else {
      setScheduledTime('');
    }
    
    // Pré-sélectionner le demandeur comme participant
    if (approving && request.requestedBy) {
      setSelectedParticipants([request.requestedBy]);
    }
  };
  
  const handleRespond = async () => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    
    try {
      const scheduledDate = respondingState === 'approving' && scheduledTime 
        ? new Date(scheduledTime) 
        : undefined;
      
      const success = await respondToMeetingRequest(
        selectedRequest.id,
        respondingState === 'approving',
        responseMessage,
        scheduledDate,
        selectedParticipants
      );
      
      if (success) {
        setResponseDialog(false);
        setSelectedRequest(null);
        setResponseMessage('');
        setScheduledTime('');
        setSelectedParticipants([]);
      }
    } catch (error) {
      console.error("Erreur lors de la réponse à la demande:", error);
    } finally {
      setProcessing(false);
    }
  };
  
  const formatRequestTime = (date: Date) => {
    return format(date, "EEEE d MMMM 'à' HH'h'mm", { locale: fr });
  };
  
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">En attente</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approuvée</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Refusée</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };
  
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Demandes de réunion</h2>
          <p className="text-gray-600">Gérer les demandes de réunion des intervenants</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={getMeetingRequests}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aphs-teal"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-gray-600">En attente</p>
                    <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Traitées</p>
                    <p className="text-2xl font-bold">{processedRequests.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Demandes en attente */}
          {pendingRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Demandes en attente ({pendingRequests.length})
              </h3>
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="border-yellow-200 bg-yellow-50">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{request.title}</CardTitle>
                        <div className="text-sm text-gray-500">
                          <span>Par {request.requestedByName}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2 pt-0">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Souhaitée pour: {formatRequestTime(request.scheduledTime || request.requestedTime)}</span>
                        </div>
                        {request.projectName && (
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            <span>Projet: {request.projectName}</span>
                          </div>
                        )}
                        {request.description && (
                          <div className="p-2 bg-white rounded text-gray-700">
                            {request.description}
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleOpenResponse(request, true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenResponse(request, false)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Refuser
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* Demandes traitées */}
          {processedRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <Check className="h-5 w-5" />
                Demandes traitées ({processedRequests.length})
              </h3>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-4">
                  {processedRequests.map((request) => (
                    <Card key={request.id} className="border-gray-200 bg-gray-50">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {request.title}
                            {renderStatusBadge(request.status)}
                          </CardTitle>
                          <div className="text-sm text-gray-500">
                            <span>Par {request.requestedByName}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2 pt-0">
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4" />
                            <span>Demandé pour: {formatRequestTime(request.scheduledTime || request.requestedTime)}</span>
                          </div>
                          {request.responseMessage && (
                            <p className="text-gray-700 bg-white p-2 rounded mt-2">
                              <strong>Réponse:</strong> {request.responseMessage}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          
          {/* État vide */}
          {requests.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Info className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <h3 className="text-lg font-medium mb-2">Aucune demande</h3>
                <p className="text-gray-500">Il n'y a aucune demande de réunion pour le moment.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {/* Dialog de réponse */}
      <Dialog open={responseDialog} onOpenChange={setResponseDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {respondingState === 'approving' ? 'Approuver' : 'Refuser'} la demande
            </DialogTitle>
            <DialogDescription>
              Demande de réunion : "{selectedRequest?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {respondingState === 'approving' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="scheduled-time">Date et heure de la réunion *</Label>
                  <Input
                    id="scheduled-time"
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    La réunion sera programmée à cette date et tous les participants seront notifiés.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="participants">Participants à la réunion *</Label>
                  {loadingUsers ? (
                    <div className="border border-input px-3 py-2 text-sm rounded-md text-gray-500">
                      Chargement des participants...
                    </div>
                  ) : (
                    <MultiSelect
                      id="participants"
                      placeholder="Sélectionnez les participants..."
                      selected={selectedParticipants}
                      options={users}
                      onChange={setSelectedParticipants}
                    />
                  )}
                  <p className="text-sm text-gray-500">
                    Sélectionnez les personnes qui participeront à cette réunion. Le demandeur est automatiquement inclus.
                  </p>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="response">
                Message {respondingState === 'approving' ? '(optionnel)' : '*'}
              </Label>
              <Textarea
                id="response"
                placeholder={
                  respondingState === 'approving' 
                    ? "Message d'accompagnement pour l'approbation..."
                    : "Raison du refus..."
                }
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setResponseDialog(false)}
              disabled={processing}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleRespond}
              disabled={
                processing || 
                (respondingState === 'approving' && (!scheduledTime || selectedParticipants.length === 0)) ||
                (respondingState === 'rejecting' && !responseMessage.trim())
              }
              className={
                respondingState === 'approving' 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {processing ? "Traitement..." : (respondingState === 'approving' ? 'Approuver' : 'Refuser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 