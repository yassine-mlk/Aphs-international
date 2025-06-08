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
        // D'abord, essayer de charger depuis localStorage (plus rapide)
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

        // Ensuite, essayer de récupérer l'utilisateur actuel pour la synchronisation
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData?.user) {
          // Essayer de charger les paramètres utilisateur depuis profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userData.user.id)
            .single();
          
          // Pour l'instant, on utilise seulement localStorage car la table profiles
          // ne stocke pas encore les préférences de langue
          // Cette fonctionnalité peut être ajoutée plus tard si nécessaire
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

  // Fonction améliorée pour changer la langue
  const handleLanguageChange = async (newLanguage: Language) => {
    setLanguage(newLanguage);
    
    // Sauvegarder immédiatement dans localStorage
    localStorage.setItem('preferredLanguage', newLanguage);
    
    // Mettre à jour la direction du document
    document.documentElement.dir = newLanguage === 'ar' ? 'rtl' : 'ltr';
    
    // Note: Les préférences de langue sont maintenant stockées uniquement en localStorage
    // Pour éviter les erreurs avec user_settings qui n'existe plus
    // La sauvegarde en base peut être ajoutée plus tard si nécessaire
  };

  // Update localStorage and document direction when language changes
  useEffect(() => {
    localStorage.setItem('preferredLanguage', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    
    // Ajouter une classe CSS pour le RTL
    if (language === 'ar') {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleLanguageChange }}>
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
