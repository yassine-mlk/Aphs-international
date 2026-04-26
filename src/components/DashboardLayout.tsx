import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarTrigger,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  MessageSquare, 
  LogOut,
  Settings,
  User,
  CheckSquare,
  BarChart3,
  FileText,
  FileCheck,
  Video,
  LifeBuoy
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import NotificationBell from '@/components/NotificationBell';
import { usePendingDocuments } from '@/hooks/usePendingDocuments';
import LoadingSpinner from '@/components/LoadingSpinner';


// Type pour l'utilisateur du dashboard
type DashboardUser = {
  email: string;
  role: string;
  id?: string;
  is_super_admin?: boolean;
}

// Traductions françaises intégrées
const dashboardTranslations = {
  fr: {
    dashboard: "Tableau de bord",
    projects: "Projets",
    myProjects: "Mes Projets",
    projectDetails: "Détails du projet",
    intervenants: "Intervenants",
    companies: "Entreprises",
    workgroups: "Groupes de travail",
    messages: "Messages",
    videoconference: "Visioconférence",
    support: "Support",
    adminSupport: "Gestion Support",
    settings: "Paramètres",
    tasks: "Tâches",
    logout: "Déconnexion",
    myAccount: "Mon compte",
    profile: "Profil",
    administrator: "Administrateur",
    specialist: "Intervenant",
    masterOwner: "Maître d'ouvrage"
  }
};

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user: authUser, role, isSuperAdmin: authIsSuperAdmin, loading: authLoading, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { count: pendingDocsCount } = usePendingDocuments();

  // Rediriger si non connecté après la fin du chargement
  useEffect(() => {
    if (!authLoading && !authUser) {
      navigate('/login');
    }
  }, [authUser, authLoading, navigate]);

  const handleLogout = async () => {
    // Éviter les déconnexions multiples
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  // Check both the role and directly for admin email
  const isAdmin = role === 'admin' || authUser?.email === 'admin@aps.com';
  const isSuperAdmin = authIsSuperAdmin;
  const isMaitreOuvrage = role === 'maitre_ouvrage';
  
  const t = dashboardTranslations.fr;

  // Fonction pour vérifier si un lien est actif
  const isLinkActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const textDirection = 'ltr';

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-gray-50" dir={textDirection}>
        <Sidebar side="left">
          <SidebarHeader className="flex items-center justify-center py-5 border-b">
            <img src="/aps-logo.svg" alt="APS" className="h-12" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={t.dashboard}
                  isActive={isLinkActive("/dashboard")}
                >
                  <Link to="/dashboard">
                    <LayoutDashboard />
                    <span>{t.dashboard}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Projet Menu Item - Admin Only */}
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t.adminSupport}
                    isActive={isLinkActive("/dashboard/admin-support")}
                  >
                    <Link to="/dashboard/admin-support">
                      <LifeBuoy className="text-blue-500" />
                      <span>{t.adminSupport}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t.projects}
                    isActive={isLinkActive("/dashboard/projets")}
                  >
                    <Link to="/dashboard/projets">
                      <Briefcase />
                      <span>{t.projects}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              

              
              {/* Projets Menu Item - Intervenant and Maitre d'ouvrage access */}
              {(!isAdmin && (role === 'intervenant' || role === 'maitre_ouvrage')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t.myProjects}
                    isActive={isLinkActive("/dashboard/intervenant/projets") || isLinkActive("/dashboard/maitre-ouvrage/projets")}
                  >
                    <Link to={isMaitreOuvrage ? "/dashboard/maitre-ouvrage/projets" : "/dashboard/intervenant/projets"}>
                      <Briefcase />
                      <span>{t.myProjects}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Tasks Menu Item - Only for non-admin users */}
              {!isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t.tasks}
                    isActive={isLinkActive("/dashboard/tasks")}
                  >
                    <Link to="/dashboard/tasks">
                      <CheckSquare />
                      <span>{t.tasks}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Mes Signatures - Only for non-admin users */}
              {!isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Mes signatures"
                    isActive={isLinkActive("/dashboard/mes-signatures")}
                  >
                    <Link to="/dashboard/mes-signatures">
                      <FileCheck />
                      <span>Mes signatures</span>
                      {pendingDocsCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {pendingDocsCount > 9 ? '9+' : pendingDocsCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={t.messages}
                  isActive={isLinkActive("/dashboard/messages")}
                >
                  <Link to="/dashboard/messages">
                    <MessageSquare />
                    <span>{t.messages}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={t.videoconference}
                  isActive={isLinkActive("/dashboard/videoconference")}
                >
                  <Link to="/dashboard/videoconference">
                    <Video />
                    <span>{t.videoconference}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t.support}
                    isActive={isLinkActive("/dashboard/support")}
                  >
                    <Link to="/dashboard/support">
                      <LifeBuoy />
                      <span>{t.support}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t.intervenants}
                    isActive={isLinkActive("/dashboard/intervenants")}
                  >
                    <Link to="/dashboard/intervenants">
                      <Users />
                      <span>{t.intervenants}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t.companies}
                    isActive={isLinkActive("/dashboard/entreprises")}
                  >
                    <Link to="/dashboard/entreprises">
                      <Briefcase />
                      <span>{t.companies}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Groupes de travail - Visible uniquement aux admins */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t.workgroups}
                    isActive={isLinkActive("/dashboard/groupes-travail")}
                  >
                    <Link to="/dashboard/groupes-travail">
                      <Users />
                      <span>{t.workgroups}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarContent>
          
          <div className="mt-auto p-4 border-t">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut size={16} />
              <span>{isLoggingOut ? 'Déconnexion...' : t.logout}</span>
            </Button>
            
            <div className="mt-4 text-xs text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-gray-500">
                <User size={12} />
                <p>{authUser?.email}</p>
              </div>
              <div className="px-3 py-2 text-center">
                <div className="text-sm text-gray-600">
                  {isAdmin ? t.administrator : 
                   role === 'maitre_ouvrage' ? t.masterOwner : 
                   t.specialist}
                </div>
              </div>
            </div>
          </div>
        </Sidebar>
        
        <SidebarInset>
          <div className="h-16 border-b flex items-center justify-between px-4 bg-white shadow-sm">
            <div className="flex items-center">
              <SidebarTrigger />
              <h2 className="text-xl font-semibold ml-4">
                {location.pathname === "/dashboard" ? t.dashboard :
                 location.pathname === "/dashboard/projets" ? t.projects :
                 location.pathname === "/dashboard/intervenants" ? t.intervenants :
                 location.pathname === "/dashboard/entreprises" ? t.companies :
                 location.pathname === "/dashboard/groupes-travail" ? t.workgroups :
                 location.pathname === "/dashboard/messages" ? t.messages :
                 location.pathname === "/dashboard/tasks" ? t.tasks :
                 location.pathname === "/dashboard/intervenant/projets" ? t.myProjects :
                 location.pathname.startsWith("/dashboard/intervenant/projets/") ? t.projectDetails :
                 location.pathname === "/dashboard/maitre-ouvrage/projets" ? t.myProjects :
                 location.pathname.startsWith("/dashboard/maitre-ouvrage/projets/") ? t.projectDetails :
                 location.pathname === "/dashboard/parametres" ? t.settings :
                 location.pathname === "/dashboard/profil" ? t.profile : ""
                }
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <NotificationBell />
              
              {/* Menu utilisateur */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full bg-purple-100 h-9 w-9 text-purple-700">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{t.myAccount}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => navigate('/dashboard/profil')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>{t.profile}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => navigate('/dashboard/parametres')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t.settings}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isLoggingOut ? 'Déconnexion...' : t.logout}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
            <Suspense fallback={<LoadingSpinner />}>
              <Outlet />
            </Suspense>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
