import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from './DashboardLayout';
import SuperAdminRoute from './SuperAdminRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Code splitting: chaque page est chargée à la demande
const Index = React.lazy(() => import("@/pages/Index"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));
const Login = React.lazy(() => import("@/pages/Login"));
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const Intervenants = React.lazy(() => import("@/pages/Intervenants"));
const Projects = React.lazy(() => import("@/pages/Projects"));
const ProjectDetails = React.lazy(() => import("@/pages/ProjectDetails"));
const EditProject = React.lazy(() => import("@/pages/EditProject"));
const Tasks = React.lazy(() => import("@/pages/Tasks"));
const AdminTasks = React.lazy(() => import("@/pages/AdminTasks"));
const TaskDetails = React.lazy(() => import("@/pages/TaskDetails"));
const Notifications = React.lazy(() => import("@/pages/Notifications"));
const Companies = React.lazy(() => import("@/pages/Companies"));
const WorkGroups = React.lazy(() => import("@/pages/WorkGroups"));
const Messages = React.lazy(() => import("@/pages/Messages"));
const ProfilePage = React.lazy(() => import("@/pages/ProfilePage"));
const IntervenantProjects = React.lazy(() => import("@/pages/IntervenantProjects"));
const IntervenantProjectDetails = React.lazy(() => import("@/pages/IntervenantProjectDetails"));
const SuperAdminDashboard = React.lazy(() => import("@/pages/SuperAdminDashboard"));
const SuperAdminLogin = React.lazy(() => import("@/pages/SuperAdminLogin"));
const Features = React.lazy(() => import("@/pages/Features"));
const Solutions = React.lazy(() => import("@/pages/Solutions"));
const Validations = React.lazy(() => import("@/pages/Validations"));
const MesSignatures = React.lazy(() => import("@/pages/MesSignatures"));
const DocumentDetail = React.lazy(() => import("@/pages/DocumentDetail"));
const WorkflowTemplates = React.lazy(() => import("@/pages/WorkflowTemplates"));
const PublicSignature = React.lazy(() => import("@/pages/PublicSignature"));
const VideoConference = React.lazy(() => import("@/pages/VideoConference"));
const SupportPage = React.lazy(() => import("@/pages/Support"));
const AdminSupport = React.lazy(() => import("@/pages/AdminSupport"));

// Fallback de chargement pour Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
  </div>
);

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { role } = useAuth();
  const hasAdminRole = role === 'admin';
  return hasAdminRole ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const IntervenantRoute = ({ children }: { children: React.ReactNode }) => {
  const { role } = useAuth();
  const hasAccess = role === 'intervenant' || role === 'maitre_ouvrage';
  return hasAccess ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const MaitreOuvrageRoute = ({ children }: { children: React.ReactNode }) => {
  const { role } = useAuth();
  const hasAccess = role === 'maitre_ouvrage';
  return hasAccess ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const SharedRoute = ({ children }: { children: React.ReactNode }) => {
  const { role } = useAuth();
  const hasAccess = role === 'admin' || role === 'intervenant' || role === 'maitre_ouvrage';
  return hasAccess ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/fonctionnalites" element={<Features />} />
      <Route path="/fonctionnalites/:featureId" element={<Features />} />
      <Route path="/solutions" element={<Solutions />} />
      <Route path="/signer/:token" element={<PublicSignature />} />

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
        
        {/* Tâches - accessibles aux intervenants et aux admins */}
        <Route path="tasks" element={
          <SharedRoute>
            <Tasks />
          </SharedRoute>
        } />
        <Route path="admin/tasks" element={
          <AdminRoute>
            <AdminTasks />
          </AdminRoute>
        } />
        <Route path="tasks/:id" element={
          <SharedRoute>
            <TaskDetails />
          </SharedRoute>
        } />

        {/* Redirections pour compatibilité */}
        <Route path="intervenant/taches-standard" element={<Navigate to="/dashboard/tasks" replace />} />
        <Route path="intervenant/workflows" element={<Navigate to="/dashboard/tasks" replace />} />
        <Route path="maitre-ouvrage/taches-standard" element={<Navigate to="/dashboard/tasks" replace />} />
        <Route path="maitre-ouvrage/workflows" element={<Navigate to="/dashboard/tasks" replace />} />

        {/* Détails des tâches - on garde les chemins pour les liens existants dans les mails/notifs */}
        <Route path="intervenant/taches-standard/:id" element={
          <IntervenantRoute>
            <TaskDetails />
          </IntervenantRoute>
        } />
        <Route path="intervenant/workflows/:id" element={
          <IntervenantRoute>
            <TaskDetails />
          </IntervenantRoute>
        } />
        <Route path="maitre-ouvrage/taches-standard/:id" element={
          <MaitreOuvrageRoute>
            <TaskDetails />
          </MaitreOuvrageRoute>
        } />
        <Route path="maitre-ouvrage/workflows/:id" element={
          <MaitreOuvrageRoute>
            <TaskDetails />
          </MaitreOuvrageRoute>
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
        <Route path="support" element={
          <SharedRoute>
            <SupportPage />
          </SharedRoute>
        } />
        <Route path="notifications" element={
          <SharedRoute>
            <Notifications />
          </SharedRoute>
        } />
        <Route path="admin-support" element={
          <SuperAdminRoute>
            <AdminSupport />
          </SuperAdminRoute>
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
        
        <Route path="videoconference" element={
          <SharedRoute>
            <VideoConference />
          </SharedRoute>
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
    </Suspense>
  );
};
