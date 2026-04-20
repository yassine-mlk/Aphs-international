import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, createContext, useContext, useCallback } from "react";
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
import EditProject from "./pages/EditProject";
import Tasks from "./pages/Tasks";
import TaskDetails from "./pages/TaskDetails";
import Companies from "./pages/Companies";
import WorkGroups from "./pages/WorkGroups";
import Messages from "./pages/Messages";
import VideoConference from "./pages/VideoConference";
import Settings from "./pages/Settings";
import ProfilePage from "./pages/ProfilePage";
import TestUpload from "./test-upload";
import IntervenantProjects from "./pages/IntervenantProjects";
import IntervenantProjectDetails from "./pages/IntervenantProjectDetails";
import IntervenantProjectDetailsLangSwitch from "./pages/IntervenantProjectDetailsLangSwitch";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminLogin from "./pages/SuperAdminLogin";

import DashboardLayout from "./components/DashboardLayout";
import SuperAdminRoute from "./components/SuperAdminRoute";
import { LanguageProvider } from "./contexts/LanguageContext";
import { UploadProvider } from "./contexts/UploadContext";
import { TenantProvider } from "./contexts/TenantContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import StorageInitializer from "./components/StorageInitializer";

const getRoleFromStorage = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}').role as string | undefined; } catch { return undefined; }
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const role = getRoleFromStorage();
  const hasAdminRole = role === 'admin' || user?.email === 'admin@aps.com';
  return hasAdminRole ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const IntervenantRoute = ({ children }: { children: React.ReactNode }) => {
  const role = getRoleFromStorage();
  const hasAccess = role === 'intervenant' || role === 'maitre_ouvrage';
  return hasAccess ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const MaitreOuvrageRoute = ({ children }: { children: React.ReactNode }) => {
  const role = getRoleFromStorage();
  const hasAccess = role === 'maitre_ouvrage';
  return hasAccess ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const SharedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const role = getRoleFromStorage();
  const hasAccess = role === 'admin' || role === 'intervenant' || role === 'maitre_ouvrage' || user?.email === 'admin@aps.com';
  return hasAccess ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// Contexte pour gérer le thème
type Theme = 'light' | 'dark' | 'system';
type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper pour obtenir le thème résolu
const getResolvedTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

// Provider de thème
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Mettre à jour le thème résolu quand le thème change
  const updateResolvedTheme = useCallback((newTheme: Theme) => {
    const resolved = getResolvedTheme(newTheme);
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, []);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Essayer de récupérer l'utilisateur actuel
        const { data: userData } = await supabase.auth.getUser();
        let loadedTheme: Theme = 'system';

        if (userData?.user) {
          // Charger le thème depuis la table profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('theme')
            .eq('user_id', userData.user.id)
            .single();

          if (profile?.theme && ['light', 'dark', 'system'].includes(profile.theme)) {
            loadedTheme = profile.theme as Theme;
          }
        } else {
          // Fallback vers localStorage
          const savedTheme = localStorage.getItem('preferredTheme') as Theme;
          if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
            loadedTheme = savedTheme;
          }
        }

        setThemeState(loadedTheme);
        updateResolvedTheme(loadedTheme);
      } catch (error) {
        console.error('Error loading theme preference:', error);
        // Fallback vers system en cas d'erreur
        setThemeState('system');
        updateResolvedTheme('system');
      }
    };

    loadTheme();

    // Écouter les changements de préférence système
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateResolvedTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, updateResolvedTheme]);

  // Setter personnalisé
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('preferredTheme', newTheme);
    updateResolvedTheme(newTheme);
  }, [updateResolvedTheme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const App = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Sync role dans localStorage quand l'user est disponible
  useEffect(() => {
    if (!user) return;
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.role) {
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...stored, role: data.role }));
          }
        });
    });
  }, [user?.id]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TenantProvider>
          <TooltipProvider>
            <LanguageProvider>
              <UploadProvider>
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
                  <Route path="projets/:id/edit" element={
                    <AdminRoute>
                      <EditProject />
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
                  
                  {/* Routes spécifiques aux intervenants */}
                  <Route path="intervenant/projets" element={
                    <IntervenantRoute>
                      <IntervenantProjects />
                    </IntervenantRoute>
                  } />
                  <Route path="intervenant/projets/:id" element={
                    <IntervenantRoute>
                      <IntervenantProjectDetails />
                    </IntervenantRoute>
                  } />
                  <Route path="intervenant/projets/:id/:lang" element={
                    <IntervenantRoute>
                      <IntervenantProjectDetailsLangSwitch />
                    </IntervenantRoute>
                  } />
                  
                  {/* Routes spécifiques aux maîtres d'ouvrage */}
                  <Route path="maitre-ouvrage/projets" element={
                    <MaitreOuvrageRoute>
                      <IntervenantProjects />
                    </MaitreOuvrageRoute>
                  } />
                  <Route path="maitre-ouvrage/projets/:id" element={
                    <MaitreOuvrageRoute>
                      <IntervenantProjectDetailsLangSwitch />
                    </MaitreOuvrageRoute>
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
                  <Route path="groupes-travail" element={
                    <AdminRoute>
                      <WorkGroups />
                    </AdminRoute>
                  } />
                  <Route path="messages" element={
                    <SharedRoute>
                      <Messages />
                    </SharedRoute>
                  } />
                  <Route path="visio" element={
                    <SharedRoute>
                      <VideoConference />
                    </SharedRoute>
                  } />
                  <Route path="parametres" element={
                    <SharedRoute>
                      <Settings />
                    </SharedRoute>
                  } />
                  <Route path="profil" element={
                    <SharedRoute>
                      <ProfilePage />
                    </SharedRoute>
                  } />
                  
                  {/* Test upload route - accessible to everyone */}
                  <Route path="test-upload" element={<TestUpload />} />
                </Route>
                
                {/* Super Admin Routes - Separate from main dashboard */}
                <Route path="/super-admin-login" element={<SuperAdminLogin />} />
                <Route element={<SuperAdminRoute />}>
                  <Route path="/super-admin" element={<SuperAdminDashboard />} />
                </Route>
                
                  <Route path="/404" element={<NotFound />} />
                  <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
              </UploadProvider>
            </LanguageProvider>
          </TooltipProvider>
        </TenantProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
