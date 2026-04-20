import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import AdminDashboard from './AdminDashboard';
import IntervenantDashboard from './IntervenantDashboard';
import { Loader2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRole = async () => {
      // Source de vérité : table profiles
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const fetchedRole = data?.role || user.user_metadata?.role || 'intervenant';
      
      // Mettre à jour le localStorage aussi
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, role: fetchedRole }));

      setRole(fetchedRole);
      setIsLoading(false);
    };

    fetchRole();
  }, [user]);

  if (isLoading) {
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
