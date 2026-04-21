import React from 'react';
import { translations } from '@/lib/translations';

const Footer: React.FC = () => {
  const t = translations.fr.footer;

  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo et description */}
          <div className="col-span-1 md:col-span-2">
            <img src="/aps-logo-white.svg" alt="APS" className="h-10 mb-4" />
            <p className="text-gray-400 mb-4 max-w-md">
              {t.description}
            </p>
          </div>

          {/* Liens rapides */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t.links}</h3>
            <ul className="space-y-2">
              <li><a href="#about" className="hover:text-white transition-colors">{t.about}</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">{t.services}</a></li>
              <li><a href="#testimonials" className="hover:text-white transition-colors">{t.testimonials}</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t.contact}</h3>
            <ul className="space-y-2">
              <li>contact@aps-international.com</li>
              <li>+33 1 23 45 67 89</li>
              <li>Paris, France</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>© 2024 APS International. {t.rights}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
