import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { translations } from '@/lib/translations';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Play } from 'lucide-react';

const HeroSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100');
          entry.target.classList.remove('opacity-0', 'translate-y-10');
        }
      });
    }, { threshold: 0.1 });
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    
    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  // Fermer le modal vidéo avec Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsVideoModalOpen(false);
      }
    };

    if (isVideoModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Empêcher le scroll
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isVideoModalOpen]);

  const t = translations[language].heroSection;
  const textDirection = language === 'ar' ? 'rtl' : 'ltr';

  const navigateToLogin = () => {
    // Assurer que la langue est sauvegardée avant navigation
    localStorage.setItem('preferredLanguage', language);
    navigate('/login');
  };

  const openVideoModal = () => {
    setIsVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
  };

  // Définir les chemins des vidéos selon la langue
  const getVideoPath = () => {
    switch (language) {
      case 'fr':
        return '/videos/demo-fr.mp4';
      case 'en':
        return '/videos/demo-en.mp4';
      case 'es':
        return '/videos/demo-es.mp4';
      case 'ar':
        return '/videos/demo-ar.mp4';
      default:
        return '/videos/demo-fr.mp4';
    }
  };

  return (
    <>
      <section 
        ref={sectionRef}
        className="relative min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50 flex items-center px-4 pt-20 opacity-0 translate-y-10 transition-all duration-1000 ease-out"
        dir={textDirection}
      >
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left order-2 lg:order-1">
              <div className="mb-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  {language === 'ar' ? (
                    <span dir="rtl" className="block">
                      <span className="text-purple-900">{translations[language].heroSection.title.split(' ')[0]}</span>{' '}
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-blue-500">
                        {translations[language].heroSection.title.split(' ').slice(1).join(' ')}
                      </span>
                    </span>
                  ) : (
                    <span>

                      <span className="text-purple-900">{translations[language].heroSection.title.split(' ')[0]}</span>{' '}
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-blue-500">
                        {translations[language].heroSection.title.split(' ').slice(1).join(' ')}
                      </span>
                    </span>
                  )}
                </h1>
              </div>
              <p className="text-lg md:text-xl text-gray-600 max-w-lg">
                {t.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-medium"
                  size="lg"
                  onClick={navigateToLogin}
                >
                  {t.cta.primary}
                </Button>
                <Button 
                  variant="outline" 
                  className="border-purple-900 text-purple-900 hover:bg-purple-900 hover:text-white flex items-center gap-2"
                  size="lg"
                  onClick={openVideoModal}
                >
                  <Play className="w-4 h-4" />
                  {t.cta.secondary}
                </Button>
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <div className="relative">
                {/* Image du tableau de bord */}
                <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" 
                    alt={language === 'fr' ? "Tableau de bord APHS Builder" :
                         language === 'en' ? "APHS Builder Dashboard" :
                         language === 'es' ? "Panel de Control APHS Builder" :
                                           "لوحة تحكم APHS Builder"}
                    className="w-full h-auto rounded-2xl"
                  />
                  
                  {/* Overlay avec logo et info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-900/30 via-transparent to-transparent"></div>
                  
                  {/* Badge flottant */}
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-800">
                        {language === 'fr' ? 'En ligne' :
                         language === 'en' ? 'Online' :
                         language === 'es' ? 'En línea' :
                                           'متصل'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Statistiques flottantes */}
                  <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                    <div className="text-sm">
                      <div className="flex items-center gap-2 text-green-600 font-medium">
                        <span>📈</span>
                        <span>+23%</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {language === 'fr' ? 'Productivité' :
                         language === 'en' ? 'Productivity' :
                         language === 'es' ? 'Productividad' :
                                           'الإنتاجية'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Éléments décoratifs */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-20 animate-pulse delay-1000"></div>
                
                {/* Petites cartes flottantes */}
                <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 bg-white rounded-xl shadow-lg p-4 hidden lg:block">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mb-2">
                    <span className="text-sm text-teal-600">👥</span>
                  </div>
                  <div className="text-xs font-medium text-gray-800">
                    {language === 'fr' ? 'Équipes' :
                     language === 'en' ? 'Teams' :
                     language === 'es' ? 'Equipos' :
                                       'الفرق'}
                  </div>
                  <div className="text-xs text-teal-600 font-bold">127</div>
                </div>
                
                <div className="absolute -right-6 top-1/3 bg-white rounded-xl shadow-lg p-4 hidden lg:block">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                    <span className="text-sm text-purple-600">📋</span>
                  </div>
                  <div className="text-xs font-medium text-gray-800">
                    {language === 'fr' ? 'Projets' :
                     language === 'en' ? 'Projects' :
                     language === 'es' ? 'Proyectos' :
                                       'المشاريع'}
                  </div>
                  <div className="text-xs text-purple-600 font-bold">43</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats section */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-bold text-2xl text-teal-600">500+</span><br />
            {t.users}
          </p>
        </div>
      </section>

      {/* Modal Vidéo */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="relative w-full max-w-4xl mx-4">
            <button
              onClick={closeVideoModal}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="Fermer la vidéo"
            >
              <X className="w-8 h-8" />
            </button>
            
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                controls
                autoPlay
                className="w-full h-full"
                onEnded={closeVideoModal}
              >
                <source src={getVideoPath()} type="video/mp4" />
                <p className="text-white p-4">
                  {language === 'fr' ? "Votre navigateur ne supporte pas les vidéos HTML5." :
                   language === 'en' ? "Your browser does not support HTML5 video." :
                   language === 'es' ? "Su navegador no admite video HTML5." :
                                     "متصفحك لا يدعم فيديو HTML5."}
                </p>
              </video>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-white text-sm">
                {language === 'fr' ? "Vidéo de démonstration - APHS Builder" :
                 language === 'en' ? "Demo Video - APHS Builder" :
                 language === 'es' ? "Video de Demostración - APHS Builder" :
                                   "فيديو توضيحي - APHS Builder"}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeroSection;
