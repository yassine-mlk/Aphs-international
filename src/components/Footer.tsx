
import React from 'react';
import { translations } from '@/lib/translations';
import { useLanguage } from '@/contexts/LanguageContext';
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language].footer;
  const textDirection = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <footer className="bg-slate-950 text-white pt-16 pb-8 px-4 border-t border-slate-800" dir={textDirection}>
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand and Description */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <img src="/aps-logo.svg" alt="APS Logo" className="h-10 brightness-0 invert" />
              <span className="font-bold text-2xl tracking-tight">APS</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t.description}
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 bg-slate-900 rounded-full hover:bg-blue-600 transition-colors duration-300">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-slate-900 rounded-full hover:bg-blue-400 transition-colors duration-300">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-slate-900 rounded-full hover:bg-blue-700 transition-colors duration-300">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-slate-900 rounded-full hover:bg-pink-600 transition-colors duration-300">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white">{t.sections.product.title}</h3>
            <ul className="space-y-4">
              <li><a href="#features" className="text-slate-400 hover:text-blue-500 transition-colors duration-300">{t.sections.product.features}</a></li>
              <li><a href="#" className="text-slate-400 hover:text-blue-500 transition-colors duration-300">{t.sections.product.pricing}</a></li>
              <li><a href="#" className="text-slate-400 hover:text-blue-500 transition-colors duration-300">{t.sections.product.demo}</a></li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white">{t.sections.company.title}</h3>
            <ul className="space-y-4">
              <li><a href="#" className="text-slate-400 hover:text-blue-500 transition-colors duration-300">{t.sections.company.about}</a></li>
              <li><a href="#" className="text-slate-400 hover:text-blue-500 transition-colors duration-300">{t.sections.company.careers}</a></li>
              <li><a href="#" className="text-slate-400 hover:text-blue-500 transition-colors duration-300">{t.sections.company.contact}</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-slate-400">
                <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <span>123 Business Avenue, Tech City, 2026</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <Phone className="w-5 h-5 text-blue-500 shrink-0" />
                <span>+1 (234) 567-890</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <Mail className="w-5 h-5 text-blue-500 shrink-0" />
                <span>contact@aps.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-800 w-full mb-8"></div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-slate-500 order-2 md:order-1">
            {t.copyright}
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500 order-1 md:order-2">
            <a href="#" className="hover:text-white transition-colors duration-300">{t.sections.legal.privacy}</a>
            <a href="#" className="hover:text-white transition-colors duration-300">{t.sections.legal.terms}</a>
            <a href="#" className="hover:text-white transition-colors duration-300">{t.sections.legal.cookies}</a>
            <a href="#" className="hover:text-white transition-colors duration-300">{t.sections.legal.legalNotice}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
