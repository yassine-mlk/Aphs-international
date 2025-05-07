
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
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-300">{t.copyright}</p>
          </div>
          <div className="flex space-x-6">
            {['Facebook', 'Twitter', 'LinkedIn', 'Instagram'].map(social => (
              <a 
                key={social}
                href={`#${social.toLowerCase()}`}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
