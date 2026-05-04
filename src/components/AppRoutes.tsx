import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from './DashboardLayout';
import SuperAdminRoute from './SuperAdminRoute';
import { useAuth } from '@/contexts/AuthContext';

import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Intervenants from "@/pages/Intervenants";
import Projects from "@/pages/Projects";
import ProjectDetails from "@/pages/ProjectDetails";
import EditProject from "@/pages/EditProject";
import Tasks from "@/pages/Tasks";
import AdminTasks from "@/pages/AdminTasks";
import TaskDetails from "@/pages/TaskDetails";
import Notifications from "@/pages/Notifications";
import Companies from "@/pages/Companies";
import WorkGroups from "@/pages/WorkGroups";
import Messages from "@/pages/Messages";
import Settings from "@/pages/Settings";
import ProfilePage from "@/pages/ProfilePage";
import IntervenantProjects from "@/pages/IntervenantProjects";
import IntervenantProjectDetails from "@/pages/IntervenantProjectDetails";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import SuperAdminLogin from "@/pages/SuperAdminLogin";
import Features from "@/pages/Features";
import Solutions from "@/pages/Solutions";
import Validations from "@/pages/Validations";
import MesSignatures from "@/pages/MesSignatures";
import DocumentDetail from "@/pages/DocumentDetail";
import WorkflowTemplates from "@/pages/WorkflowTemplates";
import PublicSignature from "@/pages/PublicSignature";
import VideoConference from "@/pages/VideoConference";
import SupportPage from "@/pages/Support";
import AdminSupport from "@/pages/AdminSupport";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, role } = useAuth();
  const hasAdminRole = role === 'admin' || user?.email === 'admin@aps.com';
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
  const { user, role } = useAuth();
  const hasAccess = role === 'admin' || role === 'intervenant' || role === 'maitre_ouvrage' || user?.email === 'admin@aps.com';
  return hasAccess ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

export const AppRoutes = () => {
  return (
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
  );
};
