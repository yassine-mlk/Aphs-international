import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Building2, Users, FileText, BarChart3, Shield, Clock, Globe, Zap,
  ArrowRight, CheckCircle2, ArrowLeft, HardHat, Layers,
  ChevronRight, Folder, UserCheck, Bell, Lock, TrendingUp
} from 'lucide-react';

// Hook pour l'animation à l'entrée
const useReveal = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.1 });
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  
  return [ref, isVisible] as const;
};

interface Feature {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  details: string[];
  benefits: string[];
  color: string;
  gradient: string;
  illustration: React.ReactNode;
}

// Illustrations SVG pour chaque fonctionnalité
const ProjectIllustration = () => (
  <svg viewBox="0 0 200 120" className="w-full h-full">
    <rect x="20" y="20" width="160" height="80" rx="8" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="2"/>
    <rect x="35" y="35" width="60" height="8" rx="4" fill="#3b82f6"/>
    <rect x="35" y="50" width="40" height="6" rx="3" fill="#9ca3af"/>
    <rect x="35" y="62" width="50" height="6" rx="3" fill="#9ca3af"/>
    <circle cx="150" cy="45" r="15" fill="#10b981" opacity="0.2"/>
    <path d="M142 45 L148 51 L158 39" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <rect x="110" y="75" width="60" height="20" rx="4" fill="#1f2937"/>
  </svg>
);

const UsersIllustration = () => (
  <svg viewBox="0 0 200 120" className="w-full h-full">
    <circle cx="60" cy="50" r="20" fill="#6366f1" opacity="0.2"/>
    <circle cx="60" cy="45" r="8" fill="#6366f1"/>
    <path d="M45 65 Q60 55 75 65" stroke="#6366f1" strokeWidth="2" fill="none"/>
    <circle cx="100" cy="50" r="20" fill="#3b82f6" opacity="0.2"/>
    <circle cx="100" cy="45" r="8" fill="#3b82f6"/>
    <path d="M85 65 Q100 55 115 65" stroke="#3b82f6" strokeWidth="2" fill="none"/>
    <circle cx="140" cy="50" r="20" fill="#10b981" opacity="0.2"/>
    <circle cx="140" cy="45" r="8" fill="#10b981"/>
    <path d="M125 65 Q140 55 155 65" stroke="#10b981" strokeWidth="2" fill="none"/>
    <rect x="70" y="85" width="60" height="8" rx="4" fill="#e5e7eb"/>
  </svg>
);

const DocsIllustration = () => (
  <svg viewBox="0 0 200 120" className="w-full h-full">
    <rect x="30" y="25" width="50" height="70" rx="4" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="2"/>
    <rect x="35" y="35" width="30" height="4" rx="2" fill="#9ca3af"/>
    <rect x="35" y="45" width="40" height="4" rx="2" fill="#9ca3af"/>
    <rect x="35" y="55" width="35" height="4" rx="2" fill="#9ca3af"/>
    <rect x="75" y="25" width="50" height="70" rx="4" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="2"/>
    <rect x="80" y="35" width="30" height="4" rx="2" fill="#9ca3af"/>
    <rect x="80" y="45" width="40" height="4" rx="2" fill="#9ca3af"/>
    <rect x="120" y="25" width="50" height="70" rx="4" fill="#10b981" opacity="0.1" stroke="#10b981" strokeWidth="2"/>
    <circle cx="145" cy="55" r="12" fill="#10b981" opacity="0.3"/>
    <path d="M140 55 L143 58 L150 50" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round"/>
  </svg>
);

const DashboardIllustration = () => (
  <svg viewBox="0 0 200 120" className="w-full h-full">
    <rect x="20" y="20" width="160" height="80" rx="8" fill="#f3f4f6"/>
    <rect x="30" y="30" width="45" height="30" rx="4" fill="#3b82f6" opacity="0.2"/>
    <rect x="35" y="50" width="25" height="4" rx="2" fill="#3b82f6"/>
    <rect x="82" y="30" width="45" height="30" rx="4" fill="#f59e0b" opacity="0.2"/>
    <rect x="87" y="50" width="25" height="4" rx="2" fill="#f59e0b"/>
    <rect x="134" y="30" width="45" height="30" rx="4" fill="#10b981" opacity="0.2"/>
    <rect x="139" y="50" width="25" height="4" rx="2" fill="#10b981"/>
    <rect x="30" y="70" width="140" height="25" rx="4" fill="#e5e7eb"/>
    <rect x="35" y="78" width="80" height="4" rx="2" fill="#9ca3af"/>
    <rect x="35" y="86" width="60" height="4" rx="2" fill="#9ca3af"/>
  </svg>
);

