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
        <div className="bg-gradient-to-br from-aphs-navy to-aphs-teal rounded-2xl overflow-hidden shadow-xl">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t.title}
              </h2>
              <p className="text-white/90 text-lg mb-8">
                {t.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  className="bg-white text-aphs-navy hover:bg-gray-100 transition-colors"
                  size="lg"
                >
                  {t.buttons.trial}
                </Button>
              </div>

              <div className="mt-8 flex items-center">
                <img 
                  src="/team/person1.jpg" 
                  alt="Said Kharrat - PDG APHS"
                  className="w-16 h-16 rounded-full object-cover border-4 border-white"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white to-gray-200 text-aphs-navy text-xl font-bold hidden items-center justify-center border-4 border-white">
                  SK
                </div>
                <div className="ml-4">
                  <p className="text-white font-medium">{t.testimonial.quote}</p>
                  <p className="text-white/70 text-sm">{t.testimonial.author}</p>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 bg-white/10 backdrop-blur-sm p-8 md:p-12">
              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-white text-sm font-medium mb-1">{t.form.name}</label>
                  <input
                    type="text"
                    id="name"
                    className="w-full px-4 py-3 bg-white/20 border border-white/10 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder={t.form.name}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-white text-sm font-medium mb-1">{t.form.email}</label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 bg-white/20 border border-white/10 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder={t.form.email}
                  />
                </div>
                <div>
                  <label htmlFor="company" className="block text-white text-sm font-medium mb-1">{t.form.company}</label>
                  <input
                    type="text"
                    id="company"
                    className="w-full px-4 py-3 bg-white/20 border border-white/10 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder={t.form.company}
                  />
                </div>
                <Button 
                  className="w-full bg-white text-aphs-navy hover:bg-gray-100 transition-colors"
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
