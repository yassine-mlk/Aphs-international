import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Building2, Users, Puzzle, ArrowRight, CheckCircle2, ArrowLeft, 
  HardHat, Briefcase, Wrench, BarChart3
} from 'lucide-react';

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

interface Solution {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  benefits: string[];
  useCases: string[];
  color: string;
  gradient: string;
}

const solutions: Solution[] = [
  {
    id: 'entreprises-generales',
    icon: Building2,
    title: 'Entreprises générales',
    subtitle: 'Pour les chefs de chantier et directeurs de travaux',
    description: 'Respectez les délais et budgets avec un outil complet de gestion de projet. Coordonnez vos équipes, suivez l\'avancement en temps réel et communiquez efficacement avec tous les intervenants.',
    features: [
      'Structure complète de projet par phases',
      'Gestion centralisée des intervenants',
      'Suivi des tâches et jalons',
      'Partage de documents sécurisé',
      'Tableaux de bord de suivi',
      'Notifications et alertes automatiques'
    ],
    benefits: [
      'Réduction des délais de 20% en moyenne',
      'Meilleure coordination des équipes',
      'Traçabilité complète des décisions',
      'Centralisation des informations'
    ],
    useCases: [
      'Construction neuve',
      'Rénovation lourde',
      'Aménagement de bureaux',
      'Projets industriels'
    ],
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    id: 'maitres-ouvrage',
    icon: Briefcase,
    title: "Maîtres d'ouvrage",
    subtitle: 'Pour les propriétaires et responsables de projets',
    description: "Maximisez votre retour sur investissement avec une visibilité totale à chaque étape du projet. Suivez les budgets, les délais et assurez la qualité de la livraison.",
    features: [
      'Vue d\'ensemble multi-projets',
      'Suivi des budgets et dépenses',
      'Validation des étapes clés',
      'Historique complet des projets',
      'Partage de documents avec MOE',
      'Alertes sur dépassements'
    ],
    benefits: [
      'Contrôle total sur les projets',
      'Transparence avec les entreprises',
      'Archive digitale complète',
      'Réduction des litiges'
    ],
    useCases: [
      'Promotion immobilière',
      'Construction de sièges sociaux',
      'Rénovation de patrimoine',
      'Projets publics'
    ],
    color: 'amber',
    gradient: 'from-amber-500 to-amber-600'
  },
  {
    id: 'entreprises-specialisees',
    icon: Wrench,
    title: 'Entreprises spécialisées',
    subtitle: 'Pour les artisans et corps de métier',
    description: "Accédez facilement à vos projets et partagez vos livrables en toute simplicité. Intégrez-vous rapidement aux chantiers et communiquez efficacement avec la maîtrise d'œuvre.",
    features: [
      'Accès rapide aux projets assignés',
      'Dépôt de rapports et photos',
      'Signature électronique des DQE',
      'Planning des interventions',
      'Messagerie intégrée',
      'Notifications de nouveaux appels d\'offres'
    ],
    benefits: [
      'Intégration fluide aux chantiers',
      'Temps de recherche de documents divisé par 2',
      'Validation plus rapide des travaux',
      'Visibilité sur les paiements'
    ],
    useCases: [
      'Électricité et plomberie',
      'Menuiserie et fermetures',
      'Peinture et finitions',
      'Second œuvre et aménagement'
    ],
    color: 'emerald',
    gradient: 'from-emerald-500 to-emerald-600'
  }
];

const Solutions: React.FC = () => {
  const navigate = useNavigate();
  const [heroRef, heroVisible] = useReveal();
  const [activeTab, setActiveTab] = useState<string>('entreprises-generales');

  const activeSolution = solutions.find(s => s.id === activeTab) || solutions[0];

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.6s ease forwards; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
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
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Des solutions pour{' '}
              <span className="text-blue-600">tous les acteurs</span>{' '}
              du BTP
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Quel que soit votre rôle dans la chaîne de construction, APS s'adapte à vos besoins spécifiques.
            </p>
            <Button 
              onClick={() => navigate('/register')}
              className="bg-black text-white hover:bg-gray-800 rounded-full px-8 py-6 text-lg"
            >
              Commencer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Solutions Tabs */}
      <section className="py-12 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            {solutions.map((solution) => (
              <button
                key={solution.id}
                onClick={() => setActiveTab(solution.id)}
                className={`flex items-center gap-3 px-6 py-4 rounded-xl transition-all ${
                  activeTab === solution.id 
                    ? 'bg-black text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <solution.icon className="h-5 w-5" />
                <span className="font-medium">{solution.title}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Active Solution Detail */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: Info */}
            <div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${activeSolution.gradient} text-white rounded-full text-sm font-medium mb-6`}>
                <activeSolution.icon className="h-4 w-4" />
                {activeSolution.title}
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {activeSolution.subtitle}
              </h2>
              
              <p className="text-lg text-gray-600 mb-8">
                {activeSolution.description}
              </p>

              {/* Features */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">Fonctionnalités clés</h3>
                <ul className="space-y-3">
                  {activeSolution.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Benefits */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">Bénéfices mesurables</h3>
                <div className="flex flex-wrap gap-2">
                  {activeSolution.benefits.map((benefit, i) => (
                    <span 
                      key={i}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>

              {/* Use Cases */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">Cas d'usage</h3>
                <div className="grid grid-cols-2 gap-3">
                  {activeSolution.useCases.map((useCase, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg"
                    >
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${activeSolution.gradient}`} />
                      <span className="text-sm font-medium">{useCase}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => navigate('/register')}
                className={`bg-gradient-to-r ${activeSolution.gradient} text-white hover:opacity-90 rounded-full px-8 py-6 text-lg`}
              >
                Essayer cette solution
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Right: Visual */}
            <div className="lg:sticky lg:top-24">
              <div className={`bg-gradient-to-br ${activeSolution.gradient} rounded-3xl p-8 shadow-2xl`}>
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  {/* Mockup Header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${activeSolution.gradient} flex items-center justify-center`}>
                        <activeSolution.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold">{activeSolution.title}</div>
                        <div className="text-sm text-gray-500">Vue détaillée</div>
                      </div>
                    </div>
                  </div>

                  {/* Mockup Content */}
                  <div className="space-y-4">
                    <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="grid grid-cols-3 gap-3">
                      <div className="h-20 bg-gray-100 rounded-xl animate-pulse" style={{ animationDelay: '0.1s' }} />
                      <div className="h-20 bg-gray-100 rounded-xl animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="h-20 bg-gray-100 rounded-xl animate-pulse" style={{ animationDelay: '0.3s' }} />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                      <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                  <div className="text-3xl font-bold text-blue-600">500+</div>
                  <div className="text-sm text-gray-600">Projets gérés</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                  <div className="text-3xl font-bold text-green-600">98%</div>
                  <div className="text-sm text-gray-600">Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Contactez-nous
            </h2>
            <p className="text-lg text-gray-600">
              Une question sur nos solutions ? Notre équipe est là pour vous accompagner.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Email</h3>
              <p className="text-gray-600">contact@aps-international.com</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Téléphone</h3>
              <p className="text-gray-600">+33 1 23 45 67 89</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Adresse</h3>
              <p className="text-gray-600">Paris, France</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Trouvez la solution qui vous correspond
          </h2>
          <p className="text-lg text-gray-400 mb-10">
            Commencez gratuitement et découvrez comment APS peut transformer votre gestion de projet.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate('/register')}
              className="bg-white text-black hover:bg-gray-100 rounded-full px-10 py-6 text-lg"
            >
              Créer un compte gratuit
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

export default Solutions;
