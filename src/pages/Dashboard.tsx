import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import IntervenantDashboard from './IntervenantDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Déterminer si l'utilisateur est un administrateur
  const isAdmin = user?.user_metadata?.role === 'admin' || 
                 user?.email === 'admin@aphs.com' || 
                 JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin';

  // Rendu conditionnel selon le rôle
  if (isAdmin) {
    return <AdminDashboard />;
  } else {
    return <IntervenantDashboard />;
  }
};

export default Dashboard;
