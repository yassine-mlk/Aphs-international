import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, Check, X, Users, Info, Clock } from 'lucide-react';
import { useVideoMeetings, MeetingRequest } from '@/hooks/useVideoMeetings';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export function MeetingRequestsManager() {
  const { toast } = useToast();
  const { getMeetingRequests, respondToMeetingRequest } = useVideoMeetings();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [responseDialog, setResponseDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MeetingRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [respondingState, setRespondingState] = useState<'idle' | 'approving' | 'rejecting'>('idle');
  
  // Charger les demandes de réunion
  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getMeetingRequests();
      setRequests(data);
    } catch (error) {
      console.error("Erreur lors du chargement des demandes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes de réunion",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadRequests();
  }, [getMeetingRequests]);
  
  const handleOpenResponse = (request: MeetingRequest, approving: boolean) => {
    setSelectedRequest(request);
    setResponseDialog(true);
    setRespondingState(approving ? 'approving' : 'rejecting');
    setResponseMessage('');
  };
  
  const handleRespond = async () => {
    if (!selectedRequest) return;
    
    try {
      const success = await respondToMeetingRequest(
        selectedRequest.id,
        respondingState === 'approving',
        responseMessage
      );
      
      if (success) {
        toast({
          title: respondingState === 'approving' ? "Demande approuvée" : "Demande refusée",
          description: respondingState === 'approving' 
            ? "La réunion a été programmée avec succès" 
            : "La demande a été refusée"
        });
        
        setResponseDialog(false);
        loadRequests();
      }
    } catch (error) {
      console.error("Erreur lors de la réponse à la demande:", error);
      toast({
        title: "Erreur",
        description: "Impossible de traiter la demande",
        variant: "destructive"
      });
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
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Demandes de réunion</h2>
        <Button 
          variant="outline" 
          onClick={loadRequests}
          disabled={loading}
        >
          {loading ? "Chargement..." : "Actualiser"}
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aphs-teal mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement des demandes...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Info className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <h3 className="text-lg font-medium mb-2">Aucune demande</h3>
            <p className="text-gray-500">Il n'y a aucune demande de réunion en attente.</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {request.title}
                      {renderStatusBadge(request.status)}
                    </CardTitle>
                    <div className="text-sm text-gray-500">
                      <span>Demande de {request.requestedByName}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3 pt-0">
                  {request.description && (
                    <p className="text-sm text-gray-700 mb-4">{request.description}</p>
                  )}
                  
                  <div className="flex flex-col gap-2 text-sm mb-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Date souhaitée: {formatRequestTime(request.scheduledTime || request.requestedTime)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Demande faite le: {formatRequestTime(request.requestedTime)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>Participants suggérés: {request.suggestedParticipants.length}</span>
                    </div>
                  </div>
                  
                  {request.suggestedParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {request.suggestedParticipants.map(participant => (
                        <Badge key={participant.id} variant="outline" className="bg-gray-50">
                          {participant.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
                
                {request.status === 'pending' && (
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
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
      
      <Dialog open={responseDialog} onOpenChange={setResponseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {respondingState === 'approving' ? "Approuver la demande" : "Refuser la demande"}
            </DialogTitle>
            <DialogDescription>
              {respondingState === 'approving' 
                ? "Une réunion sera créée avec les participants suggérés." 
                : "Veuillez expliquer la raison du refus."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedRequest && (
              <div className="text-sm">
                <div className="font-medium">{selectedRequest.title}</div>
                <div className="text-gray-600 mt-1">
                  Demandé par {selectedRequest.requestedByName} pour le{' '}
                  {selectedRequest.scheduledTime 
                    ? formatRequestTime(selectedRequest.scheduledTime) 
                    : formatRequestTime(selectedRequest.requestedTime)}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="response-message">Message (optionnel)</Label>
              <Textarea
                id="response-message"
                placeholder={respondingState === 'approving' 
                  ? "Informations supplémentaires pour les participants..." 
                  : "Raison du refus..."}
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleRespond}
              className={respondingState === 'approving' 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-red-600 hover:bg-red-700"}
            >
              {respondingState === 'approving' ? "Approuver" : "Refuser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 