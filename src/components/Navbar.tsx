import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import LanguageSelector, { Language } from '@/components/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigateToLogin = () => {
    localStorage.setItem('preferredLanguage', language);
    navigate('/login');
  };

  const t = translations[language].navbar;
  const textDirection = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-4 transition-all duration-300",
        isScrolled ? "bg-white shadow-md py-2" : "bg-transparent"
      )}
      dir={textDirection}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <a href="/" className="flex items-center">
              <img src="/aphs-logo.svg" alt="APHS Internationale" className="h-14" />
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>{t.accompagnement}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-4 w-[400px] md:w-[500px] lg:w-[600px] grid-cols-2">
                      {[
                        {
                          title: language === 'fr' ? "Conseil en management" :
                                 language === 'en' ? "Management Consulting" :
                                 language === 'es' ? "Consultoría de gestión" :
                                                   "استشارات إدارية",
                          description: language === 'fr' ? "Services de conseil pour optimiser votre organisation" :
                                       language === 'en' ? "Advisory services to optimize your organization" : 
                                       language === 'es' ? "Servicios de asesoramiento para optimizar su organización" :
                                                         "خدمات استشارية لتحسين مؤسستك",
                        },
                        {
                          title: language === 'fr' ? "Gestion de projet" :
                                 language === 'en' ? "Project Management" :
                                 language === 'es' ? "Gestión de proyectos" :
                                                   "إدارة المشاريع",
                          description: language === 'fr' ? "Pilotage de projets complexes de bout en bout" :
                                       language === 'en' ? "End-to-end management of complex projects" : 
                                       language === 'es' ? "Gestión de proyectos complejos de principio a fin" :
                                                         "إدارة المشاريع المعقدة من البداية إلى النهاية",
                        },
                        {
                          title: language === 'fr' ? "Formation professionnelle" :
                                 language === 'en' ? "Professional Training" :
                                 language === 'es' ? "Formación profesional" :
                                                   "التدريب المهني",
                          description: language === 'fr' ? "Programmes de formation personnalisés" :
                                       language === 'en' ? "Customized training programs" : 
                                       language === 'es' ? "Programas de formación personalizados" :
                                                         "برامج تدريب مخصصة",
                        },
                        {
                          title: language === 'fr' ? "Audit & Diagnostic" :
                                 language === 'en' ? "Audit & Diagnostics" :
                                 language === 'es' ? "Auditoría y diagnóstico" :
                                                   "التدقيق والتشخيص",
                          description: language === 'fr' ? "Évaluation complète de vos processus" :
                                       language === 'en' ? "Comprehensive evaluation of your processes" : 
                                       language === 'es' ? "Evaluación completa de sus procesos" :
                                                         "تقييم شامل للعمليات الخاصة بك",
                        },
                      ].map((service) => (
                        <li key={service.title} className="row-span-1">
                          <NavigationMenuLink asChild>
                            <a
                              href="#"
                              className="flex flex-col justify-between p-4 h-full rounded-md hover:bg-gray-100"
                            >
                              <div>
                                <div className="text-sm font-medium text-purple-900 mb-1">{service.title}</div>
                                <p className="text-sm text-gray-600">{service.description}</p>
                              </div>
                            </a>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>{t.about}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-4 w-[400px] md:grid-cols-2">
                      <li className="row-span-3">
                        <NavigationMenuLink asChild>
                          <a
                            className="flex flex-col justify-between h-full rounded-md bg-gradient-to-b from-purple-50 to-teal-50 p-4 no-underline"
                            href="#about"
                          >
                            <div className="mb-2 mt-4 text-lg font-medium text-purple-900">
                              <img src="/aphs-logo.svg" alt="APHS Internationale" className="h-12" />
                            </div>
                            <p className="text-sm text-gray-600">
                              {language === 'fr' ? "Notre mission est d'accompagner les entreprises dans leur transformation digitale et organisationnelle." :
                               language === 'en' ? "Our mission is to support companies in their digital and organizational transformation." :
                               language === 'es' ? "Nuestra misión es apoyar a las empresas en su transformación digital y organizativa." :
                                                 "مهمتنا هي دعم الشركات في تحولها الرقمي والتنظيمي."}
                            </p>
                            <div className="mt-2 text-teal-600">
                              {language === 'fr' ? "En savoir plus →" : 
                               language === 'en' ? "Learn more →" :
                               language === 'es' ? "Saber más →" :
                                                 "معرفة المزيد →"}
                            </div>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a href="#team" className="block p-3 rounded-md hover:bg-gray-100">
                            <div className="text-sm font-medium text-purple-900 mb-1">
                              {language === 'fr' ? "Notre équipe" :
                               language === 'en' ? "Our team" :
                               language === 'es' ? "Nuestro equipo" :
                                                 "فريقنا"}
                            </div>
                            <p className="text-sm text-gray-600">
                              {language === 'fr' ? "Des experts dédiés à votre réussite" :
                               language === 'en' ? "Experts dedicated to your success" :
                               language === 'es' ? "Expertos dedicados a su éxito" :
                                                 "خبراء مكرسون لنجاحك"}
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a href="#history" className="block p-3 rounded-md hover:bg-gray-100">
                            <div className="text-sm font-medium text-purple-900 mb-1">
                              {language === 'fr' ? "Notre histoire" :
                               language === 'en' ? "Our history" :
                               language === 'es' ? "Nuestra historia" :
                                                 "تاريخنا"}
                            </div>
                            <p className="text-sm text-gray-600">
                              {language === 'fr' ? "Plus de 15 ans d'expérience" :
                               language === 'en' ? "More than 15 years of experience" :
                               language === 'es' ? "Más de 15 años de experiencia" :
                                                 "أكثر من 15 عامًا من الخبرة"}
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
            
            <a href="#features" className="text-purple-900 font-medium hover:text-teal-600 transition-colors">
              {t.support}
            </a>
            <a href="#testimonials" className="text-purple-900 font-medium hover:text-teal-600 transition-colors">
              {t.testimonials}
            </a>
            <LanguageSelector 
              currentLanguage={language}
              onLanguageChange={setLanguage}
            />
            <Button 
              variant="default" 
              className="bg-teal-600 hover:bg-purple-900 transition-colors"
              onClick={navigateToLogin}
            >
              {language === 'fr' ? "Connexion" : 
               language === 'en' ? "Login" :
               language === 'es' ? "Iniciar sesión" :
                                 "تسجيل الدخول"}
            </Button>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSelector 
              currentLanguage={language}
              onLanguageChange={setLanguage}
            />
            <Button 
              variant="outline"
              size="sm"
              className="mr-2"
              onClick={navigateToLogin}
            >
              {language === 'fr' ? "Connexion" : 
               language === 'en' ? "Login" :
               language === 'es' ? "Iniciar sesión" :
                                 "تسجيل الدخول"}
            </Button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-purple-900 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 py-4 bg-white rounded-lg shadow-lg">
            <div className="flex flex-col space-y-3 px-4">
              <a 
                href="#services" 
                className="text-purple-900 font-medium py-2 hover:text-teal-600 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.support}
              </a>
              <a 
                href="#about" 
                className="text-purple-900 font-medium py-2 hover:text-teal-600 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.about}
              </a>
              <a 
                href="#features" 
                className="text-purple-900 font-medium py-2 hover:text-teal-600 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.support}
              </a>
              <a 
                href="#testimonials" 
                className="text-purple-900 font-medium py-2 hover:text-teal-600 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.testimonials}
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;
