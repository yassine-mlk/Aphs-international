import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from './DashboardLayout';
import SuperAdminRoute from './SuperAdminRoute';
import { useAuth } from '@/contexts/AuthContext';

// Lazy loaded components for code splitting
const Index = lazy(() => import("@/pages/Index"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Intervenants = lazy(() => import("@/pages/Intervenants"));
const Projects = lazy(() => import("@/pages/Projects"));
const ProjectDetails = lazy(() => import("@/pages/ProjectDetails"));
const EditProject = lazy(() => import("@/pages/EditProject"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const TaskDetails = lazy(() => import("@/pages/TaskDetails"));
const Companies = lazy(() => import("@/pages/Companies"));
const WorkGroups = lazy(() => import("@/pages/WorkGroups"));
const Messages = lazy(() => import("@/pages/Messages"));
const Settings = lazy(() => import("@/pages/Settings"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const IntervenantProjects = lazy(() => import("@/pages/IntervenantProjects"));
const IntervenantProjectDetails = lazy(() => import("@/pages/IntervenantProjectDetails"));
const SuperAdminDashboard = lazy(() => import("@/pages/SuperAdminDashboard"));
const SuperAdminLogin = lazy(() => import("@/pages/SuperAdminLogin"));
const Features = lazy(() => import("@/pages/Features"));
const Solutions = lazy(() => import("@/pages/Solutions"));
const Validations = lazy(() => import("@/pages/Validations"));
const MesSignatures = lazy(() => import("@/pages/MesSignatures"));
const DocumentDetail = lazy(() => import("@/pages/DocumentDetail"));
const WorkflowTemplates = lazy(() => import("@/pages/WorkflowTemplates"));
const PublicSignature = lazy(() => import("@/pages/PublicSignature"));
const VideoConference = lazy(() => import("@/pages/VideoConference"));
const SupportPage = lazy(() => import("@/pages/Support"));
const AdminSupport = lazy(() => import("@/pages/AdminSupport"));

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
            <Suspense fallback={<LoadingSpinner />}><IntervenantProjects /></Suspense>
          </IntervenantRoute>
        } />
        <Route path="intervenant/projets/:id" element={
          <IntervenantRoute>
            <Suspense fallback={<LoadingSpinner />}><IntervenantProjectDetails /></Suspense>
          </IntervenantRoute>
        } />
        
        {/* Routes spécifiques aux maîtres d'ouvrage */}
        <Route path="maitre-ouvrage/projets" element={
          <MaitreOuvrageRoute>
            <Suspense fallback={<LoadingSpinner />}><IntervenantProjects /></Suspense>
          </MaitreOuvrageRoute>
        } />
        <Route path="maitre-ouvrage/projets/:id" element={
          <MaitreOuvrageRoute>
            <Suspense fallback={<LoadingSpinner />}><IntervenantProjectDetails /></Suspense>
          </MaitreOuvrageRoute>
        } />
        
        <Route path="intervenants" element={
          <AdminRoute>
            <Suspense fallback={<LoadingSpinner />}><Intervenants /></Suspense>
          </AdminRoute>
        } />

        <Route path="entreprises" element={
          <AdminRoute>
            <Suspense fallback={<LoadingSpinner />}><Companies /></Suspense>
          </AdminRoute>
        } />
        <Route path="groupes-travail" element={
          <AdminRoute>
            <Suspense fallback={<LoadingSpinner />}><WorkGroups /></Suspense>
          </AdminRoute>
        } />
        <Route path="messages" element={
          <SharedRoute>
            <Suspense fallback={<LoadingSpinner />}><Messages /></Suspense>
          </SharedRoute>
        } />
        <Route path="parametres" element={
          <SharedRoute>
            <Suspense fallback={<LoadingSpinner />}><Settings /></Suspense>
          </SharedRoute>
        } />
        <Route path="support" element={
          <SharedRoute>
            <Suspense fallback={<LoadingSpinner />}><SupportPage /></Suspense>
          </SharedRoute>
        } />
        <Route path="admin-support" element={
          <SuperAdminRoute>
            <Suspense fallback={<LoadingSpinner />}><AdminSupport /></Suspense>
          </SuperAdminRoute>
        } />
        <Route path="profil" element={
          <SharedRoute>
            <Suspense fallback={<LoadingSpinner />}><ProfilePage /></Suspense>
          </SharedRoute>
        } />
        
        {/* Routes Workflow VISA */}
        <Route path="validations" element={<Suspense fallback={<LoadingSpinner />}><Validations /></Suspense>} />
        <Route path="mes-signatures" element={<Suspense fallback={<LoadingSpinner />}><MesSignatures /></Suspense>} />
        <Route path="documents/:documentId" element={<Suspense fallback={<LoadingSpinner />}><DocumentDetail /></Suspense>} />
        <Route path="workflow-templates" element={
          <AdminRoute>
            <Suspense fallback={<LoadingSpinner />}><WorkflowTemplates /></Suspense>
          </AdminRoute>
        } />
        
        <Route path="videoconference" element={
          <SharedRoute>
            <Suspense fallback={<LoadingSpinner />}><VideoConference /></Suspense>
          </SharedRoute>
        } />
      </Route>
      
      {/* Super Admin Routes - Separate from main dashboard */}
      <Route path="/super-admin-login" element={<Suspense fallback={<LoadingSpinner />}><SuperAdminLogin /></Suspense>} />
      <Route element={<SuperAdminRoute />}>
        <Route path="/super-admin" element={<Suspense fallback={<LoadingSpinner />}><SuperAdminDashboard /></Suspense>} />
      </Route>
      
      <Route path="/404" element={<Suspense fallback={<LoadingSpinner />}><NotFound /></Suspense>} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};
