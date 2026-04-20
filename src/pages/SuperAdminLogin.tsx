import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

const SuperAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Rediriger si déjà connecté comme Super Admin
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Vérifier si c'est un Super Admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (profile?.is_super_admin) {
          navigate('/super-admin', { replace: true });
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erreur de connexion');

      // 2. Vérifier si c'est un Super Admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_super_admin, role, first_name, last_name')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // 3. Check Super Admin
      const isSuperAdmin = profile?.is_super_admin === true;
      
      if (!isSuperAdmin) {
        // Déconnecter si pas Super Admin
        await supabase.auth.signOut();
        throw new Error('Accès réservé aux Super Administrateurs');
      }

      // 4. Stocker les infos
      localStorage.setItem('userRole', 'super_admin');
      localStorage.setItem('isSuperAdmin', 'true');
      localStorage.setItem('userEmail', email);
      
      toast({
        title: 'Bienvenue Super Admin',
        description: `Connecté en tant que ${profile?.first_name || email}`,
      });

      // 5. Rediriger
      navigate('/super-admin', { replace: true });

    } catch (err: any) {
      console.error('Super Admin login error:', err);
      setError(err.message || 'Erreur de connexion');
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de se connecter',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Super Admin
            </h1>
            <p className="text-slate-400 text-sm">
              Espace d'administration sécurisé
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email Super Admin
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exemple.com"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-xl font-semibold shadow-lg shadow-purple-500/25 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          {/* Links */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <a
              href="/login"
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              ← Retour au login utilisateur
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-8">
          Accès réservé aux administrateurs système
        </p>
      </motion.div>
    </div>
  );
};

export default SuperAdminLogin;
