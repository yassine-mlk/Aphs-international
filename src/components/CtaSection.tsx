import React from 'react';
import { Button } from "@/components/ui/button";
import { translations } from '@/lib/translations';
import { useLanguage } from '@/contexts/LanguageContext';

const CtaSection: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language].ctaSection;
  const textDirection = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <section id="contact" className="py-20 px-4 bg-white" dir={textDirection}>
      <div className="container mx-auto">
        <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t.title}
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                {t.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  size="lg"
                >
                  {t.buttons.trial}
                </Button>
              </div>
            </div>
            <div className="w-full md:w-1/2 bg-white/5 backdrop-blur-sm p-8 md:p-12 border-l border-white/5">
              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-white text-sm font-medium mb-1">{t.form.name}</label>
                  <input
                    type="text"
                    id="name"
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all"
                    placeholder={t.form.name}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-white text-sm font-medium mb-1">{t.form.email}</label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all"
                    placeholder={t.form.email}
                  />
                </div>
                <div>
                  <label htmlFor="company" className="block text-white text-sm font-medium mb-1">{t.form.company}</label>
                  <input
                    type="text"
                    id="company"
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all"
                    placeholder={t.form.company}
                  />
                </div>
                <Button 
                  className="w-full bg-white text-black hover:bg-gray-200 transition-colors font-bold"
                  size="lg"
                >
                  {t.form.submit}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
