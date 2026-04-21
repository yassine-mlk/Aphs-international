import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { HardHat, Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    if (isHomePage) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
    setIsMobileMenuOpen(false);
  };

  const navigateToLogin = () => {
    navigate('/login');
  };

  const navigateToRegister = () => {
    navigate('/register');
  };

  const scrollToFeatures = () => scrollToSection('features');
  const scrollToBenefits = () => scrollToSection('benefits');
  const scrollToContact = () => scrollToSection('contact');

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#0a0a0a]/95 backdrop-blur-md border-b border-gray-800 shadow-lg' 
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFC107] to-[#FF8F00] rounded-lg flex items-center justify-center shadow-lg shadow-[#FFC107]/20">
              <HardHat className="w-6 h-6 text-black" />
            </div>
            <span className="text-xl font-bold text-white">APS</span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Solutions Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setIsSolutionsOpen(true)}
              onMouseLeave={() => setIsSolutionsOpen(false)}
            >
              <button className="flex items-center gap-1 text-gray-300 hover:text-[#FFC107] transition-colors font-medium">
                Solutions
                <ChevronDown className={`w-4 h-4 transition-transform ${isSolutionsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isSolutionsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-xl py-2"
                  >
                    <button 
                      onClick={scrollToFeatures}
                      className="w-full text-left px-4 py-3 text-gray-300 hover:text-[#FFC107] hover:bg-[#FFC107]/5 transition-colors"
                    >
                      <div className="font-medium">Fonctionnalités</div>
                      <div className="text-xs text-gray-500">Découvrez nos outils</div>
                    </button>
                    <button 
                      onClick={scrollToBenefits}
                      className="w-full text-left px-4 py-3 text-gray-300 hover:text-[#FFC107] hover:bg-[#FFC107]/5 transition-colors"
                    >
                      <div className="font-medium">Avantages</div>
                      <div className="text-xs text-gray-500">Pourquoi choisir APS</div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={scrollToFeatures}
              className="text-gray-300 hover:text-[#FFC107] transition-colors font-medium"
            >
              Fonctionnalités
            </button>
            <button 
              onClick={scrollToBenefits}
              className="text-gray-300 hover:text-[#FFC107] transition-colors font-medium"
            >
              Avantages
            </button>
            <button 
              onClick={scrollToContact}
              className="text-gray-300 hover:text-[#FFC107] transition-colors font-medium"
            >
              Contact
            </button>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-gray-300 hover:text-[#FFC107] hover:bg-[#FFC107]/10"
              onClick={navigateToLogin}
            >
              Connexion
            </Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                className="bg-gradient-to-r from-[#FFC107] to-[#FF8F00] hover:from-[#FFB300] hover:to-[#F57C00] text-black font-bold shadow-lg shadow-[#FFC107]/20"
                onClick={navigateToRegister}
              >
                Essai gratuit
              </Button>
            </motion.div>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-gray-300 hover:text-[#FFC107] transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden bg-[#0a0a0a] border-t border-gray-800 overflow-hidden"
            >
              <div className="py-4 space-y-2">
                <button 
                  onClick={scrollToFeatures}
                  className="w-full text-left px-4 py-3 text-gray-300 hover:text-[#FFC107] hover:bg-[#FFC107]/5 rounded-lg transition-colors"
                >
                  Fonctionnalités
                </button>
                <button 
                  onClick={scrollToBenefits}
                  className="w-full text-left px-4 py-3 text-gray-300 hover:text-[#FFC107] hover:bg-[#FFC107]/5 rounded-lg transition-colors"
                >
                  Avantages
                </button>
                <button 
                  onClick={scrollToContact}
                  className="w-full text-left px-4 py-3 text-gray-300 hover:text-[#FFC107] hover:bg-[#FFC107]/5 rounded-lg transition-colors"
                >
                  Contact
                </button>
                <div className="pt-4 px-4 space-y-3">
                  <Button 
                    variant="outline"
                    className="w-full border-gray-700 text-gray-300 hover:border-[#FFC107] hover:text-[#FFC107]"
                    onClick={navigateToLogin}
                  >
                    Connexion
                  </Button>
                  <Button 
                    className="w-full bg-gradient-to-r from-[#FFC107] to-[#FF8F00] text-black font-bold"
                    onClick={navigateToRegister}
                  >
                    Essai gratuit
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;
