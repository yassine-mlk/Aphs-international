import React, { useState, Suspense } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  LayoutDashboard, 
  Users, 
  LogOut,
  Settings,
  User,
  CheckSquare,
  Video,
  Bell,
  ShieldCheck,
  Building2,
  Users2,
  Mail,
  HelpCircle,
  FolderKanban,
  FileSignature
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { usePendingDocuments } from '@/hooks/usePendingDocuments';
import LoadingSpinner from '@/components/LoadingSpinner';

import { usePlan } from '@/hooks/usePlan';

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
    masterOwner: "Maître d'ouvrage",
    notifications: "Notifications",
    mainMenu: "MENU PRINCIPAL",
    collaboration: "COLLABORATION",
    administration: "ADMINISTRATION",
    system: "SYSTÈME"
  }
};

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user: authUser, role, isSuperAdmin: authIsSuperAdmin, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { count: pendingDocsCount } = usePendingDocuments();
  const { unreadCount: unreadNotificationsCount } = useNotifications();
  const { can } = usePlan();

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

  const NavItem = ({ to, icon: Icon, label, isActive, badge }: { to: string, icon: any, label: string, isActive: boolean, badge?: number }) => (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={label}
        isActive={isActive}
        className={cn(
          "transition-all duration-200 group relative py-6 px-4",
          isActive 
            ? "bg-blue-50 text-blue-600 font-bold" 
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        <Link to={to} className="flex items-center gap-3">
          <Icon className={cn(
            "h-5 w-5 transition-colors",
            isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
          )} />
          <span className="text-sm tracking-tight">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className={cn(
              "ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
              isActive ? "bg-blue-600 text-white" : "bg-red-500 text-white"
            )}>
              {badge > 9 ? '9+' : badge}
            </span>
          )}
          {isActive && (
            <motion.div 
              layoutId="active-bar"
              className="absolute left-0 w-1 h-8 bg-blue-600 rounded-r-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <SidebarProvider>
      <Sidebar side="left" className="border-r border-gray-100">
        <SidebarHeader className="flex items-center justify-center py-8">
          <Link to="/dashboard" className="transition-transform hover:scale-105 active:scale-95">
            <img src="/aps-logo.svg" alt="APS" className="h-14" />
          </Link>
        </SidebarHeader>
        
        <SidebarContent className="px-2 pt-4">
          <SidebarMenu>
            <NavItem 
              to="/dashboard" 
              icon={LayoutDashboard} 
              label={t.dashboard} 
              isActive={isLinkActive("/dashboard")} 
            />
            <NavItem 
              to={isAdmin ? "/dashboard/projets" : (isMaitreOuvrage ? "/dashboard/maitre-ouvrage/projets" : "/dashboard/intervenant/projets")} 
              icon={FolderKanban} 
              label={t.projects} 
              isActive={isAdmin ? isLinkActive("/dashboard/projets") : (isLinkActive("/dashboard/intervenant/projets") || isLinkActive("/dashboard/maitre-ouvrage/projets"))} 
            />
            <NavItem 
              to={isAdmin ? "/dashboard/admin/tasks" : "/dashboard/tasks"} 
              icon={CheckSquare} 
              label={t.tasks} 
              isActive={isAdmin ? isLinkActive("/dashboard/admin/tasks") : (isLinkActive("/dashboard/tasks") || isLinkActive("/dashboard/intervenant/taches-standard") || isLinkActive("/dashboard/intervenant/workflows") || isLinkActive("/dashboard/maitre-ouvrage/taches-standard") || isLinkActive("/dashboard/maitre-ouvrage/workflows"))} 
            />

            {!isAdmin && (
              <NavItem 
                to="/dashboard/mes-signatures" 
                icon={FileSignature} 
                label="Mes signatures" 
                isActive={isLinkActive("/dashboard/mes-signatures")}
                badge={pendingDocsCount}
              />
            )}
            <NavItem 
              to="/dashboard/messages" 
              icon={Mail} 
              label={t.messages} 
              isActive={isLinkActive("/dashboard/messages")} 
            />
            {can('videoconference') && (
              <NavItem 
                to="/dashboard/videoconference" 
                icon={Video} 
                label={t.videoconference} 
                isActive={isLinkActive("/dashboard/videoconference")} 
              />
            )}

            {isAdmin && (
              <>
                <NavItem 
                  to="/dashboard/intervenants" 
                  icon={Users2} 
                  label={t.intervenants} 
                  isActive={isLinkActive("/dashboard/intervenants")} 
                />
                <NavItem 
                  to="/dashboard/groupes-travail" 
                  icon={Users} 
                  label={t.workgroups} 
                  isActive={isLinkActive("/dashboard/groupes-travail")} 
                />
                <NavItem 
                  to="/dashboard/entreprises" 
                  icon={Building2} 
                  label={t.companies} 
                  isActive={isLinkActive("/dashboard/entreprises")} 
                />
              </>
            )}

            <NavItem 
              to="/dashboard/notifications" 
              icon={Bell} 
              label={t.notifications} 
              isActive={isLinkActive("/dashboard/notifications")}
            />
            {!isSuperAdmin && (
              <NavItem 
                to="/dashboard/support" 
                icon={HelpCircle} 
                label={t.support} 
                isActive={isLinkActive("/dashboard/support")} 
              />
            )}
            {isSuperAdmin && (
              <NavItem 
                to="/dashboard/admin-support" 
                icon={ShieldCheck} 
                label={t.adminSupport} 
                isActive={isLinkActive("/dashboard/admin-support")} 
              />
            )}
          </SidebarMenu>
        </SidebarContent>
        
        <div className="mt-auto p-4 space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10 border border-blue-100">
                <AvatarImage src={authUser?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
                  {authUser?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{authUser?.email}</p>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  {isAdmin ? t.administrator : role === 'maitre_ouvrage' ? t.masterOwner : t.specialist}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="w-full justify-start gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50 h-9 rounded-xl"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut size={14} />
              <span className="text-xs font-bold">{isLoggingOut ? '...' : t.logout}</span>
            </Button>
          </div>
        </div>
      </Sidebar>
      
      <SidebarInset className="bg-[#F8F9FA]">
        <div className="h-16 border-b flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center">
            <SidebarTrigger className="text-gray-400 hover:text-blue-600" />
            <div className="h-6 w-[1px] bg-gray-200 mx-4 hidden md:block" />
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              {location.pathname === "/dashboard" ? t.dashboard :
               location.pathname === "/dashboard/projets" ? t.projects :
               location.pathname === "/dashboard/intervenants" ? t.intervenants :
               location.pathname === "/dashboard/entreprises" ? t.companies :
               location.pathname === "/dashboard/groupes-travail" ? t.workgroups :
               location.pathname === "/dashboard/messages" ? t.messages :
               location.pathname === "/dashboard/tasks" ? t.tasks :
               location.pathname.includes("/tasks/") ? "Détails de la tâche" :
               location.pathname.includes("/projets/") ? "Détails du projet" :
               location.pathname === "/dashboard/profil" ? t.profile : 
               location.pathname === "/dashboard/notifications" ? t.notifications :
               location.pathname === "/dashboard/mes-signatures" ? "Mes signatures" :
               location.pathname === "/dashboard/support" ? t.support :
               "Application"
              }
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell />
            
            <Button 
              variant="ghost" 
              className="relative h-10 w-10 rounded-2xl p-0 hover:bg-blue-50 group transition-all overflow-hidden border border-gray-100"
              onClick={() => navigate('/dashboard/profil')}
              title={t.profile}
            >
              <Avatar className="h-full w-full rounded-none">
                <AvatarImage src={authUser?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gray-50 text-gray-400 group-hover:text-blue-600">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>
        </div>
        
        <div className="p-4 md:p-8">
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
