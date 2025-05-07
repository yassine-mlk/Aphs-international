import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Récupérer la session en cours
    async function getSession() {
      if (initialized) return; // Prevent multiple initializations
      
      setLoading(true);
      try {
        // Check localStorage for stored user as fallback
        const storedUser = localStorage.getItem('user');
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          setUser(session.user);
          console.log('Session existante trouvée pour:', session.user.email);
        } else if (storedUser) {
          // Si pas de session Supabase mais localStorage disponible
          // Créer un user mock à partir du localStorage pour l'UI
          try {
            const parsedUser = JSON.parse(storedUser);
            console.log('No active session but found stored user in localStorage:', parsedUser);
            
            // Créer un user mock compatible avec l'API de Supabase
            const mockUser = {
              id: parsedUser.id || 'local-id',
              email: parsedUser.email,
              user_metadata: {
                role: parsedUser.role
              },
              app_metadata: {}, // Requis par le type User
              aud: 'authenticated',
              created_at: new Date().toISOString()
            } as unknown as User; // Cast sécurisé avec unknown d'abord
            
            setUser(mockUser);
          } catch (error) {
            console.error('Error parsing stored user:', error);
          }
        } else {
          console.log('Aucune session existante trouvée');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de la session:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    }

    getSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('État d\'authentification changé:', _event, session?.user?.email);
      
      if (session) {
        setSession(session);
        setUser(session.user);
      } else {
        setSession(null);
        setUser(null); // Toujours réinitialiser l'utilisateur quand la session est nulle
      }
      
      // Make sure loading is always set to false after auth state changes
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [initialized]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user && data.session) {
        console.log('Connexion réussie pour:', data.user.email);
        setUser(data.user);
        setSession(data.session);
        return { user: data.user, error: null };
      }
      
      return { user: null, error: new Error('Utilisateur ou session non disponible') };
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return { user: null, error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Réinitialiser immédiatement les états pour l'interface
      setUser(null);
      setSession(null);
      
      // Nettoyer toutes les données utilisateur locales
      localStorage.removeItem('user');
      sessionStorage.clear();
      
      // Essayer de vider les cookies (pour Safari et autres navigateurs)
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
      
      // Déconnexion Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Erreur Supabase lors de la déconnexion:', error);
        // Malgré l'erreur, on a déjà nettoyé l'état local
      }
      
      console.log('Déconnexion réussie, état nettoyé');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      // Définir comme non chargé pour éviter les écrans de chargement bloqués
      setLoading(false);
      setInitialized(false); // Permettre une réinitialisation au prochain rendu
    }
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
} 