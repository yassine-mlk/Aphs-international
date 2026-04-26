import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  isSuperAdmin: boolean;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const roleRef = React.useRef<string | null>(null);

  const fetchUserProfile = async (userId: string) => {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, is_super_admin')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!error && data) {
        setRole(data.role);
        roleRef.current = data.role;
        setIsSuperAdmin(data.is_super_admin === true);
        return data;
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
    return null;
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // 1. Récupérer la session initiale
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          await fetchUserProfile(initialSession.user.id);
        }

        setLoading(false);
        setInitialized(true);

        // 2. Écouter les changements d'état
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          if (!mounted) return;

          console.log("Auth event:", event);

          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
            
            // On récupère le profil sur les événements importants
            // On ne met loading à true que si on n'a pas encore de rôle (initialisation ou nouvelle connexion)
            const shouldFetchProfile = event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED';
            const needsLoading = !roleRef.current && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED');

            if (shouldFetchProfile) {
              if (needsLoading) setLoading(true);
              await fetchUserProfile(currentSession.user.id);
              if (needsLoading) setLoading(false);
            } else {
              setLoading(false);
            }
          } else {
            setSession(null);
            setUser(null);
            setRole(null);
            setIsSuperAdmin(false);
            setLoading(false);
          }
        });

        return subscription;
      } catch (error) {
        console.error("Error in initializeAuth:", error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
        return null;
      }
    }

    const subscriptionPromise = initializeAuth();

    return () => {
      mounted = false;
      subscriptionPromise.then(sub => sub?.unsubscribe());
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user && data.session) {
        // Les états seront mis à jour par onAuthStateChange
        return { user: data.user, error: null };
      }
      
      return { user: null, error: new Error('Utilisateur ou session non disponible') };
    } catch (error) {
      console.error("SignIn error in AuthContext:", error);
      return { user: null, error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setSession(null);
      setUser(null);
      setRole(null);
      roleRef.current = null;
      setIsSuperAdmin(false);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      role, 
      isSuperAdmin, 
      loading, 
      initialized,
      signIn, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
