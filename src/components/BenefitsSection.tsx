import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, TrendingUp, Zap, Shield, Clock, Users } from 'lucide-react';

const BenefitsSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  const benefits = [
    {
      icon: TrendingUp,
      title: "Productivité accrue",
      description: "Gagnez jusqu'à 30% de temps sur la gestion quotidienne de vos projets grâce à l'automatisation des tâches récurrentes."
    },
    {
      icon: Shield,
      title: "Sécurité totale",
      description: "Vos données sont chiffrées et stockées en France. Conformité RGPD garantie avec sauvegardes automatiques."
    },
    {
      icon: Clock,
      title: "Temps réel",
      description: "Suivez l'avancement de vos chantiers en temps réel. Notifications instantanées pour chaque évolution importante."
    },
    {
      icon: Users,
      title: "Collaboration fluide",
      description: "Tous vos intervenants sur une même plateforme. Échanges structurés et traçabilité complète des décisions."
    },
    {
      icon: Zap,
      title: "Performance optimale",
      description: "Interface réactive et rapide. Fonctionne sur tous les appareils, même sur chantier avec une connexion limitée."
    },
    {
      icon: Check,
      title: "Conformité assurée",
      description: "Générez vos DOE conformes aux normes en vigueur. Archivage réglementaire automatique et traçable."
    }
  ];

  const features = [
    "Gestion documentaire centralisée",
    "Workflow de validation intégré",
    "Tableaux de bord personnalisés",
    "Annotations sur plans et documents",
    "Comptes-rendus de visite automatisés",
    "Export DOE en un clic"
  ];

  return (
    <section id="benefits" className="relative py-24 bg-[#1a1a1a] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,69,19,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,69,19,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
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
            <TrendingUp className="w-4 h-4 text-[#FFC107]" />
            <span className="text-[#FFC107] text-sm font-medium">Pourquoi choisir APS ?</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Des avantages <span className="text-[#FFC107]">concrets</span>
          </h2>
          <p className="text-xl text-gray-400">
            Découvrez comment APS transforme votre quotidien sur les chantiers
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              whileHover={{ y: -5 }}
              className="group bg-[#0a0a0a] border border-gray-800 rounded-2xl p-8 hover:border-[#FFC107]/30 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFC107] to-[#FF8F00] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <benefit.icon className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{benefit.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Feature List Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-[#8B4513]/20 to-[#1a1a1a] border border-[#8B4513]/30 rounded-3xl p-12"
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-white mb-6">
                Tout ce dont vous avez besoin, <span className="text-[#FFC107]">en un seul outil</span>
              </h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                APS regroupe toutes les fonctionnalités essentielles pour la gestion de vos projets de construction. Fini les multiples logiciels et les pertes de temps.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-[#FFC107] to-[#FF8F00] text-black font-bold px-8 py-4 rounded-xl hover:shadow-lg hover:shadow-[#FFC107]/30 transition-all"
              >
                Découvrir toutes les fonctionnalités
              </motion.button>
            </div>
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-[#0a0a0a]/50 rounded-xl border border-gray-800"
                >
                  <div className="w-8 h-8 rounded-full bg-[#FFC107]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-[#FFC107]" />
                  </div>
                  <span className="text-gray-300">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { value: "98%", label: "Clients satisfaits" },
            { value: "40%", label: "Gain de temps moyen" },
            { value: "24/7", label: "Support disponible" },
            { value: "0€", label: "Coût de démarrage" }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-6 bg-[#0a0a0a] rounded-2xl border border-gray-800"
            >
              <div className="text-4xl font-bold text-[#FFC107] mb-2">{stat.value}</div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default BenefitsSection;
