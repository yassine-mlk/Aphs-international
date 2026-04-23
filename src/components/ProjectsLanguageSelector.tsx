import React from 'react';
import { Globe } from 'lucide-react';

// Composant simplifié - Site uniquement en français
export const ProjectsLanguageSelector: React.FC = () => {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Globe className="h-4 w-4" />
      <span>🇫🇷</span>
      <span className="hidden md:inline">Français</span>
    </div>
  );
};

export default ProjectsLanguageSelector; 