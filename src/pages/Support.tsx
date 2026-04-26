
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LifeBuoy, 
  PlusCircle, 
  History, 
  HelpCircle, 
  MessageSquare,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useSupport } from '@/hooks/useSupport';
import { SupportTicket, TicketPriority, TicketCategory } from '@/types/support';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const FAQ_ITEMS = [
  {
    question: "Comment démarrer une visioconférence ?",
    answer: "Pour démarrer une visioconférence, rendez-vous dans l'onglet 'Visioconférence' de votre tableau de bord, puis cliquez sur 'Démarrer une réunion'. Vous pourrez ensuite inviter des participants."
  },
  {
    question: "Comment signer un document ?",
    answer: "Lorsqu'un document nécessite votre signature, vous recevrez une notification. Allez dans 'Mes Signatures', sélectionnez le document et suivez les instructions pour apposer votre signature électronique."
  },
  {
    question: "Comment ajouter un intervenant à un projet ?",
    answer: "Les administrateurs peuvent ajouter des intervenants depuis la page de détails d'un projet, sous l'onglet 'Membres'. Cliquez sur 'Ajouter un membre' et sélectionnez l'intervenant souhaité."
  },
  {
    question: "Quels formats de fichiers sont acceptés ?",
    answer: "La plateforme accepte principalement les fichiers PDF pour les documents officiels et les visas. Pour les autres documents, les formats images (JPG, PNG) et Word sont également supportés."
  }
];

const SupportPage: React.FC = () => {
  const { loading, getMyTickets, createTicket } = useSupport();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTab, setActiveTab] = useState("faq");
  
  // État du formulaire
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [category, setCategory] = useState<TicketCategory>("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    const data = await getMyTickets();
    setTickets(data);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;

    setIsSubmitting(true);
    const success = await createTicket({
      subject,
      description,
      priority,
      category
    });

    if (success) {
      setSubject("");
      setDescription("");
      setPriority("medium");
      setCategory("general");
      loadTickets();
      setActiveTab("history");
    }
    setIsSubmitting(false);
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
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl text-primary">
          <LifeBuoy className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centre de Support</h1>
          <p className="text-muted-foreground">Besoin d'aide ? Trouvez des réponses ou contactez notre équipe.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" /> FAQ
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Nouveau Ticket
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Mes Tickets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Questions Fréquentes</CardTitle>
              <CardDescription>Consultez les réponses aux problèmes les plus courants.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {FAQ_ITEMS.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left font-medium">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ouvrir un ticket</CardTitle>
              <CardDescription>Expliquez-nous votre problème et nous reviendrons vers vous dès que possible.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Catégorie</label>
                    <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Général</SelectItem>
                        <SelectItem value="technical">Problème Technique</SelectItem>
                        <SelectItem value="billing">Facturation</SelectItem>
                        <SelectItem value="feature_request">Suggestion d'amélioration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priorité</label>
                    <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Priorité" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Basse</SelectItem>
                        <SelectItem value="medium">Moyenne</SelectItem>
                        <SelectItem value="high">Haute</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sujet</label>
                  <Input 
                    placeholder="Bref résumé de votre demande" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description détaillée</label>
                  <Textarea 
                    placeholder="Décrivez votre problème en détail..." 
                    className="min-h-[150px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? "Envoi en cours..." : "Envoyer le ticket"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-12">
              <LoadingSpinner />
            </div>
          ) : tickets.length === 0 ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium">Aucun ticket pour le moment</h3>
                <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                  Si vous rencontrez un problème, n'hésitez pas à ouvrir un nouveau ticket.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => setActiveTab("new")}>
                  Ouvrir mon premier ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tickets.map((ticket) => (
                <Card key={ticket.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className={`h-1 w-full ${
                    ticket.priority === 'urgent' ? 'bg-destructive' : 
                    ticket.priority === 'high' ? 'bg-orange-400' : 'bg-primary/20'
                  }`} />
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(ticket.status)}
                        <span className="text-xs text-muted-foreground">
                          #{ticket.id.slice(0, 8)}
                        </span>
                      </div>
                      <CardTitle className="text-xl pt-2">{ticket.subject}</CardTitle>
                    </div>
                    {getPriorityBadge(ticket.priority)}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Créé le {format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0 h-4">
                          {ticket.category.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    {ticket.admin_notes && (
                      <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">Réponse du support</span>
                        </div>
                        <p className="text-sm italic">{ticket.admin_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupportPage;
