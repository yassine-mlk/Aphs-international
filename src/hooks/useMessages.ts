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
}

export function useMessages() {
  const { supabase, getUsers } = useSupabase();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const { notifyNewMessage } = useNotificationTriggers();

  // Récupérer les contacts disponibles pour l'utilisateur
  // MÉTHODE CORRIGÉE : Utilise la même approche que la page Intervenants qui fonctionne
  const getAvailableContacts = useCallback(async (): Promise<Contact[]> => {
    if (!user) return [];
    
    try {
      setLoading(true);
      
      console.log('🔍 Récupération des contacts depuis auth.users (même méthode que Intervenants)...');
      
             // Utiliser getUsers() comme dans la page Intervenants qui fonctionne parfaitement
       const userData = await getUsers();
      
      if (userData && userData.users) {
        console.log('✅ Données utilisateurs récupérées:', userData.users.length, 'utilisateurs');
        
        // Transformer les données des utilisateurs en format Contact
        // MÊME TRANSFORMATION que dans Intervenants.tsx
        const formattedContacts: Contact[] = userData.users
          .filter((authUser: any) => {
            // Exclure l'utilisateur actuel, les admins et les utilisateurs bannis
            const isCurrentUser = authUser.id === user.id;
            const isAdmin = authUser.user_metadata?.role === 'admin';
            const isAdminEmail = authUser.email?.toLowerCase()?.includes('admin@aphs');
            const isBanned = authUser.banned;
            
            return !isCurrentUser && !isAdmin && !isAdminEmail && !isBanned;
          })
          .map((authUser: any) => ({
            id: authUser.id,
            email: authUser.email || '',
            // MÊME LOGIQUE que dans Intervenants pour extraire les noms
            first_name: authUser.user_metadata?.first_name || 
                       authUser.user_metadata?.name?.split(' ')[0] || '',
            last_name: authUser.user_metadata?.last_name || 
                      authUser.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
            role: authUser.user_metadata?.role || 'intervenant',
            specialty: authUser.user_metadata?.specialty || ''
          }));
        
        console.log('✅ Contacts formatés depuis auth.users:', formattedContacts.length, 'contacts');
        console.log('📋 Exemple de contacts:', formattedContacts.slice(0, 3));
        
        return formattedContacts;
      } else {
        console.warn('⚠️ Aucune donnée utilisateur récupérée');
        return [];
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des contacts depuis auth.users:', error);
      
      // Fallback: essayer avec la table profiles si auth.users échoue
      try {
        console.log('🔄 Fallback: tentative avec la table profiles...');
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, email, first_name, last_name, role, specialty, status')
          .eq('status', 'active')
          .neq('user_id', user.id)
          .neq('role', 'admin');

        if (profilesError) throw profilesError;

        const fallbackContacts = (profilesData || []).map(profile => ({
          id: profile.user_id,
          email: profile.email || '',
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          role: profile.role || 'intervenant',
          specialty: profile.specialty || ''
        }));

        console.log('✅ Fallback réussi avec profiles:', fallbackContacts.length, 'contacts');
        return fallbackContacts;
      } catch (fallbackError) {
        console.error('❌ Erreur de fallback aussi:', fallbackError);
        return [];
      }
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

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
      if (conversationIds.length === 0) {
        console.log('Aucune conversation trouvée pour cet utilisateur');
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
              console.log('🔍 Récupération des participants depuis auth.users...');
              
              // D'abord essayer avec auth.users (même méthode que page Intervenants)
              const userData = await getUsers();
              
              if (userData && userData.users) {
                // Filtrer les utilisateurs correspondant aux participant IDs
                const relevantUsers = userData.users.filter((authUser: any) => 
                  participantIds.includes(authUser.id)
                );
                
                if (relevantUsers.length > 0) {
                  console.log('✅ Participants trouvés dans auth.users:', relevantUsers.length);
                  
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
                    status: 'offline'
                  }));
                } else {
                  throw new Error('Aucun participant trouvé dans auth.users');
                }
              } else {
                throw new Error('Aucune donnée auth.users');
              }
            } catch (error) {
              console.warn('⚠️ Fallback vers profiles:', error.message);
              
              // Fallback: utiliser la table profiles
              try {
                if (participantIds.length === 0) {
                  throw new Error('Aucun participant ID à rechercher');
                }
                
                const { data: profilesData, error: profilesError } = await supabase
                  .from('profiles')
                  .select('user_id, role, first_name, last_name, email, specialty')
                  .in('user_id', participantIds);
                
                if (!profilesError && profilesData && profilesData.length > 0) {
                  console.log("✅ Profils trouvés pour les participants (fallback):", profilesData);
                  
                  participantUsers = profilesData.map(profile => ({
                    id: profile.user_id,
                    email: profile.email || '',
                    first_name: profile.first_name || '',
                    last_name: profile.last_name || '',
                    role: profile.role || 'intervenant',
                    specialty: profile.specialty || '',
                    status: 'offline'
                  }));
                } else {
                  console.error('❌ Erreur dans fallback profiles:', profilesError);
                  
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
                console.error('❌ Erreur complète dans récupération participants:', fallbackError);
                
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
            workgroup_id: conv.workgroup_id,
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
          console.log('🔍 Récupération des expéditeurs depuis auth.users (même méthode que page Intervenants)...');
          
          // Utiliser auth.users en premier (même logique que pour contacts et participants)
          const userData = await getUsers();
          
          if (userData && userData.users) {
            const relevantSenders = userData.users.filter((authUser: any) => 
              senderIds.includes(authUser.id)
            );
            
            if (relevantSenders.length > 0) {
              console.log('✅ Expéditeurs trouvés dans auth.users:', relevantSenders.length);
              
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
          console.warn('⚠️ Fallback expéditeurs vers profiles:', error.message);
          
          // Fallback: utiliser la table profiles
          try {
            if (senderIds.length === 0) {
              throw new Error('Aucun sender ID à rechercher');
            }
            
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, user_id, role, first_name, last_name, email, specialty')
              .in('user_id', senderIds);
            
            if (!profilesError && profilesData && profilesData.length > 0) {
              console.log('✅ Expéditeurs trouvés dans profiles (fallback):', profilesData.length);
              
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
              console.error('❌ Erreur dans fallback profiles expéditeurs:', profilesError);
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
            console.error('❌ Erreur complète dans récupération expéditeurs:', fallbackError);
            
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
      
      
      // Envoyer des notifications aux autres participants
      try {
        // Récupérer les participants de la conversation (excepté l'expéditeur)
        const { data: participants, error: participantsError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id);
        
        if (!participantsError && participants && participants.length > 0) {
          // Récupérer le nom de l'expéditeur
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('user_id', user.id)
            .single();
          
          const senderName = senderProfile && (senderProfile.first_name || senderProfile.last_name)
            ? `${senderProfile.first_name} ${senderProfile.last_name}`.trim()
            : (senderProfile?.email || user.email || 'Un utilisateur');
          
          // Envoyer une notification à chaque participant
          for (const participant of participants) {
            await notifyNewMessage(
              participant.user_id,
              senderName,
              content.length > 50 ? `${content.substring(0, 47)}...` : content
            );
          }
        }
      } catch (notificationError) {
        console.error('Erreur lors de l\'envoi des notifications:', notificationError);
        // Ne pas faire échouer l'envoi du message si les notifications échouent
      }
      
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
  }, [user, supabase, toast, notifyNewMessage]);

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