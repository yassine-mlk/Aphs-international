
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
          <h2 className="text-3xl md:text-4xl font-bold text-aphs-navy mb-4">
            {t.title}
          </h2>
          <p className="text-aphs-gray text-lg">
            {t.subtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {t.benefits.map((benefit, index) => (
            <div 
              key={index} 
              className={`rounded-xl p-8 text-center ${index === 0 ? 'bg-blue-100' : index === 1 ? 'bg-green-100' : 'bg-orange-100'} transition-all duration-500 hover:scale-105`}
            >
              <h3 className={`text-3xl font-bold mb-3 ${index === 0 ? 'text-blue-600' : index === 1 ? 'text-green-600' : 'text-orange-600'}`}>
                {benefit.title}
              </h3>
              <p className="text-gray-700">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-20 bg-gradient-to-r from-aphs-navy to-aphs-teal rounded-xl p-8 md:p-12 flex flex-col md:flex-row items-center">
          <div className="md:w-2/3 mb-8 md:mb-0">
            <h2 className="text-3xl font-bold text-white mb-4">
              {t.cta.title}
            </h2>
            <p className="text-white/90">
              {t.cta.subtitle}
            </p>
          </div>
          <div className="md:w-1/3 md:text-right">
            <a 
              href="#contact" 
              className="inline-block bg-white text-aphs-navy font-semibold py-3 px-8 rounded-lg hover:bg-opacity-90 transition-all"
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
