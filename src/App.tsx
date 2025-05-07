import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, createContext, useContext } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Intervenants from "./pages/Intervenants";
import Projects from "./pages/Projects";
import ProjectsEn from "./pages/ProjectsEn";
import ProjectsEs from "./pages/ProjectsEs";
import ProjectsAr from "./pages/ProjectsAr";
import ProjectDetails from "./pages/ProjectDetails";
import ProjectDetailsEn from "./pages/ProjectDetailsEn";
import Tasks from "./pages/Tasks";
import TaskDetails from "./pages/TaskDetails";
import Companies from "./pages/Companies";
import WorkGroups from "./pages/WorkGroups";
import Messages from "./pages/Messages";
import VideoConference from "./pages/VideoConference";
import Settings from "./pages/Settings";
import TestUpload from "./test-upload";
import DashboardLayout from "./components/DashboardLayout";
import { LanguageProvider } from "./contexts/LanguageContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import StorageInitializer from "./components/StorageInitializer";

const queryClient = new QueryClient();

// Contexte pour gérer le thème
type ThemeContextType = {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Provider de thème
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Essayer de récupérer l'utilisateur actuel
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData?.user) {
          // Essayer de charger les paramètres utilisateur depuis Supabase
          const { data: settings } = await supabase
            .from('user_settings')
            .select('theme')
            .eq('id', userData.user.id)
            .single();
          
          if (settings && settings.theme) {
            setTheme(settings.theme);
            return;
          }
        }
        
        // Fallback vers localStorage
        const savedTheme = localStorage.getItem('preferredTheme') as 'light' | 'dark';
        if (savedTheme) {
          setTheme(savedTheme);
        } else {
          // Utiliser les préférences du système
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setTheme(prefersDark ? 'dark' : 'light');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    
    loadTheme();
  }, []);
  
  // Appliquer le thème lorsqu'il change
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('preferredTheme', theme);
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const App = () => {
  const { user } = useAuth();
  const [localUserRole, setLocalUserRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check localStorage for user role
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setLocalUserRole(parsedUser.role);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
      }
    }
  }, [navigate]);

  // Vérifier si l'utilisateur a un rôle admin (check both Supabase user and localStorage)
  const isAdmin = user?.user_metadata?.role === 'admin' || localUserRole === 'admin' || 
                  user?.email === 'admin@aphs.com';

  // Composant pour les routes accessibles uniquement aux admins
  const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    // Also check if the email is admin@aphs.com for direct access
    const userFromStorage = JSON.parse(localStorage.getItem('user') || '{}');
    const hasAdminRole = isAdmin || userFromStorage?.email === 'admin@aphs.com';
    return hasAdminRole ? <>{children}</> : <Navigate to="/dashboard" replace />;
  };

  // Composant pour les routes accessibles aux intervenants
  const IntervenantRoute = ({ children }: { children: React.ReactNode }) => {
    const hasAccess = user?.user_metadata?.role === 'intervenant' || 
                      localUserRole === 'intervenant';
    return hasAccess ? <>{children}</> : <Navigate to="/dashboard" replace />;
  };
  
  // Composant pour les routes accessibles aux admins et intervenants
  const SharedRoute = ({ children }: { children: React.ReactNode }) => {
    const hasAccess = user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'intervenant' || 
                      localUserRole === 'admin' || localUserRole === 'intervenant' ||
                      user?.email === 'admin@aphs.com';
    return hasAccess ? <>{children}</> : <Navigate to="/dashboard" replace />;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <LanguageProvider>
            <Toaster />
            <Sonner />
            {/* Initialisation du stockage Supabase */}
            {user && <StorageInitializer />}
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              
              {/* Routes du dashboard protégées */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                
                {/* Projets - accessibles aux admins uniquement */}
                <Route path="projets" element={
                  <AdminRoute>
                    <Projects />
                  </AdminRoute>
                } />
                
                {/* Language-specific Project pages */}
                <Route path="projets/en" element={
                  <AdminRoute>
                    <ProjectsEn />
                  </AdminRoute>
                } />
                <Route path="projets/es" element={
                  <AdminRoute>
                    <ProjectsEs />
                  </AdminRoute>
                } />
                <Route path="projets/ar" element={
                  <AdminRoute>
                    <ProjectsAr />
                  </AdminRoute>
                } />
                
                <Route path="projets/:id" element={
                  <AdminRoute>
                    <ProjectDetails />
                  </AdminRoute>
                } />
                
                {/* Language-specific project details routes */}
                <Route path="projets/:id/en" element={
                  <AdminRoute>
                    <ProjectDetailsEn />
                  </AdminRoute>
                } />
                <Route path="projets/:id/es" element={
                  <AdminRoute>
                    <ProjectDetails />
                  </AdminRoute>
                } />
                <Route path="projets/:id/ar" element={
                  <AdminRoute>
                    <ProjectDetails />
                  </AdminRoute>
                } />
                
                {/* Tâches - accessibles aux intervenants et aux admins */}
                <Route path="tasks" element={
                  <SharedRoute>
                    <Tasks />
                  </SharedRoute>
                } />
                <Route path="tasks/:id" element={
                  <SharedRoute>
                    <TaskDetails />
                  </SharedRoute>
                } />
                
                <Route path="intervenants" element={
                  <AdminRoute>
                    <Intervenants />
                  </AdminRoute>
                } />
                <Route path="entreprises" element={
                  <AdminRoute>
                    <Companies />
                  </AdminRoute>
                } />
                <Route path="groupes" element={
                  <SharedRoute>
                    <WorkGroups />
                  </SharedRoute>
                } />
                <Route path="messages" element={
                  <SharedRoute>
                    <Messages />
                  </SharedRoute>
                } />
                <Route path="video" element={
                  <SharedRoute>
                    <VideoConference />
                  </SharedRoute>
                } />
                <Route path="parametres" element={<Settings />} />
                
                {/* Test upload route - accessible to everyone */}
                <Route path="test-upload" element={<TestUpload />} />
              </Route>
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </LanguageProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
