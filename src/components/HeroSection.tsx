import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { HardHat, Building2, FileText, ChevronRight, Play, X, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const HeroSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100');
          entry.target.classList.remove('opacity-0', 'translate-y-10');
        }
      });
    }, { threshold: 0.1 });

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % 3);
    }, 4000);

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
      clearInterval(interval);
    };
  }, []);

  const navigateToLogin = () => navigate('/login');
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const roles = [
    {
      icon: Building2,
      title: "Maître d'œuvre",
      description: "Centralisez votre GED et votre suivi de chantier pour une gestion de projet plus fluide et performante !",
      color: "from-[#FFC107] to-[#FF8F00]"
    },
    {
      icon: HardHat,
      title: "Maître d'ouvrage",
      description: "Une solution complète pour une transparence totale et une supervision simplifiée de vos projets.",
      color: "from-[#4A4A4A] to-[#1a1a1a]"
    },
    {
      icon: FileText,
      title: "Entreprise générale",
      description: "Un outil centralisé pour une maîtrise complète et un suivi en temps réel de vos chantiers.",
      color: "from-[#8B4513] to-[#5D3A1A]"
    }
  ];

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0a] transition-all duration-1000 opacity-0 translate-y-10"
    >
      {/* Animated Construction Background */}
      <div className="absolute inset-0">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,193,7,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,193,7,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        
        {/* Radial gradient */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black"></div>
        
        {/* Animated lines */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFC107" stopOpacity="0" />
              <stop offset="50%" stopColor="#FFC107" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FFC107" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d="M0,400 L200,200 L400,350 L600,150 L800,300 L1000,100 L1200,250 L1400,50"
            stroke="url(#lineGrad)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M0,600 L150,450 L350,550 L550,400 L750,500 L950,350 L1150,450 L1400,300"
            stroke="url(#lineGrad)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 0.5 }}
          />
        </svg>

        {/* Floating construction elements */}
        <motion.div
          className="absolute top-20 left-[10%] w-2 h-32 bg-gradient-to-b from-[#FFC107] to-transparent rounded-full"
          animate={{ y: [0, 20, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-40 right-[15%] w-2 h-24 bg-gradient-to-b from-[#FFC107] to-transparent rounded-full"
          animate={{ y: [0, -15, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
        />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 relative z-10 py-20">
        <div className="max-w-6xl mx-auto">
          {/* Main Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFC107]/10 border border-[#FFC107]/30 mb-6"
            >
              <HardHat className="w-5 h-5 text-[#FFC107]" />
              <span className="text-[#FFC107] font-medium">La plateforme des professionnels du BTP</span>
            </motion.div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight">
              Embarquez tous les acteurs
              <br />
              <span className="bg-gradient-to-r from-[#FFC107] via-[#FF8F00] to-[#FFC107] bg-clip-text text-transparent">
                de vos projets
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-3xl mx-auto">
              APS est votre centrale d'informations, la plateforme d'échanges et de supervision pour tous vos projets de construction
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#FFC107] to-[#FF8F00] hover:from-[#FFB300] hover:to-[#F57C00] text-black font-bold px-8 py-6 text-lg rounded-xl shadow-lg shadow-[#FFC107]/30"
                  onClick={navigateToLogin}
                >
                  Démarrer gratuitement
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-[#FFC107]/50 text-[#FFC107] hover:bg-[#FFC107]/10 px-8 py-6 text-lg rounded-xl"
                  onClick={() => setIsVideoModalOpen(true)}
                >
                  <Play className="mr-2 w-5 h-5" />
                  Voir la démo
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Role Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            {roles.map((role, index) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.2, duration: 0.6 }}
                whileHover={{ y: -10, scale: 1.02 }}
                onMouseEnter={() => setActiveCard(index)}
                className={`relative group cursor-pointer ${activeCard === index ? 'ring-2 ring-[#FFC107]' : ''}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500`}></div>
                <div className="relative bg-[#1a1a1a]/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 h-full hover:border-[#FFC107]/30 transition-colors">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <role.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{role.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">{role.description}</p>
                  <div className="flex items-center text-[#FFC107] text-sm font-medium group-hover:translate-x-2 transition-transform">
                    En savoir plus <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-8 mt-16 pt-8 border-t border-gray-800"
          >
            {[
              { value: "500+", label: "Projets gérés" },
              { value: "50+", label: "Entreprises" },
              { value: "10K+", label: "Utilisateurs" },
              { value: "99.9%", label: "Disponibilité" }
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 + i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-[#FFC107]">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-[#FFC107] rounded-full transition-colors group"
            >
              <X className="w-6 h-6 text-white group-hover:text-black" />
            </button>
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]">
              <p className="text-gray-500">Vidéo de démonstration à venir</p>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
