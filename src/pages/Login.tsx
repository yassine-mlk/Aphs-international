import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PasswordInput from '@/components/ui/password-input';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn, user, loading: authLoading } = useAuth();
    const redirectedRef = useRef(false);
  
  // Redirect if user is already logged in
  useEffect(() => {
    // Empêcher les redirections multiples
    if (redirectedRef.current || authLoading) return;
    
    if (user) {
      redirectedRef.current = true;
      
      // Check if super admin for redirect
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const redirectPath = userData?.isSuperAdmin ? '/super-admin' : '/dashboard';
      
      // Utiliser un délai minimal pour éviter le throttling
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 100);
    }
  }, [user, navigate, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Éviter les soumissions multiples
    if (isLoading) return;
    
    setIsLoading(true);

    try {
      const { user, error } = await signIn(email, password);
      
      if (error) {
        throw error;
      }
      
      if (user) {
        // Store user data in localStorage including the role
        
        // Récupérer le rôle depuis la table profiles (source de vérité pour SaaS)
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_super_admin, user_id, email')
          .eq('user_id', user.id)
          .maybeSingle();
        
        
        if (profileError && profileError.code !== 'PGRST116') {
        }
        
        let userRole = profileData?.role || user.user_metadata?.role || 'intervenant';
        
        // Force admin role for admin@aps.com
        if (email === 'admin@aps.com') {
          userRole = 'admin';
        }
        
        const userData = {
          email: user.email,
          role: userRole,
          isSuperAdmin: profileData?.is_super_admin || false,
          id: user.id
        };
        
        
        // Définir le localStorage avant la navigation
        localStorage.setItem('user', JSON.stringify(userData));
        
        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur votre espace",
          duration: 3000,
        });
        
        // Marquer comme redirigé avant de naviguer
        redirectedRef.current = true;
        
        // Redirection selon le rôle
        const redirectPath = userData.isSuperAdmin ? '/super-admin' : '/dashboard';
        
        // Utiliser replace: true et un délai minimal pour éviter le throttling
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 100);
      } else {
        throw new Error("Connexion échouée");
      }
    } catch (error) {
      toast({
        title: "Erreur de connexion",
        description: "Email ou mot de passe incorrect",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  
  return (
    <div className="min-h-screen flex bg-white">
      {/* Partie gauche - Formulaire de connexion */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/aps-logo.svg" alt="APS" className="h-16 mx-auto" />
            <p className="mt-2 text-gray-500 font-medium">Connectez-vous pour accéder à votre espace</p>
            <div className="mt-6 flex justify-center">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>🇫🇷</span>
                <span>Français</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-2xl">
            <h2 className="text-3xl font-bold text-black mb-8">
              Connexion
            </h2>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="email" className="text-gray-700 font-semibold mb-1.5 block">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 border-gray-200 focus:border-blue-600 focus:ring-blue-600 transition-all"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <Label htmlFor="password" className="text-gray-700 font-semibold">Mot de passe</Label>
                    <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                      Mot de passe oublié ?
                    </a>
                  </div>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-12 border-gray-200 focus:border-blue-600 focus:ring-blue-600 transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-black hover:bg-blue-600 text-white font-bold transition-all text-lg shadow-lg hover:shadow-blue-600/20"
                disabled={isLoading}
              >
                {isLoading ? "Connexion en cours..." : "Se connecter"}
              </Button>
              
              <div className="text-sm text-gray-500 mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="font-bold text-black mb-1">Besoin d'aide ?</p>
                <p>Contactez votre administrateur si vous n'avez pas de compte.</p>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Partie droite - Image/Illustration */}
      <div className="hidden lg:block lg:flex-1 bg-cover bg-center relative" style={{ 
        backgroundImage: 'url("https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1350&q=80")',
        backgroundSize: 'cover'
      }}>
        <div className="h-full w-full bg-black/60 backdrop-blur-[2px] flex flex-col justify-center p-16 text-white">
          <div className="max-w-xl">
            <h2 className="text-5xl font-black mb-8 leading-tight">
              Bienvenue sur la plateforme <br/>
              <span className="text-blue-500">APS</span> <img src="/aps-logo.svg" alt="APS" className="inline h-12 ml-2 brightness-0 invert" />
            </h2>
            <p className="text-xl text-gray-200 mb-12 leading-relaxed">Gérez vos projets et collaborez efficacement avec tous vos intervenants.</p>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all group">
                <h3 className="font-bold mb-2 text-blue-400 group-hover:text-blue-300">Gestion de Projets</h3>
                <p className="text-sm text-gray-300">Suivez l'avancement de vos projets en temps réel</p>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all group">
                <h3 className="font-bold mb-2 text-blue-400 group-hover:text-blue-300">Collaboration</h3>
                <p className="text-sm text-gray-300">Travaillez en équipe avec des outils puissants</p>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all group">
                <h3 className="font-bold mb-2 text-blue-400 group-hover:text-blue-300">Communication</h3>
                <p className="text-sm text-gray-300">Échangez avec vos collaborateurs rapidement</p>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all group">
                <h3 className="font-bold mb-2 text-blue-400 group-hover:text-blue-300">Analyse</h3>
                <p className="text-sm text-gray-300">Consultez des rapports détaillés sur vos activités</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
