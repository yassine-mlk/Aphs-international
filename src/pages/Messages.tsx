import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone, 
  Video as VideoIcon,
  Edit, 
  MessageSquare, 
  Clock, 
  Users,
  RefreshCw,
  Plus,
  AlertCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from "@/components/ui/use-toast";
import { useSupabase } from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useMessages, User, Conversation, Message, Contact } from '../hooks/useMessages';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Constante pour l'intervalle de polling en millisecondes (30 secondes)
const POLLING_INTERVAL = 30000;

const Messages: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    getAvailableContacts, 
    getConversations, 
    getMessages, 
    sendMessage, 
    createDirectConversation,
    createGroupConversation,
    loading: messagesLoading 
  } = useMessages();
  const [activeTab, setActiveTab] = useState("tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollingTime, setLastPollingTime] = useState<Date | null>(null);
  const [newConversationDialogOpen, setNewConversationDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupContacts, setSelectedGroupContacts] = useState<string[]>([]);
  const [conversationType, setConversationType] = useState<'direct' | 'group'>('direct');
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Add error states to track specific issues
  const [contactsError, setContactsError] = useState<boolean>(false);
  const [conversationsError, setConversationsError] = useState<boolean>(false);
  const [messagesError, setMessagesError] = useState<boolean>(false);
  
  // Charger les contacts disponibles
  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);
        setContactsError(false);
        const fetchedContacts = await getAvailableContacts();
        setContacts(fetchedContacts);
        
        // Après avoir chargé les contacts, charger les conversations
        await loadConversations();
      } catch (error) {
        console.error('Erreur lors du chargement des contacts:', error);
        setContactsError(true);
        toast({
          title: "Erreur",
          description: "Impossible de charger les contacts. Cliquez sur 'Actualiser' pour réessayer.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      loadContacts();
    }
  }, [user, getAvailableContacts]);
  
  // Configuration du polling automatique
  useEffect(() => {
    if (!user) return;
    
    // Fonction pour effectuer le polling
    const pollForUpdates = async () => {
      setIsPolling(true);
      try {
        // 1. Mettre à jour la liste des conversations
        await loadConversations(false);
        
        // 2. Si une conversation est active, vérifier les nouveaux messages
        if (activeConversation) {
          await loadMessages(activeConversation.id, false);
        }
        
        setLastPollingTime(new Date());
      } catch (error) {
        console.error('Erreur lors du polling:', error);
      } finally {
        setIsPolling(false);
      }
    };
    
    // Démarrer l'intervalle de polling
    const pollingInterval = setInterval(pollForUpdates, POLLING_INTERVAL);
    
    // Nettoyer l'intervalle lors du démontage du composant
    return () => {
      clearInterval(pollingInterval);
    };
  }, [user, activeConversation]);
  
  // Fonction manuelle pour rafraîchir les données
  const handleRefresh = async () => {
    if (isPolling) return;
    
    setIsPolling(true);
    try {
      // Reset all error states
      setContactsError(false);
      setConversationsError(false);
      setMessagesError(false);
      
      // If we had a contacts error, reload contacts first
      if (contactsError) {
        const fetchedContacts = await getAvailableContacts();
        setContacts(fetchedContacts);
      }
      
      await loadConversations(true);
      
      if (activeConversation) {
        await loadMessages(activeConversation.id, true);
      }
      
      setLastPollingTime(new Date());
      
      toast({
        title: "Mise à jour",
        description: "Les messages ont été actualisés",
      });
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'actualiser les messages",
        variant: "destructive"
      });
    } finally {
      setIsPolling(false);
    }
  };
  
  // Charger les conversations
  const loadConversations = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      setConversationsError(false);
      
      // Récupérer les vraies conversations depuis Supabase
      const fetchedConversations = await getConversations();
      setConversations(fetchedConversations);
      
      // Sélectionner la première conversation par défaut seulement au premier chargement
      if (fetchedConversations.length > 0 && !activeConversation && showLoading) {
        setActiveConversation(fetchedConversations[0]);
        await loadMessages(fetchedConversations[0].id, showLoading);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error);
      setConversationsError(true);
      if (showLoading) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les conversations. Cliquez sur 'Actualiser' pour réessayer.",
          variant: "destructive"
        });
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };
  
  // Charger les messages d'une conversation
  const loadMessages = async (conversationId: string, showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      setMessagesError(false);
      
      // Récupérer les vrais messages depuis Supabase
      const fetchedMessages = await getMessages(conversationId);
      setMessages(fetchedMessages);
      
      // Défiler vers le bas automatiquement
      setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      setMessagesError(true);
      if (showLoading) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les messages. Cliquez sur 'Actualiser' pour réessayer.",
          variant: "destructive"
        });
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };
  
  // Gérer l'envoi d'un nouveau message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !activeConversation) return;
    
    try {
      // Envoyer le message à Supabase
      const sentMessage = await sendMessage(activeConversation.id, newMessage);
      
      if (sentMessage) {
        // Ajouter le message à la liste locale
        setMessages(prev => [...prev, sentMessage]);
        
        // Mettre à jour lastMessage dans la conversation active
        setConversations(prev => 
          prev.map(conv => 
            conv.id === activeConversation.id 
              ? { 
                  ...conv, 
                  lastMessage: sentMessage, 
                  updatedAt: new Date()
                } 
              : conv
          )
        );
        
        // Réinitialiser le champ de saisie
        setNewMessage("");
        
        // Défiler vers le nouveau message
        setTimeout(() => {
          if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive"
      });
    }
  };
  
  // Créer une nouvelle conversation
  const handleCreateConversation = async () => {
    try {
      let conversationId: string | null = null;
      
      if (conversationType === 'direct') {
        if (!selectedContactId) {
          toast({
            title: "Erreur",
            description: "Veuillez sélectionner un contact",
            variant: "destructive"
          });
          return;
        }
        
        conversationId = await createDirectConversation(selectedContactId);
      } else {
        if (!newGroupName || selectedGroupContacts.length === 0) {
          toast({
            title: "Erreur",
            description: "Veuillez remplir tous les champs",
            variant: "destructive"
          });
          return;
        }
        
        conversationId = await createGroupConversation(newGroupName, selectedGroupContacts);
      }
      
      if (conversationId) {
        toast({
          title: "Succès",
          description: `Conversation ${conversationType === 'direct' ? 'directe' : 'de groupe'} créée avec succès`,
        });
        
        // Fermer le dialogue
        setNewConversationDialogOpen(false);
        
        // Réinitialiser les champs
        setSelectedContactId("");
        setNewGroupName("");
        setSelectedGroupContacts([]);
        
        // Actualiser les conversations et sélectionner la nouvelle
        await loadConversations();
        
        // Trouver et activer la nouvelle conversation
        const newConversations = await getConversations();
        const newConversation = newConversations.find(c => c.id === conversationId);
        
        if (newConversation) {
          setActiveConversation(newConversation);
          await loadMessages(newConversation.id);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la conversation",
        variant: "destructive"
      });
    }
  };
  
  // Formatage du nom d'utilisateur
  const formatUserName = (user: User) => {
    if (!user || !user.id) {
      return "Utilisateur supprimé";
    }
    
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else if (user.last_name) {
      return user.last_name;
    } else if (user.name) {
      return user.name;
    } else if (user.email) {
      // Au lieu d'afficher l'email complet, afficher seulement la partie avant @
      return user.email.split('@')[0];
    } else {
      return "Utilisateur supprimé";
    }
  };

  // Formatage du nom de contact (priorité au nom complet)
  const formatContactName = (contact: Contact) => {
    if (!contact || !contact.id) {
      return "Contact supprimé";
    }
    
    if (contact.first_name && contact.last_name) {
      return `${contact.first_name} ${contact.last_name}`;
    } else if (contact.first_name) {
      return contact.first_name;
    } else if (contact.last_name) {
      return contact.last_name;
    } else {
      // En dernier recours, utiliser l'email mais avec un formatage plus propre
      return contact.email.split('@')[0]; // Affiche la partie avant @ de l'email
    }
  };

  // Obtenir les initiales d'un utilisateur ou contact pour l'avatar
  const getInitials = (person: User | Contact) => {
    if (!person) return "?";
    
    // Essayer d'utiliser first_name et last_name
    if ('first_name' in person && person.first_name && 'last_name' in person && person.last_name) {
      return `${person.first_name[0]}${person.last_name[0]}`.toUpperCase();
    }
    
    // Essayer d'utiliser first_name seulement
    if ('first_name' in person && person.first_name) {
      return person.first_name[0].toUpperCase();
    }
    
    // Essayer d'utiliser last_name seulement
    if ('last_name' in person && person.last_name) {
      return person.last_name[0].toUpperCase();
    }
    
    // Essayer d'utiliser name (pour User)
    if ('name' in person && person.name) {
      const names = person.name.split(' ');
      return names.length > 1 
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    
    // En dernier recours, utiliser l'email
    if (person.email) {
      return person.email[0].toUpperCase();
    }
    
    return "?";
  };
  
  // Changer de conversation active
  const changeActiveConversation = async (conversation: Conversation) => {
    setActiveConversation(conversation);
    await loadMessages(conversation.id);
    
    // Marquer comme lu (la fonction loadMessages s'en charge déjà via Supabase)
    // Mais mettons quand même à jour l'état local
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversation.id 
          ? { ...conv, unreadCount: 0 } 
          : conv
      )
    );
  };
  
  // Gérer le changement de type de conversation
  const handleConversationTypeChange = (type: 'direct' | 'group') => {
    setConversationType(type);
    setSelectedContactId("");
    setSelectedGroupContacts([]);
    setNewGroupName("");
  };
  
  // Gérer la sélection/déselection d'un contact pour un groupe
  const toggleGroupContact = (contactId: string) => {
    if (selectedGroupContacts.includes(contactId)) {
      setSelectedGroupContacts(prev => prev.filter(id => id !== contactId));
    } else {
      setSelectedGroupContacts(prev => [...prev, contactId]);
    }
  };
  
  // Filtrer les conversations selon le type et la recherche
  const filteredConversations = conversations.filter(conv => {
    const matchesTab = activeTab === "tous" || 
                     (activeTab === "directs" && conv.type === 'direct') ||
                     (activeTab === "groupes" && conv.type === 'group');
    
    // Améliorer la recherche pour inclure first_name, last_name et email
    const matchesSearch = conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         conv.participants.some(p => {
                           const fullName = formatUserName(p).toLowerCase();
                           const firstName = p.first_name?.toLowerCase() || '';
                           const lastName = p.last_name?.toLowerCase() || '';
                           const email = p.email?.toLowerCase() || '';
                           
                           return fullName.includes(searchQuery.toLowerCase()) ||
                                  firstName.includes(searchQuery.toLowerCase()) ||
                                  lastName.includes(searchQuery.toLowerCase()) ||
                                  email.includes(searchQuery.toLowerCase());
                         });
    
    return matchesTab && matchesSearch;
  });
  
  // Formatage de l'heure pour l'affichage
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Hier';
    } else if (diffInDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  // Render error states with retry buttons
  const renderErrorState = () => {
    if (contactsError || conversationsError) {
      return (
        <div className="h-full flex-1 flex flex-col items-center justify-center p-4">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur de connexion</AlertTitle>
            <AlertDescription>
              {contactsError 
                ? "Impossible de charger vos contacts." 
                : "Impossible de charger vos conversations."}
              <br />
              Vérifiez votre connexion Internet et réessayez.
            </AlertDescription>
          </Alert>
          <Button 
            variant="default" 
            onClick={handleRefresh}
            disabled={isPolling}
            className="mt-4"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isPolling ? 'animate-spin' : ''}`} />
            Réessayer
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Communiquez avec vos collègues et groupes de travail
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {lastPollingTime && (
            <span className="text-xs text-gray-500">
              Dernière mise à jour: {formatTimestamp(lastPollingTime)}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isPolling || messagesLoading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isPolling ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="flex h-full overflow-hidden border rounded-lg shadow-md">
        {/* Partie gauche: Liste des conversations */}
        <div className="w-1/3 border-r flex flex-col bg-white">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Rechercher..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <Tabs defaultValue="tous" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start bg-gray-100 p-0 h-auto">
              <TabsTrigger value="tous" className="flex-1 py-2 data-[state=active]:bg-white">
                Tous
              </TabsTrigger>
              <TabsTrigger value="directs" className="flex-1 py-2 data-[state=active]:bg-white">
                Directs
              </TabsTrigger>
              <TabsTrigger value="groupes" className="flex-1 py-2 data-[state=active]:bg-white">
                Groupes
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <ScrollArea className="flex-1">
            {loading || messagesLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="w-10 h-10 border-4 border-t-teal-500 border-r-transparent border-b-teal-500 border-l-transparent rounded-full animate-spin"></div>
              </div>
            ) : contactsError || conversationsError ? (
              renderErrorState()
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-full p-4 text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-500">Aucune conversation trouvée</p>
                {searchQuery && (
                  <p className="text-sm text-gray-400 mt-1">
                    Essayez avec une autre recherche
                  </p>
                )}
                {!searchQuery && (
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={() => setNewConversationDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle conversation
                  </Button>
                )}
              </div>
            ) : (
              filteredConversations.map(conv => (
                <div 
                  key={conv.id} 
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${activeConversation?.id === conv.id ? 'bg-gray-100' : ''}`}
                  onClick={() => changeActiveConversation(conv)}
                >
                  <div className="flex gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conv.type === 'direct' && conv.participants.length > 0 ? conv.participants[0].avatar : ''} />
                        <AvatarFallback className={`
                          ${conv.type === 'group' ? 'bg-aphs-navy' : 'bg-aphs-teal'}
                          text-white
                        `}>
                          {conv.type === 'direct' && conv.participants.length > 0
                            ? getInitials(conv.participants[0])
                            : <Users className="h-5 w-5" />
                          }
                        </AvatarFallback>
                      </Avatar>
                      {conv.type === 'direct' && conv.participants.length > 0 && conv.participants[0].status && (
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white
                          ${conv.participants[0].status === 'online' ? 'bg-green-500' : 
                           conv.participants[0].status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'}
                        `}></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-medium truncate">
                          {conv.type === 'direct' && conv.participants.length > 0
                            ? formatUserName(conv.participants[0])
                            : conv.name
                          }
                        </h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {conv.lastMessage ? formatTimestamp(conv.lastMessage.timestamp) : ''}
                        </span>
                      </div>
                      
                      {conv.type === 'group' && (
                        <div className="text-xs text-gray-500 flex space-x-1 mt-0.5 mb-1">
                          <span>{conv.participants.length} membres</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-sm text-gray-600 truncate">
                          {conv.lastMessage ? (
                            conv.type === 'group' && conv.lastMessage.senderId !== user?.id ? (
                              <span>
                                <span className="font-medium">
                                  {conv.lastMessage.content.includes("[Message d'un utilisateur supprimé]") 
                                    ? "Utilisateur supprimé" 
                                    : formatUserName({
                                      ...conv.participants.find(p => p.id === conv.lastMessage?.senderId) || 
                                      { id: '', email: '', role: '' }
                                    }).split(' ')[0]}:
                                </span>
                                {' '}{conv.lastMessage.content}
                              </span>
                            ) : (
                              conv.lastMessage.content
                            )
                          ) : (
                            <span className="italic text-gray-400">Pas de messages</span>
                          )}
                        </p>
                        
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="bg-aphs-teal ml-2">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
          
          <div className="p-3 border-t bg-gray-50">
            <Button 
              className="w-full bg-aphs-teal hover:bg-aphs-navy"
              onClick={() => setNewConversationDialogOpen(true)}
            >
              <Edit className="mr-2 h-4 w-4" /> Nouveau message
            </Button>
          </div>
        </div>
        
        {/* Partie droite: Conversation active */}
        <div className="w-2/3 flex flex-col bg-gray-50">
          {activeConversation ? (
            <>
              {/* En-tête de la conversation */}
              <div className="p-4 border-b bg-white flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={activeConversation.type === 'direct' && activeConversation.participants.length > 0 ? activeConversation.participants[0].avatar : ''} />
                    <AvatarFallback className={`
                      ${activeConversation.type === 'group' ? 'bg-aphs-navy' : 'bg-aphs-teal'}
                      text-white
                    `}>
                      {activeConversation.type === 'direct' && activeConversation.participants.length > 0
                        ? getInitials(activeConversation.participants[0])
                        : <Users className="h-5 w-5" />
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">
                      {activeConversation.type === 'direct' && activeConversation.participants.length > 0
                        ? formatUserName(activeConversation.participants[0])
                        : activeConversation.name
                      }
                    </h2>
                    <p className="text-xs text-gray-500">
                      {activeConversation.type === 'direct' && activeConversation.participants.length > 0 ? (
                        activeConversation.participants[0].status === 'online' ? 'En ligne' : 
                        activeConversation.participants[0].status === 'away' ? 'Absent' : 'Hors ligne'
                      ) : (
                        `${activeConversation.participants.length} membres`
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-500"
                    onClick={() => loadMessages(activeConversation.id, true)}
                    disabled={messagesLoading}
                    title="Actualiser les messages"
                  >
                    <RefreshCw className={`h-4 w-4 ${messagesLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-500">
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-500">
                    <VideoIcon className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-gray-500">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              
              {/* Corps de la conversation (messages) */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col justify-center items-center h-full p-4 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-gray-500">Aucun message</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Envoyez votre premier message pour démarrer la conversation
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.senderId === user?.id;
                    const showSender = index === 0 || messages[index - 1].senderId !== msg.senderId;
                    const isDeletedUserMessage = msg.content.includes("[Message d'un utilisateur supprimé]");
                    
                    return (
                      <div 
                        key={msg.id} 
                        className={`mb-4 flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && showSender && activeConversation.participants.length > 0 && (
                          <Avatar className="h-8 w-8 mr-2 mt-1">
                            <AvatarFallback className={`text-white text-xs ${isDeletedUserMessage ? 'bg-gray-400' : 'bg-aphs-teal'}`}>
                              {isDeletedUserMessage ? "?" : (
                                msg.sender 
                                ? getInitials(msg.sender)
                                : (activeConversation.type === 'direct'
                                  ? getInitials(activeConversation.participants[0])
                                  : getInitials(activeConversation.participants.find(p => p.id === msg.senderId) || 
                                    { id: '', email: '', role: '' })
                                )
                              )}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={`max-w-[70%] ${!isMe && !showSender ? 'ml-10' : ''}`}>
                          {!isMe && showSender && (
                            <div className="mb-1 text-xs text-gray-500">
                              {isDeletedUserMessage ? "Utilisateur supprimé" : (
                                msg.sender 
                                ? formatUserName(msg.sender)
                                : (activeConversation.type === 'direct' && activeConversation.participants.length > 0
                                  ? formatUserName(activeConversation.participants[0])
                                  : formatUserName(activeConversation.participants.find(p => p.id === msg.senderId) || 
                                    { id: '', email: '', role: '' })
                                )
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-end">
                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                isMe 
                                  ? 'bg-aphs-teal text-white rounded-tr-none' 
                                  : isDeletedUserMessage
                                    ? 'bg-gray-100 text-gray-500 italic rounded-tl-none shadow-sm'
                                    : 'bg-white text-gray-800 rounded-tl-none shadow-sm'
                              }`}
                            >
                              <p>{msg.content}</p>
                            </div>
                            
                            <div className="text-xs text-gray-500 mx-2">
                              {formatTimestamp(msg.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {(isPolling || messagesLoading) && (
                  <div className="text-center py-2">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Actualisation...
                    </span>
                  </div>
                )}
                <div ref={messageEndRef}></div>
              </ScrollArea>
              
              {/* Pied de page (input) */}
              <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" className="text-gray-500">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="Écrivez votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="icon" className="text-gray-500">
                  <Smile className="h-5 w-5" />
                </Button>
                <Button type="submit" disabled={newMessage.trim() === "" || messagesLoading}>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </Button>
              </form>
            </>
          ) : (
            // État vide (aucune conversation sélectionnée)
            <div className="flex flex-col justify-center items-center h-full p-6 text-center">
              <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">Aucune conversation sélectionnée</h3>
              <p className="text-gray-500 max-w-md">
                Sélectionnez une conversation existante ou commencez une nouvelle discussion
              </p>
              <Button 
                className="mt-4" 
                variant="outline"
                onClick={() => setNewConversationDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle conversation
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Dialogue pour créer une nouvelle conversation */}
      <Dialog open={newConversationDialogOpen} onOpenChange={setNewConversationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
            <DialogDescription>
              Créez une nouvelle conversation directe ou un groupe
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex gap-4 mb-2">
              <Button 
                variant={conversationType === 'direct' ? 'default' : 'outline'} 
                type="button" 
                className="flex-1"
                onClick={() => handleConversationTypeChange('direct')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Direct
              </Button>
              <Button 
                variant={conversationType === 'group' ? 'default' : 'outline'} 
                type="button" 
                className="flex-1"
                onClick={() => handleConversationTypeChange('group')}
              >
                <Users className="h-4 w-4 mr-2" />
                Groupe
              </Button>
            </div>
            
            {conversationType === 'direct' ? (
              <div className="grid gap-2">
                <label htmlFor="contact" className="text-sm font-medium">
                  Sélectionnez un contact
                </label>
                <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                  <SelectTrigger id="contact">
                    <SelectValue placeholder="Sélectionnez un contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {formatContactName(contact)}
                        {contact.role === 'admin' && ' (Admin)'}
                        {contact.specialty && (
                          <span className="text-xs text-gray-500 ml-1">
                            • {contact.specialty}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <label htmlFor="group-name" className="text-sm font-medium">
                  Nom du groupe
                </label>
                <Input
                  id="group-name"
                  placeholder="Entrez un nom pour le groupe"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                
                <label className="text-sm font-medium mt-2">
                  Sélectionnez les membres
                </label>
                <div className="h-40 overflow-y-auto border rounded-md p-2">
                  {contacts.map(contact => (
                    <div 
                      key={contact.id} 
                      className="flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={() => toggleGroupContact(contact.id)}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedGroupContacts.includes(contact.id)}
                        onChange={() => {}}
                        className="mr-2"
                      />
                      <span>
                        {formatContactName(contact)}
                        {contact.role === 'admin' && ' (Admin)'}
                        {contact.specialty && (
                          <span className="text-xs text-gray-500 ml-1">
                            • {contact.specialty}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedGroupContacts.length} contacts sélectionnés
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="sm:justify-start">
            <Button 
              type="button" 
              variant="default" 
              onClick={handleCreateConversation}
              disabled={
                conversationType === 'direct' ? !selectedContactId : 
                !newGroupName || selectedGroupContacts.length === 0
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer la conversation
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setNewConversationDialogOpen(false)}
            >
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Messages;
