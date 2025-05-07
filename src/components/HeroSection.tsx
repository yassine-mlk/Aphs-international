import React, { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { translations } from '@/lib/translations';
import { useLanguage } from '@/contexts/LanguageContext';

const HeroSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  
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

  const t = translations[language].heroSection;
  const textDirection = language === 'ar' ? 'rtl' : 'ltr';

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <section className="pt-28 pb-16 md:pt-32 md:pb-20 px-4 bg-gradient-to-br from-white to-purple-50">
      <div 
        ref={sectionRef}
        className="container mx-auto flex flex-col md:flex-row items-center opacity-0 translate-y-10 transition-all duration-1000"
        dir={textDirection}
      >
        <div className="w-full md:w-1/2 space-y-6 mb-10 md:mb-0">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4">
              {language === 'fr' ? (
                <span>
                  <span className="text-purple-900">APHS</span>{' '}
                  <span className="text-teal-600">Internationale</span><br />
                  <span className="text-purple-900">{translations[language].heroSection.title.split(' ')[0]}</span>{' '}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-blue-500">
                    {translations[language].heroSection.title.split(' ').slice(1).join(' ')}
                  </span>
                </span>
              ) : language === 'ar' ? (
                <span dir="rtl" className="block">
                  <span className="text-purple-900">APHS</span>{' '}
                  <span className="text-teal-600">Internationale</span><br />
                  <span className="text-purple-900">{translations[language].heroSection.title.split(' ')[0]}</span>{' '}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-blue-500">
                    {translations[language].heroSection.title.split(' ').slice(1).join(' ')}
                  </span>
                </span>
              ) : (
                <span>
                  <span className="text-purple-900">APHS</span>{' '}
                  <span className="text-teal-600">Internationale</span><br />
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
              className="border-purple-900 text-purple-900 hover:bg-purple-900 hover:text-white"
              size="lg"
            >
              {t.cta.secondary}
            </Button>
          </div>
          <div className="flex items-center pt-2">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-purple-200 to-teal-200"
                  style={{ 
                    backgroundImage: `url(https://randomuser.me/api/portraits/men/${i+10}.jpg)`,
                    backgroundSize: 'cover' 
                  }}
                ></div>
              ))}
            </div>
            <p className="ml-3 text-sm text-gray-600">
              <span className="font-semibold">500+</span> {t.users}
            </p>
          </div>
        </div>
        
        <div className="w-full md:w-1/2 relative">
          <div className="absolute -z-10 top-0 right-0 w-72 h-72 bg-teal-100 rounded-full blur-3xl opacity-80"></div>
          <div className="absolute -z-10 bottom-0 left-0 w-72 h-72 bg-purple-100 rounded-full blur-3xl opacity-80"></div>
          <div className="relative z-10 rounded-lg overflow-hidden shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1541976590-713941681591?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
              alt="Construction project dashboard" 
              className="w-full h-auto rounded-lg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent"></div>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-teal-500 rounded-2xl rotate-12 z-0 blur-sm"></div>
          <div className="absolute -top-6 -left-6 w-16 h-16 bg-purple-500 rounded-2xl rotate-45 z-0 blur-sm"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
