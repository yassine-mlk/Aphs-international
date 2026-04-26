import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import AdminDashboard from './AdminDashboard';
import IntervenantDashboard from './IntervenantDashboard';
import { Loader2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (role === 'admin' || user?.email === 'admin@aps.com') {
    return <AdminDashboard />;
  }

  return <IntervenantDashboard />;
};

export default Dashboard;
