
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export type Language = 'en' | 'fr' | 'es' | 'ar';

interface LanguageSelectorProps {
  onLanguageChange: (lang: Language) => void;
  currentLanguage: Language;
}

const languages = {
  en: { name: 'English', flag: '🇬🇧' },
  fr: { name: 'Français', flag: '🇫🇷' },
  es: { name: 'Español', flag: '🇪🇸' },
  ar: { name: 'العربية', flag: '🇸🇦' },
};

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  onLanguageChange, 
  currentLanguage 
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4" />
          <span>{languages[currentLanguage].flag}</span>
          <span className="hidden md:inline">{languages[currentLanguage].name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white">
        {Object.entries(languages).map(([code, { name, flag }]) => (
          <DropdownMenuItem 
            key={code}
            onClick={() => onLanguageChange(code as Language)}
            className={`flex items-center gap-2 ${currentLanguage === code ? 'font-bold bg-gray-100' : ''}`}
          >
            <span>{flag}</span>
            <span>{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
