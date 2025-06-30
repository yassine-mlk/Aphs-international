import React, { useState } from 'react';
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
  const [responseDialog, setResponseDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [respondingState, setRespondingState] = useState<'idle' | 'approving' | 'rejecting'>('idle');
  const [processing, setProcessing] = useState(false);
  
  const handleOpenResponse = (request: any, approving: boolean) => {
    setSelectedRequest(request);
    setResponseDialog(true);
    setRespondingState(approving ? 'approving' : 'rejecting');
    setResponseMessage('');
    // Pré-remplir avec la date demandée si on approuve
    if (approving && request.scheduledTime) {
      setScheduledTime(format(request.scheduledTime, 'yyyy-MM-dd\'T\'HH:mm'));
    } else {
      setScheduledTime('');
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
        scheduledDate
      );
      
      if (success) {
        setResponseDialog(false);
        setSelectedRequest(null);
        setResponseMessage('');
        setScheduledTime('');
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
          <p className="text-gray-600">
            {pendingRequests.length} demande(s) en attente • {processedRequests.length} traitée(s)
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={getMeetingRequests}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {loading ? "Chargement..." : "Actualiser"}
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aphs-teal mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement des demandes...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Demandes en attente */}
          {pendingRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-orange-700 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Demandes en attente ({pendingRequests.length})
              </h3>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="border-orange-200 bg-orange-50">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {request.title}
                            {renderStatusBadge(request.status)}
                          </CardTitle>
                          <div className="text-sm text-gray-600">
                            <span>Par {request.requestedByName}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3 pt-0">
                        {request.description && (
                          <p className="text-sm text-gray-700 mb-4">{request.description}</p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>Date souhaitée: {formatRequestTime(request.scheduledTime || request.requestedTime)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{request.suggestedParticipants.length} participants suggérés</span>
                          </div>
                          {request.projectName && (
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-4 w-4 text-gray-400" />
                              <span>Projet: {request.projectName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>Demandé le: {formatRequestTime(request.createdAt)}</span>
                          </div>
                        </div>
                        
                        {request.suggestedParticipants.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {request.suggestedParticipants.map(participant => (
                              <Badge key={participant.id} variant="outline" className="bg-white/50">
                                {participant.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                      
                      <CardFooter className="flex justify-end gap-2 pt-0">
                        <Button 
                          variant="outline" 
                          className="border-red-200 hover:bg-red-50 text-red-700"
                          onClick={() => handleOpenResponse(request, false)}
                        >
                          <X className="h-4 w-4 mr-2" /> Refuser
                        </Button>
                        <Button 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleOpenResponse(request, true)}
                        >
                          <Check className="h-4 w-4 mr-2" /> Approuver
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
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
        <DialogContent className="sm:max-w-[500px]">
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
                (respondingState === 'approving' && !scheduledTime) ||
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