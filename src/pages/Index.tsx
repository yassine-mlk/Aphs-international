import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  HardHat, ArrowRight, Menu, X, Play, ChevronRight,
  Building2, Users, FileText, BarChart3, Shield, Clock,
  CheckCircle2, ArrowUpRight, Zap, Globe, Mail, Phone,
  MessageSquare, Video, Target, HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContactForm } from '@/hooks/useContactForm';
import SEOHead from '@/components/SEOHead';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  const [workflowRef, workflowVisible] = useReveal();
  const [pricingRef, pricingVisible] = useReveal();
  const [faqRef, faqVisible] = useReveal();
  const { formData, isLoading, handleInputChange, handleSubmit } = useContactForm();

  // Scroll Progress Bar
  useEffect(() => {
    const progressBar = document.createElement('div'); 
    progressBar.style.cssText = ` 
      position: fixed; top: 0; left: 0; height: 2px; 
      background: #1A4FFF; z-index: 9999; 
      width: 0%; transition: width 0.1s; 
    `; 
    document.body.prepend(progressBar); 
    
    const handleScroll = () => { 
      const scrolled = window.scrollY; 
      const total = document.body.scrollHeight - window.innerHeight; 
      progressBar.style.width = (scrolled / total * 100) + '%'; 
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      progressBar.remove();
    };
  }, []);

  // Intersection Observer for Reveal Animations and Counters
  useEffect(() => {
    const animateCounter = (el: HTMLElement, target: number, suffix: string, duration = 1500) => { 
      let start = 0; 
      const step = target / (duration / 16); 
      const timer = setInterval(() => { 
        start += step; 
        if (start >= target) { 
          el.textContent = target + suffix; 
          clearInterval(timer); 
        } else { 
          el.textContent = Math.floor(start) + suffix; 
        } 
      }, 16); 
    };

    const observer = new IntersectionObserver( 
      (entries) => { 
        entries.forEach(entry => { 
          if (entry.isIntersecting) { 
            entry.target.classList.add('visible'); 
            
            // Si c'est un compteur, on lance l'animation
            const counterEl = entry.target.querySelector('[data-counter]');
            if (counterEl instanceof HTMLElement && !counterEl.classList.contains('animated')) {
              const target = parseInt(counterEl.dataset.counter || '0');
              const suffix = counterEl.dataset.suffix || '';
              animateCounter(counterEl, target, suffix);
              counterEl.classList.add('animated');
            }
          } 
        }); 
      }, 
      { threshold: 0.15 } 
    ); 
    
    document.querySelectorAll( 
      '.reveal, .reveal-left, .reveal-right' 
    ).forEach(el => observer.observe(el));

    // Hero est visible immédiatement
    document.querySelectorAll('.hero-section .reveal, .hero-section .reveal-left, .hero-section .reveal-right') 
      .forEach(el => el.classList.add('visible'));

    return () => observer.disconnect();
  }, []);

  const scrollToContact = (e: React.MouseEvent) => {
    e.preventDefault();
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

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
        
        /* Apple-style Scroll Animations */
        .reveal { 
          opacity: 0; 
          transform: translateY(40px); 
          transition: opacity 0.7s ease, transform 0.7s ease; 
        } 
        
        .reveal.visible { 
          opacity: 1; 
          transform: translateY(0); 
        } 
        
        .reveal-left { 
          opacity: 0; 
          transform: translateX(-40px); 
          transition: opacity 0.7s ease, transform 0.7s ease; 
        } 
        
        .reveal-left.visible { 
          opacity: 1; 
          transform: translateX(0); 
        } 
        
        .reveal-right { 
          opacity: 0; 
          transform: translateX(40px); 
          transition: opacity 0.7s ease, transform 0.7s ease; 
        } 
        
        .reveal-right.visible { 
          opacity: 1; 
          transform: translateX(0); 
        } 
        
        /* Délai en cascade pour les grilles */ 
        .reveal:nth-child(1) { transition-delay: 0ms; } 
        .reveal:nth-child(2) { transition-delay: 100ms; } 
        .reveal:nth-child(3) { transition-delay: 200ms; } 
        .reveal:nth-child(4) { transition-delay: 300ms; } 
        .reveal:nth-child(5) { transition-delay: 400ms; } 
        .reveal:nth-child(6) { transition-delay: 500ms; } 
        
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
              <span className="text-xl font-bold tracking-tight">APS Construction</span>
            </a>

            <div className="hidden md:flex items-center gap-8">
              {[
                { label: 'Fonctionnalités', href: '#fonctionnalites' },
                { label: 'Workflow', href: '#workflow' },
                { label: 'Tarifs', href: '#tarifs' },
                { label: 'FAQ', href: '#faq' }
              ].map((item) => (
                <a 
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium text-gray-600 hover:text-black transition-colors relative group"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-blue-600 transition-all group-hover:w-full" />
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Button 
                onClick={() => navigate('/login')}
                className="bg-[#1A4FFF] text-white hover:bg-[#0A0A0A] rounded-[100px] px-6 py-[10px] text-sm font-medium transition-all duration-200 border-none shadow-sm"
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
                {[
                  { label: 'Fonctionnalités', href: '#fonctionnalites' },
                  { label: 'Workflow', href: '#workflow' },
                  { label: 'Tarifs', href: '#tarifs' },
                  { label: 'FAQ', href: '#faq' }
                ].map((item) => (
                  <a 
                    key={item.label}
                    href={item.href}
                    className="block text-lg font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#1A4FFF] text-white hover:bg-[#0A0A0A] rounded-[100px] py-4 text-base font-medium transition-all duration-200 border-none shadow-sm"
                >
                  Connexion
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="hero-section relative min-h-screen flex items-center pt-20 overflow-hidden bg-white">
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
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium mb-8 hover:scale-105 transition-transform cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Plateforme de gestion de projets BTP — France
              </div>
              
              {/* Main Title */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-8 tracking-tight">
                <span className="block">Pilotez vos projets</span>
                <span className="block mt-2">
                  <span className="text-stroke relative">
                    de construction
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                      <path d="M0 4C50 4 50 0 100 0C150 0 150 8 200 4" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" className="animate-draw" />
                    </svg>
                  </span>
                </span>
                <span className="block mt-2">sans perdre le fil</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-10 max-w-lg leading-relaxed">
                APS Construction centralise l'ensemble de vos intervenants, phases, documents et validations sur une seule plateforme. De l'étude préalable à la réception des travaux.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  onClick={scrollToContact}
                  className="bg-black text-white hover:bg-gray-800 rounded-full px-8 h-14 text-base font-medium group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    Demander une démonstration
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 h-14 text-base font-medium border-2 hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('fonctionnalites')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Voir comment ça marche →
                </Button>
              </div>

              {/* Trust badges */}
              <div className="mt-12 flex flex-wrap items-center gap-6">
                <div className="reveal flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">
                    <strong data-counter="20" data-suffix="%">20%</strong> d'économie
                  </span>
                </div>
                <div className="reveal flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">
                    <strong data-counter="98" data-suffix="%">98%</strong> de satisfaction
                  </span>
                </div>
                <div className="reveal flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">
                    <strong data-counter="40" data-suffix="%">40%</strong> moins de retards
                  </span>
                </div>
              </div>
            </div>

            <div className="reveal-right relative hidden lg:block">
              <div className="relative">
                {/* Dashboard Mockup */}
                <div className="bg-white rounded-2xl p-2 border border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden">
                  <div className="bg-gray-50/50 rounded-xl overflow-hidden border border-gray-100">
                    {/* Browser Header */}
                    <div className="bg-gray-100/80 px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                      </div>
                      <div className="ml-2 bg-white rounded-md px-4 py-1 text-[11px] text-gray-500 flex-1 text-center border border-gray-200 shadow-sm font-medium">
                        app.aps-construction.fr
                      </div>
                    </div>
                    
                    {/* Dashboard Content */}
                    <div className="p-6 bg-white">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Villa Méditerranée</h3>
                          <p className="text-xs text-gray-500 font-medium">Phase Conception • Mise à jour il y a 2h</p>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <Target className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>

                      {/* KPI Cards */}
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <div className="text-sm font-bold text-gray-900 mb-1">12 tâches</div>
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">
                            8 en cours
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <div className="text-sm font-bold text-gray-900 mb-1">5 intervenants</div>
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-600">
                            actifs
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <div className="text-sm font-bold text-gray-900 mb-1">2 workflows</div>
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600">
                            en révision
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <div className="text-sm font-bold text-gray-900 mb-1">80% avancement</div>
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-600">
                            en avance
                          </div>
                        </div>
                      </div>

                      {/* Recent Tasks List */}
                      <div className="space-y-3">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tâches prioritaires</div>
                        {[
                          { title: 'Plans de coffrage PH RDC', status: 'Visa VAR', color: 'text-red-600', bg: 'bg-red-50' },
                          { title: 'Note de calcul structure', status: 'En révision', color: 'text-orange-600', bg: 'bg-orange-50' },
                          { title: 'Détails étanchéité terrasse', status: 'Visa VSO', color: 'text-green-600', bg: 'bg-green-50' }
                        ].map((task, i) => (
                          <div key={i} className="flex items-center gap-4 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                            <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-bold text-gray-900 truncate">{task.title}</div>
                            </div>
                            <div className={`px-2 py-1 rounded-md text-[10px] font-bold ${task.bg} ${task.color}`}>
                              {task.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-2xl p-5 border border-gray-100 animate-float">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                      <Target className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-gray-900">Visa VSO</div>
                      <div className="text-[11px] text-gray-500 font-medium">Calculé automatiquement</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-2xl p-5 border border-gray-100 animate-float" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-gray-900">Zéro retard</div>
                      <div className="text-[11px] text-gray-500 font-medium">Alertes automatiques</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section ref={featuresRef} id="fonctionnalites" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`max-w-3xl mb-20 ${featuresVisible ? 'animate-slide-up' : 'opacity-0'}`}>
            <div className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-4">Fonctionnalités</div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              Tout ce dont votre chantier a besoin
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              De la première étude à la réception des travaux — chaque intervenant sait exactement ce qu'il doit faire et quand.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                icon: BarChart3, 
                title: 'Assignation des tâches', 
                desc: 'Créez des tâches par phases et sous-phases, assignez les bons intervenants avec des deadlines précises. Diagramme de Gantt intégré et suivi en temps réel.' 
              },
              { 
                icon: FileText, 
                title: 'Workflow documentaire', 
                desc: 'Circuit de validation séquentiel avec avis F/D/S/HM et visas VSO/VAO/VAR. Gestion automatique des révisions, des indices et des notifications.' 
              },
              { 
                icon: Shield, 
                title: 'Stockage de fichiers lourds', 
                desc: 'Uploadez plans, maquettes et rapports jusqu\'à plusieurs Go par fichier. Aucune limite de taille — conçu pour les gros projets BTP.' 
              },
              { 
                icon: MessageSquare, 
                title: 'Messagerie & Groupes', 
                desc: 'Conversations privées et groupes de travail par projet. Chaque intervenant accède uniquement aux échanges qui le concernent.' 
              },
              { 
                icon: Video, 
                title: 'Visioconférence intégrée', 
                desc: 'Organisez vos réunions de chantier directement depuis la plateforme. Demandes, acceptations et rappels automatiques.' 
              },
              { 
                icon: Target, 
                title: 'Tableau de bord intelligent', 
                desc: 'Vue en temps réel de l\'avancement, des alertes et des workflows bloqués. Tout ce que l\'administrateur doit surveiller, en un coup d\'œil.' 
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="reveal group bg-gray-50 rounded-3xl p-8 hover-lift border border-gray-100"
              >
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:bg-blue-600 transition-colors">
                  <feature.icon className="h-7 w-7 text-black group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section (Fond sombre) */}
      <section ref={workflowRef} id="workflow" className="py-24 bg-slate-950 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="reveal">
              <div className="text-blue-500 font-bold text-sm uppercase tracking-widest mb-4">Workflow documentaire</div>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">
                La seule plateforme qui parle vraiment le BTP
              </h2>
              <p className="text-xl text-slate-400 mb-12 leading-relaxed">
                Les visas VSO, VAO, VAR, les avis F/D/S/HM, les indices de révision A→B→C… Tout ce qui se passe sur un vrai chantier est géré nativement.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-12">
                {[
                  { label: 'F', name: 'Favorable', color: 'bg-green-500' },
                  { label: 'S', name: 'Suspendu', color: 'bg-yellow-500' },
                  { label: 'D', name: 'Défavorable', color: 'bg-red-500' },
                  { label: 'HM', name: 'Hors Mission', color: 'bg-slate-500' },
                ].map(avis => (
                  <div key={avis.label} className="reveal flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className={`${avis.color} w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white`}>
                      {avis.label}
                    </div>
                    <span className="font-medium">{avis.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="space-y-6 relative z-10">
                {[
                  { step: '1', title: 'L\'exécutant soumet le document', desc: 'Upload du fichier avec commentaires. L\'indice de révision est automatiquement assigné (A, B, C…).' },
                  { step: '2', title: 'Chaîne de validation séquentielle', desc: 'Chaque validateur est notifié quand c\'est son tour. La chaîne se déroule quel que soit l\'avis.' },
                  { step: '3', title: 'Visa calculé automatiquement', desc: 'VSO si favorable, VAO en suspension, VAR en refus. Notification instantanée avec observations.' },
                  { step: '4', title: 'L\'administrateur clôture ou intervient', desc: 'En cas de blocage après N révisions, l\'admin peut valider, relancer ou réassigner en un clic.' },
                ].map((item, index) => (
                  <div key={index} className="reveal flex gap-6 p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors group">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{item.title}</h3>
                      <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Decorative gradient */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-600/20 blur-[120px] rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={pricingRef} id="tarifs" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="reveal text-center max-w-3xl mx-auto mb-20">
            <div className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-4">Nos formules</div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Un tarif adapté à chaque projet</h2>
            <p className="text-xl text-gray-600">
              Nos commerciaux établissent avec vous le contrat adapté à la taille et aux besoins de votre projet.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {[
              {
                title: 'Plan Starter',
                subtitle: 'Pour les maîtres d\'œuvre indépendants et les petits projets.',
                price: '100€',
                period: '/ projet / mois',
                features: ['Jusqu\'à 10 intervenants par projet', 'Tâches standards', 'Messagerie privée', 'Diagramme de Gantt', 'Stockage 5 Go', 'Support email'],
                cta: 'Demander un devis'
              },
              {
                title: 'Plan Pro',
                subtitle: 'Pour les bureaux d\'études et les PME du BTP.',
                price: '199€',
                period: '/ projet / mois',
                popular: true,
                features: ['Jusqu\'à 30 intervenants par projet', 'Workflow documentaire complet', 'Visa VSO / VAO / VAR automatique', 'Avis F / D / S / HM', 'Visioconférence intégrée', 'Groupes de travail', 'Notifications email', 'Stockage 50 Go (fichiers jusqu\'à 2 Go)', 'Support prioritaire'],
                cta: 'Demander un devis'
              },
              {
                title: 'Plan Business',
                subtitle: 'Pour les grands projets et les promoteurs immobiliers.',
                price: '499€',
                period: '/ projet / mois',
                features: ['Intervenants illimités', 'Signature électronique', 'Stockage illimité', 'Structure projet personnalisable', 'Fiches informatives avancées', 'Accès API', 'Gestionnaire de compte dédié', 'SLA garanti'],
                cta: 'Demander un devis'
              }
            ].map((plan, index) => ( 
              <div key={index} className={`reveal relative bg-white rounded-3xl p-10 border hover-lift transition-all ${
                plan.popular 
                ? 'lg:scale-105 border-[#1A4FFF] border-2 shadow-xl z-10' 
                : 'bg-gray-50 border-gray-100'
              }`}>
                <h3 className="text-2xl font-bold mb-4 text-black">{plan.title}</h3>
                <p className="text-gray-500 mb-8 h-12">{plan.subtitle}</p>
                <div className="mb-10">
                  <span className="text-4xl font-black text-black">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                
                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={scrollToContact}
                  className={`w-full py-6 rounded-full text-base font-bold transition-all ${
                    plan.popular 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200' 
                    : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-16 p-8 bg-blue-50 rounded-3xl border border-blue-100 text-center">
            <p className="text-blue-900 font-medium">
              Tarifs indicatifs hors taxes. Nos commerciaux établissent avec vous un contrat sur mesure selon vos besoins. 
              Contactez-nous pour une proposition personnalisée.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                quote: "Avant APS Construction, nous perdions un temps considérable à relancer les intervenants par email. Aujourd'hui, tout le monde sait exactement ce qu'il doit faire et quand.",
                author: "Directeur de projet",
                org: "Bureau d'études structure"
              },
              { 
                quote: "La gestion des indices de révision et des visas VSO/VAR correspond exactement à nos pratiques terrain. C'est le premier outil que nous recommandons.",
                author: "Responsable MOE",
                org: "Cabinet d'architecture"
              },
              { 
                quote: "Nous gérons plusieurs projets simultanément avec des dizaines d'intervenants. Le tableau de bord nous permet d'identifier immédiatement les circuits bloqués.",
                author: "Directeur technique",
                org: "Promoteur immobilier"
              }
            ].map((t, i) => (
              <div key={i} className="reveal bg-white p-10 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <p className="text-lg italic text-gray-700 mb-8 leading-relaxed">"{t.quote}"</p>
                <div>
                  <div className="font-bold text-gray-900">{t.author}</div>
                  <div className="text-sm text-blue-600 font-medium">{t.org}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section ref={faqRef} id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">Questions fréquentes</h2>
            <p className="text-gray-500">Tout ce que vous devez savoir sur APS Construction.</p>
          </div>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            {[
              { q: "Qu'est-ce qu'un \"projet\" dans APS Construction ?", r: "Un projet correspond à un chantier ou une opération de construction. Vous pouvez y intégrer autant de phases, sous-phases et tâches que nécessaire. Chaque projet est configuré avec votre équipe commerciale selon vos besoins spécifiques." },
              { q: "Comment fonctionne le workflow documentaire VSO/VAO/VAR ?", r: "L'administrateur assigne un exécutant et une chaîne de validateurs ordonnée. L'exécutant soumet le document, chaque validateur donne son avis (F/D/S/HM) dans l'ordre. Le système calcule automatiquement le visa final et notifie toutes les parties." },
              { q: "Peut-on uploader des fichiers de grande taille ?", r: "Oui. Il n'y a aucune limite de taille de fichier sur les formules Pro et Business. Vous pouvez uploader des maquettes BIM, des vidéos de chantier et des plans haute résolution sans contrainte technique." },
              { q: "Les intervenants externes peuvent-ils accéder à la plateforme ?", r: "Oui. Vous invitez vos intervenants (entreprises, bureaux d'études, contrôleurs techniques) directement depuis la plateforme. Chacun accède uniquement aux projets et tâches qui le concernent." },
              { q: "Comment se passe la mise en place ?", r: "Notre équipe vous accompagne de A à Z. Après signature du contrat, nous configurons la plateforme avec vous, importons vos données et formons vos équipes. Le délai est généralement inférieur à une semaine." }
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="reveal border rounded-2xl px-6 bg-gray-50/50">
                <AccordionTrigger className="text-left font-bold text-lg py-6 hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-base pb-6 leading-relaxed">
                  {faq.r}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="reveal py-24 bg-blue-600 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Votre prochain chantier mérite mieux</h2>
          <p className="text-xl text-blue-100 mb-12 leading-relaxed">
            Rejoignez les professionnels du BTP qui ont adopté APS Construction pour piloter leurs projets avec sérénité.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={scrollToContact}
              className="bg-white text-blue-600 hover:bg-gray-100 rounded-full px-10 h-16 text-lg font-bold shadow-xl"
            >
              Contacter un commercial
            </Button>
            <Button 
              size="lg"
              onClick={scrollToContact}
              className="bg-black text-white hover:bg-gray-900 rounded-full px-10 h-16 text-lg font-bold shadow-xl border-none"
            >
              Demander une démonstration
            </Button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 blur-3xl rounded-full -ml-32 -mb-32" />
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl font-bold mb-6 tracking-tight">Parlons de votre projet</h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Renseignez vos coordonnées et un membre de notre équipe commerciale vous contacte sous 24 heures ouvrées.
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold">Email</div>
                    <div className="text-gray-600">contact@aps-construction.fr</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold">Téléphone</div>
                    <div className="text-gray-600">+33 (0)1 84 60 00 00</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-sm text-gray-500 italic">
                  "En soumettant ce formulaire, vous acceptez d'être recontacté par notre équipe commerciale. Aucun démarchage automatisé."
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-gray-100">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input id="nom" name="nom" value={formData.nom} onChange={handleInputChange} placeholder="Nom" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input id="prenom" name="prenom" value={formData.prenom} onChange={handleInputChange} placeholder="Prénom" required />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="entreprise">Société</Label>
                    <Input id="entreprise" name="entreprise" value={formData.entreprise} onChange={handleInputChange} placeholder="Votre entreprise" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fonction">Poste / Fonction</Label>
                    <Input id="fonction" name="fonction" value={formData.fonction} onChange={handleInputChange} placeholder="Ex: Directeur de projet" required />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email professionnel</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="email@entreprise.fr" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input id="telephone" name="telephone" value={formData.telephone} onChange={handleInputChange} placeholder="06 00 00 00 00" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nbProjets">Nombre de projets à gérer</Label>
                  <select 
                    id="nbProjets" 
                    name="nbProjets" 
                    value={formData.nbProjets} 
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="1">1 projet</option>
                    <option value="2-5">2 à 5 projets</option>
                    <option value="5-10">5 à 10 projets</option>
                    <option value="+10">Plus de 10 projets</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message / Besoin spécifique (optionnel)</Label>
                  <textarea 
                    id="message" 
                    name="message" 
                    value={formData.message} 
                    onChange={handleInputChange}
                    rows={4}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Dites-nous en plus sur vos besoins..."
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl text-lg font-bold transition-all"
                >
                  {isLoading ? "Envoi en cours..." : "Envoyer ma demande"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <HardHat className="h-5 w-5 text-black" />
                </div>
                <span className="text-xl font-bold">APS Construction</span>
              </div>
              <p className="text-slate-400 leading-relaxed mb-6">
                La plateforme de gestion de projets BTP pour les professionnels exigeants.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-6">Produit</h4>
              <ul className="space-y-4 text-slate-400">
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#workflow" className="hover:text-white transition-colors">Workflow</a></li>
                <li><a href="#tarifs" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6">Ressources</h4>
              <ul className="space-y-4 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Guide de démarrage</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6">Contact</h4>
              <ul className="space-y-4 text-slate-400">
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4" />
                  <span>contact@aps-construction.fr</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4" />
                  <span>+33 (0)1 84 60 00 00</span>
                </li>
                <li className="flex items-start gap-3">
                  <Target className="h-4 w-4 mt-1" />
                  <span>Paris, France</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-slate-500">
              © 2026 APS Construction. Tous droits réservés.
            </p>
            <div className="flex gap-8 text-sm text-slate-500">
              <a href="#" className="hover:text-white transition-colors">Politique de confidentialité</a>
              <a href="#" className="hover:text-white transition-colors">Mentions légales</a>
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
