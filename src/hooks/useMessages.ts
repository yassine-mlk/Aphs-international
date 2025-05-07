import { useCallback, useState } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

/**
 * Helper to add timeout to any promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000, errorMessage = 'Operation timed out'): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

// Types
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  role: string;
  specialty?: string;
  status?: 'online' | 'offline' | 'away';
  avatar?: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: User;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

export interface Contact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  specialty?: string;
}

export function useMessages() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(false);

  // Récupérer les contacts disponibles pour l'utilisateur
  const getAvailableContacts = useCallback(async (): Promise<Contact[]> => {
    if (!user) return [];
    
    try {
      setLoading(true);
      
      // Debug - afficher l'ID utilisateur utilisé dans l'appel
      console.log('Appel à get_available_contacts avec user.id:', user.id);
      
      // Call the RPC function
      const rpcCall = supabase
        .rpc('get_available_contacts', { 
          p_user_id: user.id 
        });
        
      // Add timeout of 8 seconds to the fetch operation
      const response = await withTimeout(
        rpcCall as unknown as Promise<PostgrestSingleResponse<any>>, 
        8000, 
        'La récupération des contacts a expiré'
      );
      
      const { data, error } = response;
      
      if (error) {
        console.error('RPC error details:', error);
        throw error;
      }
      
      // Log the returned data to debug
      console.log('Contacts data from RPC (raw):', data);
      
      // Si data est null ou undefined, retourner un tableau vide
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('Aucun contact retourné');
        return [];
      }
      
      // Formater les résultats en type Contact avec les nouveaux noms de colonnes
      const contacts: Contact[] = data.map((contact: any) => {
        console.log('Mapping contact:', contact);
        return {
          id: contact.contact_id,
          email: contact.contact_email,
          first_name: contact.contact_first_name,
          last_name: contact.contact_last_name,
          role: contact.contact_role,
          specialty: contact.contact_specialty
        };
      });
      
      console.log('Contacts formatés:', contacts);
      return contacts;
    } catch (error) {
      console.error('Erreur lors de la récupération des contacts:', error);
      
      // En cas d'erreur, retourner un tableau vide
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Récupérer toutes les conversations de l'utilisateur
  const getConversations = useCallback(async (): Promise<Conversation[]> => {
    if (!user) return [];
    
    try {
      setLoading(true);
      
      // Instead of using the direct query that's failing, use our new function
      const rpcCall = supabase
        .rpc('get_user_conversations', { p_user_id: user.id });
      
      // Add timeout of 8 seconds to the fetch operation
      const response = await withTimeout(
        rpcCall as unknown as Promise<PostgrestSingleResponse<any>>, 
        8000, 
        'La récupération des conversations a expiré'
      );
      
      const { data: participations, error: participationsError } = response;
      
      if (participationsError) {
        console.error('Error fetching conversations:', participationsError);
        throw participationsError;
      }
      
      if (!participations || participations.length === 0) {
        return [];
      }
      
      const conversationIds = participations.map((p: any) => p.conversation_id);
      
      // Récupérer les informations sur les conversations
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });
      
      if (conversationsError) throw conversationsError;
      
      if (!conversationsData) {
        return [];
      }
      
      // Récupérer les participants pour chaque conversation
      const conversations: Conversation[] = await Promise.all(
        conversationsData.map(async (conv: any) => {
          // Récupérer les participants
          const { data: participants, error: participantsError } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id);
          
          if (participantsError) throw participantsError;
          
          // Récupérer les informations des participants
          let participantUsers: User[] = [];
          
          if (participants && participants.length > 0) {
            const participantIds = participants.map((p: any) => p.user_id);
            
            try {
              // Remplacer par une approche qui fonctionne avec l'API de Supabase
              // Utiliser directement les profils comme solution principale
              const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, user_id, role, company_id, first_name, last_name, email, specialty')
                .in('user_id', participantIds);
              
              if (!profilesError && profilesData && profilesData.length > 0) {
                console.log("Profils trouvés pour les participants:", profilesData);
                
                // Utiliser les données des profils
                participantUsers = profilesData.map(profile => {
                  const userId = profile.user_id;
                  const role = profile.role || 'utilisateur';
                  
                  return {
                    id: userId,
                    email: profile.email || '',
                    first_name: profile.first_name || (role === 'admin' ? 'Administrateur' : 
                              role === 'intervenant' ? 'Intervenant' : 'Utilisateur'),
                    last_name: profile.last_name || '',
                    role: role,
                    specialty: profile.specialty || '',
                    status: 'offline'
                  };
                });
              } else {
                console.error('Erreur ou aucun profil trouvé:', profilesError);
                
                // Fallback si on ne trouve pas les données utilisateur
                participantUsers = participants.map((p: any) => ({
                  id: p.user_id,
                  email: '',
                  first_name: 'Utilisateur',
                  last_name: '',
                  role: 'utilisateur',
                  status: 'offline'
                }));
              }
            } catch (error) {
              console.error('Erreur lors de la récupération des informations utilisateur:', error);
              
              // Fallback
              participantUsers = participants.map((p: any) => ({
                id: p.user_id,
                email: '',
                first_name: 'Utilisateur',
                last_name: '',
                role: 'utilisateur',
                status: 'offline'
              }));
            }
          }
          
          // Récupérer le dernier message
          const { data: lastMessageData, error: lastMessageError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (lastMessageError) throw lastMessageError;
          
          let lastMessage: Message | undefined = undefined;
          if (lastMessageData && lastMessageData.length > 0) {
            lastMessage = {
              id: lastMessageData[0].id,
              conversationId: lastMessageData[0].conversation_id,
              senderId: lastMessageData[0].sender_id,
              content: lastMessageData[0].content,
              timestamp: new Date(lastMessageData[0].created_at),
              isRead: false // À déterminer avec message_reads
            };
          }
          
          // Récupérer le nombre de messages non lus en utilisant uniquement la fonction serveur
          let unreadCount = 0;
          try {
            const { data, error } = await supabase
              .rpc('get_unread_count', { 
                p_conversation_id: conv.id, 
                p_user_id: user.id 
              });
            
            if (error) {
              console.error('Erreur lors du comptage des messages non lus:', error);
            } else {
              unreadCount = data || 0;
            }
          } catch (error) {
            console.error('Exception lors du comptage des messages non lus:', error);
          }
          
          // Construire l'objet conversation
          return {
            id: conv.id,
            type: conv.type,
            name: conv.name,
            participants: participantUsers,
            lastMessage,
            unreadCount,
            updatedAt: new Date(conv.updated_at)
          };
        })
      );
      
      return conversations;
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer vos conversations',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Récupérer les messages d'une conversation
  const getMessages = useCallback(async (conversationId: string): Promise<Message[]> => {
    if (!user) return [];
    
    try {
      setLoading(true);
      
      // Get messages for the conversation with timeout
      const messagesCall = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      const messagesResponse = await withTimeout(
        messagesCall as unknown as Promise<PostgrestSingleResponse<any>>,
        8000,
        'La récupération des messages a expiré'
      );
      
      const { data: messagesData, error: messagesError } = messagesResponse;
      
      if (messagesError) throw messagesError;
      
      if (!messagesData) {
        return [];
      }
      
      // Marquer tous les messages comme lus
      const messagesToMark = messagesData
        .filter((msg: any) => msg.sender_id !== user.id)
        .map((msg: any) => ({
          message_id: msg.id,
          user_id: user.id
        }));
      
      if (messagesToMark.length > 0) {
        // Utiliser upsert pour éviter les doublons
        const { error: markError } = await supabase
          .from('message_reads')
          .upsert(messagesToMark, { onConflict: 'message_id,user_id' });
        
        if (markError) {
          console.error('Erreur lors du marquage des messages comme lus:', markError);
        }
      }
      
      // Récupérer tous les IDs d'expéditeurs uniques
      const senderIds = [...new Set(messagesData.map((msg: any) => msg.sender_id))];
      
      // Récupérer les données des expéditeurs
      let senders: Record<string, User> = {};
      if (senderIds.length > 0) {
        try {
          console.log('Récupération des données des expéditeurs depuis les profils');
          
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, user_id, role, company_id, first_name, last_name, email, specialty')
            .in('user_id', senderIds);
          
          if (!profilesError && profilesData && profilesData.length > 0) {
            // Debug 
            console.log('Début du débogage des profils expéditeurs');
            if (profilesData.length > 0) {
              console.log('Structure de la table profiles:', Object.keys(profilesData[0]));
              console.log('Exemple de profil:', profilesData[0]);
            }
            
            // Créer un dictionnaire avec les données de profils
            profilesData.forEach(profile => {
              const userId = profile.user_id;
              const role = profile.role || 'utilisateur';
              
              senders[userId] = {
                id: userId,
                email: profile.email || '',
                first_name: profile.first_name || (role === 'admin' ? 'Administrateur' : 
                          role === 'intervenant' ? 'Intervenant' : 'Utilisateur'),
                last_name: profile.last_name || '',
                role: role,
                specialty: profile.specialty || ''
              };
            });
          } else {
            console.error('Erreur ou aucun profil trouvé pour les expéditeurs:', profilesError);
            
            // Fallback - création de valeurs par défaut
            senderIds.forEach(senderId => {
              senders[senderId] = {
                id: senderId,
                email: '',
                first_name: 'Utilisateur',
                last_name: '',
                role: 'utilisateur',
                specialty: ''
              };
            });
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des données expéditeurs:', error);
          
          // Fallback en cas d'erreur
          senderIds.forEach(senderId => {
            senders[senderId] = {
              id: senderId,
              email: '',
              first_name: 'Utilisateur',
              last_name: '',
              role: 'utilisateur',
              specialty: ''
            };
          });
        }
      }
      
      // Formater les messages
      const messages: Message[] = messagesData.map((msg: any) => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        sender: senders[msg.sender_id],
        content: msg.content,
        timestamp: new Date(msg.created_at),
        isRead: true // Tous les messages sont maintenant lus
      }));
      
      return messages;
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les messages',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Envoyer un message
  const sendMessage = useCallback(async (conversationId: string, content: string): Promise<Message | null> => {
    if (!user) return null;
    
    try {
      setLoading(true);
      
      const messageData = {
        conversation_id: conversationId,
        sender_id: user.id,
        content
      };
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select('*')
        .single();
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('Aucune donnée retournée après insertion');
      }
      
      // Mettre à jour le timestamp de la conversation
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      // Formater le message
      const message: Message = {
        id: data.id,
        conversationId: data.conversation_id,
        senderId: data.sender_id,
        content: data.content,
        timestamp: new Date(data.created_at),
        isRead: false
      };
      
      return message;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Créer une conversation directe
  const createDirectConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('create_direct_conversation', {
          p_user1_id: user.id,
          p_user2_id: otherUserId
        });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la conversation',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Créer une conversation de groupe
  const createGroupConversation = useCallback(async (name: string, userIds: string[]): Promise<string | null> => {
    if (!user) return null;
    
    try {
      setLoading(true);
      
      // S'assurer que l'utilisateur actuel est inclus
      if (!userIds.includes(user.id)) {
        userIds.push(user.id);
      }
      
      const { data, error } = await supabase
        .rpc('create_group_conversation', {
          p_name: name,
          p_user_ids: userIds
        });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Erreur lors de la création du groupe:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le groupe',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  return {
    loading,
    getAvailableContacts,
    getConversations,
    getMessages,
    sendMessage,
    createDirectConversation,
    createGroupConversation
  };
} 