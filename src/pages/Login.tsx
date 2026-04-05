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
    <div className="min-h-screen flex bg-white" dir={textDirection}>
      {/* Partie gauche - Formulaire de connexion */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/aphs-logo.svg" alt="APHS Internationale" className="h-16 mx-auto" />
            <p className="mt-2 text-gray-500 font-medium">{t.subtitle}</p>
            <div className="mt-6 flex justify-center">
              <LanguageSelector 
                currentLanguage={language}
                onLanguageChange={setLanguage}
              />
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-2xl">
            <h2 className="text-3xl font-bold text-black mb-8">
              {t.title}
            </h2>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="email" className="text-gray-700 font-semibold mb-1.5 block">{t.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 border-gray-200 focus:border-blue-600 focus:ring-blue-600 transition-all"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <Label htmlFor="password" className="text-gray-700 font-semibold">{t.password}</Label>
                    <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                      {t.forgotPassword}
                    </a>
                  </div>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
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
                {isLoading ? t.loadingButton : t.loginButton}
              </Button>
              
              <div className="text-sm text-gray-500 mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="font-bold text-black mb-1">{language === 'fr' ? "Besoin d'aide ?" :
                                                  language === 'en' ? "Need help?" :
                                                  language === 'es' ? "¿Necesita ayuda?" :
                                                                     "هل تحتاج إلى مساعدة؟"}</p>
                <p>{t.contactAdmin}</p>
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
              {t.welcomeTitle} <br/>
              <span className="text-blue-500">APHS</span> <img src="/aphs-logo.svg" alt="APHS" className="inline h-12 ml-2 brightness-0 invert" />
            </h2>
            <p className="text-xl text-gray-200 mb-12 leading-relaxed">{t.welcomeSubtitle}</p>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all group">
                <h3 className="font-bold mb-2 text-blue-400 group-hover:text-blue-300">{t.projectManagement}</h3>
                <p className="text-sm text-gray-300">{t.projectManagementDesc}</p>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all group">
                <h3 className="font-bold mb-2 text-blue-400 group-hover:text-blue-300">{t.collaboration}</h3>
                <p className="text-sm text-gray-300">{t.collaborationDesc}</p>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all group">
                <h3 className="font-bold mb-2 text-blue-400 group-hover:text-blue-300">{t.communication}</h3>
                <p className="text-sm text-gray-300">{t.communicationDesc}</p>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all group">
                <h3 className="font-bold mb-2 text-blue-400 group-hover:text-blue-300">{t.analysis}</h3>
                <p className="text-sm text-gray-300">{t.analysisDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
