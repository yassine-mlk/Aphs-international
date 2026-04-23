import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, createContext, useContext, useCallback, lazy, Suspense } from "react";
// Lazy loaded components for code splitting
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Intervenants = lazy(() => import("./pages/Intervenants"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const EditProject = lazy(() => import("./pages/EditProject"));
const Tasks = lazy(() => import("./pages/Tasks"));
const TaskDetails = lazy(() => import("./pages/TaskDetails"));
const Companies = lazy(() => import("./pages/Companies"));
const WorkGroups = lazy(() => import("./pages/WorkGroups"));
const Messages = lazy(() => import("./pages/Messages"));
const VideoConference = lazy(() => import("./pages/VideoConferenceImproved"));
const Settings = lazy(() => import("./pages/Settings"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const IntervenantProjects = lazy(() => import("./pages/IntervenantProjects"));
const IntervenantProjectDetails = lazy(() => import("./pages/IntervenantProjectDetails"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const SuperAdminLogin = lazy(() => import("./pages/SuperAdminLogin"));
const Features = lazy(() => import("./pages/Features"));
const Solutions = lazy(() => import("./pages/Solutions"));
const Validations = lazy(() => import("./pages/Validations"));
const MesSignatures = lazy(() => import("./pages/MesSignatures"));
const DocumentDetail = lazy(() => import("./pages/DocumentDetail"));
const WorkflowTemplates = lazy(() => import("./pages/WorkflowTemplates"));
const PublicSignature = lazy(() => import("./pages/PublicSignature"));

import DashboardLayout from "./components/DashboardLayout";
import SuperAdminRoute from "./components/SuperAdminRoute";
import { UploadProvider } from "./contexts/UploadContext";
import { TenantProvider } from "./contexts/TenantContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import StorageInitializer from "./components/StorageInitializer";
import LoadingSpinner from "./components/LoadingSpinner";

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
            <UploadProvider>
                <Toaster />
                <Sonner />
                {/* Initialisation du stockage Supabase */}
                {user && <StorageInitializer />}
                <Routes>
                  <Route path="/" element={<Suspense fallback={<LoadingSpinner />}><Index /></Suspense>} />
                  <Route path="/login" element={<Suspense fallback={<LoadingSpinner />}><Login /></Suspense>} />
                  <Route path="/fonctionnalites" element={<Suspense fallback={<LoadingSpinner />}><Features /></Suspense>} />
                  <Route path="/fonctionnalites/:featureId" element={<Suspense fallback={<LoadingSpinner />}><Features /></Suspense>} />
                  <Route path="/solutions" element={<Suspense fallback={<LoadingSpinner />}><Solutions /></Suspense>} />
                  <Route path="/signer/:token" element={<Suspense fallback={<LoadingSpinner />}><PublicSignature /></Suspense>} />

                {/* Routes du dashboard protégées */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<LoadingSpinner />}><Dashboard /></Suspense>} />
                  
                  {/* Projets - accessibles aux admins uniquement */}
                  <Route path="projets" element={
                    <AdminRoute>
                      <Suspense fallback={<LoadingSpinner />}><Projects /></Suspense>
                    </AdminRoute>
                  } />
                  
                  <Route path="projets/:id" element={
                    <AdminRoute>
                      <Suspense fallback={<LoadingSpinner />}><ProjectDetails /></Suspense>
                    </AdminRoute>
                  } />
                  <Route path="projets/:id/edit" element={
                    <AdminRoute>
                      <Suspense fallback={<LoadingSpinner />}><EditProject /></Suspense>
                    </AdminRoute>
                  } />
                  
                  {/* Tâches - accessibles aux intervenants et aux admins */}
                  <Route path="tasks" element={
                    <SharedRoute>
                      <Suspense fallback={<LoadingSpinner />}><Tasks /></Suspense>
                    </SharedRoute>
                  } />
                  <Route path="tasks/:id" element={
                    <SharedRoute>
                      <Suspense fallback={<LoadingSpinner />}><TaskDetails /></Suspense>
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
                  
                  {/* Routes spécifiques aux maîtres d'ouvrage */}
                  <Route path="maitre-ouvrage/projets" element={
                    <MaitreOuvrageRoute>
                      <IntervenantProjects />
                    </MaitreOuvrageRoute>
                  } />
                  <Route path="maitre-ouvrage/projets/:id" element={
                    <MaitreOuvrageRoute>
                      <IntervenantProjectDetails />
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
                  
                  {/* Routes Workflow VISA */}
                  <Route path="validations" element={<Validations />} />
                  <Route path="mes-signatures" element={<MesSignatures />} />
                  <Route path="documents/:documentId" element={<DocumentDetail />} />
                  <Route path="workflow-templates" element={
                    <AdminRoute>
                      <WorkflowTemplates />
                    </AdminRoute>
                  } />
                  
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
          </TooltipProvider>
        </TenantProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
