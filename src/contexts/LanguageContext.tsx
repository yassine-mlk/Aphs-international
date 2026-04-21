import React, { createContext, useContext } from 'react';

type Language = 'fr';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Langue fixée à FR uniquement
  const language: Language = 'fr';
  const setLanguage = () => {}; // No-op

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  return useContext(LanguageContext);
};
