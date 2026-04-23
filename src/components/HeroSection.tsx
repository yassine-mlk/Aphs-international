import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { X, Play } from 'lucide-react';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';

const HeroSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
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

  const textDirection = 'ltr';

  const navigateToLogin = () => {
    navigate('/login');
  };

  const openVideoModal = () => {
    setIsVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
  };

  // Définir les chemins des vidéos
  const getVideoPath = () => {
    return '/videos/demo-fr.mp4';
  };

  return (
    <>
      <section 
        ref={sectionRef}
        className="relative min-h-[90vh] lg:min-h-[85vh] bg-white flex items-center px-4 pt-24 pb-16 opacity-0 translate-y-10 transition-all duration-1000 ease-out"
        dir={textDirection}
      >
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left order-2 lg:order-1">
              <div className="mb-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  <span>
                    <span className="text-black">{APP_NAME.split(' ')[0]}</span>{' '}
                    <span className="text-blue-600">
                      {APP_NAME.split(' ').slice(1).join(' ')}
                    </span>
                  </span>
                </h1>
              </div>
              <p className="text-lg md:text-xl text-gray-600 max-w-lg">
                {APP_DESCRIPTION}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  className="bg-black hover:bg-blue-600 text-white font-medium transition-colors"
                  size="lg"
                  onClick={navigateToLogin}
                >
                  Commencer maintenant
                </Button>
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <div className="relative">
                {/* Image du tableau de bord */}
                <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" 
                    alt="Tableau de bord APS"
                    className="w-full h-auto rounded-2xl"
                  />
                  
                  {/* Overlay avec logo et info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                  
                  {/* Badge flottant */}
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-800">
                        En ligne
                      </span>
                    </div>
                  </div>
                  
                  {/* Statistiques flottantes */}
                  <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-100">
                    <div className="text-sm">
                      <div className="flex items-center gap-2 text-blue-600 font-bold">
                        <span>📈</span>
                        <span>+23%</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Productivité
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Éléments décoratifs */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-600/10 rounded-full animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-black/5 rounded-full animate-pulse delay-1000"></div>
                
                {/* Petites cartes flottantes */}
                <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 bg-white rounded-xl shadow-xl p-4 hidden lg:block border border-gray-50">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-2">
                    <span className="text-sm">👥</span>
                  </div>
                  <div className="text-xs font-medium text-gray-800">
                    Équipes
                  </div>
                  <div className="text-xs text-blue-600 font-bold">127</div>
                </div>
                
                <div className="absolute -right-6 top-1/3 bg-white rounded-xl shadow-xl p-4 hidden lg:block border border-gray-50">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center mb-2">
                    <span className="text-sm">📋</span>
                  </div>
                  <div className="text-xs font-medium text-gray-800">
                    Projets
                  </div>
                  <div className="text-xs text-blue-600 font-bold">42</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bouton Play flottant pour la vidéo */}
      <div className="fixed bottom-8 left-8 z-40">
        <button 
          onClick={openVideoModal}
          className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-gray-200 px-5 py-3 rounded-full shadow-2xl hover:bg-black hover:text-white group transition-all duration-500 hover:scale-105"
        >
          <div className="relative">
            <div className="absolute -inset-2 bg-blue-600/20 rounded-full animate-ping group-hover:bg-blue-600/40"></div>
            <div className="relative w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
              <Play className="w-5 h-5 fill-current ml-1" />
            </div>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Regarder</span>
            <span className="text-sm font-bold">Démo Vidéo</span>
          </div>
        </button>
      </div>

      {/* Modal Vidéo */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div 
            className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity"
            onClick={closeVideoModal}
          ></div>
          
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-scale-in">
            <button 
              onClick={closeVideoModal}
              className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
            >
              <X className="w-6 h-6" />
            </button>
            
            <video 
              autoPlay 
              controls 
              className="w-full h-full"
            >
              <source src={getVideoPath()} type="video/mp4" />
              Votre navigateur ne supporte pas les vidéos HTML5.
            </video>
            
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
              <h3 className="text-white font-bold text-xl">Vidéo de démonstration - APS</h3>
              <p className="text-white/60 text-sm">Découvrez comment APS transforme la gestion de vos chantiers.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeroSection;
