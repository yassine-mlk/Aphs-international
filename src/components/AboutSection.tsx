import React, { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NAV } from '@/lib/constants';

interface TeamMember {
  name: string;
  title: string;
  image: string;
}

const teamMembers: TeamMember[] = [
  {
    name: "Said Kharrat",
    title: "Président-directeur général",
    image: "/team/person1.jpg"
  },
  {
    name: "Agnes Barokel",
    title: "Directrice des opérations",
    image: "/team/person2.jpg"
  },
  {
    name: "Fernando Passareli",
    title: "Directeur technique",
    image: "/team/person3.jpg"
  }
];

const AboutSection: React.FC = () => {
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

  return (
    <section id="about" className="py-20 px-4 bg-white">
      <div 
        ref={sectionRef}
        className="container mx-auto opacity-0 translate-y-10 transition-all duration-1000"
      >
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
            {NAV.about}
          </h2>
          <p className="text-gray-600 text-lg">
            En savoir plus sur APS International
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-16">
          {teamMembers.map((member, index) => (
            <div 
              key={index}
              className="team-member opacity-0 translate-y-10 transition-all duration-500 flex flex-col items-center text-center group"
            >
              <div className="relative mb-6">
                <div className="h-72 w-48 rounded-2xl border-4 border-blue-600 shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl overflow-hidden bg-gray-50">
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
                  <div className="w-full h-full bg-blue-600 text-white text-4xl font-bold hidden items-center justify-center">
                    {member.name.substring(0, 2)}
                  </div>
                </div>
                <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-blue-600 rounded-full opacity-80 animate-pulse"></div>
              </div>
              <h3 className="text-2xl font-bold text-black mb-2 group-hover:text-blue-600 transition-colors duration-300">{member.name}</h3>
              <p className="text-blue-600 font-medium text-lg">{member.title}</p>
            </div>
          ))}
        </div>
        
        <div className="bg-black p-8 md:p-12 rounded-xl text-white">
          <div className="md:flex items-center">
            <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
              <h3 className="text-2xl font-bold mb-4">Notre Mission</h3>
              <p className="mb-4 text-gray-300">Fournir des solutions innovantes pour la gestion de projets de construction complexes, en garantissant transparence, efficacité et respect des délais.</p>
              <p className="text-gray-300">Notre vision est de devenir le leader mondial de la technologie appliquée au secteur du bâtiment et des travaux publics.</p>
            </div>
            <div className="md:w-1/3 bg-white/10 p-6 rounded-lg backdrop-blur-sm border border-white/10">
              <h4 className="font-bold mb-3 text-xl">Nos Valeurs</h4>
              <ul className="space-y-2">
                {["Innovation", "Transparence", "Excellence", "Collaboration"].map((value, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-gray-200">{value}</span>
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
