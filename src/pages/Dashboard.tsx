import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import IntervenantDashboard from './IntervenantDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Déterminer si l'utilisateur est un administrateur
  // Le rôle est maintenant stocké dans localStorage par Login.tsx (source de vérité: table profiles)
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = userData?.role === 'admin' || 
                 user?.email === 'admin@aps.com';

  // Rendu conditionnel selon le rôle
  if (isAdmin) {
    return <AdminDashboard />;
  } else {
    return <IntervenantDashboard />;
  }
};

export default Dashboard;
