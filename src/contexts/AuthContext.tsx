import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AvailableTenant {
  id: string;
  name: string;
  role: string;
  slug: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  isSuperAdmin: boolean;
  status: AuthStatus;
  activeTenantId: string | null;
  showTenantSelector: boolean;
  availableTenants: AvailableTenant[];
  setActiveTenantId: (id: string | null) => void;
  setRole: (role: string | null) => void;
  fetchAvailableTenants: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(null);
  const [showTenantSelector, setShowTenantSelector] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<AvailableTenant[]>([]);

  const setActiveTenantId = useCallback((id: string | null) => {
    setActiveTenantIdState(id);
    if (id) {
      setShowTenantSelector(false);
      try { localStorage.setItem('aps_active_tenant', id); } catch {}
    } else {
      try { localStorage.removeItem('aps_active_tenant'); } catch {}
    }
  }, []);

  const mountedRef = useRef(true);
  const statusRef = useRef<AuthStatus>('loading');

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const withTimeout = useCallback(async <T,>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> => {
    let timeoutId: number | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    try {
      return await Promise.race([Promise.resolve(promise), timeoutPromise]);
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    }
  }, []);

  const fetchAvailableTenants = useCallback(async (userId: string) => {
    if (!supabase) return;
    try {
      const { data } = await withTimeout(
        supabase
          .from('tenant_members')
          .select('tenant_id, role, tenants!inner(name, slug)')
          .eq('user_id', userId)
          .eq('status', 'active'),
        5000
      );

      if (!mountedRef.current) return;

      if (data && data.length > 0) {
        const tenants: AvailableTenant[] = data.map((m: any) => ({
          id: m.tenant_id,
          name: m.tenants?.name || '',
          role: m.role || 'intervenant',
          slug: m.tenants?.slug || '',
        }));

        setAvailableTenants(tenants);

        if (tenants.length === 1) {
          setActiveTenantId(tenants[0].id);
          setRole(tenants[0].role);
          setShowTenantSelector(false);
        } else {
          // Vérifier si un tenant était précédemment sélectionné
          let savedId: string | null = null;
          try { savedId = localStorage.getItem('aps_active_tenant'); } catch {}

          const savedTenant = savedId ? tenants.find(t => t.id === savedId) : null;
          if (savedTenant) {
            setActiveTenantId(savedTenant.id);
            setRole(savedTenant.role);
            setShowTenantSelector(false);
          } else {
            setShowTenantSelector(true);
          }
        }
      } else {
        setAvailableTenants([]);
        setShowTenantSelector(false);
      }
    } catch {
    }
  }, [withTimeout]);

  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    try {
      const { data } = await withTimeout(
        Promise.resolve(
          supabase
            .from('profiles')
            .select('role, is_super_admin')
            .eq('user_id', userId)
            .maybeSingle()
        ),
        5000
      );

      if (!mountedRef.current) return;

      if (data) {
        setIsSuperAdmin(data.is_super_admin === true);
      }
    } catch {
    }
  }, [withTimeout]);

  const setAuthenticated = useCallback((nextSession: Session) => {
    setSession(nextSession);
    setUser(nextSession.user);
    setStatus('authenticated');
    fetchUserProfile(nextSession.user.id);
    fetchAvailableTenants(nextSession.user.id);
  }, [fetchUserProfile, fetchAvailableTenants]);

  const setUnauthenticated = useCallback(() => {
    setSession(null);
    setUser(null);
    setRole(null);
    setIsSuperAdmin(false);
    setActiveTenantId(null);
    setShowTenantSelector(false);
    setAvailableTenants([]);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    if (!supabase) {
      setUnauthenticated();
      return () => {
        mountedRef.current = false;
      };
    }

    // Sécurité : Timeout de 5 secondes pour forcer la sortie de l'état loading
    const loadingTimeoutId = window.setTimeout(() => {
      if (mountedRef.current && statusRef.current === 'loading') {
        console.warn('Auth loading timeout reached, forcing unauthenticated');
        setUnauthenticated();
      }
    }, 5000);

    const initialize = async () => {
      try {
        // Au montage, appeler getSession pour récupérer la session existante
        const { data, error } = await supabase.auth.getSession();
        
        if (!mountedRef.current) return;
        
        if (error) {
          console.error('Error fetching session:', error);
          setUnauthenticated();
          return;
        }

        if (data.session) {
          setAuthenticated(data.session);
        } else {
          setUnauthenticated();
        }
      } catch (error) {
        console.error('Unexpected error during auth initialization:', error);
        if (mountedRef.current) setUnauthenticated();
      }
    };

    void initialize();

    // S'abonner à onAuthStateChange pour tous les événements
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mountedRef.current) return;
      
      if (import.meta.env.DEV) {
        console.log('Auth state change event:', event);
      }
      
      if (nextSession) {
        setAuthenticated(nextSession);
      } else {
        setUnauthenticated();
      }
    });

    return () => {
      mountedRef.current = false;
      window.clearTimeout(loadingTimeoutId);
      subscription.unsubscribe();
    };
  }, [setAuthenticated, setUnauthenticated]);

  useEffect(() => {
    if (!supabase) return;

    const onVisibilityChange = async () => {
      // Quand document.visibilityState === 'visible', appeler supabase.auth.getSession()
      if (document.visibilityState !== 'visible') return;
      
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mountedRef.current) return;
        
        if (error) {
          console.error('Visibility change: Error fetching session:', error);
          return; // Ne pas forcer unauthenticated ici, onAuthStateChange s'en chargera si nécessaire
        }

        if (data.session) {
          setAuthenticated(data.session);
        } else if (statusRef.current === 'authenticated') {
          // Si on était authentifié mais qu'on n'a plus de session au retour, forcer unauthenticated
          setUnauthenticated();
        }
      } catch (error) {
        console.error('Visibility change: Unexpected error:', error);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [setAuthenticated, setUnauthenticated, withTimeout]);

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
      return { user: null, error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      if (!supabase) return;
      await supabase.auth.signOut();
    } finally {
      setUnauthenticated();
    }
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    role,
    isSuperAdmin,
    status,
    activeTenantId,
    showTenantSelector,
    availableTenants,
    setActiveTenantId,
    setRole,
    fetchAvailableTenants,
    signIn,
    signOut,
  }), [isSuperAdmin, role, session, signIn, signOut, status, user, activeTenantId, showTenantSelector, availableTenants, setActiveTenantId, setRole, fetchAvailableTenants]);

  return (
    <AuthContext.Provider value={value}>
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
