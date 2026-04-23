import React, { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NAV } from '@/lib/constants';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  image: string;
  quote: string;
}

const testimonials: Testimonial[] = [
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
    quote: "APS et ses équipes nous ont accompagné dans la livraison d'un immeuble de 50 logements dans les délais impartis et dans le respect de la qualité."
  },
  {
    name: "Alice Moll-Bocherel",
    role: "Directrice",
    company: "SEMIDEP",
    image: "/testimonials/alice-moll-bocherel.jpg",
    quote: "Monsieur Kharrat a réalisé ce chantier avec beaucoup de transparence et de professionnalisme. Rénovation Hôtel Paris 9."
  }
];

const TestimonialsSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
    
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
      const nextIndex = (activeIndex + 1) % testimonials.length;
      changeTestimonial(nextIndex);
    }, 6000);
    
    return () => clearInterval(interval);
  }, [activeIndex]);

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

  return (
    <section id="testimonials" className="py-20 px-4 bg-gray-50">
      <div ref={sectionRef} className="container mx-auto opacity-0">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
            {NAV.testimonials}
          </h2>
          <p className="text-gray-600 text-lg">
            Ce que nos clients disent de nous
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 relative overflow-hidden border border-gray-100">
            {/* Éléments décoratifs */}
            <div className="absolute -top-6 -left-6 w-16 h-16 bg-blue-600/5 rounded-full"></div>
            <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-black/5 rounded-full"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Image du témoignage */}
                <div className="flex-shrink-0">
                  <div className={`w-32 h-40 rounded-2xl border-4 border-blue-600 shadow-lg overflow-hidden bg-gray-50 transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                    <img 
                      src={testimonials[activeIndex].image} 
                      alt={testimonials[activeIndex].name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full bg-blue-600 text-white text-2xl font-bold hidden items-center justify-center">
                      {testimonials[activeIndex].name.substring(0, 2)}
                    </div>
                  </div>
                </div>
                
                {/* Contenu du témoignage */}
                <div className="flex-1">
                  <div className="text-4xl text-blue-600 mb-4 font-serif">"</div>
                  <p className={`text-lg md:text-xl text-black mb-6 leading-relaxed transition-all duration-500 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                    {testimonials[activeIndex].quote}
                  </p>
                  <div className={`transition-all duration-500 delay-100 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                    <h4 className="font-bold text-black text-lg mb-1">{testimonials[activeIndex].name}</h4>
                    <p className="text-blue-600 font-semibold">{testimonials[activeIndex].role}</p>
                    <p className="text-sm text-gray-500">{testimonials[activeIndex].company}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation points */}
          <div className="flex justify-center mt-8 space-x-3">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => changeTestimonial(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 hover:scale-125 ${
                  activeIndex === index 
                    ? 'bg-blue-600 w-8' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Voir le témoignage ${index + 1}`}
              />
            ))}
          </div>
          
          {/* Navigation arrows */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => changeTestimonial((activeIndex - 1 + testimonials.length) % testimonials.length)}
              className="p-3 rounded-full bg-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 text-blue-600 border border-gray-100"
              aria-label="Témoignage précédent"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            <div className="text-center">
              <span className="text-sm text-gray-500 font-medium">{activeIndex + 1} / {testimonials.length}</span>
            </div>
            
            <button
              onClick={() => changeTestimonial((activeIndex + 1) % testimonials.length)}
              className="p-3 rounded-full bg-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 text-blue-600 border border-gray-100"
              aria-label="Témoignage suivant"
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
