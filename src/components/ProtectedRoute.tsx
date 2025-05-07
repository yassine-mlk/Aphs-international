import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<number>(0);

  useEffect(() => {
    // Éviter de vérifier trop souvent (throttling)
    const now = Date.now();
    if (now - lastChecked < 500) return;
    setLastChecked(now);

    // Vérifier si l'utilisateur est déjà authentifié par Supabase
    if (user) {
      setAuthenticated(true);
      return;
    }

    // Si Supabase a fini de charger et qu'il n'y a pas d'utilisateur, vérifier localStorage
    if (!loading) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          // Vérifier que le JSON est valide
          JSON.parse(storedUser);
          setAuthenticated(true);
        } catch (error) {
          console.error('Invalid user data in localStorage:', error);
          localStorage.removeItem('user');
          setAuthenticated(false);
        }
      } else {
        setAuthenticated(false);
      }
    }
  }, [user, loading, lastChecked]);

  // Attendre que l'authentification soit vérifiée
  if (loading || authenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-teal-500 border-r-transparent border-b-teal-500 border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Rediriger vers la page de connexion si non authentifié
  if (!authenticated) {
    // Rediriger vers la page de login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Si l'utilisateur essaie d'accéder à la page des paramètres, vérifier s'il a bien un compte valide
  if (location.pathname.includes('/parametres')) {
    // Vérifier que l'utilisateur a une session valide (Supabase ou localStorage)
    if (!user) {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  // Si l'utilisateur est authentifié, afficher le contenu
  return <>{children}</>;
};

export default ProtectedRoute; 