
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

  return (
    <section id="features" className="py-20 px-4 bg-gray-50" dir={textDirection}>
      <div ref={sectionRef} className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16 opacity-0">
          <h2 className="text-3xl md:text-4xl font-bold text-aphs-navy mb-4">
            {t.title}
          </h2>
          <p className="text-aphs-gray text-lg">
            {t.subtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {t.features.map((feature, index) => (
            <FeatureCard 
              key={index}
              title={feature.title}
              description={feature.description}
              icon={index === 0 ? "📊" : 
                    index === 1 ? "👷" : 
                    index === 2 ? "📝" : 
                    index === 3 ? "💰" :
                    index === 4 ? "⚙️" : "🤝"}
              delay={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
