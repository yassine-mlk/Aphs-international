import React, { createContext, useState, useContext, useEffect } from 'react';
import { Language } from '@/components/LanguageSelector';
import { supabase } from '../lib/supabase';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('fr');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        // Essayer de récupérer l'utilisateur actuel
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData?.user) {
          // Essayer de charger les paramètres utilisateur depuis Supabase
          const { data: settings } = await supabase
            .from('user_settings')
            .select('language')
            .eq('id', userData.user.id)
            .single();
          
          if (settings && settings.language) {
            setLanguage(settings.language as Language);
            return;
          }
        }
        
        // Fallback vers localStorage si aucun paramètre utilisateur n'est trouvé
        const savedLanguage = localStorage.getItem('preferredLanguage') as Language;
        if (savedLanguage && ['en', 'fr', 'es', 'ar'].includes(savedLanguage)) {
          setLanguage(savedLanguage);
        } else {
          // Try to detect browser language
          const browserLang = navigator.language.split('-')[0];
          if (['en', 'fr', 'es', 'ar'].includes(browserLang as Language)) {
            setLanguage(browserLang as Language);
          }
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
        
        // Fallback vers localStorage
        const savedLanguage = localStorage.getItem('preferredLanguage') as Language;
        if (savedLanguage && ['en', 'fr', 'es', 'ar'].includes(savedLanguage)) {
          setLanguage(savedLanguage);
        }
      }
    };
    
    loadLanguage();
  }, []);

  // Update localStorage and document direction when language changes
  useEffect(() => {
    localStorage.setItem('preferredLanguage', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
