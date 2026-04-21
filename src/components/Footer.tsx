import React from 'react';
import { HardHat, Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin, ChevronRight } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0a0a0a] text-white pt-16 pb-8 px-4 border-t border-gray-800">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand and Description */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FFC107] to-[#FF8F00] rounded-lg flex items-center justify-center">
                <HardHat className="w-6 h-6 text-black" />
              </div>
              <span className="font-bold text-2xl tracking-tight text-white">APS</span>
            </div>
            <p className="text-gray-400 leading-relaxed mb-6">
              APS est votre centrale d'informations pour tous vos projets de construction. 
              La plateforme collaborative des professionnels du BTP.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="p-2 bg-[#1a1a1a] rounded-full hover:bg-[#FFC107] hover:text-black text-gray-400 transition-all duration-300">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-[#1a1a1a] rounded-full hover:bg-[#FFC107] hover:text-black text-gray-400 transition-all duration-300">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-[#1a1a1a] rounded-full hover:bg-[#FFC107] hover:text-black text-gray-400 transition-all duration-300">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-[#1a1a1a] rounded-full hover:bg-[#FFC107] hover:text-black text-gray-400 transition-all duration-300">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-[#FFC107]">Produit</h3>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="flex items-center text-gray-400 hover:text-[#FFC107] transition-colors group">
                  <ChevronRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Fonctionnalités
                </a>
              </li>
              <li>
                <a href="#benefits" className="flex items-center text-gray-400 hover:text-[#FFC107] transition-colors group">
                  <ChevronRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Avantages
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-400 hover:text-[#FFC107] transition-colors group">
                  <ChevronRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Tarifs
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-400 hover:text-[#FFC107] transition-colors group">
                  <ChevronRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Roadmap
                </a>
              </li>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-[#FFC107]">Solutions</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="flex items-center text-gray-400 hover:text-[#FFC107] transition-colors group">
                  <ChevronRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Maître d'œuvre
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-400 hover:text-[#FFC107] transition-colors group">
                  <ChevronRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Maître d'ouvrage
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-400 hover:text-[#FFC107] transition-colors group">
                  <ChevronRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Entreprise générale
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-gray-400 hover:text-[#FFC107] transition-colors group">
                  <ChevronRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  Bureau d'études
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-[#FFC107]">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#FFC107] flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 text-sm">
                  123 Avenue des Champs-Élysées<br />
                  75008 Paris, France
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#FFC107] flex-shrink-0" />
                <a href="tel:+33123456789" className="text-gray-400 hover:text-[#FFC107] transition-colors text-sm">
                  +33 1 23 45 67 89
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#FFC107] flex-shrink-0" />
                <a href="mailto:contact@aps.fr" className="text-gray-400 hover:text-[#FFC107] transition-colors text-sm">
                  contact@aps.fr
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Restez informé</h4>
              <p className="text-gray-400 text-sm">Recevez nos actualités et nouveautés produits</p>
            </div>
            <form className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder="Votre email"
                className="px-4 py-3 bg-[#1a1a1a] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FFC107]/50 flex-1 md:w-64"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-[#FFC107] to-[#FF8F00] text-black font-bold rounded-lg hover:shadow-lg hover:shadow-[#FFC107]/30 transition-all"
              >
                S'inscrire
              </button>
            </form>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {currentYear} APS. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <a href="#" className="text-gray-500 hover:text-[#FFC107] transition-colors">
              Mentions légales
            </a>
            <a href="#" className="text-gray-500 hover:text-[#FFC107] transition-colors">
              Politique de confidentialité
            </a>
            <a href="#" className="text-gray-500 hover:text-[#FFC107] transition-colors">
              CGU
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
