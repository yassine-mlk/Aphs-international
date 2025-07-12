import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import { NotificationType } from '@/hooks/useNotifications';

interface ToastParams {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export function useTranslatedNotifications() {
  const { toast } = useToast();
  const { language } = useLanguage();
  
  // Récupérer les traductions pour la langue actuelle
  const t = translations[language as keyof typeof translations].notifications;

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

  // Afficher une notification toast traduite avec un type de notification
  const showNotification = useCallback((
    type: NotificationType,
    params: Record<string, any> = {},
    options: Partial<ToastParams> = {}
  ) => {
    const notificationConfig = t.types[type];
    
    if (!notificationConfig) {
      console.warn(`Type de notification non trouvé: ${type}`);
      return;
    }

    const title = formatMessage(notificationConfig.title, params);
    const message = formatMessage(notificationConfig.message, params);

    toast({
      title,
      description: message,
      variant: options.variant || 'default',
      duration: options.duration || 5000,
      ...options
    });
  }, [t.types, formatMessage, toast]);

  // Afficher un toast commun traduit
  const showCommonToast = useCallback((
    messageKey: keyof typeof t.common,
    params: Record<string, any> = {},
    options: Partial<ToastParams> = {}
  ) => {
    const messageTemplate = t.common[messageKey];
    
    if (!messageTemplate) {
      console.warn(`Clé de message commune non trouvée: ${messageKey}`);
      return;
    }

    const message = formatMessage(String(messageTemplate), params);

    toast({
      title: options.title || t.common.info,
      description: message,
      variant: options.variant || 'default',
      duration: options.duration || 3000,
      ...options
    });
  }, [t.common, formatMessage, toast]);

  // Raccourcis pour les types de toast les plus communs
  const showSuccess = useCallback((messageKey: keyof typeof t.common, params?: Record<string, any>) => {
    showCommonToast(messageKey, params, { 
      title: t.common.success, 
      variant: 'default' 
    });
  }, [showCommonToast, t.common.success]);

  const showError = useCallback((messageKey: keyof typeof t.common, params?: Record<string, any>) => {
    showCommonToast(messageKey, params, { 
      title: t.common.error, 
      variant: 'destructive' 
    });
  }, [showCommonToast, t.common.error]);

  const showWarning = useCallback((messageKey: keyof typeof t.common, params?: Record<string, any>) => {
    showCommonToast(messageKey, params, { 
      title: t.common.warning, 
      variant: 'default' 
    });
  }, [showCommonToast, t.common.warning]);

  // Toast personnalisé avec traduction directe
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
    
    // Accès direct aux traductions
    translations: t,
    
    // Fonction utilitaire pour formatter les messages
    formatMessage
  };
} 