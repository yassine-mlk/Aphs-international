import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import IntervenantProjectDetails from './IntervenantProjectDetails';
import IntervenantProjectDetailsEn from './IntervenantProjectDetailsEn';
import IntervenantProjectDetailsEs from './IntervenantProjectDetailsEs';
import IntervenantProjectDetailsAr from './IntervenantProjectDetailsAr';

const IntervenantProjectDetailsLangSwitch: React.FC = () => {
  const { language } = useLanguage();
  if (language === 'en') return <IntervenantProjectDetailsEn />;
  if (language === 'es') return <IntervenantProjectDetailsEs />;
  if (language === 'ar') return <IntervenantProjectDetailsAr />;
  return <IntervenantProjectDetails />; // français par défaut
};

export default IntervenantProjectDetailsLangSwitch; 