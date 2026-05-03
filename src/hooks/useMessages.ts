import { useCallback, useState } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { useNotificationTriggers } from './useNotificationTriggers';

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

import { notifyMessageReceived } from '@/lib/notifications/messageNotifications';

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
  avatar_url?: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'workgroup';
  name?: string;
  workgroup_id?: string;
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
  avatar_url?: string;
}

export function useMessages() {
  const { supabase, getUsers } = useSupabase();
  const { user, status } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const { notifyNewMessage } = useNotificationTriggers();

  // Récupérer les contacts disponibles pour l'utilisateur
  const getAvailableContacts = useCallback(async (silent = false): Promise<Contact[]> => {
    if (status !== 'authenticated' || !user || !supabase) return [];
    
    try {
      if (!silent) setLoading(true);
      
      
      // Récupérer les contacts autorisés (ceux dans ses workgroups ou autorisés par admin)
      const { data: contacts, error: contactsError } = await supabase
        .rpc('get_available_contacts', { p_user_id: user.id });
      
      if (contactsError) {
        console.error("Erreur RPC get_available_contacts:", contactsError);
        // Fallback sécurisé: uniquement les utilisateurs du même tenant
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (myProfile?.tenant_id) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, email, first_name, last_name, role, specialty, avatar_url')
            .eq('tenant_id', myProfile.tenant_id)
            .neq('user_id', user.id)
            .eq('status', 'active');
            
          if (profiles) {
            return profiles.map(p => ({
              id: p.user_id,
              email: p.email || '',
              first_name: p.first_name || '',
              last_name: p.last_name || '',
              role: p.role || 'intervenant',
              specialty: p.specialty || '',
              avatar_url: p.avatar_url
            }));
          }
        }
        return [];
      }
      
      if (!contacts || contacts.length === 0) {
        return [];
      }
      
      // Mapper les contacts retournés par la fonction RPC
      return contacts.map((c: any) => ({
        id: c.contact_id,
        email: c.contact_email || '',
        first_name: c.contact_first_name || '',
        last_name: c.contact_last_name || '',
        role: c.contact_role || 'intervenant',
        specialty: c.contact_specialty || '',
        avatar_url: c.contact_avatar_url // Note: Assurez-vous que la fonction SQL retourne avatar_url si disponible
      }));
      
    } catch (error) {
      return [];
    } finally {
      setLoading(false);
    }
  }, [status, user, supabase]);

  // Récupérer toutes les conversations de l'utilisateur
  const getConversations = useCallback(async (silent = false): Promise<Conversation[]> => {
    if (status !== 'authenticated' || !user || !supabase) return [];
    
    try {
      if (!silent) setLoading(true);
      
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
        throw participationsError;
      }
      
      if (!participations || participations.length === 0) {
        return [];
      }
      
      const conversationIds = participations.map((p: any) => p.conversation_id);
      
      // Récupérer les informations sur les conversations
      if (conversationIds.length === 0) {
        return [];
      }
      
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
              // MÉTHODE CORRIGÉE : Utiliser auth.users d'abord, puis profiles en fallback
              
              // D'abord essayer avec auth.users (même méthode que page Intervenants)
              const userData = await getUsers();
              
              if (userData && userData.users) {
                // Filtrer les utilisateurs correspondant aux participant IDs
                const relevantUsers = userData.users.filter((authUser: any) => 
                  participantIds.includes(authUser.id)
                );
                
                if (relevantUsers.length > 0) {
                  
                  participantUsers = relevantUsers.map((authUser: any) => ({
                    id: authUser.id,
                    email: authUser.email || '',
                    // MÊME LOGIQUE que dans Intervenants pour extraire les noms
                    first_name: authUser.user_metadata?.first_name || 
                               authUser.user_metadata?.name?.split(' ')[0] || '',
                    last_name: authUser.user_metadata?.last_name || 
                              authUser.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
                    role: authUser.user_metadata?.role || 'intervenant',
                    specialty: authUser.user_metadata?.specialty || '',
                    avatar_url: authUser.user_metadata?.avatar_url,
                    status: 'offline'
                  }));
                } else {
                  throw new Error('Aucun participant trouvé dans auth.users');
                }
              } else {
                throw new Error('Aucune donnée auth.users');
              }
            } catch (error) {
              
              // Fallback: utiliser la table profiles
              try {
                if (participantIds.length === 0) {
                  throw new Error('Aucun participant ID à rechercher');
                }
                
                const { data: profilesData, error: profilesError } = await supabase
                  .from('profiles')
                  .select('user_id, role, first_name, last_name, email, specialty, avatar_url')
                  .in('user_id', participantIds);
                
                if (!profilesError && profilesData && profilesData.length > 0) {
                  
                  participantUsers = profilesData.map(profile => ({
                    id: profile.user_id,
                    email: profile.email || '',
                    first_name: profile.first_name || '',
                    last_name: profile.last_name || '',
                    role: profile.role || 'intervenant',
                    specialty: profile.specialty || '',
                    avatar_url: profile.avatar_url,
                    status: 'offline'
                  }));
                } else {
                  
                  // Dernier fallback
                  participantUsers = participants.map((p: any) => ({
                    id: p.user_id,
                    email: '',
                    first_name: 'Utilisateur',
                    last_name: '',
                    role: 'utilisateur',
                    status: 'offline'
                  }));
                }
              } catch (fallbackError) {
                
                // Dernier fallback
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
            } else {
              unreadCount = data || 0;
            }
          } catch (error) {
          }
          
          // Construire l'objet conversation avec participants dédoublonnés
          return {
            id: conv.id,
            type: conv.type,
            name: conv.name,
            workgroup_id: conv.workgroup_id,
            participants: participantUsers.filter((u, index, self) => 
              index === self.findIndex((t) => t.id === u.id)
            ),
            lastMessage,
            unreadCount,
            updatedAt: new Date(conv.updated_at)
          };
        })
      );
      
      return conversations;
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer vos conversations',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [status, user, supabase, toast]);

  // Récupérer les messages d'une conversation
  const getMessages = useCallback(async (conversationId: string, silent = false): Promise<Message[]> => {
    if (status !== 'authenticated' || !user || !supabase) return [];
    
    try {
      if (!silent) setLoading(true);
      
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
        }
      }
      
      // Récupérer tous les IDs d'expéditeurs uniques
      const senderIds = [...new Set(messagesData.map((msg: any) => msg.sender_id))];
      
      // Récupérer les données des expéditeurs
      let senders: Record<string, User> = {};
      if (senderIds.length > 0) {
        try {
          
          // Utiliser auth.users en premier (même logique que pour contacts et participants)
          const userData = await getUsers();
          
          if (userData && userData.users) {
            const relevantSenders = userData.users.filter((authUser: any) => 
              senderIds.includes(authUser.id)
            );
            
            if (relevantSenders.length > 0) {
              
              relevantSenders.forEach((authUser: any) => {
                senders[authUser.id] = {
                  id: authUser.id,
                  email: authUser.email || '',
                  // MÊME LOGIQUE que dans Intervenants pour extraire les noms
                  first_name: authUser.user_metadata?.first_name || 
                             authUser.user_metadata?.name?.split(' ')[0] || '',
                  last_name: authUser.user_metadata?.last_name || 
                            authUser.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
                  role: authUser.user_metadata?.role || 'intervenant',
                  specialty: authUser.user_metadata?.specialty || ''
                };
              });
              
              // Ajouter les expéditeurs manquants avec des valeurs par défaut
              senderIds.forEach(senderId => {
                if (!senders[senderId as string]) {
                  senders[senderId as string] = {
                    id: senderId as string,
                    email: '',
                    first_name: 'Utilisateur',
                    last_name: '',
                    role: 'utilisateur',
                    specialty: ''
                  };
                }
              });
            } else {
              throw new Error('Aucun expéditeur trouvé dans auth.users');
            }
          } else {
            throw new Error('Aucune donnée auth.users');
          }
        } catch (error) {
          
          // Fallback: utiliser la table profiles
          try {
            if (senderIds.length === 0) {
              throw new Error('Aucun sender ID à rechercher');
            }
            
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('user_id, role, first_name, last_name, email, specialty')
              .in('user_id', senderIds);
            
            if (!profilesError && profilesData && profilesData.length > 0) {
              
              profilesData.forEach(profile => {
                senders[profile.user_id] = {
                  id: profile.user_id,
                  email: profile.email || '',
                  first_name: profile.first_name || '',
                  last_name: profile.last_name || '',
                  role: profile.role || 'intervenant',
                  specialty: profile.specialty || ''
                };
              });
            } else {
            }
            
            // Ajouter les expéditeurs manquants avec des valeurs par défaut
            senderIds.forEach(senderId => {
              if (!senders[senderId as string]) {
                senders[senderId as string] = {
                  id: senderId as string,
                  email: '',
                  first_name: 'Utilisateur',
                  last_name: '',
                  role: 'utilisateur',
                  specialty: ''
                };
              }
            });
          } catch (fallbackError) {
            
            // Dernier fallback - valeurs par défaut pour tous
            senderIds.forEach(senderId => {
              senders[senderId as string] = {
                id: senderId as string,
                email: '',
                first_name: 'Utilisateur',
                last_name: '',
                role: 'utilisateur',
                specialty: ''
              };
            });
          }
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
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les messages',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [status, user, supabase, toast]);

  // Envoyer un message
  const sendMessage = useCallback(async (conversationId: string, content: string): Promise<Message | null> => {
    if (status !== 'authenticated' || !user || !supabase) return null;
    
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

      // Mettre à jour le timestamp de la conversation
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Notifications aux autres participants
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id);
      
      if (participants) {
        participants.forEach(p => {
          notifyMessageReceived(p.user_id, user.id, content, conversationId);
        });
      }

      return {
        id: data.id,
        conversationId: data.conversation_id,
        senderId: data.sender_id,
        content: data.content,
        timestamp: new Date(data.created_at),
        isRead: false
      };
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [status, user, supabase, getUsers, toast, notifyNewMessage]);

  // Fonctions de création de conversations supprimées - seules les conversations de groupes de travail sont autorisées

  // Supprimer une conversation (admin uniquement)
  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    if (status !== 'authenticated' || !user || !supabase) return false;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .rpc('admin_delete_conversation', {
          p_conversation_id: conversationId,
          p_user_id: user.id
        });
      
      if (error) throw error;
      
      toast({
        title: 'Conversation supprimée',
        description: 'La conversation et tous ses messages ont été supprimés définitivement',
        variant: 'default'
      });
      
      return true;
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer la conversation',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [status, user, supabase, toast]);

  // Obtenir les statistiques de conversation (admin uniquement)
  const getConversationStats = useCallback(async () => {
    if (status !== 'authenticated' || !user) return [];
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('admin_get_conversation_stats', {
          p_user_id: user.id
        });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les statistiques des conversations',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [status, user, supabase, toast]);

  return {
    loading,
    getAvailableContacts,
    getConversations,
    getMessages,
    sendMessage,
    deleteConversation,
    getConversationStats
  };
} 
