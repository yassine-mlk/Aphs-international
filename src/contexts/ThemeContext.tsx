import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type Theme = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper pour obtenir le thème résolu
const getResolvedTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Mettre à jour le thème résolu quand le thème change
  const updateResolvedTheme = useCallback((newTheme: Theme) => {
    const resolved = getResolvedTheme(newTheme);
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, []);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Essayer de récupérer l'utilisateur actuel
        const { data: userData } = await supabase.auth.getUser();
        let loadedTheme: Theme = 'system';

        if (userData?.user) {
          // Charger le thème depuis la table profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('theme')
            .eq('user_id', userData.user.id)
            .single();

          if (profile?.theme && ['light', 'dark', 'system'].includes(profile.theme)) {
            loadedTheme = profile.theme as Theme;
          }
        } else {
          // Fallback vers localStorage
          const savedTheme = localStorage.getItem('preferredTheme') as Theme;
          if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
            loadedTheme = savedTheme;
          }
        }

        setThemeState(loadedTheme);
        updateResolvedTheme(loadedTheme);
      } catch (error) {
        // Fallback vers system en cas d'erreur
        setThemeState('system');
        updateResolvedTheme('system');
      }
    };

    loadTheme();

    // Écouter les changements de préférence système
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateResolvedTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, updateResolvedTheme]);

  // Setter personnalisé
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('preferredTheme', newTheme);
    updateResolvedTheme(newTheme);
  }, [updateResolvedTheme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
