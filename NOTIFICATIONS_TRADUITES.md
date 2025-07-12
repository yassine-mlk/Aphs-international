# Documentation : Notifications Traduites APHS

## Vue d'ensemble

L'application APHS dispose maintenant d'un système complet de notifications traduites qui supporte 4 langues :
- **Français** (fr)
- **Anglais** (en) 
- **Espagnol** (es)
- **Arabe** (ar)

## Architecture

### 1. Structure des traductions (`src/lib/translations.ts`)

Chaque langue contient une section `notifications` avec :

```typescript
notifications: {
  // Types de notifications système
  types: {
    file_uploaded: {
      title: "Titre de la notification",
      message: "Message avec paramètres {uploaderName}, {fileName}, etc."
    },
    // ... autres types
  },
  // Messages toast communs
  common: {
    success: "Succès",
    error: "Erreur",
    // ... autres messages communs
  }
}
```

### 2. Hook personnalisé (`src/hooks/useTranslatedNotifications.ts`)

Le hook `useTranslatedNotifications` fournit :

- **Formatage automatique** des messages avec paramètres
- **Gestion des conditions** (ex: `{projectName, select, undefined {} other {text}}`)
- **Fonctions simplifiées** pour les cas d'usage courants

## Types de notifications

### Notifications système

| Type | Description |
|------|-------------|
| `file_uploaded` | Nouveau fichier uploadé |
| `task_validated` | Tâche validée |
| `message_received` | Nouveau message reçu |
| `meeting_request` | Demande de réunion |
| `task_assigned` | Nouvelle tâche assignée |
| `project_added` | Ajouté à un nouveau projet |
| `task_validation_request` | Demande de validation de tâche |
| `file_validation_request` | Fichier à valider |
| `meeting_request_approved` | Demande de réunion approuvée |
| `meeting_request_rejected` | Demande de réunion refusée |
| `meeting_invitation` | Invitation à une réunion |

### Messages toast communs

- Messages de succès/erreur
- Messages de validation
- Messages d'état système
- Messages d'erreur réseau

## Utilisation

### 1. Dans les composants React

```typescript
import { useTranslatedNotifications } from '@/hooks/useTranslatedNotifications';

function MonComposant() {
  const { showSuccess, showError, showNotification } = useTranslatedNotifications();

  // Toast de succès simple
  const handleSuccess = () => {
    showSuccess('taskSubmitted');
  };

  // Toast d'erreur simple
  const handleError = () => {
    showError('networkError');
  };

  // Notification système avec paramètres
  const handleFileUploaded = () => {
    showNotification('file_uploaded', {
      uploaderName: 'Jean Dupont',
      fileName: 'document.pdf',
      projectName: 'Projet Alpha'
    });
  };
}
```

### 2. Dans les hooks de notifications (`useNotificationTriggers`)

```typescript
const notifyFileUploaded = useCallback(async (
  fileName: string,
  uploaderName: string,
  projectName?: string
) => {
  const notifConfig = translations.types.file_uploaded;
  const title = formatMessage(notifConfig.title, { uploaderName, fileName, projectName });
  const message = formatMessage(notifConfig.message, { uploaderName, fileName, projectName });
  
  await createAdminNotification('file_uploaded', title, message, { fileName, uploaderName, projectName });
}, [createAdminNotification, formatMessage, translations]);
```

## Fonctionnalités avancées

### 1. Formatage avec paramètres

Les messages supportent l'interpolation de variables :
```
"Nouveau fichier \"{fileName}\" uploadé par {uploaderName}"
```

### 2. Conditions conditionnelles

Affichage conditionnel de texte basé sur la présence de paramètres :
```
"{projectName, select, undefined {} other { pour le projet {projectName}}}"
```

### 3. Formatage contextuel

Les dates sont automatiquement formatées selon la locale :
```typescript
const scheduledDate = new Date(scheduledTime).toLocaleDateString();
```

## Migration des composants existants

### Avant
```typescript
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();

toast({
  title: "Succès",
  description: "Tâche soumise avec succès",
});
```

### Après
```typescript
import { useTranslatedNotifications } from '@/hooks/useTranslatedNotifications';

const { showSuccess } = useTranslatedNotifications();

showSuccess('taskSubmitted');
```

## API du hook `useTranslatedNotifications`

### Fonctions principales

```typescript
// Notification système avec type et paramètres
showNotification(type: NotificationType, params?: Record<string, any>, options?: ToastOptions)

// Toast commun avec clé de traduction
showCommonToast(messageKey: string, params?: Record<string, any>, options?: ToastOptions)
```

### Raccourcis
```typescript
// Toast de succès
showSuccess(messageKey: string, params?: Record<string, any>)

// Toast d'erreur
showError(messageKey: string, params?: Record<string, any>)

// Toast d'avertissement
showWarning(messageKey: string, params?: Record<string, any>)

// Toast personnalisé
showCustomToast(title: string, description?: string, variant?: 'default' | 'destructive')
```

### Utilitaires
```typescript
// Accès direct aux traductions
translations: NotificationTranslations

// Fonction de formatage
formatMessage(template: string, params: Record<string, any>): string
```

## Composants modifiés

### ✅ Complètement migré
- `CompanyForm.tsx` - Utilise les notifications traduites

### 🔄 En cours de migration
- `TaskManager.tsx`
- `ProjectDetails.tsx`
- `MeetingRequestForm.tsx`
- `Messages.tsx`
- `Settings.tsx`

### ⏳ À migrer
- `VideoConference.tsx`
- `EditProject.tsx`
- `WorkGroups.tsx`

## Bonnes pratiques

### 1. Préférer les clés de traduction aux textes codés en dur
```typescript
// ✅ Bon
showError('networkError');

// ❌ Éviter
showCustomToast('Erreur', 'Erreur réseau');
```

### 2. Utiliser les paramètres pour les données dynamiques
```typescript
// ✅ Bon
showSuccess('companyCreated', { name: companyName });

// ❌ Éviter
showCustomToast('Succès', `Entreprise ${companyName} créée`);
```

### 3. Gérer les cas optionnels avec des conditions
```typescript
// Les paramètres undefined sont automatiquement gérés
showNotification('task_assigned', {
  taskName: 'Tâche 1',
  projectName: undefined, // Sera ignoré dans le message
  assignerName: 'Jean'
});
```

## Avantages

1. **Cohérence linguistique** - Tous les messages respectent la langue sélectionnée
2. **Maintenance simplifiée** - Centralisation des textes
3. **Expérience utilisateur améliorée** - Messages adaptes à la culture
4. **Développement accéléré** - API simple et réutilisable
5. **Support RTL** - Adapté pour l'arabe
6. **Type safety** - Vérification TypeScript des clés de traduction

## Structure des fichiers

```
src/
├── hooks/
│   ├── useTranslatedNotifications.ts    # Hook principal
│   └── useNotificationTriggers.ts       # Notifications système (modifié)
├── lib/
│   └── translations.ts                  # Toutes les traductions (étendu)
└── components/
    └── CompanyForm.tsx                  # Exemple d'usage (migré)
```

## Notes techniques

- **Performant** : Les traductions sont mises en cache
- **Flexible** : Support des paramètres complexes
- **Extensible** : Facile d'ajouter de nouveaux types
- **Compatible** : Fonctionne avec l'infrastructure toast existante
- **Testable** : Fonctions pures facilement testables

Cette implémentation offre une base solide pour un système de notifications multilingue professionnel. 