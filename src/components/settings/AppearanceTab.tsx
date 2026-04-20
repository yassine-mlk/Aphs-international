import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sun, Moon, Settings as SettingsIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Language } from '@/components/LanguageSelector';

type ThemeOption = 'light' | 'dark' | 'system';

const LANGUAGES = [
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
] as const;

interface AppearanceTabProps {
  selectedTheme: ThemeOption;
  resolvedTheme: string;
  selectedLanguage: Language;
  onThemeChange: (theme: ThemeOption) => void;
  onLanguageChange: (lang: Language) => void;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({
  selectedTheme, resolvedTheme, selectedLanguage, onThemeChange, onLanguageChange
}) => (
  <Card className="border-0 shadow-md">
    <CardHeader>
      <CardTitle>Apparence</CardTitle>
      <CardDescription>Personnalisez l'apparence de l'application.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Thème */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Thème</Label>
          <p className="text-muted-foreground text-sm">Le mode Système suit vos préférences OS.</p>
        </div>
        <Select value={selectedTheme} onValueChange={v => onThemeChange(v as ThemeOption)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <span className="flex items-center gap-2"><Sun className="h-4 w-4" /> Clair</span>
            </SelectItem>
            <SelectItem value="dark">
              <span className="flex items-center gap-2"><Moon className="h-4 w-4" /> Sombre</span>
            </SelectItem>
            <SelectItem value="system">
              <span className="flex items-center gap-2"><SettingsIcon className="h-4 w-4" /> Système</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">
        Thème actuel : {resolvedTheme === 'dark' ? 'Sombre' : 'Clair'}{selectedTheme === 'system' && ' (détecté du système)'}
      </p>

      {/* Langue */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Label>Langue</Label>
          <p className="text-muted-foreground text-sm">Choisissez la langue de l'interface.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {LANGUAGES.map(l => (
            <Button
              key={l.code}
              variant={selectedLanguage === l.code ? 'default' : 'outline'}
              size="sm"
              onClick={() => onLanguageChange(l.code as Language)}
            >
              {l.flag} {l.name}
            </Button>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);
