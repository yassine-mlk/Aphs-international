import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { NOTIFICATIONS } from '@/lib/constants';
import { NotificationType } from '@/hooks/useNotifications';

interface ToastParams {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export function useTranslatedNotifications() {
  const { toast } = useToast();
    
  // Utiliser les constantes en français
  const t = NOTIFICATIONS;

  // Fonction pour formatter les messages avec paramètres
  const formatMessage = useCallback((template: string, params: Record<string, any>): string => {
    let result = template;
    
    // Remplacer les paramètres simples {paramName}
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`{${key}}`, 'g');
        result = result.replace(regex, String(value));
      }
    });

    // Gérer les conditions select simples {param, select, undefined {} other {text}}
    const selectRegex = /{(\w+),\s*select,\s*undefined\s*{}\s*other\s*{\s*([^}]+)\s*}}/g;
    result = result.replace(selectRegex, (match, paramName, otherText) => {
      const value = params[paramName];
      return value !== undefined && value !== null && value !== '' ? otherText : '';
    });

    return result;
  }, []);

  // Afficher une notification toast avec un type de notification
  const showNotification = useCallback((
    type: NotificationType,
    params: Record<string, any> = {},
    options: Partial<ToastParams> = {}
  ) => {
    const notificationConfig = (t.types as any)[type];
    
    if (!notificationConfig) {
      return;
    }

    const title = formatMessage(typeof notificationConfig === 'string' ? notificationConfig : notificationConfig.title, params);
    const message = formatMessage(typeof notificationConfig === 'string' ? "" : notificationConfig.message, params);

    toast({
      title,
      description: message,
      variant: options.variant || 'default',
      duration: options.duration || 5000,
      ...options
    });
  }, [t.types, formatMessage, toast]);

  // Afficher un toast commun
  const showCommonToast = useCallback((
    messageKey: string,
    params: Record<string, any> = {},
    options: Partial<ToastParams> = {}
  ) => {
    const messageTemplate = (t as any)[messageKey];
    
    if (!messageTemplate) {
      return;
    }

    const message = formatMessage(String(messageTemplate), params);

    toast({
      title: options.title || t.title,
      description: message,
      variant: options.variant || 'default',
      duration: options.duration || 3000,
      ...options
    });
  }, [t, formatMessage, toast]);

  // Raccourcis pour les types de toast les plus communs
  const showSuccess = useCallback((messageKey: string, params?: Record<string, any>) => {
    showCommonToast(messageKey, params, { 
      title: "Succès", 
      variant: 'default' 
    });
  }, [showCommonToast]);

  const showError = useCallback((messageKey: string, params?: Record<string, any>) => {
    showCommonToast(messageKey, params, { 
      title: "Erreur", 
      variant: 'destructive' 
    });
  }, [showCommonToast]);

  const showWarning = useCallback((messageKey: string, params?: Record<string, any>) => {
    showCommonToast(messageKey, params, { 
      title: "Attention", 
      variant: 'default' 
    });
  }, [showCommonToast]);

  // Toast personnalisé
  const showCustomToast = useCallback((
    title: string,
    description?: string,
    variant: 'default' | 'destructive' = 'default'
  ) => {
    toast({
      title,
      description,
      variant,
      duration: 3000
    });
  }, [toast]);

  return {
    // Fonctions principales
    showNotification,
    showCommonToast,
    
    // Raccourcis pour les types communs
    showSuccess,
    showError,
    showWarning,
    showCustomToast,
    
    // Accès direct aux constantes
    translations: t,
    
    // Fonction utilitaire pour formatter les messages
    formatMessage
  };
} 