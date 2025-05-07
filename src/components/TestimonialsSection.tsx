
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
      name: "Sarah Johnson",
      role: "Project Manager",
      company: "BuildCorp Inc.",
      image: "https://images.unsplash.com/photo-1584361853901-dd1904bb7987?crop=faces&cs=tinysrgb&fit=crop&auto=format&w=200&q=80",
      quote: "APHS Internationale has revolutionized how we manage construction projects. The real-time tracking and budget monitoring features have saved us countless hours and thousands of dollars."
    },
    {
      name: "Michael Chen",
      role: "Site Supervisor",
      company: "Chen Construction Group",
      image: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?crop=faces&cs=tinysrgb&fit=crop&auto=format&w=200&q=80",
      quote: "The mobile accessibility has been a game-changer for our on-site operations. I can update project status and communicate with the team in real-time, even from remote construction sites."
    },
    {
      name: "Elena Rodriguez",
      role: "Operations Director",
      company: "Rodriguez Builders",
      image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?crop=faces&cs=tinysrgb&fit=crop&auto=format&w=200&q=80",
      quote: "We've seen a 40% reduction in project delays since implementing APHS Internationale. The collaboration tools ensure everyone is on the same page, reducing miscommunications and errors."
    }
  ],
  fr: [
    {
      name: "Sarah Johnson",
      role: "Chef de Projet",
      company: "BuildCorp Inc.",
      image: "https://images.unsplash.com/photo-1584361853901-dd1904bb7987?crop=faces&cs=tinysrgb&fit=crop&auto=format&w=200&q=80",
      quote: "APHS Internationale a révolutionné notre façon de gérer les projets de construction. Les fonctionnalités de suivi en temps réel et de contrôle budgétaire nous ont fait économiser d'innombrables heures et des milliers d'euros."
    },
    {
      name: "Michael Chen",
      role: "Superviseur de Chantier",
      company: "Chen Construction Group",
      image: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?crop=faces&cs=tinysrgb&fit=crop&auto=format&w=200&q=80",
      quote: "L'accessibilité mobile a changé la donne pour nos opérations sur site. Je peux mettre à jour l'état du projet et communiquer avec l'équipe en temps réel, même depuis des chantiers éloignés."
    },
    {
      name: "Elena Rodriguez",
      role: "Directrice des Opérations",
      company: "Rodriguez Builders",
      image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?crop=faces&cs=tinysrgb&fit=crop&auto=format&w=200&q=80",
      quote: "Nous avons constaté une réduction de 40% des retards de projet depuis l'implémentation d'APHS Internationale. Les outils de collaboration garantissent que tout le monde est sur la même longueur d'onde, réduisant les erreurs et les malentendus."
    }
  ],
  es: [
    {
      name: "Sarah Johnson",
      role: "Directora de Proyecto",
      company: "BuildCorp Inc.",
      image: "https://images.unsplash.com/photo-1584361853901-dd1904bb7987?crop=faces&cs=tinysrgb&fit=crop&auto=format&w=200&q=80",
      quote: "APHS Internationale ha revolucionado la forma en que gestionamos los proyectos de construcción. Las características de seguimiento en tiempo real y monitoreo de presupuesto nos han ahorrado incontables horas y miles de dólares."
    },
    {
      name: "Michael Chen",
      role: "Supervisor de Obra",
      company: "Chen Construction Group",
      image: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?crop=faces&cs=tinysrgb&fit=crop&auto=format&w=200&q=80",
      quote: "La accesibilidad móvil ha sido un cambio radical para nuestras operaciones en el sitio. Puedo actualizar el estado del proyecto y comunicarme con el equipo en tiempo real, incluso desde sitios de construcción remotos."
    },
    {
      name: "Elena Rodriguez",
      role: "Directora de Operaciones",
      company: "Rodriguez Builders",
      image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?crop=faces&cs=tinysrgb&fit=crop&auto=format&w=200&q=80",
      quote: "Hemos visto una reducción del 40% en los retrasos de proyectos desde que implementamos APHS Internationale. Las herramientas de colaboración aseguran que todos estén en la misma página, reduciendo los errores y malentendidos."
    }
  ],
  ar: [
    {
      name: "سارة جونسون",
      role: "مديرة المشروع",
      company: "بيلدكورب",
      image: "https://images.unsplash.com/photo-1584361853901-dd1904bb7987?crop=faces&cs=tinysrgb&fit=crop&auto=format&w=200&q=80",
      quote: "لقد أحدثت APHS Internationale ثورة في طريقة إدارتنا لمشاريع البناء. لقد وفرت ميزات التتبع في الوقت الحقيقي ومراقبة الميزانية ساعات لا تحصى وآلاف الدولارات."
    },
    {
      name: "مايكل تشن",
      role: "مشرف الموقع",
      company: "مجموعة تشن للإنشاءات",
      image: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?crop=faces&cs=tinysrgb&fit=crop&auto=format&w=200&q=80",
      quote: "كانت إمكانية الوصول عبر الهاتف المحمول بمثابة نقلة نوعية لعملياتنا في الموقع. يمكنني تحديث حالة المشروع والتواصل مع الفريق في الوقت الفعلي، حتى من مواقع البناء النائية."
    },
    {
      name: "إيلينا رودريغيز",
      role: "مديرة العمليات",
      company: "رودريغيز للبناء",
      image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?crop=faces&cs=tinysrgb&fit=crop&auto=format&w=200&q=80",
      quote: "شهدنا انخفاضًا بنسبة 40٪ في تأخيرات المشاريع منذ تنفيذ APHS Internationale. تضمن أدوات التعاون أن يكون الجميع على نفس الصفحة، مما يقلل من سوء التفاهم والأخطاء."
    }
  ]
};

const TestimonialsSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(current => (current + 1) % testimonials[language].length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [language]);

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
    <section id="testimonials" className="py-20 px-4 bg-gray-50" dir={textDirection}>
      <div ref={sectionRef} className="container mx-auto opacity-0">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-aphs-navy mb-4">
            {t.title}
          </h2>
          <p className="text-aphs-gray text-lg">
            {t.subtitle}
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 relative">
            <div className="absolute -top-6 -left-6 w-12 h-12 bg-aphs-teal rounded-full z-0"></div>
            <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-aphs-orange rounded-full z-0"></div>
            
            <div className="relative z-10">
              <div className="text-4xl text-aphs-teal mb-6">"</div>
              <p className="text-lg md:text-xl text-aphs-navy mb-6 min-h-[100px]">
                {currentTestimonials[activeIndex].quote}
              </p>
              <div className="flex items-center">
                <Avatar className="h-14 w-14 mr-4">
                  <AvatarImage src={currentTestimonials[activeIndex].image} alt={currentTestimonials[activeIndex].name} />
                  <AvatarFallback>{currentTestimonials[activeIndex].name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-aphs-navy">{currentTestimonials[activeIndex].name}</h4>
                  <p className="text-sm text-aphs-gray">{currentTestimonials[activeIndex].role}, {currentTestimonials[activeIndex].company}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-8">
            {currentTestimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-3 h-3 rounded-full mx-1 ${activeIndex === index ? 'bg-aphs-teal' : 'bg-gray-300'}`}
                aria-label={`View testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
