import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Building, 
  Smartphone, 
  Bell, 
  Clock, 
  FileCheck,
  Users,
  PenTool,
  FileText,
  Shield,
  ChevronRight
} from 'lucide-react';

interface FeatureProps {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard: React.FC<FeatureProps> = ({ icon: Icon, title, description, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative bg-[#1a1a1a] border border-gray-800 rounded-2xl p-8 hover:border-[#FFC107]/50 transition-all duration-500"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFC107]/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="relative">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FFC107] to-[#FF8F00] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-[#FFC107]/20">
          <Icon className="w-7 h-7 text-black" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#FFC107] transition-colors">
          {title}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
};

const HighlightCard: React.FC<{ 
  title: string; 
  subtitle: string; 
  description: string;
  icon: React.ElementType;
  reversed?: boolean;
}> = ({ title, subtitle, description, icon: Icon, reversed }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: reversed ? 50 : -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className={`flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 items-center`}
    >
      <div className="flex-1">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFC107]/10 border border-[#FFC107]/30 mb-4">
          <Icon className="w-4 h-4 text-[#FFC107]" />
          <span className="text-[#FFC107] text-sm font-medium">{subtitle}</span>
        </div>
        <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h3>
        <p className="text-gray-400 text-lg leading-relaxed mb-6">{description}</p>
        <button className="flex items-center text-[#FFC107] font-medium hover:translate-x-2 transition-transform">
          En savoir plus <ChevronRight className="w-5 h-5 ml-1" />
        </button>
      </div>
      <div className="flex-1">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFC107]/20 to-transparent rounded-2xl blur-2xl"></div>
          <div className="relative bg-[#0a0a0a] border border-gray-800 rounded-2xl p-8 aspect-square flex items-center justify-center">
            <Icon className="w-32 h-32 text-[#FFC107]/30" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FeaturesSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  const features = [
    {
      icon: Database,
      title: "Information centralisée",
      description: "Toutes les données de vos projets, centralisées et accessibles en temps réel depuis un seul espace sécurisé. Fini la dispersion des informations."
    },
    {
      icon: Building,
      title: "Gestion de projets",
      description: "Des fonctionnalités de gestion de projets conçues avec des professionnels du secteur et validées par leur expertise terrain."
    },
    {
      icon: Smartphone,
      title: "Suivi mobile",
      description: "Vos projets sur tablette ou téléphone, avec des outils de prise de vue et de localisation opérationnels, même sans accès à Internet."
    },
    {
      icon: Bell,
      title: "Communications & alertes",
      description: "Des alertes et notifications ciblées, tenant chaque utilisateur informé des évolutions de vos projets de construction."
    },
    {
      icon: Clock,
      title: "Gain de temps",
      description: "Automatisez vos processus récurrents et concentrez-vous sur l'essentiel. Réduisez les délais de validation et d'échange."
    },
    {
      icon: FileCheck,
      title: "DOE sur mesure",
      description: "Générez vos dossiers des ouvrages exécutés rapidement et efficacement. Des dossiers exhaustifs et conformes en un seul clic."
    }
  ];

  const highlights = [
    {
      icon: Shield,
      subtitle: "Sécurité maximale",
      title: "Votre meilleur allié",
      description: "APS est la solution logicielle en ligne incontournable pour transformer la gestion de vos projets de A à Z. Nos outils et fonctionnalités, plébiscités par les professionnels du secteur, sont conçus pour optimiser chaque étape de votre travail."
    },
    {
      icon: Users,
      subtitle: "Collaboration fluide",
      title: "Tous vos acteurs connectés",
      description: "Maîtres d'œuvre, maîtres d'ouvrage, entreprises générales, bureaux d'études... Tous les intervenants de votre projet collaborent sur une même plateforme avec des droits d'accès adaptés à chaque rôle."
    },
    {
      icon: PenTool,
      subtitle: "Outils avancés",
      title: "Annotation & validation",
      description: "Outils d'annotation directement sur PDF et images pour un retour précis. Module de compte rendu sur-mesure et système de visa intégré pour une validation sécurisée de vos documents."
    }
  ];

  return (
    <section id="features" className="relative py-24 bg-[#0a0a0a] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,193,7,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,193,7,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      {/* Floating elements */}
      <motion.div
        className="absolute top-40 left-10 w-64 h-64 bg-[#FFC107]/5 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-40 right-10 w-96 h-96 bg-[#8B4513]/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, delay: 2 }}
      />

      <div ref={sectionRef} className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFC107]/10 border border-[#FFC107]/30 mb-6">
            <FileText className="w-4 h-4 text-[#FFC107]" />
            <span className="text-[#FFC107] text-sm font-medium">Fonctionnalités riches et sur-mesure</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Une solution <span className="text-[#FFC107]">globale</span>
          </h2>
          <p className="text-xl text-gray-400">
            APS simplifie et sécurise vos projets avec des outils pensés pour les professionnels du BTP
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-32">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Highlight Sections */}
        <div className="space-y-32">
          {highlights.map((highlight, index) => (
            <HighlightCard
              key={highlight.title}
              {...highlight}
              reversed={index % 2 === 1}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-32 text-center"
        >
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-gray-800 rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FFC107]/10 via-transparent to-[#8B4513]/10"></div>
            <div className="relative">
              <h3 className="text-3xl font-bold text-white mb-4">
                Prêt à transformer votre gestion de projet ?
              </h3>
              <p className="text-gray-400 mb-8">
                Rejoignez les professionnels qui ont déjà adopté APS pour leurs projets de construction.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-[#FFC107] to-[#FF8F00] text-black font-bold px-8 py-4 rounded-xl hover:shadow-lg hover:shadow-[#FFC107]/30 transition-all"
              >
                Démarrer gratuitement
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
