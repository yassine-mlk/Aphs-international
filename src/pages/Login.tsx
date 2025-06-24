import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import LanguageSelector from '@/components/LanguageSelector';
import PasswordInput from '@/components/ui/password-input';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn, user, loading: authLoading } = useAuth();
  const { language, setLanguage } = useLanguage();
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
          title: language === 'fr' ? "Connexion réussie" :
                 language === 'en' ? "Login successful" :
                 language === 'es' ? "Inicio de sesión exitoso" :
                                   "تم تسجيل الدخول بنجاح",
          description: language === 'fr' ? "Bienvenue sur votre espace" :
                       language === 'en' ? "Welcome to your workspace" :
                       language === 'es' ? "Bienvenido a su espacio de trabajo" :
                                         "مرحباً بك في مساحة العمل الخاصة بك",
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
        title: language === 'fr' ? "Erreur de connexion" :
               language === 'en' ? "Login error" :
               language === 'es' ? "Error de inicio de sesión" :
                                 "خطأ في تسجيل الدخول",
        description: language === 'fr' ? "Email ou mot de passe incorrect" :
                     language === 'en' ? "Incorrect email or password" :
                     language === 'es' ? "Correo electrónico o contraseña incorrectos" :
                                       "بريد إلكتروني أو كلمة مرور غير صحيحة",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const t = translations[language].loginPage;
  const textDirection = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-purple-50 to-indigo-50" dir={textDirection}>
      {/* Partie gauche - Formulaire de connexion */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/aphs-logo.svg" alt="APHS Internationale" className="h-16 mx-auto" />
            <p className="mt-2 text-gray-600">{t.subtitle}</p>
            <div className="mt-4 flex justify-center">
              <LanguageSelector 
                currentLanguage={language}
                onLanguageChange={setLanguage}
              />
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {t.title}
            </h2>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-gray-700">{t.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-gray-700">{t.password}</Label>
                    <a href="#" className="text-sm text-teal-600 hover:text-teal-700">
                      {t.forgotPassword}
                    </a>
                  </div>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
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
                {isLoading ? t.loadingButton : t.loginButton}
              </Button>
              
              <div className="text-sm text-gray-500 mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium mb-2">{language === 'fr' ? "Informations de connexion:" :
                                                  language === 'en' ? "Login information:" :
                                                  language === 'es' ? "Información de inicio de sesión:" :
                                                                     "معلومات تسجيل الدخول:"}</p>
                <p>{t.contactAdmin}</p>
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
          <h2 className="text-4xl font-bold mb-6">
            {t.welcomeTitle} <img src="/aphs-logo.svg" alt="APHS Internationale" className="inline h-14 ml-2" />
          </h2>
          <p className="text-xl mb-8">{t.welcomeSubtitle}</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold mb-2">{t.projectManagement}</h3>
              <p>{t.projectManagementDesc}</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold mb-2">{t.collaboration}</h3>
              <p>{t.collaborationDesc}</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold mb-2">{t.communication}</h3>
              <p>{t.communicationDesc}</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold mb-2">{t.analysis}</h3>
              <p>{t.analysisDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
