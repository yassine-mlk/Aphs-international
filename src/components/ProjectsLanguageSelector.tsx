import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectsLanguageSelectorProps {
  currentLanguage: 'fr' | 'en' | 'es' | 'ar';
}

export const ProjectsLanguageSelector: React.FC<ProjectsLanguageSelectorProps> = ({ currentLanguage }) => {
  const languages = {
    fr: { name: 'Français', flag: '🇫🇷', path: '/dashboard/projets' },
    en: { name: 'English', flag: '🇬🇧', path: '/dashboard/projets/en' },
    es: { name: 'Español', flag: '🇪🇸', path: '/dashboard/projets/es' },
    ar: { name: 'العربية', flag: '🇸🇦', path: '/dashboard/projets/ar' },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Languages className="h-4 w-4" />
          <span>{languages[currentLanguage].flag}</span>
          <span>Page Language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(languages).map(([code, { name, flag, path }]) => (
          <DropdownMenuItem key={code} asChild className={`flex items-center gap-2 ${currentLanguage === code ? 'font-bold bg-gray-100' : ''}`}>
            <Link to={path}>
              <span>{flag}</span>
              <span>{name}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProjectsLanguageSelector; 