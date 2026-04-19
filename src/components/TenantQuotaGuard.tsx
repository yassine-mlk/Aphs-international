import React from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Settings, 
  Users, 
  HardDrive,
  X
} from 'lucide-react';

interface QuotaGuardProps {
  type: 'project' | 'intervenant' | 'storage';
  children: React.ReactNode;
  requiredStorage?: number; // en bytes, pour le type 'storage'
}

/**
 * Composant qui vérifie les quotas avant d'afficher le contenu
 * Si quota dépassé, affiche un message bloquant
 */
export function TenantQuotaGuard({ type, children, requiredStorage }: QuotaGuardProps) {
  const { tenant, usage, isLoading } = useTenant();

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (!tenant) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="font-semibold text-red-900">Aucun tenant sélectionné</h3>
              <p className="text-sm text-red-700">
                Vous devez être membre d'un tenant pour accéder à cette fonctionnalité.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  let isBlocked = false;
  let title = '';
  let message = '';
  let icon = <Settings className="h-6 w-6" />;
  let quotaInfo = null;

  switch (type) {
    case 'project':
      isBlocked = usage.projects.used >= usage.projects.limit;
      title = 'Quota de projets atteint';
      message = `Vous avez utilisé ${usage.projects.used}/${usage.projects.limit} projets autorisés. Passez à un forfait supérieur pour créer plus de projets.`;
      icon = <Settings className="h-6 w-6 text-orange-500" />;
      quotaInfo = (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Projets utilisés</span>
            <span className="font-medium">{usage.projects.used} / {usage.projects.limit}</span>
          </div>
          <Progress value={usage.projects.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {usage.projects.percentage}% utilisé
          </p>
        </div>
      );
      break;

    case 'intervenant':
      isBlocked = usage.intervenants.used >= usage.intervenants.limit;
      title = 'Quota d\'intervenants atteint';
      message = `Vous avez utilisé ${usage.intervenants.used}/${usage.intervenants.limit} intervenants autorisés. Passez à un forfait supérieur pour ajouter plus d'intervenants.`;
      icon = <Users className="h-6 w-6 text-orange-500" />;
      quotaInfo = (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Intervenants utilisés</span>
            <span className="font-medium">{usage.intervenants.used} / {usage.intervenants.limit}</span>
          </div>
          <Progress value={usage.intervenants.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {usage.intervenants.percentage}% utilisé
          </p>
        </div>
      );
      break;

    case 'storage':
      if (requiredStorage) {
        const wouldExceed = (usage.storage.usedBytes + requiredStorage) > usage.storage.limitBytes;
        isBlocked = wouldExceed;
        const requiredGb = (requiredStorage / (1024 * 1024 * 1024)).toFixed(2);
        title = 'Quota de stockage insuffisant';
        message = `Cet upload nécessite ${requiredGb} GB. Il vous reste ${usage.storage.limitGb - usage.storage.usedGb} GB disponibles.`;
      }
      icon = <HardDrive className="h-6 w-6 text-orange-500" />;
      quotaInfo = (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Stockage utilisé</span>
            <span className="font-medium">{usage.storage.usedGb} / {usage.storage.limitGb} GB</span>
          </div>
          <Progress value={usage.storage.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {usage.storage.percentage}% utilisé
          </p>
        </div>
      );
      break;
  }

  if (isBlocked) {
    return (
      <Card className="border-orange-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">{title}</h3>
              <p className="text-muted-foreground mb-4">{message}</p>
              
              {quotaInfo}

              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => window.history.back()}>
                  <X className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Button onClick={() => window.location.href = '/dashboard/settings'}>
                  Voir les forfaits
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

/**
 * Composant d'affichage des quotas (barres de progression)
 */
export function TenantQuotaDisplay() {
  const { tenant, usage, isLoading } = useTenant();

  if (isLoading || !tenant) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Projets */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Projets</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-2xl font-bold">{usage.projects.used}</span>
            <span className="text-sm text-muted-foreground">/ {usage.projects.limit}</span>
          </div>
          <Progress value={usage.projects.percentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Intervenants */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Intervenants</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-2xl font-bold">{usage.intervenants.used}</span>
            <span className="text-sm text-muted-foreground">/ {usage.intervenants.limit}</span>
          </div>
          <Progress value={usage.intervenants.percentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Stockage */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Stockage</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-2xl font-bold">{usage.storage.usedGb}</span>
            <span className="text-sm text-muted-foreground">/ {usage.storage.limitGb} GB</span>
          </div>
          <Progress value={usage.storage.percentage} className="h-2" />
        </CardContent>
      </Card>
    </div>
  );
}
