import React, { useState, useEffect } from 'react';
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
  Video, 
  LogOut,
  Settings,
  User,
  CheckSquare,
  BarChart3,
  FileText,
  FileCheck
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
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import NotificationBell from '@/components/NotificationBell';
import { usePendingDocuments } from '@/hooks/usePendingDocuments';


// Type pour l'utilisateur du dashboard
type DashboardUser = {
  email: string;
  role: string;
  id?: string;
}

// Create dashboard translations
const dashboardTranslations = {
  en: {
    dashboard: "Dashboard",
    projects: "Projects",
    myProjects: "My Projects",
    projectDetails: "Project Details",
    intervenants: "Specialists",
    companies: "Companies",
    workgroups: "Work Groups",
    messages: "Messages",
    videoconference: "Video Conference",
    settings: "Settings",
    tasks: "Tasks",
    logout: "Logout",
    myAccount: "My Account",
    profile: "Profile",
    administrator: "Administrator",
    specialist: "Specialist",
    masterOwner: "Project Owner"
  },
  fr: {
    dashboard: "Tableau de bord",
    projects: "Projets",
    myProjects: "Mes Projets",
    projectDetails: "Détails du Projet",
    intervenants: "Intervenants",
    companies: "Entreprises",
    workgroups: "Groupes de travail",
    messages: "Messages",
    videoconference: "Vidéoconférence",
    settings: "Paramètres",
    tasks: "Tâches",
    logout: "Déconnexion",
    myAccount: "Mon Compte",
    profile: "Profil",
    administrator: "Administrateur",
    specialist: "Intervenant",
    masterOwner: "Maître d'ouvrage"
  },
  es: {
    dashboard: "Panel de control",
    projects: "Proyectos",
    myProjects: "Mis Proyectos",
    projectDetails: "Detalles del Proyecto",
    intervenants: "Especialistas",
    companies: "Empresas",
    workgroups: "Grupos de trabajo",
    messages: "Mensajes",
    videoconference: "Videoconferencia",
    settings: "Ajustes",
    tasks: "Tareas",
    logout: "Cerrar sesión",
    myAccount: "Mi cuenta",
    profile: "Perfil",
    administrator: "Administrador",
    specialist: "Especialista",
    masterOwner: "Propietario del proyecto"
  },
  ar: {
    dashboard: "لوحة التحكم",
    projects: "المشاريع",
    myProjects: "مشاريعي",
    projectDetails: "تفاصيل المشروع",
    intervenants: "المتخصصين",
    companies: "الشركات",
    workgroups: "مجموعات العمل",
    messages: "الرسائل",
    videoconference: "مؤتمر فيديو",
    settings: "الإعدادات",
    tasks: "المهام",
    logout: "تسجيل الخروج",
    myAccount: "حسابي",
    profile: "الملف الشخصي",
    administrator: "المسؤول",
    specialist: "متخصص",
    masterOwner: "مالك المشروع"
  }
};

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const { user: authUser, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { count: pendingDocsCount } = usePendingDocuments();

  useEffect(() => {
    // Fonction pour charger les données utilisateur
    const loadUser = () => {
      // D'abord, vérifier si l'utilisateur est déjà défini
      if (user) {
        setLoading(false);
        return;
      }
      
      // Récupérer le rôle depuis profiles (source de vérité)
      if (authUser) {
        supabase
          .from('profiles')
          .select('role')
          .eq('user_id', authUser.id)
          .maybeSingle()
          .then(({ data }) => {
            const role = data?.role || authUser.user_metadata?.role || 'intervenant';
            const userData = { email: authUser.email || '', role, id: authUser.id };
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            setLoading(false);
          });
        return;
      }
      
      // Fallback localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.email === 'admin@aps.com') {
            parsedUser.role = 'admin';
            localStorage.setItem('user', JSON.stringify(parsedUser));
          }
          setUser(parsedUser);
          setLoading(false);
        } catch (error) {
          localStorage.removeItem('user');
          navigate('/login');
        }
      } else {
        // Si aucun utilisateur n'est trouvé, rediriger vers login
        navigate('/login');
      }
    };
    
    // Charger l'utilisateur
    loadUser();
  }, [user, authUser, navigate]);

  const handleLogout = async () => {
    // Éviter les déconnexions multiples
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // Utiliser la fonction signOut de AuthContext pour déconnecter de Supabase
      await signOut();
      
      // Nettoyage supplémentaire pour garantir la déconnexion
      localStorage.removeItem('user');
      sessionStorage.clear();
      
      // Réinitialiser l'état local
      setUser(null);
      
      // Notifier l'utilisateur
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
        duration: 3000,
      });
      
      // Introduire un bref délai avant la navigation pour éviter les problèmes
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
    } catch (error) {
      toast({
        title: "Erreur de déconnexion",
        description: "Un problème est survenu pendant la déconnexion.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };


  // Si l'utilisateur n'est pas défini ou si on est en cours de chargement, on affiche un loader
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-blue-600 border-r-transparent border-b-blue-600 border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Make sure we correctly identify admin role
  // Check both the role and directly for admin email
  const isAdmin = user?.role === 'admin' || user?.email === 'admin@aps.com';
  const isMaitreOuvrage = user?.role === 'maitre_ouvrage';
  
  const t = dashboardTranslations.fr;

  // Fonction pour vérifier si un lien est actif
  const isLinkActive = (path: string) => {
    return location.pathname === path;
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
              {(!isAdmin && (user?.role === 'intervenant' || user?.role === 'maitre_ouvrage')) && (
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
                  isActive={isLinkActive("/dashboard/visio")}
                >
                  <Link to="/dashboard/visio">
                    <Video />
                    <span>{t.videoconference}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
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
                <p>{user?.email}</p>
              </div>
              <div className="px-3 py-2 text-center">
                <div className="text-sm text-gray-600">
                  {isAdmin ? t.administrator : 
                   user?.role === 'maitre_ouvrage' ? t.masterOwner : 
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
                 location.pathname === "/dashboard/visio" ? t.videoconference :
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

            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
