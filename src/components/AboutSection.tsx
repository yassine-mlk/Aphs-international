import React, { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { translations } from '@/lib/translations';
import { Language } from './LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';

interface TeamMember {
  name: string;
  title: {
    en: string;
    fr: string;
    es: string;
    ar: string;
  };
  image: string;
}

const teamMembers: TeamMember[] = [
  {
    name: "Said Kharrat",
    title: {
      en: "Chief Executive Officer",
      fr: "Président-directeur général",
      es: "Director Ejecutivo",
      ar: "الرئيس التنفيذي"
    },
    image: "/team/person1.jpg"
  },
  {
    name: "Agnes Barokel",
    title: {
      en: "Chief Operations Officer",
      fr: "Directrice des opérations",
      es: "Directora de Operaciones",
      ar: "مدير العمليات"
    },
    image: "/team/person2.jpg"
  },
  {
    name: "Fernando Passareli",
    title: {
      en: "Chief Technology Officer",
      fr: "Directeur technique",
      es: "Director de Tecnología",
      ar: "المدير التقني"
    },
    image: "/team/person3.jpg"
  }
];

interface AboutSectionProps {
  language: Language;
}

const AboutSection: React.FC<AboutSectionProps> = ({ language }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100');
          entry.target.classList.remove('opacity-0', 'translate-y-10');
          
          // Animate team members with delay
          const teamElements = entry.target.querySelectorAll('.team-member');
          teamElements.forEach((el, i) => {
            setTimeout(() => {
              el.classList.add('opacity-100', 'translate-y-0');
              el.classList.remove('opacity-0', 'translate-y-10');
            }, i * 200);
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

  const t = translations[language].aboutSection;
  const textDirection = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <section id="about" className="py-20 px-4 bg-white">
      <div 
        ref={sectionRef}
        className="container mx-auto opacity-0 translate-y-10 transition-all duration-1000"
        dir={textDirection}
      >
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-aphs-navy mb-4">
            {t.title}
          </h2>
          <p className="text-aphs-gray text-lg">
            {t.subtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-16">
          {teamMembers.map((member, index) => (
            <div 
              key={index}
              className="team-member opacity-0 translate-y-10 transition-all duration-500 flex flex-col items-center text-center group"
            >
              <div className="relative mb-6">
                <div className="h-72 w-48 rounded-2xl border-4 border-aphs-teal shadow-2xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-3xl overflow-hidden bg-gradient-to-br from-slate-100 to-white">
                  <img 
                    src={member.image} 
                    alt={member.name} 
                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full bg-gradient-to-br from-aphs-teal to-blue-500 text-white text-4xl font-bold hidden items-center justify-center">
                    {member.name.substring(0, 2)}
                  </div>
                </div>
                <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-gradient-to-br from-aphs-teal to-blue-500 rounded-full opacity-80 animate-pulse"></div>
              </div>
              <h3 className="text-2xl font-bold text-aphs-navy mb-2 group-hover:text-aphs-teal transition-colors duration-300">{member.name}</h3>
              <p className="text-aphs-teal font-medium text-lg">{member.title[language]}</p>
            </div>
          ))}
        </div>
        
        <div className="bg-gradient-to-r from-aphs-navy to-aphs-teal p-8 md:p-12 rounded-xl text-white">
          <div className="md:flex items-center">
            <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
              <h3 className="text-2xl font-bold mb-4">{t.mission.title}</h3>
              <p className="mb-4">{t.mission.content}</p>
              <p>{t.mission.vision}</p>
            </div>
            <div className="md:w-1/3 bg-white/10 p-6 rounded-lg backdrop-blur-sm">
              <h4 className="font-bold mb-3 text-xl">{t.values.title}</h4>
              <ul className="space-y-2">
                {t.values.list.map((value, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="bg-white text-aphs-teal rounded-full h-6 w-6 flex items-center justify-center text-sm">
                      {index + 1}
                    </span>
                    <span>{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
