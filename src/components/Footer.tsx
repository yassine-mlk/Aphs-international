
import React from 'react';
import { translations } from '@/lib/translations';
import { useLanguage } from '@/contexts/LanguageContext';

const Footer: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language].footer;
  const textDirection = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <footer className="bg-black text-white py-12 px-4 border-t border-gray-800" dir={textDirection}>
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/aphs-logo.svg" alt="Logo" className="h-8 brightness-0 invert" />
            <span className="font-bold text-xl tracking-tight">APHS</span>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm text-gray-400">{t.copyright}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
