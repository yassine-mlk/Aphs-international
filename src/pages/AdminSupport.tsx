
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { 
  LifeBuoy, 
  Search,
  MessageSquare,
  Clock,
  User as UserIcon,
  CheckCircle2,
  Filter,
  ArrowRight
} from 'lucide-react';
import { useSupport } from '@/hooks/useSupport';
import { useAuth } from '@/contexts/AuthContext';
import { SupportTicket, TicketStatus } from '@/types/support';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';

const AdminSupport: React.FC = () => {
  const { status } = useAuth();
  const { loading, getAllTickets, updateTicketStatus } = useSupport();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // État pour la réponse
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState<TicketStatus>("open");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      loadAllTickets();
    }
  }, [status]);

  useEffect(() => {
    let result = tickets;
    
    if (statusFilter !== "all") {
      result = result.filter(t => t.status === statusFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.subject.toLowerCase().includes(query) || 
        t.description.toLowerCase().includes(query) ||
        t.user?.email.toLowerCase().includes(query) ||
        t.user?.first_name.toLowerCase().includes(query) ||
        t.user?.last_name.toLowerCase().includes(query)
      );
    }
    
    setFilteredTickets(result);
  }, [tickets, searchQuery, statusFilter]);

  const loadAllTickets = async () => {
    const data = await getAllTickets();
    setTickets(data);
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    
    setIsUpdating(true);
    const success = await updateTicketStatus(selectedTicket.id, newStatus, adminNotes);
    
    if (success) {
      setSelectedTicket(null);
      setAdminNotes("");
      loadAllTickets();
    }
    setIsUpdating(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Ouvert</Badge>;
      case 'in_progress': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">En cours</Badge>;
      case 'resolved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Résolu</Badge>;
      case 'closed': return <Badge variant="secondary">Fermé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low': return <Badge variant="outline" className="text-gray-500">Basse</Badge>;
      case 'medium': return <Badge variant="outline" className="text-blue-500">Moyenne</Badge>;
      case 'high': return <Badge variant="outline" className="text-orange-500 border-orange-200">Haute</Badge>;
      case 'urgent': return <Badge variant="destructive">Urgent</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <LifeBuoy className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestion du Support</h1>
            <p className="text-muted-foreground">Gérez les demandes d'assistance des utilisateurs.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Liste des tickets */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un ticket, un email..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="open">Ouvert</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="resolved">Résolu</SelectItem>
                  <SelectItem value="closed">Fermé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <LoadingSpinner />
            </div>
          ) : filteredTickets.length === 0 ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium">Aucun ticket trouvé</h3>
                <p className="text-muted-foreground mt-2">
                  Ajustez vos filtres ou votre recherche.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <Card 
                  key={ticket.id} 
                  className={`cursor-pointer transition-all hover:border-primary/50 ${selectedTicket?.id === ticket.id ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : ''}`}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setAdminNotes(ticket.admin_notes || "");
                    setNewStatus(ticket.status);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(ticket.status)}
                        <span className="text-xs font-mono text-muted-foreground">#{ticket.id.slice(0, 8)}</span>
                      </div>
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <h3 className="font-bold text-lg mb-1">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                      {ticket.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        <UserIcon className="h-3 w-3" />
                        {ticket.user?.first_name} {ticket.user?.last_name}
                      </div>
                      <div className="text-muted-foreground">
                        {ticket.user?.email}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                        <Clock className="h-3 w-3" />
                        {format(new Date(ticket.created_at), 'dd MMM HH:mm', { locale: fr })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Détails et Action */}
        <div className="space-y-4">
          {selectedTicket ? (
            <Card className="sticky top-6 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Détails du ticket</CardTitle>
                <CardDescription>Répondre et mettre à jour le statut.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                    <p className="font-bold mb-1">Description de l'utilisateur :</p>
                    {selectedTicket.description}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Nouveau Statut</label>
                    <Select value={newStatus} onValueChange={(v: any) => setNewStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Ouvert</SelectItem>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="resolved">Résolu</SelectItem>
                        <SelectItem value="closed">Fermé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Réponse / Notes Admin</label>
                    <Textarea 
                      placeholder="Saisissez votre réponse ici..." 
                      className="min-h-[150px]"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                      L'utilisateur pourra voir ces notes comme réponse officielle.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button 
                    className="w-full" 
                    onClick={handleUpdateTicket}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Mise à jour..." : "Mettre à jour le ticket"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setSelectedTicket(null)}
                  >
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                <p className="text-sm text-muted-foreground">
                  Sélectionnez un ticket pour voir les détails et y répondre.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;
