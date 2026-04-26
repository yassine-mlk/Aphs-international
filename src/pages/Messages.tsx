import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  MoreVertical, 
  MessageSquare, 
  Users,
  RefreshCw,
  Plus,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Messages: React.FC = () => {
  const { toast } = useToast();
  const { user, role, status } = useAuth();
    const { supabase } = useSupabase();
    const { 
    getAvailableContacts, 
    getConversations, 
    getMessages, 
    sendMessage, 
    deleteConversation,
    loading: messagesLoading 
  } = useMessages();
  // Variables de recherche et onglets supprimées pour simplifier l'interface
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Add error states to track specific issues
  const [contactsError, setContactsError] = useState<boolean>(false);
  const [conversationsError, setConversationsError] = useState<boolean>(false);
  const [messagesError, setMessagesError] = useState<boolean>(false);
  
  // États pour la suppression de conversation (admin uniquement)
  const [deleteConversationDialogOpen, setDeleteConversationDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  
  // État pour les détails du groupe
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  
  // Vérifier si l'utilisateur est admin
  const isAdmin = role === 'admin' || user?.email === 'admin@aps.com';

  // Charger les messages d'une conversation
  const loadMessages = useCallback(async (conversationId: string, showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setMessagesError(false);

      const fetchedMessages = await getMessages(conversationId, !showLoading);
      setMessages(fetchedMessages);

      setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      setMessagesError(true);
      if (showLoading) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les messages.",
          variant: "destructive"
        });
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [getMessages, toast]);

  // Charger les conversations
  const loadConversations = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setConversationsError(false);

      const fetchedConversations = await getConversations(!showLoading);
      setConversations(fetchedConversations);

      if (fetchedConversations.length > 0 && !activeConversationRef.current && showLoading) {
        setActiveConversation(fetchedConversations[0]);
        await loadMessages(fetchedConversations[0].id, showLoading);
      }
    } catch (error) {
      setConversationsError(true);
      if (showLoading) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les conversations.",
          variant: "destructive"
        });
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [getConversations, loadMessages, toast]);

  // Charger les contacts disponibles (déclaré après loadConversations)
  const loadContacts = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      setContactsError(false);
      const fetchedContacts = await getAvailableContacts(silent);
      setContacts(fetchedContacts);
      await loadConversations(!silent);
    } catch (error) {
      setContactsError(true);
      if (!silent) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les contacts.",
          variant: "destructive"
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [getAvailableContacts, loadConversations]);

  useEffect(() => {
    if (status === 'authenticated' && user?.id) {
      loadContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, status]);

  // Stabilisation des callbacks et state pour realtime sans re-subscription
  const loadConversationsRef = useRef(loadConversations);
  const loadMessagesRef = useRef(loadMessages);
  const activeConversationRef = useRef(activeConversation);
  const conversationsRef = useRef(conversations);

  useEffect(() => {
    loadConversationsRef.current = loadConversations;
    loadMessagesRef.current = loadMessages;
    activeConversationRef.current = activeConversation;
    conversationsRef.current = conversations;
  }, [loadConversations, loadMessages, activeConversation, conversations]);

  // Debounced reload for realtime updates
  const messagesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSilentReload = useCallback(() => {
    if (status !== 'authenticated') return;
    if (messagesTimerRef.current) clearTimeout(messagesTimerRef.current);
    messagesTimerRef.current = setTimeout(() => {
      loadConversationsRef.current(false);
      if (activeConversationRef.current) {
        loadMessagesRef.current(activeConversationRef.current.id, false);
      }
    }, 600);
  }, [status]);

  // Realtime subscription for messages and conversations
  useEffect(() => {
    if (status !== 'authenticated' || !user?.id) return;

    const channel = supabase
      .channel(`messages-all-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msgConvId = payload.new?.conversation_id;
        const relevant = conversationsRef.current.some(c => c.id === msgConvId);
        if (relevant) {
          scheduleSilentReload();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        scheduleSilentReload();
      })
      .subscribe();

    return () => {
      if (messagesTimerRef.current) clearTimeout(messagesTimerRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, status]);

  // Polling de secours très espacé (5 minutes) en cas de défaillance realtime
  useEffect(() => {
    if (status !== 'authenticated' || !user?.id) return;

    const pollForUpdates = async () => {
      if (status !== 'authenticated') return;
      try {
        await loadConversationsRef.current(false);
        if (activeConversationRef.current) {
          await loadMessagesRef.current(activeConversationRef.current.id, false);
        }
      } catch (error) {
        // Silently ignore polling errors
      }
    };

    const pollingInterval = setInterval(pollForUpdates, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(pollingInterval);
    };
  }, [user?.id, status]);

  // Fonction manuelle pour rafraîchir les données (erreur uniquement)
  const handleRefresh = async () => {
    if (isPolling) return;

    setIsPolling(true);
    try {
      setContactsError(false);
      setConversationsError(false);
      setMessagesError(false);

      if (contactsError) {
        const fetchedContacts = await getAvailableContacts();
        setContacts(fetchedContacts);
      }

      await loadConversations(true);

      if (activeConversation) {
        await loadMessages(activeConversation.id, true);
      }

      toast({
        title: "Mise à jour",
        description: "Les messages ont été actualisés",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'actualiser les messages",
        variant: "destructive"
      });
    } finally {
      setIsPolling(false);
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
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
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
  const getInitials = (person: User | Contact | undefined) => {
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
  const changeActiveConversation = useCallback(async (conversation: Conversation) => {
    setActiveConversation(conversation);
    setShowGroupDetails(false); // Reset group details view when switching
    await loadMessages(conversation.id);
    
    // Marquer comme lu
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversation.id 
          ? { ...conv, unreadCount: 0 } 
          : conv
      )
    );
  }, [loadMessages]);
  
  // Toutes les conversations sont affichées (pas de filtrage)
  const filteredConversations = conversations;

  // Fonction pour ouvrir la modal de suppression
  const handleDeleteConversation = (conversation: Conversation) => {
    setConversationToDelete(conversation);
    setDeleteConversationDialogOpen(true);
  };

  // Fonction pour confirmer la suppression
  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    const success = await deleteConversation(conversationToDelete.id);
    
    if (success) {
      // Supprimer la conversation de la liste locale
      setConversations(prev => prev.filter(conv => conv.id !== conversationToDelete.id));
      
      // Si c'est la conversation active, la désélectionner
      if (activeConversation?.id === conversationToDelete.id) {
        setActiveConversation(null);
        setMessages([]);
      }
      
      // Recharger les conversations
      await loadConversations(false);
    }
    
    setDeleteConversationDialogOpen(false);
    setConversationToDelete(null);
  };
  
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
            onClick={() => loadContacts()}
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
    <div className="h-[calc(100vh-160px)] w-full max-w-full flex flex-col overflow-hidden">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Communiquez avec vos collègues
          </p>
        </div>
        
      </div>

      <div className="flex h-full w-full max-w-full overflow-hidden border rounded-lg shadow-md">
        {/* Partie gauche: Liste des conversations */}
        <div className="w-1/3 border-r flex flex-col bg-white min-w-0 max-w-xs overflow-hidden">
          
          <ScrollArea className="flex-1 w-full overflow-hidden">
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
                {/* Suppression du bouton "Nouvelle conversation" - seules les conversations de groupes de travail sont autorisées */}
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
                      <Avatar className="h-12 w-12 border border-gray-100 shadow-sm">
                        <AvatarImage src={conv.type === 'direct' && conv.participants.length > 0 ? conv.participants[0].avatar_url : ''} />
                        <AvatarFallback className={`
                          ${conv.type === 'group' || conv.type === 'workgroup' ? 'bg-aps-navy' : 'bg-aps-teal'}
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
                        <h3 className={`font-medium truncate flex-1 min-w-0 max-w-full ${conv.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                          {conv.type === 'direct' && conv.participants.length > 0
                            ? formatUserName(conv.participants[0])
                            : conv.name
                          }
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {conv.lastMessage ? formatTimestamp(conv.lastMessage.timestamp) : ''}
                          </span>
                          {/* Bouton de suppression pour les admins (sauf conversations workgroup) */}
                          {isAdmin && conv.type !== 'workgroup' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conv);
                              }}
                              title="Supprimer la conversation"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {conv.type === 'group' && (
                        <div className="text-xs text-gray-500 flex space-x-1 mt-0.5 mb-1">
                          <span>{conv.participants.length} membres</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mt-1">
                        <p className={`text-sm truncate flex-1 min-w-0 max-w-full ${conv.unreadCount > 0 ? 'text-aps-teal font-medium' : 'text-gray-500'}`}>
                          {conv.lastMessage ? (
                            conv.type === 'group' && conv.lastMessage.senderId !== user?.id ? (
                              <span className="truncate block max-w-full">
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
                              <span className="truncate block max-w-full">{conv.lastMessage.content}</span>
                            )
                          ) : (
                            <span className="italic text-gray-400">Pas de messages</span>
                          )}
                        </p>
                        
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="bg-aps-teal ml-2">
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
        </div>
        
        {/* Partie droite: Conversation active */}
        <div className="w-2/3 flex flex-col bg-gray-50 min-w-0 flex-1 overflow-hidden">
          {activeConversation ? (
            <>
              {/* En-tête de la conversation */}
              <div className="p-4 border-b bg-white flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10 border-2 border-gray-100">
                    <AvatarImage src={activeConversation.type === 'direct' && activeConversation.participants.length > 0 ? activeConversation.participants[0].avatar_url : ''} />
                    <AvatarFallback className={`
                      ${activeConversation.type === 'group' || activeConversation.type === 'workgroup' ? 'bg-aps-navy' : 'bg-aps-teal'}
                      text-white
                    `}>
                      {activeConversation.type === 'direct' && activeConversation.participants.length > 0
                        ? getInitials(activeConversation.participants[0])
                        : <Users className="h-5 w-5" />
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div className="cursor-pointer" onClick={() => (activeConversation.type === 'group' || activeConversation.type === 'workgroup') && setShowGroupDetails(!showGroupDetails)}>
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                      {activeConversation.type === 'direct' && activeConversation.participants.length > 0
                        ? formatUserName(activeConversation.participants[0])
                        : activeConversation.name
                      }
                      {(activeConversation.type === 'group' || activeConversation.type === 'workgroup') && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 bg-gray-50">Groupe</Badge>
                      )}
                    </h2>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      {activeConversation.type === 'direct' && activeConversation.participants.length > 0 ? (
                        <>
                          <span className={`w-2 h-2 rounded-full ${activeConversation.participants[0].status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          {activeConversation.participants[0].status === 'online' ? 'En ligne' : 'Hors ligne'}
                        </>
                      ) : (
                        <>
                          <Users className="h-3 w-3" />
                          {activeConversation.participants.length + 1} membres
                        </>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  {(activeConversation.type === 'group' || activeConversation.type === 'workgroup') && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-9 w-9 p-0 ${showGroupDetails ? 'bg-gray-100 text-aps-teal' : ''}`}
                      onClick={() => setShowGroupDetails(!showGroupDetails)}
                      title="Détails du groupe"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 flex overflow-hidden relative">
                {/* Corps de la conversation (messages) */}
                <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${showGroupDetails ? 'mr-0 lg:mr-4' : ''}`}>
                  <ScrollArea className="flex-1 p-4 w-full">
                    {messages.length === 0 ? (
                      <div className="flex flex-col justify-center items-center h-full p-4 text-center">
                        <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                          <MessageSquare className="h-12 w-12 text-gray-300" />
                        </div>
                        <p className="text-gray-600 font-medium">Aucun message</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Envoyez votre premier message pour démarrer la conversation
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg, index) => {
                          const isMe = msg.senderId === user?.id;
                          const showSender = index === 0 || messages[index - 1].senderId !== msg.senderId;
                          const isDeletedUserMessage = msg.content.includes("[Message d'un utilisateur supprimé]");
                          
                          return (
                            <div 
                              key={msg.id} 
                              className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${showSender ? 'mt-4' : 'mt-1'}`}
                            >
                              {!isMe && showSender && (
                                <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                                  <AvatarImage src={
                                    msg.sender 
                                    ? msg.sender.avatar_url 
                                    : (activeConversation.type === 'direct'
                                      ? activeConversation.participants[0].avatar_url
                                      : activeConversation.participants.find(p => p.id === msg.senderId)?.avatar_url)
                                  } />
                                  <AvatarFallback className={`text-white text-xs ${isDeletedUserMessage ? 'bg-gray-400' : 'bg-aps-teal'}`}>
                                    {isDeletedUserMessage ? "?" : (
                                      msg.sender 
                                      ? getInitials(msg.sender)
                                      : (activeConversation.type === 'direct' && activeConversation.participants.length > 0
                                        ? getInitials(activeConversation.participants[0])
                                        : getInitials(activeConversation.participants.find(p => p.id === msg.senderId) || 
                                          { id: '', email: '', role: '' })
                                      )
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              
                              <div className={`max-w-[75%] min-w-0 ${!isMe && !showSender ? 'ml-10' : ''}`}>
                                {!isMe && showSender && (
                                  <div className="mb-1 ml-1 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
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
                                
                                <div className={`group relative flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                  <div
                                    className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm break-words ${
                                      isMe 
                                        ? 'bg-aps-teal text-white rounded-tr-none' 
                                        : isDeletedUserMessage
                                          ? 'bg-gray-200 text-gray-500 italic rounded-tl-none'
                                          : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                  </div>
                                  
                                  <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1">
                                    {formatTimestamp(msg.timestamp)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div ref={messageEndRef} className="h-4"></div>
                  </ScrollArea>

                  {/* Pied de page (input) */}
                  <div className="p-4 border-t bg-white">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-full border border-gray-200 focus-within:border-aps-teal focus-within:ring-1 focus-within:ring-aps-teal transition-all">
                      <Input
                        placeholder="Votre message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10 px-4"
                      />
                      <Button 
                        type="submit" 
                        disabled={newMessage.trim() === "" || messagesLoading}
                        className="rounded-full h-10 w-10 p-0 bg-aps-teal hover:bg-aps-teal/90 flex-shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </div>

                {/* Panneau latéral des détails du groupe */}
                {showGroupDetails && (activeConversation.type === 'group' || activeConversation.type === 'workgroup') && (
                  <div className="w-80 border-l bg-white flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">Détails du groupe</h3>
                      <Button variant="ghost" size="sm" onClick={() => setShowGroupDetails(false)} className="h-8 w-8 p-0">
                        <Plus className="h-4 w-4 rotate-45" />
                      </Button>
                    </div>
                    
                    <ScrollArea className="flex-1">
                      <div className="p-6 flex flex-col items-center text-center border-b">
                        <Avatar className="h-20 w-20 mb-3 border-4 border-gray-50">
                          <AvatarFallback className="bg-aps-navy text-white text-2xl">
                            <Users className="h-10 w-10" />
                          </AvatarFallback>
                        </Avatar>
                        <h4 className="font-bold text-lg text-gray-900">{activeConversation.name}</h4>
                        <Badge variant="secondary" className="mt-1 bg-aps-navy/10 text-aps-navy border-none">
                          {activeConversation.type === 'workgroup' ? 'Groupe de travail' : 'Groupe'}
                        </Badge>
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Membres ({activeConversation.participants.length + 1})</h5>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Moi-même */}
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-gray-100">
                              <AvatarImage src={user?.user_metadata?.avatar_url} />
                              <AvatarFallback className="bg-aps-teal text-white text-xs">Moi</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-medium text-gray-900 truncate">Vous</p>
                              <p className="text-xs text-gray-500 capitalize">{role || 'Utilisateur'}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-gray-50">Admin</Badge>
                          </div>

                          {/* Les autres participants */}
                          {activeConversation.participants.map((participant) => (
                            <div key={participant.id} className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-gray-100">
                                <AvatarImage src={participant.avatar_url} />
                                <AvatarFallback className="bg-aps-teal text-white text-xs">
                                  {getInitials(participant)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {formatUserName(participant)}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">{participant.role}</p>
                              </div>
                              {participant.status === 'online' && (
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                    </ScrollArea>
                  </div>
                )}
              </div>
            </>
          ) : (
            // État vide (aucune conversation sélectionnée)
            <div className="flex flex-col justify-center items-center h-full p-6 text-center">
              <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">Aucune conversation sélectionnée</h3>
              <p className="text-gray-500 max-w-md">
                Sélectionnez une conversation existante
              </p>
              {/* Suppression du bouton "Nouvelle conversation" - seules les conversations de groupes de travail sont autorisées */}
            </div>
          )}
        </div>
      </div>
      
      {/* Dialogue de confirmation pour supprimer une conversation */}
      <Dialog open={deleteConversationDialogOpen} onOpenChange={setDeleteConversationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          
          {conversationToDelete && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={`
                    ${conversationToDelete.type === 'group' ? 'bg-aps-navy' : 'bg-aps-teal'}
                    text-white
                  `}>
                    {conversationToDelete.type === 'direct' && conversationToDelete.participants.length > 0
                      ? getInitials(conversationToDelete.participants[0])
                      : <Users className="h-5 w-5" />
                    }
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">
                    {conversationToDelete.type === 'direct' && conversationToDelete.participants.length > 0
                      ? formatUserName(conversationToDelete.participants[0])
                      : conversationToDelete.name
                    }
                  </h4>
                  <p className="text-sm text-gray-500">
                    {conversationToDelete.type === 'direct' ? 'Conversation directe' : 
                     conversationToDelete.type === 'group' ? 'Conversation de groupe' : 
                     'Conversation workgroup'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="sm:justify-start">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmDeleteConversation}
              disabled={messagesLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setDeleteConversationDialogOpen(false);
                setConversationToDelete(null);
              }}
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
