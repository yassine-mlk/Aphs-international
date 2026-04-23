import React, { useEffect, useRef } from 'react';

const BenefitsSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

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
      title: "Livraison 15% plus rapide",
      description: "Accélérez les délais de projet grâce à des flux de travail rationalisés et à l'automatisation.",
      icon: "🚀"
    },
    {
      title: "Réduction des coûts de 10%",
      description: "Minimisez les dépassements de budget grâce au suivi financier en temps réel et aux analyses.",
      icon: "💰"
    },
    {
      title: "Collaboration améliorée de 30%",
      description: "Améliorez la communication et réduisez les erreurs grâce à des informations centralisées.",
      icon: "🤝"
    }
  ];

  return (
    <section 
      ref={sectionRef}
      className="py-24 bg-gray-50 opacity-0 translate-y-10 transition-all duration-1000"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-black mb-4">
            Transformez votre gestion de construction
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Des résultats concrets de sociétés de construction comme la vôtre qui ont implémenté APS.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="text-4xl mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-bold text-black mb-3">{benefit.title}</h3>
              <p className="text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-xl text-gray-700 mb-6">
            Prêt à révolutionner votre gestion de projets de construction ?
          </p>
          <a 
            href="/login"
            className="inline-flex items-center px-8 py-4 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
          >
            Réserver une démo
          </a>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
