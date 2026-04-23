import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-white py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Logo et description */}
          <div className="col-span-2">
            <img src="/aps-logo.svg" alt="APS" className="h-10 mb-4 brightness-0 invert" />
            <p className="text-gray-400 mb-6 max-w-md">
              Logiciel avancé de gestion de projets de construction aidant les équipes à livrer des projets à temps et dans les limites du budget.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">LinkedIn</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Facebook</a>
            </div>
          </div>

          {/* Produit */}
          <div>
            <h4 className="font-semibold mb-4">Produit</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Fonctionnalités</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Tarifs</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Démo</a></li>
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h4 className="font-semibold mb-4">Entreprise</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">À propos</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Carrières</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © 2026 APS International. Tous droits réservés.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-gray-500 hover:text-white transition-colors">Mentions légales</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">Confidentialité</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">CGU</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
