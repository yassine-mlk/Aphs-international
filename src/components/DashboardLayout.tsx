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
  Globe,
  CheckSquare,
  BarChart3,
  FileText
} from 'lucide-react';
import { Language } from '@/components/LanguageSelector';
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
import NotificationBell from '@/components/NotificationBell';


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
    specialist: "Specialist"
  },
  fr: {
    dashboard: "Tableau de bord",
    projects: "Projets",
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
    specialist: "Intervenant"
  },
  es: {
    dashboard: "Panel de control",
    projects: "Proyectos",
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
    specialist: "Especialista"
  },
  ar: {
    dashboard: "لوحة التحكم",
    projects: "المشاريع",
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
    specialist: "متخصص"
  }
};

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const { language, setLanguage } = useLanguage();
  const { user: authUser, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Fonction pour charger les données utilisateur
    const loadUser = () => {
      // D'abord, vérifier si l'utilisateur est déjà défini
      if (user) {
        setLoading(false);
        return;
      }
      
      // Ensuite, essayer de récupérer depuis authUser (Supabase)
      if (authUser) {
        setUser({
          email: authUser.email || '',
          role: authUser.user_metadata?.role || 'intervenant',
          id: authUser.id
        });
        setLoading(false);
        return;
      }
      
      // Enfin, essayer de récupérer depuis localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log('DashboardLayout - user from localStorage:', parsedUser);
          
          // Force admin role for admin@aphs.com
          if (parsedUser.email === 'admin@aphs.com') {
            parsedUser.role = 'admin';
            localStorage.setItem('user', JSON.stringify(parsedUser));
          }
          
          setUser(parsedUser);
          setLoading(false);
        } catch (error) {
          console.error('Error parsing user data:', error);
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
        title: language === 'fr' ? "Déconnexion réussie" : 
               language === 'en' ? "Successfully logged out" :
               language === 'es' ? "Desconexión exitosa" : 
               "تم تسجيل الخروج بنجاح",
        description: language === 'fr' ? "À bientôt !" : 
                     language === 'en' ? "See you soon!" :
                     language === 'es' ? "¡Hasta pronto!" : 
                     "نراك قريبا!",
        duration: 3000,
      });
      
      // Introduire un bref délai avant la navigation pour éviter les problèmes
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast({
        title: "Erreur de déconnexion",
        description: "Un problème est survenu pendant la déconnexion.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  // Si l'utilisateur n'est pas défini ou si on est en cours de chargement, on affiche un loader
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-teal-500 border-r-transparent border-b-teal-500 border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Make sure we correctly identify admin role
  // Check both the role and directly for admin email
  const isAdmin = user?.role === 'admin' || user?.email === 'admin@aphs.com';
  
  const t = dashboardTranslations[language];

  const languages = {
    en: { name: 'English', flag: '🇬🇧' },
    fr: { name: 'Français', flag: '🇫🇷' },
    es: { name: 'Español', flag: '🇪🇸' },
    ar: { name: 'العربية', flag: '🇸🇦' },
  };

  // Fonction pour vérifier si un lien est actif
  const isLinkActive = (path: string) => {
    return location.pathname === path;
  };

  const textDirection = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-gray-50" dir={textDirection}>
        <Sidebar side={language === 'ar' ? 'right' : 'left'}>
          <SidebarHeader className="flex items-center justify-center py-5 border-b">
            <img src="/aphs-logo.svg" alt="APHS Internationale" className="h-12" />
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
                    isActive={isLinkActive("/dashboard/groupes")}
                  >
                    <Link to="/dashboard/groupes">
                      <Users />
                      <span>{t.workgroups}</span>
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
                  isActive={isLinkActive("/dashboard/video")}
                >
                  <Link to="/dashboard/video">
                    <Video />
                    <span>{t.videoconference}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
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
              
              {/* Projets Menu Item - Intervenant access */}
              {!isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Mes Projets"
                    isActive={isLinkActive("/dashboard/intervenant/projets")}
                  >
                    <Link to="/dashboard/intervenant/projets">
                      <Briefcase />
                      <span>Mes Projets</span>
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
              <div className={cn(
                "inline-flex items-center px-2 py-1 rounded-full text-xs",
                isAdmin 
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              )}>
                {isAdmin ? t.administrator : t.specialist}
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
                 location.pathname === "/dashboard/groupes" ? t.workgroups :
                 location.pathname === "/dashboard/messages" ? t.messages :
                 location.pathname === "/dashboard/video" ? t.videoconference :
                 location.pathname === "/dashboard/tasks" ? t.tasks :
                 location.pathname === "/dashboard/intervenant/projets" ? "Mes Projets" :
                 location.pathname.startsWith("/dashboard/intervenant/projets/") ? "Détails du Projet" :
                 location.pathname === "/dashboard/parametres" ? t.settings : ""
                }
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {/* Sélecteur de langue */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>{languages[language].flag}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white">
                  {Object.entries(languages).map(([code, { name, flag }]) => (
                    <DropdownMenuItem 
                      key={code}
                      onClick={() => handleLanguageChange(code as Language)}
                      className={`flex items-center gap-2 ${language === code ? 'font-bold bg-gray-100' : ''}`}
                    >
                      <span>{flag}</span>
                      <span>{name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              

              
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
                    onClick={() => navigate('/dashboard/parametres')}
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
