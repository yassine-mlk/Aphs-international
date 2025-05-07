import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Button } from './ui/button';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface JitsiMeetingProps {
  roomName: string;
  displayName: string;
  email?: string;
  onClose?: () => void;
  onError?: (error: Error) => void;
  isModerator?: boolean;
}

export function JitsiMeeting({ roomName, displayName, email, onClose, onError, isModerator = true }: JitsiMeetingProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<any>(null);
  const [jitsiLoaded, setJitsiLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const maxReconnectAttempts = 2;
  
  // Generer un identifiant de session unique pour prévenir les boucles
  const sessionId = useMemo(() => Math.random().toString(36).substring(2, 10), []);
  
  // État pour suivre si on a essayé de rejoindre en tant qu'invité
  const [triedJoinAsGuest, setTriedJoinAsGuest] = useState(false);

  // Charger le script Jitsi
  useEffect(() => {
    // Vérifier si le script est déjà chargé
    if (window.JitsiMeetExternalAPI) {
      setJitsiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => setJitsiLoaded(true);
    script.onerror = () => {
      const error = new Error('Impossible de charger Jitsi Meet');
      setLoadError(error);
      if (onError) onError(error);
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [onError]);

  // Initialiser Jitsi une fois le script chargé
  useEffect(() => {
    if (!jitsiLoaded || !jitsiContainerRef.current) return;
    
    console.log(`Initializing Jitsi session ${sessionId} for room ${roomName}, attempt ${reconnectAttempt}`);

    try {
      const domain = 'meet.jit.si';
      const options = {
        roomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName,
          email
        },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          enableClosePage: true,
          disableProfile: false,
          roomPasswordRequired: false,
          desktopSharingChromeDisabled: true,
          p2p: {
            enabled: true
          },
          testing: {
            enableEncodedTransformSupport: true
          },
          constraints: {
            video: {
              height: {
                ideal: 720,
                max: 1080,
                min: 240
              }
            }
          }
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
            'security'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false
        }
      };

      const jitsiApi = new window.JitsiMeetExternalAPI(domain, options);
      
      jitsiApi.addEventListener('videoConferenceJoined', () => {
        console.log(`Session ${sessionId}: Utilisateur a rejoint la visioconférence`);
        
        if (isModerator) {
          const roomPassword = `aphs-${Math.random().toString(36).substring(2, 8)}`;
          console.log(`Session ${sessionId}: Setting room password as moderator`);
          
          jitsiApi.executeCommand('password', roomPassword);
        }
      });

      jitsiApi.addEventListener('passwordRequired', () => {
        console.log(`Session ${sessionId}: Password required - attempting to join as guest`);
        setTriedJoinAsGuest(true);
        jitsiApi.executeCommand('joinAsGuest', displayName);
      });

      jitsiApi.addEventListener('readyToClose', () => {
        console.log(`Session ${sessionId}: Ready to close`);
        if (onClose) onClose();
      });

      jitsiApi.addEventListener('errorOccurred', (error: any) => {
        console.error(`Session ${sessionId}: Jitsi error:`, error);
        
        // Check if it's a membersOnly error
        if (error && (error.error === 'conference.connectionError.membersOnly' || 
            (error.details && error.details.error === 'conference.connectionError.membersOnly') ||
            (typeof error === 'string' && error.includes('membersOnly')))) {
          
          console.log(`Session ${sessionId}: MembersOnly error detected in errorOccurred`);
          
          // Check if there are params that might contain the room name
          if (error.params && Array.isArray(error.params) && error.params.length > 0) {
            console.log(`Session ${sessionId}: MembersOnly error for room: ${error.params[0]}`);
          }
          
          if (isModerator) {
            // Pour les modérateurs, on tente de forcer la création/accès de la salle
            console.log(`Session ${sessionId}: User is moderator, attempting to create/join the room with privileges`);
            try {
              // Forcer la création de la salle avec des droits de modérateur
              jitsiApi.executeCommand('overwriteConfig', {
                startWithAudioMuted: false,
                prejoinPageEnabled: false,
                membersOnly: false
              });
              
              // Attendre un peu puis définir un mot de passe (cela établit l'utilisateur comme propriétaire)
              setTimeout(() => {
                const roomPassword = `aphs-${Math.random().toString(36).substring(2, 8)}`;
                jitsiApi.executeCommand('password', roomPassword);
              }, 1000);
              
              return; // On attend pour voir si ça fonctionne
            } catch (moderatorError) {
              console.error(`Session ${sessionId}: Failed to establish moderator privileges:`, moderatorError);
            }
          } else if (!isModerator) {
            // Try to join as guest before giving up
            if (!triedJoinAsGuest) {
              console.log(`Session ${sessionId}: Attempting to join as guest for non-moderator`);
              setTriedJoinAsGuest(true);
              try {
                jitsiApi.executeCommand('joinAsGuest', displayName);
                return; // Wait to see if this works
              } catch (guestError) {
                console.error(`Session ${sessionId}: Failed to join as guest:`, guestError);
              }
            }
            
            // If guest join didn't work or was already tried, inform the user
            if (onError) onError(new Error('Cette salle n\'est accessible qu\'aux modérateurs. Veuillez attendre que l\'hôte rejoigne la réunion.'));
            return;
          }
        }
        
        // Extract the error message more carefully
        let errorMessage = 'Unknown error';
        
        try {
          if (typeof error === 'string') {
            errorMessage = error;
          } else if (error && typeof error === 'object') {
            if (error.error && typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.details && error.details.error) {
              errorMessage = error.details.error;
            } else if (error.type) {
              errorMessage = error.type;
            } else if (error.message) {
              errorMessage = error.message;
            } else {
              // Try to get something meaningful from the object
              errorMessage = JSON.stringify(error);
            }
          }
        } catch (e) {
          console.error('Error parsing Jitsi error:', e);
        }
        
        if (onError) onError(new Error(`Jitsi error: ${errorMessage}`));
      });

      jitsiApi.addEventListener('participantKickedOut', (kicked: any) => {
        console.warn(`Session ${sessionId}: Participant kicked out:`, kicked);
      });

      jitsiApi.addEventListener('conferenceFailed', (error: any) => {
        console.error(`Session ${sessionId}: Conference failed:`, error);
        
        // Extract the error message more carefully
        let errorMessage = 'Unknown error';
        
        try {
          if (typeof error === 'string') {
            errorMessage = error;
          } else if (error && typeof error === 'object') {
            if (error.error && typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.details && error.details.error) {
              errorMessage = error.details.error;
            } else if (error.type) {
              errorMessage = error.type;
            } else if (error.message) {
              errorMessage = error.message;
            } else {
              // Try to get something meaningful from the object
              errorMessage = JSON.stringify(error);
            }
          }
        } catch (e) {
          console.error('Error parsing Jitsi error:', e);
        }
        
        if (error && error.error === 'conference.connectionError.membersOnly' && reconnectAttempt < maxReconnectAttempts) {
          console.log(`Session ${sessionId}: Attempt ${reconnectAttempt + 1}/${maxReconnectAttempts}: Members only error detected`);
          
          // Check if there are params that might contain the room name
          if (error.params && Array.isArray(error.params) && error.params.length > 0) {
            console.log(`Session ${sessionId}: MembersOnly error for room: ${error.params[0]}`);
          }
          
          if (isModerator) {
            // Pour les modérateurs, essayons de créer une nouvelle salle avec des droits explicites
            console.log(`Session ${sessionId}: Moderator detected, will create new room with explicit admin rights`);
            
            try {
              // Create a new room with a more unique name (use timestamp to avoid collision)
              const timestamp = new Date().getTime();
              const randomPart = Math.random().toString(36).substring(2, 8);
              const newRoomName = `aphs-private_${timestamp}_${randomPart}`;
              console.log(`Session ${sessionId}: Moderator creating new room: ${newRoomName}`);
              
              jitsiApi.dispose();
              
              // Incrémenter le compteur de tentatives pour éviter la boucle infinie
              setReconnectAttempt(prevAttempt => prevAttempt + 1);
              
              setTimeout(() => {
                const newOptions = {
                  ...options,
                  roomName: newRoomName,
                  configOverwrite: {
                    ...options.configOverwrite,
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    prejoinPageEnabled: false,
                    membersOnly: false
                  }
                };
                
                const newJitsiApi = new window.JitsiMeetExternalAPI(domain, newOptions);
                setApi(newJitsiApi);
                
                newJitsiApi.addEventListener('videoConferenceJoined', () => {
                  console.log(`Session ${sessionId}: Moderator joined new room, setting password`);
                  // Définir immédiatement un mot de passe pour établir les droits d'admin
                  const roomPassword = `aphs-${Math.random().toString(36).substring(2, 8)}`;
                  newJitsiApi.executeCommand('password', roomPassword);
                });
                
                newJitsiApi.addEventListener('errorOccurred', (newError: any) => {
                  console.error(`Session ${sessionId}: Jitsi error in new room:`, newError);
                  let errorMessage = 'Unknown error';
                  // Extraction du message d'erreur...
                  try {
                    if (typeof newError === 'string') {
                      errorMessage = newError;
                    } else if (newError && typeof newError === 'object') {
                      if (newError.error && typeof newError.error === 'string') {
                        errorMessage = newError.error;
                      } else if (newError.details && newError.details.error) {
                        errorMessage = newError.details.error;
                      } else if (newError.type) {
                        errorMessage = newError.type;
                      } else if (newError.message) {
                        errorMessage = newError.message;
                      } else {
                        errorMessage = JSON.stringify(newError);
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing Jitsi error:', e);
                  }
                  if (onError) onError(new Error(`Jitsi error in new room: ${errorMessage}`));
                });
                
                // Ajouter aussi le gestionnaire conferenceFailed pour la nouvelle salle
                newJitsiApi.addEventListener('conferenceFailed', (newError: any) => {
                  console.error(`Session ${sessionId}: Conference failed in new room:`, newError);
                  
                  // Extract the error message carefully
                  let errorMessage = 'Unknown error';
                  
                  try {
                    if (typeof newError === 'string') {
                      errorMessage = newError;
                    } else if (newError && typeof newError === 'object') {
                      if (newError.error && typeof newError.error === 'string') {
                        errorMessage = newError.error;
                      } else if (newError.details && newError.details.error) {
                        errorMessage = newError.details.error;
                      } else if (newError.type) {
                        errorMessage = newError.type;
                      } else if (newError.message) {
                        errorMessage = newError.message;
                      } else {
                        errorMessage = JSON.stringify(newError);
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing Jitsi error:', e);
                  }
                  
                  // Gestionnaire particulier pour l'erreur membersOnly dans la nouvelle salle
                  if (newError && newError.error === 'conference.connectionError.membersOnly') {
                    console.warn(`Session ${sessionId}: Still getting membersOnly error in new room. Trying last attempt...`);
                    try {
                      // Dernier essai pour forcer les droits de modérateur
                      newJitsiApi.executeCommand('overwriteConfig', {
                        startWithAudioMuted: false,
                        prejoinPageEnabled: false,
                        membersOnly: false
                      });
                      
                      // Attendre et réessayer de définir un mot de passe
                      setTimeout(() => {
                        const roomPassword = `aphs-${Math.random().toString(36).substring(2, 8)}`;
                        newJitsiApi.executeCommand('password', roomPassword);
                      }, 1000);
                      
                      return;
                    } catch (e) {
                      console.error(`Session ${sessionId}: Final attempt failed:`, e);
                    }
                  }
                  
                  // Ne pas tenter de recréer une salle pour éviter une boucle infinie
                  if (onError) onError(new Error(`Erreur lors de l'accès à la salle: ${errorMessage}`));
                });
                
                // Ajouter des gestionnaires pour les autres événements importants
                newJitsiApi.addEventListener('passwordRequired', () => {
                  console.log(`Session ${sessionId}: Password required in new room - setting as moderator`);
                  const roomPassword = `aphs-${Math.random().toString(36).substring(2, 8)}`;
                  newJitsiApi.executeCommand('password', roomPassword);
                });
                
                // Réadjouter l'événement readyToClose
                newJitsiApi.addEventListener('readyToClose', () => {
                  console.log(`Session ${sessionId}: Ready to close (new room)`);
                  if (onClose) onClose();
                });
              }, 500);
              
              return;
            } catch (newRoomError) {
              console.error(`Session ${sessionId}: Failed to create new room as moderator:`, newRoomError);
            }
          } else if (!isModerator) {
            // Try to join as guest before giving up
            if (!triedJoinAsGuest) {
              console.log(`Session ${sessionId}: Attempting to join as guest for non-moderator`);
              setTriedJoinAsGuest(true);
              try {
                jitsiApi.executeCommand('joinAsGuest', displayName);
                return; // Wait to see if this works
              } catch (guestError) {
                console.error(`Session ${sessionId}: Failed to join as guest:`, guestError);
              }
            }
            
            // If guest join didn't work or was already tried, inform the user
            if (onError) onError(new Error('Cette salle n\'est accessible qu\'aux modérateurs. Veuillez attendre que l\'hôte rejoigne la réunion.'));
            return;
          }
        } else if (error && error.error === 'connection.passwordRequired') {
          console.log(`Session ${sessionId}: Password required error. Attempting to join as participant...`);
          try {
            jitsiApi.executeCommand('joinAsGuest', displayName);
          } catch (passwordError) {
            console.error(`Session ${sessionId}: Failed to join as guest:`, passwordError);
            if (onError) onError(new Error(`Failed to join as guest: ${passwordError.message || 'Password error'}`));
          }
        } else {
          console.log(`Session ${sessionId}: Unhandled conference error or max reconnect attempts reached: ${error.error}`);
          if (onError) onError(new Error(`Conference failed: ${error.error || 'Unknown error'}`));
        }
      });

      setApi(jitsiApi);

      return () => {
        console.log(`Session ${sessionId}: Cleaning up Jitsi API`);
        jitsiApi.dispose();
      };
    } catch (error) {
      console.error(`Session ${sessionId}: Erreur lors de l'initialisation de Jitsi:`, error);
      setLoadError(error as Error);
      if (onError) onError(error as Error);
    }
  }, [jitsiLoaded, roomName, displayName, email, onClose, onError, isModerator, reconnectAttempt, sessionId, maxReconnectAttempts, triedJoinAsGuest]);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center bg-red-50 rounded-lg border border-red-200 h-[600px]">
        <h3 className="text-xl font-semibold text-red-700 mb-4">
          Impossible de charger la visioconférence
        </h3>
        <p className="text-red-600 mb-6">
          {loadError.message || 'Une erreur est survenue lors du chargement de Jitsi Meet.'}
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] bg-gray-100 rounded-lg overflow-hidden">
      {!jitsiLoaded ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de la visioconférence...</p>
          </div>
        </div>
      ) : (
        <div ref={jitsiContainerRef} className="w-full h-full"></div>
      )}
    </div>
  );
} 