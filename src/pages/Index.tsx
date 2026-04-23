import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  HardHat, ArrowRight, Menu, X, Play, ChevronRight,
  Building2, Users, FileText, BarChart3, Shield, Clock,
  CheckCircle2, ArrowUpRight, Zap, Globe, Mail, Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContactForm } from '@/hooks/useContactForm';
import SEOHead from '@/components/SEOHead';

// Hook pour détecter le scroll
const useScrollPosition = () => {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return scrollY;
};

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

const Index: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollY = useScrollPosition();
  const [heroRef, heroVisible] = useReveal();
  const [statsRef, statsVisible] = useReveal();
  const [featuresRef, featuresVisible] = useReveal();
  const [audienceRef, audienceVisible] = useReveal();
  const { formData, isLoading, handleInputChange, handleSubmit } = useContactForm();

  return (
    <>
      <SEOHead />
      <div className="min-h-screen bg-white text-black font-sans selection:bg-blue-600 selection:text-white">
      {/* Styles globaux */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(60px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        .touch-manipulation {
          touch-action: manipulation;
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-left { animation: slideInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-right { animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade { animation: fadeIn 0.8s ease forwards; }
        .animate-scale { animation: scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse 3s ease-in-out infinite; }
        .animate-marquee { animation: marquee 30s linear infinite; }
        
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        
        .reveal {
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.active {
          opacity: 1;
          transform: translateY(0);
        }
        
        .hover-lift {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
        }
        .hover-lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.15);
        }
        
        .text-stroke {
          -webkit-text-stroke: 2px black;
          color: transparent;
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #000 0%, #2563eb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrollY > 50 ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <HardHat className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">APS</span>
            </a>

            <div className="hidden md:flex items-center gap-8">
              {['Fonctionnalités', 'Solutions', 'Tarifs', 'Contact'].map((item) => (
                <a 
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-sm font-medium text-gray-600 hover:text-black transition-colors relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-blue-600 transition-all group-hover:w-full" />
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Button 
                onClick={() => navigate('/login')}
                className="bg-black text-white hover:bg-gray-800 rounded-full px-6 text-sm font-medium"
              >
                Connexion
              </Button>
            </div>

            <button 
              className="md:hidden p-3 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 animate-slide-down">
            <div className="px-6 py-6 space-y-6">
              <div className="space-y-4">
                {['Fonctionnalités', 'Solutions', 'Tarifs', 'Contact'].map((item) => (
                  <a 
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="block text-lg font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item}
                  </a>
                ))}
              </div>
              <Button 
                className="w-full bg-black text-white rounded-full py-4 text-base touch-manipulation"
                onClick={() => navigate('/login')}
              >
                Connexion
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Modern & Dynamic */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-white">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }} />
          
          {/* Floating Orbs */}
          <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-blue-100 rounded-full blur-[100px] opacity-40 animate-pulse-slow" />
          <div className="absolute bottom-20 left-1/4 w-[400px] h-[400px] bg-gray-200 rounded-full blur-[80px] opacity-30 animate-pulse-slow" style={{ animationDelay: '2s' }} />
          
          {/* Diagonal Lines */}
          <svg className="absolute top-0 right-0 w-full h-full opacity-5" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="0" y1="100" x2="100" y2="0" stroke="black" strokeWidth="0.5" />
            <line x1="20" y1="100" x2="100" y2="20" stroke="black" strokeWidth="0.5" />
            <line x1="40" y1="100" x2="100" y2="40" stroke="black" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`${heroVisible ? 'animate-slide-up' : 'opacity-0'}`}>
              {/* Badge with animation */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium mb-8 hover:scale-105 transition-transform cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Gestion simplifiée des projets de construction
              </div>
              
              {/* Main Title with staggered animation */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-8 tracking-tight">
                <span className="block">La construction,</span>
                <span className="block mt-2">
                  <span className="text-stroke relative">
                    réinventée
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                      <path d="M0 4C50 4 50 0 100 0C150 0 150 8 200 4" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" className="animate-draw" />
                    </svg>
                  </span>
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-10 max-w-lg leading-relaxed">
                Pilotez vos projets du DCE à la GPA. Centralisez vos documents, collaborez avec vos équipes et livrez avec excellence.
              </p>

              {/* CTA Buttons with hover effects */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  onClick={() => navigate('/contact')}
                  className="bg-black text-white hover:bg-gray-800 rounded-full px-8 h-14 text-base font-medium group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    Demander une démo
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </div>

              {/* Trust badges */}
              <div className="mt-12 flex items-center gap-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Essai gratuit 14 jours</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Sans engagement</span>
                </div>
              </div>
            </div>

            <div className={`relative ${heroVisible ? 'animate-slide-right delay-300' : 'opacity-0'}`}>
              <div className="relative">
                {/* Dashboard Mockup */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 shadow-2xl">
                  {/* Browser chrome */}
                  <div className="bg-white rounded-xl overflow-hidden">
                    {/* Top bar */}
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-gray-300" />
                        <div className="w-3 h-3 rounded-full bg-gray-300" />
                        <div className="w-3 h-3 rounded-full bg-gray-300" />
                      </div>
                      <div className="ml-4 bg-white rounded-md px-3 py-1 text-sm text-gray-400 flex-1 text-center">
                        app.aps-international.com
                      </div>
                    </div>
                    
                    {/* Dashboard content */}
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <div className="text-lg font-bold">Tableau de bord</div>
                          <div className="text-sm text-gray-500">Vue d'ensemble de vos projets</div>
                        </div>
                        <div className="w-32 h-8 bg-gray-100 rounded-lg" />
                      </div>
                      
                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="text-sm text-gray-500 mb-1">Projets actifs</div>
                          <div className="text-2xl font-bold">12</div>
                          <div className="text-xs text-green-600 mt-1">+3 ce mois</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="text-sm text-gray-500 mb-1">Intervenants</div>
                          <div className="text-2xl font-bold">48</div>
                          <div className="text-xs text-blue-600 mt-1">+8 ce mois</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="text-sm text-gray-500 mb-1">Documents</div>
                          <div className="text-2xl font-bold">156</div>
                          <div className="text-xs text-gray-500 mt-1">+24 cette semaine</div>
                        </div>
                      </div>
                      
                      {/* Main content area */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-4">
                            <div className="font-semibold text-sm">Projets récents</div>
                            <div className="w-6 h-6 bg-gray-200 rounded" />
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">Résidence Les Lilas</div>
                                <div className="text-xs text-gray-500">Phase 2 - En cours</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">Bureau Centre-Ville</div>
                                <div className="text-xs text-gray-500">Livré - Terminé</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-4">
                            <div className="font-semibold text-sm">Activité récente</div>
                            <div className="w-6 h-6 bg-gray-200 rounded" />
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                              <div>
                                <div className="text-sm">Nouveau document ajouté</div>
                                <div className="text-xs text-gray-500">Plan_architecte_v2.pdf</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
                              <div>
                                <div className="text-sm">Projet mis à jour</div>
                                <div className="text-xs text-gray-500">Résidence Les Lilas - Phase 2</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating stat card */}
                <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl p-4 border border-gray-100 animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">98%</div>
                      <div className="text-xs text-gray-500">Taux d'adoption</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-gray-400 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-24 bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`grid md:grid-cols-3 gap-12 ${statsVisible ? '' : ''}`}>
            {[
              { number: '500', suffix: '+', label: 'projets', desc: 'gérés sur la plateforme' },
              { number: '1000', suffix: '+', label: 'intervenants', desc: 'connectés chaque jour' },
              { number: '50', suffix: '%', label: 'temps gagné', desc: 'sur la gestion documentaire' },
            ].map((stat, index) => (
              <div 
                key={index}
                className={`text-center ${statsVisible ? `animate-slide-up delay-${index * 100}` : 'opacity-0'}`}
              >
                <div className="flex items-baseline justify-center gap-1 mb-4">
                  <span className="text-6xl md:text-7xl font-bold">{stat.number}</span>
                  <span className="text-4xl font-bold text-blue-500">{stat.suffix}</span>
                </div>
                <div className="text-xl font-medium mb-2">{stat.label}</div>
                <div className="text-gray-400">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section ref={featuresRef} id="fonctionnalités" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`max-w-3xl mb-16 ${featuresVisible ? 'animate-slide-up' : 'opacity-0'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Tout ce qu'il faut pour construire l'avenir
            </h2>
            <p className="text-xl text-gray-600">
              Une suite complète d'outils pour gérer vos projets de construction de A à Z.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: 'gestion-projets', icon: Building2, title: 'Gestion de projets', desc: 'Créez et organisez vos projets de construction facilement' },
              { id: 'intervenants', icon: Users, title: 'Intervenants', desc: 'Gérez les équipes et les accès par projet' },
              { id: 'documents', icon: FileText, title: 'Documents', desc: 'Centralisez tous les fichiers de vos chantiers' },
              { id: 'tableau-de-bord', icon: BarChart3, title: 'Tableau de bord', desc: 'Visualisez l\'avancement de vos projets' },
              { id: 'securite', icon: Shield, title: 'Sécurité', desc: 'Protection des données et conformité RGPD' },
              { id: 'suivi-temps', icon: Clock, title: 'Suivi temps', desc: 'Gérez les délais et échéances des projets' },
              { id: 'multi-tenant', icon: Globe, title: 'Multi-tenant', desc: 'Séparation des données par entreprise' },
              { id: 'notifications', icon: Zap, title: 'Notifications', desc: 'Alertes et rappels pour les projets' },
            ].map((feature, index) => (
              <div
                key={index}
                onClick={() => navigate(`/fonctionnalites/${feature.id}`)}
                className={`group bg-white rounded-2xl p-8 hover-lift cursor-pointer border border-gray-100 ${
                  featuresVisible ? `animate-slide-up delay-${index * 50}` : 'opacity-0'
                }`}
              >
                <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
                <div className="mt-6 flex items-center text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-blue-600">En savoir plus</span>
                  <ArrowUpRight className="ml-1 h-4 w-4 text-blue-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section ref={audienceRef} id="solutions" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`text-center max-w-3xl mx-auto mb-16 ${audienceVisible ? 'animate-slide-up' : 'opacity-0'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Pour tous les acteurs du BTP
            </h2>
            <p className="text-xl text-gray-600">
              Des solutions adaptées à chaque métier de la construction.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                id: 'entreprises-generales',
                title: 'Entreprises générales',
                desc: 'Organisez vos chantiers et coordonnez vos équipes efficacement.',
                features: ['Structure de projet', 'Gestion des intervenants', 'Suivi des tâches']
              },
              {
                id: 'maitres-ouvrage',
                title: "Maîtres d'ouvrage",
                desc: "Suivez vos projets en temps réel et communiquez avec vos équipes.",
                features: ['Vue d\'ensemble projets', 'Partage documents', 'Historique complet']
              },
              {
                id: 'entreprises-specialisees',
                title: 'Entreprises spécialisées',
                desc: 'Accédez à vos projets et partagez vos livrables en toute simplicité.',
                features: ['Accès intervenants', 'Dépôt documents', 'Notifications projets']
              },
            ].map((solution, index) => (
              <div
                key={index}
                className={`bg-gray-50 rounded-3xl p-8 hover-lift border border-gray-100 h-full group ${
                  audienceVisible ? `animate-slide-up delay-${index * 150}` : 'opacity-0'
                }`}
              >
                <h3 className="text-2xl font-bold mb-4">{solution.title}</h3>
                <p className="text-gray-600 mb-6">{solution.desc}</p>
                <ul className="space-y-3 mb-8">
                  {solution.features.map((feature, i) => (
                    <li key={i} className="flex items-center text-sm">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full rounded-full border-2 hover:bg-black hover:text-white transition-colors"
                  onClick={() => navigate('/solutions')}
                >
                  Découvrir
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Prêt à transformer votre gestion de projet ?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Rejoignez les entreprises qui ont déjà adopté APS pour leurs projets.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate('/register')}
              className="bg-white text-blue-600 hover:bg-gray-100 rounded-full px-10 h-14 text-base font-medium"
            >
              Démarrer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 rounded-full px-10 h-14 text-base font-medium"
            >
              Contacter l'équipe
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="tarifs" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tarifs sur mesure
            </h2>
            <p className="text-lg text-gray-600">
              Des solutions adaptées à la taille de votre entreprise et à vos besoins spécifiques.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 hover-lift">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Petite structure</h3>
              <p className="text-gray-600 mb-4">Idéal pour les TPE et indépendants du BTP</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                  Jusqu'à 5 projets actifs
                </li>
                <li className="flex items-center text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                  10 intervenants
                </li>
                <li className="flex items-center text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                  Support email
                </li>
              </ul>
              <Button 
                variant="outline"
                className="w-full rounded-full border-2 hover:bg-black hover:text-white"
                onClick={() => navigate('/register')}
              >
                Demander un devis
              </Button>
            </div>

            {/* Professional Plan */}
            <div className="bg-black rounded-2xl p-8 text-white hover-lift relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Plus populaire
                </span>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 mt-2">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Entreprise</h3>
              <p className="text-gray-400 mb-4">Pour les PME et entreprises générales</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                  Projets illimités
                </li>
                <li className="flex items-center text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                  Intervenants illimités
                </li>
                <li className="flex items-center text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                  Support prioritaire
                </li>
              </ul>
              <Button 
                className="w-full bg-white text-black hover:bg-gray-100 rounded-full"
                onClick={() => navigate('/register')}
              >
                Demander un devis
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 hover-lift">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Grand compte</h3>
              <p className="text-gray-600 mb-4">Pour les groupes et promoteurs immobiliers</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                  Multi-sociétés
                </li>
                <li className="flex items-center text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                  API et intégrations
                </li>
                <li className="flex items-center text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                  Account manager dédié
                </li>
              </ul>
              <Button 
                variant="outline"
                className="w-full rounded-full border-2 hover:bg-black hover:text-white"
                onClick={() => navigate('/register')}
              >
                Contacter commercial
              </Button>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600">
              <span className="font-semibold">Essai gratuit de 14 jours</span> • Sans engagement • Sans carte bancaire
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Contactez-nous
            </h2>
            <p className="text-lg text-gray-600">
              Une question sur nos solutions ? Notre équipe est là pour vous accompagner.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <div className="lg:col-span-3 bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-bold mb-6">Envoyez-nous un message</h3>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                    <input 
                      id="nom"
                      type="text" 
                      name="nom"
                      value={formData.nom}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="Votre nom"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                    <input 
                      id="prenom"
                      type="text" 
                      name="prenom"
                      value={formData.prenom}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="Votre prénom"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input 
                    id="email"
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="entreprise" className="block text-sm font-medium text-gray-700 mb-2">Entreprise</label>
                  <input 
                    id="entreprise"
                    type="text" 
                    name="entreprise"
                    value={formData.entreprise}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Nom de votre entreprise"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea 
                    id="message"
                    rows={4}
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Comment pouvons-nous vous aider ?"
                    aria-describedby="message-help"
                    required
                  />
                </div>
                <Button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-black text-white hover:bg-gray-800 rounded-full py-6 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Envoyer le formulaire de contact"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      Envoyer le message
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">Email</h3>
                <p className="text-gray-600">contact@aps-international.com</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">Téléphone</h3>
                <p className="text-gray-600">+33640164997</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">Adresse</h3>
                <p className="text-gray-600">Bordeaux, France</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <HardHat className="h-6 w-6 text-black" />
                </div>
                <span className="text-2xl font-bold">APS</span>
              </div>
              <p className="text-gray-400 max-w-sm mb-6 leading-relaxed">
                La plateforme de gestion de construction moderne pour les entreprises du BTP. Simplifiez vos projets, gagnez en efficacité.
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all duration-300 group">
                  <svg className="h-5 w-5 text-gray-300 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all duration-300 group">
                  <Mail className="h-5 w-5 text-gray-300 group-hover:text-white" />
                </a>
                <a href="#" className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all duration-300 group">
                  <Phone className="h-5 w-5 text-gray-300 group-hover:text-white" />
                </a>
              </div>
            </div>
            
            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Produit</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#tarifs" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="#solutions" className="hover:text-white transition-colors">Solutions</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Intégrations</a></li>
              </ul>
            </div>
            
            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Entreprise</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carrières</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Contact</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-1 flex-shrink-0" />
                  <span>contact@aps-international.com</span>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-1 flex-shrink-0" />
                  <span>+33640164997</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span>Bordeaux, France</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">&copy; 2026 APS International. Tous droits réservés.</p>
            <div className="flex gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Mentions légales</a>
              <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-white transition-colors">CGU</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default Index;
