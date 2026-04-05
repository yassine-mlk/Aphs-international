
import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { translations } from '@/lib/translations';
import { useLanguage } from '@/contexts/LanguageContext';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  delay: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon, delay }) => {
  return (
    <div 
      className={cn(
        "bg-white rounded-xl p-6 card-shadow opacity-0",
        "hover:border-b-4 hover:border-aphs-teal hover:-translate-y-1 transition-all duration-300"
      )}
      style={{
        animationDelay: `${delay * 0.2}s`,
        animationFillMode: 'forwards'
      }}
    >
      <div className="h-12 w-12 bg-aphs-teal/10 rounded-lg flex items-center justify-center mb-4">
        <span className="text-aphs-teal text-2xl">{icon}</span>
      </div>
      <h3 className="text-xl font-semibold mb-2 text-aphs-navy">{title}</h3>
      <p className="text-aphs-gray">{description}</p>
    </div>
  );
};

const FeaturesSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const elements = entry.target.querySelectorAll('.opacity-0');
          elements.forEach((el, i) => {
            setTimeout(() => {
              el.classList.add('animate-fade-in');
            }, i * 150);
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

  const t = translations[language].featuresSection;
  const textDirection = language === 'ar' ? 'rtl' : 'ltr';
  const icons = ["📊", "👷", "📝", "💰", "⚙️", "🤝"];

  return (
    <section id="features" className="py-24 px-4 bg-white" dir={textDirection}>
      <div ref={sectionRef} className="container mx-auto opacity-0">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-6">
            {t.title}
          </h2>
          <p className="text-gray-600 text-lg md:text-xl leading-relaxed">
            {t.subtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {t.features.map((feature, index) => (
            <div 
              key={index} 
              className="group p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-2xl hover:border-blue-600 transition-all duration-500 hover:-translate-y-2"
            >
              <div className="w-14 h-14 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-500">
                <span className="text-2xl">{icons[index]}</span>
              </div>
              <h3 className="text-xl font-bold text-black mb-3 group-hover:text-blue-600 transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
