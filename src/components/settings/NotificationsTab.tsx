import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface NotificationSettings {
  email: boolean;
  push: boolean;
  messages: boolean;
  updates: boolean;
}

interface NotificationsTabProps {
  notifications: NotificationSettings;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  onSave: () => Promise<void>;
  saving: boolean;
}

const NOTIF_ITEMS = [
  { key: 'email', label: 'Notifications par email', desc: 'Recevoir des emails pour les mises à jour importantes.' },
  { key: 'push', label: 'Notifications push', desc: 'Recevoir des notifications sur votre appareil.' },
  { key: 'messages', label: 'Messages et mentions', desc: 'Recevoir des notifications pour les nouveaux messages.' },
  { key: 'updates', label: 'Mises à jour du système', desc: 'Être informé des nouveautés et des améliorations.' },
] as const;

export const NotificationsTab: React.FC<NotificationsTabProps> = ({ notifications, setNotifications, onSave, saving }) => (
  <Card className="border-0 shadow-md">
    <CardHeader>
      <CardTitle>Préférences de notification</CardTitle>
      <CardDescription>Choisissez comment vous souhaitez être notifié.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {NOTIF_ITEMS.map(({ key, label, desc }) => (
        <div key={key} className="flex items-center justify-between">
          <div>
            <Label>{label}</Label>
            <p className="text-muted-foreground text-sm">{desc}</p>
          </div>
          <Switch
            checked={notifications[key]}
            onCheckedChange={checked => setNotifications(n => ({ ...n, [key]: checked }))}
          />
        </div>
      ))}
    </CardContent>
    <CardFooter>
      <Button onClick={onSave} disabled={saving}>
        {saving ? 'Enregistrement...' : 'Enregistrer les préférences'}
      </Button>
    </CardFooter>
  </Card>
);
