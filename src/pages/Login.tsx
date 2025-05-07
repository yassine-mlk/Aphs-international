import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '../contexts/AuthContext';

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
      console.log('Login - User already logged in, redirecting to dashboard');
      redirectedRef.current = true;
      
      // Utiliser un délai minimal pour éviter le throttling
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
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
        console.log('Login successful - User data:', user);
        
        let userRole = user.user_metadata?.role || 'intervenant';
        
        // Force admin role for admin@aphs.com
        if (email === 'admin@aphs.com') {
          userRole = 'admin';
          console.log('Forcing admin role for admin@aphs.com');
        }
        
        const userData = {
          email: user.email,
          role: userRole,
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
        
        // Utiliser replace: true et un délai minimal pour éviter le throttling
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      } else {
        throw new Error("Connexion échouée");
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
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
    <div className="min-h-screen flex bg-gradient-to-br from-purple-50 to-indigo-50">
      {/* Partie gauche - Formulaire de connexion */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/aphs-logo.svg" alt="APHS Internationale" className="h-16 mx-auto" />
            <p className="mt-2 text-gray-600">Connectez-vous pour accéder à votre espace</p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Connexion
            </h2>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-gray-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-gray-700">Mot de passe</Label>
                    <a href="#" className="text-sm text-teal-600 hover:text-teal-700">
                      Mot de passe oublié?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 w-full"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Connexion en cours...' : 'Se connecter'}
              </Button>
              
              <div className="text-sm text-gray-500 mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium mb-2">Informations de connexion:</p>
                <p>Contactez votre administrateur si vous n'avez pas de compte.</p>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Partie droite - Image/Illustration */}
      <div className="hidden lg:block lg:flex-1 bg-cover bg-center" style={{ 
        backgroundImage: 'url("https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1350&q=80")',
        backgroundSize: 'cover'
      }}>
        <div className="h-full w-full bg-gradient-to-br from-purple-900/70 to-indigo-900/70 flex flex-col justify-center p-12 text-white">
          <h2 className="text-4xl font-bold mb-6">Bienvenue sur la plateforme <img src="/aphs-logo.svg" alt="APHS Internationale" className="inline h-14 ml-2" /></h2>
          <p className="text-xl mb-8">Gérez vos projets et collaborez efficacement avec tous vos intervenants.</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold mb-2">Gestion de projets</h3>
              <p>Suivez l'avancement de vos projets en temps réel</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold mb-2">Collaboration</h3>
              <p>Travaillez en équipe avec des outils performants</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold mb-2">Communication</h3>
              <p>Échangez avec vos collaborateurs rapidement</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold mb-2">Analyse</h3>
              <p>Visualisez des rapports détaillés sur vos activités</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