const SecurityIllustration = () => (
  <svg viewBox="0 0 200 120" className="w-full h-full">
    <circle cx="100" cy="60" r="35" fill="#f43f5e" opacity="0.1"/>
    <path d="M100 35 L100 25" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round"/>
    <path d="M75 45 Q100 35 125 45 L125 75 Q100 95 75 75 Z" fill="#f43f5e" opacity="0.2" stroke="#f43f5e" strokeWidth="2"/>
    <circle cx="100" cy="65" r="8" fill="#f43f5e" opacity="0.3"/>
    <path d="M96 65 L99 68 L104 62" stroke="#f43f5e" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <rect x="60" y="85" width="80" height="6" rx="3" fill="#e5e7eb"/>
  </svg>
);

const TimeIllustration = () => (
  <svg viewBox="0 0 200 120" className="w-full h-full">
    <circle cx="100" cy="60" r="40" fill="#f97316" opacity="0.1" stroke="#f97316" strokeWidth="2"/>
    <circle cx="100" cy="60" r="3" fill="#f97316"/>
    <path d="M100 60 L100 35" stroke="#f97316" strokeWidth="3" strokeLinecap="round"/>
    <path d="M100 60 L120 70" stroke="#f97316" strokeWidth="3" strokeLinecap="round"/>
    <rect x="30" y="95" width="40" height="8" rx="4" fill="#10b981" opacity="0.3"/>
    <rect x="80" y="95" width="40" height="8" rx="4" fill="#f59e0b" opacity="0.3"/>
    <rect x="130" y="95" width="40" height="8" rx="4" fill="#3b82f6" opacity="0.3"/>
  </svg>
);

const TenantIllustration = () => (
  <svg viewBox="0 0 200 120" className="w-full h-full">
    <rect x="25" y="30" width="45" height="60" rx="4" fill="#8b5cf6" opacity="0.1" stroke="#8b5cf6" strokeWidth="2"/>
    <rect x="35" y="45" width="25" height="4" rx="2" fill="#8b5cf6"/>
    <rect x="35" y="55" width="20" height="4" rx="2" fill="#8b5cf6" opacity="0.5"/>
    <rect x="77" y="30" width="45" height="60" rx="4" fill="#3b82f6" opacity="0.1" stroke="#3b82f6" strokeWidth="2"/>
    <rect x="87" y="45" width="25" height="4" rx="2" fill="#3b82f6"/>
    <rect x="129" y="30" width="45" height="60" rx="4" fill="#10b981" opacity="0.1" stroke="#10b981" strokeWidth="2"/>
    <rect x="139" y="45" width="25" height="4" rx="2" fill="#10b981"/>
    <path d="M70 60 L77 60" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="4"/>
    <path d="M122 60 L129 60" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="4"/>
  </svg>
);

const NotifIllustration = () => (
  <svg viewBox="0 0 200 120" className="w-full h-full">
    <rect x="50" y="30" width="100" height="60" rx="8" fill="#06b6d4" opacity="0.1" stroke="#06b6d4" strokeWidth="2"/>
    <circle cx="165" cy="35" r="15" fill="#ef4444"/>
    <text x="165" y="40" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">3</text>
    <rect x="65" y="45" width="60" height="6" rx="3" fill="#06b6d4" opacity="0.5"/>
    <rect x="65" y="58" width="45" height="6" rx="3" fill="#06b6d4" opacity="0.3"/>
    <rect x="65" y="71" width="50" height="6" rx="3" fill="#06b6d4" opacity="0.4"/>
    <circle cx="45" cy="60" r="3" fill="#ef4444" opacity="0.5">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
    </circle>
  </svg>
);

