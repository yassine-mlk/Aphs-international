import React, { useEffect, useRef } from 'react';
import { translations } from '@/lib/translations';
import { useLanguage } from '@/contexts/LanguageContext';

const BenefitsSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const t = translations.fr.benefits;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const benefits = [
    {
      title: t.items[0].title,
      description: t.items[0].description,
      stat: "95%",
      statLabel: "Satisfaction client"
    },
    {
      title: t.items[1].title,
      description: t.items[1].description,
      stat: "200+",
      statLabel: "Projets réalisés"
    },
    {
      title: t.items[2].title,
      description: t.items[2].description,
      stat: "15+",
      statLabel: "Années d'expérience"
    }
  ];

  return (
    <section className="py-20 bg-white" ref={sectionRef}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              {t.title}
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              {t.subtitle}
            </p>
            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-lg">
                    {benefit.stat}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{benefit.title}</h3>
                    <p className="text-gray-600">{benefit.description}</p>
                    <p className="text-sm text-blue-600 mt-1">{benefit.statLabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img
              src="/about-illustration.svg"
              alt="Benefits illustration"
              className="w-full h-auto rounded-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
