import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from '@/lib/utils';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigateToLogin = () => {
    navigate('/login');
  };

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-4 transition-all duration-300",
        isScrolled ? "bg-white shadow-md py-2" : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <img src="/aps-logo.svg" alt="APS" className="h-10" />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Accompagnement</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-4 w-[400px] md:w-[500px] lg:w-[600px] grid-cols-2">
                      {[
                        {
                          title: "Conseil en management",
                          description: "Services de conseil pour optimiser votre organisation",
                        },
                        {
                          title: "Gestion de projet",
                          description: "Pilotage de projets complexes de bout en bout",
                        },
                        {
                          title: "Formation professionnelle",
                          description: "Programmes de formation personnalisés",
                        },
                        {
                          title: "Audit & Diagnostic",
                          description: "Évaluation complète de vos processus",
                        },
                      ].map((service) => (
                        <li key={service.title} className="row-span-1">
                          <NavigationMenuLink asChild>
                            <a
                              href="#"
                              className="flex flex-col justify-between p-4 h-full rounded-md hover:bg-gray-100"
                            >
                              <div>
                                <div className="text-sm font-medium text-slate-900 mb-1">{service.title}</div>
                                <p className="text-sm text-gray-600">{service.description}</p>
                              </div>
                            </a>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>À Propos</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-4 w-[400px] md:grid-cols-2">
                      <li className="row-span-3">
                        <NavigationMenuLink asChild>
                          <a
                            className="flex flex-col justify-between h-full rounded-md bg-gradient-to-b from-gray-50 to-blue-50 p-4 no-underline"
                            href="#about"
                          >
                            <div className="mb-2 mt-4 text-lg font-medium text-black">
                              <img src="/aps-logo.svg" alt="APS" className="h-12" />
                            </div>
                            <p className="text-sm text-gray-600">
                              Notre mission est d'accompagner les entreprises dans leur transformation digitale et organisationnelle.
                            </p>
                            <div className="mt-2 text-blue-600 font-semibold">
                              En savoir plus →
                            </div>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a href="#team" className="block p-3 rounded-md hover:bg-gray-100">
                            <div className="text-sm font-medium text-slate-900 mb-1">
                              Notre équipe
                            </div>
                            <p className="text-sm text-gray-600">
                              Des experts dédiés à votre réussite
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a href="#testimonials" className="block p-3 rounded-md hover:bg-gray-100">
                            <div className="text-sm font-medium text-slate-900 mb-1">
                              Témoignages
                            </div>
                            <p className="text-sm text-gray-600">
                              Ce que nos clients disent de nous
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
            
            <a href="#features" className="text-black font-medium hover:text-blue-600 transition-colors">
              Fonctionnalités
            </a>
            <a href="#testimonials" className="text-black font-medium hover:text-blue-600 transition-colors">
              Témoignages
            </a>
            <Button 
              variant="default" 
              className="bg-black hover:bg-blue-600 text-white transition-colors"
              onClick={navigateToLogin}
            >
              Connexion
            </Button>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm"
              className="mr-2"
              onClick={navigateToLogin}
            >
              Connexion
            </Button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-900 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 py-4 border-t border-gray-200">
            <ul className="space-y-4">
              <li>
                <a href="#about" className="block text-black font-medium hover:text-blue-600" onClick={() => setIsMobileMenuOpen(false)}>
                  À Propos
                </a>
              </li>
              <li>
                <a href="#features" className="block text-black font-medium hover:text-blue-600" onClick={() => setIsMobileMenuOpen(false)}>
                  Fonctionnalités
                </a>
              </li>
              <li>
                <a href="#testimonials" className="block text-black font-medium hover:text-blue-600" onClick={() => setIsMobileMenuOpen(false)}>
                  Témoignages
                </a>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;