const features: Feature[] = [
  {
    id: 'gestion-projets',
    icon: Building2,
    title: 'Gestion de Projets',
    description: 'Créez et organisez vos projets de construction facilement. Structurez vos chantiers par phases et suivez leur avancement.',
    details: [
      'Création rapide de projets avec formulaire intuitif',
      'Organisation par phases et lots de travaux',
      'Suivi de l\'avancement global et détaillé',
      'Attribution des responsables par projet',
      'Historique complet des modifications'
    ],
    benefits: ['Gain de temps', 'Meilleure organisation', 'Visibilité totale'],
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    illustration: <ProjectIllustration />
  },
  {
    id: 'intervenants',
    icon: Users,
    title: 'Gestion des Intervenants',
    description: 'Centralisez la gestion de tous vos intervenants : entreprises, sous-traitants, architectes, bureaux d\'études.',
    details: [
      'Annuaire centralisé des contacts et entreprises',
      'Gestion des rôles et permissions par projet',
      'Accès personnalisé selon le profil utilisateur',
      'Suivi des interventions et participations',
      'Notifications ciblées par groupe'
    ],
    benefits: ['Collaboration simplifiée', 'Sécurité des accès', 'Communication ciblée'],
    color: 'indigo',
    gradient: 'from-indigo-500 to-indigo-600',
    illustration: <UsersIllustration />
  },
  {
    id: 'documents',
    icon: FileText,
    title: 'Gestion des Documents',
    description: 'Stockez, organisez et partagez tous vos documents de chantier en un seul endroit sécurisé.',
    details: [
      'Stockage sécurisé et organisé par projet',
      'Organisation par dossiers et catégories',
      'Versionning des documents modifiés',
      'Partage contrôlé avec permissions',
      'Prévisualisation en ligne des fichiers'
    ],
    benefits: ['Centralisation', 'Traçabilité', 'Accès rapide'],
    color: 'emerald',
    gradient: 'from-emerald-500 to-emerald-600',
    illustration: <DocsIllustration />
  },
  {
    id: 'tableau-de-bord',
    icon: BarChart3,
    title: 'Tableau de Bord',
    description: 'Visualisez l\'avancement de vos projets avec des indicateurs clairs et des analyses en temps réel.',
    details: [
      'Vue d\'ensemble de tous vos projets',
      'Indicateurs de performance clés (KPIs)',
      'Suivi des délais et échéances',
      'Alertes visuelles pour les retards',
      'Rapports automatisés exportables'
    ],
    benefits: ['Pilotage efficace', 'Décisions rapides', 'Transparence'],
    color: 'amber',
    gradient: 'from-amber-500 to-amber-600',
    illustration: <DashboardIllustration />
  },
  {
    id: 'securite',
    icon: Shield,
    title: 'Sécurité & Conformité',
    description: 'Vos données sont protégées par les plus hauts standards de sécurité. Conformité RGPD garantie.',
    details: [
      'Chiffrement des données en transit et au repos',
      'Authentification sécurisée avec sessions',
      'Contrôle d\'accès granulaire par utilisateur',
      'Journal d\'audit complet des actions',
      'Conformité RGPD pour la protection des données'
    ],
    benefits: ['Confidentialité', 'Traçabilité', 'Conformité légale'],
    color: 'rose',
    gradient: 'from-rose-500 to-rose-600',
    illustration: <SecurityIllustration />
  },
  {
    id: 'suivi-temps',
    icon: Clock,
    title: 'Suivi des Délais',
    description: 'Gérez les échéances et délais de vos projets de construction. Anticipez les retards.',
    details: [
      'Planification des jalons et milestones',
      'Alertes automatiques avant échéances',
      'Suivi des délais par phase de projet',
      'Calendrier de projet partagé',
      'Rappels automatiques aux intervenants'
    ],
    benefits: ['Respect des délais', 'Anticipation', 'Organisation'],
    color: 'orange',
    gradient: 'from-orange-500 to-orange-600',
    illustration: <TimeIllustration />
  },
  {
    id: 'multi-tenant',
    icon: Globe,
    title: 'Multi-Entreprise',
    description: 'Chaque entreprise dispose de son espace isolé et sécurisé. Séparation stricte des données.',
    details: [
      'Isolation complète des données par tenant',
      'Espace dédié et personnalisé par entreprise',
      'Configuration personnalisée des paramètres',
      'Administration simplifiée par compte',
      'Scalabilité pour grandir avec vos besoins'
    ],
    benefits: ['Isolation', 'Personnalisation', 'Évolutivité'],
    color: 'violet',
    gradient: 'from-violet-500 to-violet-600',
    illustration: <TenantIllustration />
  },
  {
    id: 'notifications',
    icon: Zap,
    title: 'Notifications Intelligentes',
    description: 'Restez informé en temps réel de toute activité importante sur vos projets.',
    details: [
      'Alertes en temps réel sur activités projets',
      'Notifications personnalisées selon rôle',
      'Rappels automatiques pour échéances',
      'Canaux multiples : email, in-app',
      'Filtrage intelligent des alertes'
    ],
    benefits: ['Réactivité', 'Information', 'Engagement'],
    color: 'cyan',
    gradient: 'from-cyan-500 to-cyan-600',
    illustration: <NotifIllustration />
  }
];

