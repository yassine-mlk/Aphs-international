
import React, { useEffect, useRef } from 'react';
import { translations } from '@/lib/translations';
import { useLanguage } from '@/contexts/LanguageContext';

const BenefitsSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-reveal');
          const elements = entry.target.children;
          Array.from(elements).forEach(el => {
            el.classList.add('opacity-100');
            el.classList.remove('opacity-0', 'transform');
          });
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

  const t = translations[language].benefitsSection;
  const textDirection = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <section id="benefits" className="py-20 px-4 bg-white" dir={textDirection}>
      <div ref={sectionRef} className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
            {t.title}
          </h2>
          <p className="text-gray-600 text-lg">
            {t.subtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {t.benefits.map((benefit, index) => (
            <div 
              key={index} 
              className={`rounded-2xl p-10 text-center border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${
                index === 0 ? 'bg-blue-50 border-blue-100 hover:border-blue-600' : 
                index === 1 ? 'bg-gray-50 border-gray-100 hover:border-black' : 
                'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
              }`}
            >
              <h3 className={`text-4xl font-black mb-4 ${
                index === 2 ? 'text-white' : 
                index === 0 ? 'text-blue-600' : 'text-black'
              }`}>
                {benefit.title}
              </h3>
              <p className={index === 2 ? 'text-blue-50 font-medium' : 'text-gray-600 font-medium'}>
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-24 bg-black rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center justify-between border border-gray-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32"></div>
          <div className="md:w-2/3 relative z-10 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              {t.cta.title}
            </h2>
            <p className="text-gray-400 text-lg md:text-xl max-w-xl">
              {t.cta.subtitle}
            </p>
          </div>
          <div className="md:w-1/3 text-center md:text-right mt-10 md:mt-0 relative z-10">
            <a 
              href="#contact" 
              className="inline-block bg-blue-600 text-white font-bold py-4 px-10 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 transform hover:scale-105 active:scale-95"
            >
              {t.cta.button}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
