
import React from 'react';
import { Globe } from "lucide-react";

export type Language = 'fr';

interface LanguageSelectorProps {
  onLanguageChange?: (lang: Language) => void;
  currentLanguage?: Language;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = () => {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Globe className="h-4 w-4" />
      <span>🇫🇷</span>
      <span className="hidden md:inline">Français</span>
    </div>
  );
};

export default LanguageSelector;