const Features: React.FC = () => {
  const navigate = useNavigate();
  const [heroRef, heroVisible] = useReveal();
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 0.6s ease forwards; }
        .animate-fade { animation: fadeIn 0.6s ease forwards; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .hover-lift {
          transition: all 0.3s ease;
        }
        .hover-lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Retour à l'accueil</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <HardHat className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">APS</span>
            </div>

            <Button 
              onClick={() => navigate('/login')}
              className="bg-black text-white hover:bg-gray-800 rounded-full text-sm"
            >
              Connexion
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="pt-32 pb-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`max-w-3xl mx-auto text-center ${heroVisible ? 'animate-slide-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium mb-6">
              <Layers className="h-4 w-4" />
              Fonctionnalités
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Tout ce qu'il faut pour{' '}
              <span className="text-blue-600">gérer vos projets</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Découvrez les outils qui simplifient la gestion de vos projets de construction du début à la fin.
            </p>
            <Button 
              onClick={() => navigate('/register')}
              className="bg-black text-white hover:bg-gray-800 rounded-full px-8 py-6 text-lg"
            >
              Essayer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* All Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                className={`group bg-white rounded-3xl overflow-hidden border border-gray-200 hover-lift cursor-pointer ${
                  activeFeature === feature.id ? 'ring-2 ring-blue-600 border-blue-600' : ''
                }`}
                onClick={() => setActiveFeature(activeFeature === feature.id ? null : feature.id)}
              >
                {/* Illustration Area */}
                <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 p-6 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-40 h-32">
                      {feature.illustration}
                    </div>
                  </div>
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
                </div>
                
                {/* Content */}
                <div className="p-8">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{feature.title}</h3>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  
                  {/* Benefits tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {feature.benefits.map((benefit, i) => (
                      <span 
                        key={i}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>

                  {/* Expanded details */}
                  <div className={`overflow-hidden transition-all duration-300 ${activeFeature === feature.id ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                    <div className="pt-4 border-t border-gray-100">
                      <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-500">Détails</h4>
                      <ul className="space-y-2">
                        {feature.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700 text-sm">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Toggle hint */}
                  <div className="flex items-center text-blue-600 font-medium mt-4 group-hover:text-blue-700">
                    <span className="text-sm">{activeFeature === feature.id ? 'Voir moins' : 'Voir les détails'}</span>
                    <ChevronRight className={`ml-1 h-4 w-4 transition-transform ${activeFeature === feature.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Feature Showcase */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Une interface pensée pour le BTP
            </h2>
            <p className="text-lg text-gray-600">
              Des outils intuitifs conçus spécifiquement pour les équipes de construction.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Tableau de bord intuitif',
                description: 'Visualisez tous vos projets en un coup d\'œil avec des indicateurs clairs.',
                icon: BarChart3,
                color: 'bg-blue-500'
              },
              {
                title: 'Gestion documentaire',
                description: 'Centralisez tous vos plans, devis et documents en un seul endroit.',
                icon: FileText,
                color: 'bg-emerald-500'
              },
              {
                title: 'Collaboration fluide',
                description: 'Connectez tous vos intervenants sur une même plateforme.',
                icon: Users,
                color: 'bg-indigo-500'
              }
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover-lift">
                <div className={`w-14 h-14 ${item.color} rounded-xl flex items-center justify-center mb-6`}>
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prêt à simplifier votre gestion de projet ?
          </h2>
          <p className="text-lg text-gray-400 mb-10">
            Rejoignez les entreprises qui utilisent APS pour leurs projets de construction.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate('/register')}
              className="bg-white text-black hover:bg-gray-100 rounded-full px-10 py-6 text-lg"
            >
              Démarrer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="border-2 border-white text-white hover:bg-white hover:text-black rounded-full px-10 py-6 text-lg"
            >
              Se connecter
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <HardHat className="h-5 w-5 text-black" />
              </div>
              <span className="text-xl font-bold text-white">APS</span>
            </div>
            <p className="text-sm">© 2024 APS International. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Features;
