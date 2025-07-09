
import React from 'react';
import { translations } from '@/lib/translations';
import { useLanguage } from '@/contexts/LanguageContext';

const Footer: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language].footer;
  const textDirection = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <footer className="bg-aphs-navy text-white py-8 px-4" dir={textDirection}>
      <div className="container mx-auto">
        <div className="flex justify-center items-center">
          <div>
            <p className="text-sm text-gray-300">{t.copyright}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
