import React, { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { translations } from '@/lib/translations';
import { useLanguage } from '@/contexts/LanguageContext';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  image: string;
  quote: string;
}

const testimonials: Record<string, Testimonial[]> = {
  en: [
    {
      name: "Philippe Chognot",
      role: "Director SOUTH WEST",
      company: "Stockmeier France",
      image: "/testimonials/philippe-chognot.jpg",
      quote: "This project had to be carried out in an occupied environment and in phases to guarantee production continuity. We thank Mr. Kharrat!"
    },
    {
      name: "Norbert Fradin",
      role: "Developer",
      company: "Fradin Promotion",
      image: "/testimonials/norbert-fradin.jpg",
      quote: "APHS and its teams supported us in delivering a 50-unit building within the allotted timeframe and in compliance with quality standards."
    },
    {
      name: "Alice Moll-Bocherel",
      role: "Director",
      company: "SEMIDEP",
      image: "/testimonials/alice-moll-bocherel.jpg",
      quote: "Mr. Kharrat carried out this project with great transparency and professionalism during the renovation of Hotel Paris 9."
    }
  ],
  fr: [
    {
      name: "Philippe Chognot",
      role: "Directeur SUD OUEST",
      company: "Stockmeier France",
      image: "/testimonials/philippe-chognot.jpg",
      quote: "Ce chantier devait se réaliser en milieu occupé et par phase afin de garantir la continuité de la production. Nous remercions Monsieur Kharrat !"
    },
    {
      name: "Norbert Fradin",
      role: "Promoteur",
      company: "Fradin Promotion",
      image: "/testimonials/norbert-fradin.jpg",
      quote: "APHS et ses équipes nous ont accompagné dans la livraison d'un immeuble de 50 logements dans les délais impartis et dans le respect de la qualité."
    },
    {
      name: "Alice Moll-Bocherel",
      role: "Directrice",
      company: "SEMIDEP",
      image: "/testimonials/alice-moll-bocherel.jpg",
      quote: "Monsieur Kharrat a réalisé ce chantier avec beaucoup de transparence et de professionnalisme. Rénovation Hôtel Paris 9."
    }
  ],
  es: [
    {
      name: "Philippe Chognot",
      role: "Director SUR OESTE",
      company: "Stockmeier France",
      image: "/testimonials/philippe-chognot.jpg",
      quote: "Este proyecto tuvo que realizarse en un entorno ocupado y por fases para garantizar la continuidad de la producción. ¡Agradecemos al Sr. Kharrat!"
    },
    {
      name: "Norbert Fradin",
      role: "Promotor",
      company: "Fradin Promotion",
      image: "/testimonials/norbert-fradin.jpg",
      quote: "APHS y sus equipos nos apoyaron en la entrega de un edificio de 50 unidades dentro del plazo asignado y cumpliendo con los estándares de calidad."
    },
    {
      name: "Alice Moll-Bocherel",
      role: "Directora",
      company: "SEMIDEP",
      image: "/testimonials/alice-moll-bocherel.jpg",
      quote: "El Sr. Kharrat llevó a cabo este proyecto con gran transparencia y profesionalismo durante la renovación del Hotel Paris 9."
    }
  ],
  ar: [
    {
      name: "فيليب شونو",
      role: "مدير الجنوب الغربي",
      company: "ستوكماير فرنسا",
      image: "/testimonials/philippe-chognot.jpg",
      quote: "كان يجب تنفيذ هذا المشروع في بيئة مشغولة وعلى مراحل لضمان استمرارية الإنتاج. نشكر السيد خرات!"
    },
    {
      name: "نوربرت فرادين",
      role: "مطور",
      company: "فرادين بروموشن",
      image: "/testimonials/norbert-fradin.jpg",
      quote: "دعمتنا APHS وفرقها في تسليم مبنى من 50 وحدة ضمن الإطار الزمني المخصص ووفقاً لمعايير الجودة."
    },
    {
      name: "أليس مول-بوشيريل",
      role: "مديرة",
      company: "سيميديب",
      image: "/testimonials/alice-moll-bocherel.jpg",
      quote: "نفذ السيد خرات هذا المشروع بشفافية ومهنية كبيرة خلال تجديد فندق باريس 9."
    }
  ]
};

const TestimonialsSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  
  const changeTestimonial = (newIndex: number) => {
    if (newIndex === activeIndex || isTransitioning) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveIndex(newIndex);
      setTimeout(() => setIsTransitioning(false), 100);
    }, 300);
  };
  
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % testimonials[language].length;
      changeTestimonial(nextIndex);
    }, 6000);
    
    return () => clearInterval(interval);
  }, [language, activeIndex]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in');
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

  const t = translations[language].testimonialsSection;
  const textDirection = language === 'ar' ? 'rtl' : 'ltr';
  const currentTestimonials = testimonials[language] || testimonials.en;

  return (
    <section id="testimonials" className="py-20 px-4 bg-gradient-to-br from-slate-50 to-white" dir={textDirection}>
      <div ref={sectionRef} className="container mx-auto opacity-0">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-aphs-navy mb-4">
            {t.title}
          </h2>
          <p className="text-aphs-gray text-lg">
            {t.subtitle}
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 relative overflow-hidden">
            {/* Éléments décoratifs */}
            <div className="absolute -top-6 -left-6 w-16 h-16 bg-gradient-to-br from-aphs-teal to-blue-500 rounded-full opacity-20"></div>
            <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-gradient-to-br from-blue-400 to-teal-500 rounded-full opacity-20"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Image du témoignage */}
                <div className="flex-shrink-0">
                  <div className={`w-32 h-40 rounded-2xl border-4 border-aphs-teal shadow-xl overflow-hidden bg-gradient-to-br from-slate-100 to-white transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                    <img 
                      src={currentTestimonials[activeIndex].image} 
                      alt={currentTestimonials[activeIndex].name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full bg-gradient-to-br from-aphs-teal to-blue-500 text-white text-2xl font-bold hidden items-center justify-center">
                      {currentTestimonials[activeIndex].name.substring(0, 2)}
                    </div>
                  </div>
                </div>
                
                {/* Contenu du témoignage */}
                <div className="flex-1">
                  <div className="text-4xl text-aphs-teal mb-4">"</div>
                  <p className={`text-lg md:text-xl text-aphs-navy mb-6 leading-relaxed transition-all duration-500 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                    {currentTestimonials[activeIndex].quote}
                  </p>
                  <div className={`transition-all duration-500 delay-100 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                    <h4 className="font-bold text-aphs-navy text-lg mb-1">{currentTestimonials[activeIndex].name}</h4>
                    <p className="text-aphs-teal font-medium">{currentTestimonials[activeIndex].role}</p>
                    <p className="text-sm text-aphs-gray">{currentTestimonials[activeIndex].company}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation points */}
          <div className="flex justify-center mt-8 space-x-3">
            {currentTestimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => changeTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 hover:scale-125 ${
                  activeIndex === index 
                    ? 'bg-aphs-teal shadow-lg' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`View testimonial ${index + 1}`}
              />
            ))}
          </div>
          
          {/* Navigation arrows */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => changeTestimonial((activeIndex - 1 + currentTestimonials.length) % currentTestimonials.length)}
              className="p-3 rounded-full bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 text-aphs-teal"
              aria-label="Previous testimonial"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            <div className="text-center">
              <span className="text-sm text-aphs-gray">{activeIndex + 1} / {currentTestimonials.length}</span>
            </div>
            
            <button
              onClick={() => changeTestimonial((activeIndex + 1) % currentTestimonials.length)}
              className="p-3 rounded-full bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 text-aphs-teal"
              aria-label="Next testimonial"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
