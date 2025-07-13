# 🌍 Guide des Notifications Traduites - APHS

## ✅ Implémentation Terminée

Le système de **notifications traduites** est maintenant implémenté avec succès. Les notifications s'affichent automatiquement dans la langue sélectionnée par l'utilisateur et changent dynamiquement lorsque la langue est modifiée.

## 🎯 Fonctionnalités Implémentées

### 🔄 **Traduction Automatique**
- ✅ Notifications traduites dans les **4 langues** : Français, Anglais, Espagnol, Arabe
- ✅ Changement automatique selon la langue sélectionnée
- ✅ Formatage des paramètres dynamiques (noms, dates, etc.)
- ✅ Gestion des conditions (ex: avec/sans nom de projet)

### 📋 **Types de Notifications Traduites**
- ✅ **file_uploaded** - Fichier uploadé
- ✅ **task_validated** - Tâche validée
- ✅ **message_received** - Message reçu
- ✅ **meeting_request** - Demande de réunion
- ✅ **task_assigned** - Tâche assignée
- ✅ **project_added** - Ajouté au projet
- ✅ **task_validation_request** - Demande de validation
- ✅ **file_validation_request** - Fichier à valider
- ✅ **meeting_request_approved** - Réunion approuvée
- ✅ **meeting_request_rejected** - Réunion refusée
- ✅ **meeting_invitation** - Invitation réunion

## 🛠️ Configuration de la Base de Données

### 📊 **Nouvelles Colonnes**
Le schéma de la table `notifications` a été étendu avec :
```sql
-- Nouvelles colonnes pour les traductions
title_key TEXT,           -- Clé de traduction du titre
message_key TEXT,         -- Clé de traduction du message
title_params JSONB,       -- Paramètres pour le titre
message_params JSONB      -- Paramètres pour le message
```

### 🔧 **Script de Mise à Jour**
Exécutez le script `src/scripts/update_notifications_schema.sql` dans l'éditeur SQL de Supabase pour ajouter les colonnes nécessaires.

## 💻 Utilisation du Code

### 🔨 **Créer une Notification**
```typescript
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';

const { notifyTaskAssigned } = useNotificationTriggers();

// Nouvelle méthode avec paramètres
await notifyTaskAssigned(
  'user-id',
  'Nom de la tâche',
  'Nom du projet',     // optionnel
  'Nom de l\'assigneur' // optionnel
);
```

### 🎨 **Exemples de Traductions**
```typescript
// Français
"Une nouvelle tâche "Rénovation cuisine" vous a été assignée pour le projet Maison familiale par Jean Dupont"

// Anglais
"A new task "Kitchen renovation" has been assigned to you for project Family house by Jean Dupont"

// Espagnol
"Se le ha asignado una nueva tarea "Renovación de cocina" para el proyecto Casa familiar por Jean Dupont"

// Arabe
"تم تعيين مهمة جديدة "تجديد المطبخ" لك للمشروع بيت العائلة من قبل Jean Dupont"
```

### 📱 **Affichage Dynamique**
- Les notifications existantes changent automatiquement de langue
- Nouveaux paramètres formatés selon la langue
- Gestion des conditions (avec/sans projet, etc.)

## 🎯 Hooks Modifiés

### 🔗 **useNotifications**
- ✅ Traduction automatique des notifications
- ✅ Rechargement lors du changement de langue
- ✅ Formatage des paramètres dynamiques
- ✅ Gestion des conditions avancées

### 🔗 **useNotificationTriggers**
- ✅ Création avec clés de traduction
- ✅ Paramètres structurés
- ✅ Suppression du texte en dur

## 📄 Structure des Traductions

### 🏗️ **Format des Traductions**
```typescript
// Dans src/lib/translations.ts
notifications: {
  types: {
    task_assigned: {
      title: "New task assigned",
      message: "A new task \"{taskName}\" has been assigned to you{projectName, select, undefined {} other { for project {projectName}}}{assignerName, select, undefined {} other { by {assignerName}}}"
    }
  }
}
```

### 🎨 **Paramètres Dynamiques**
- `{taskName}` - Nom de la tâche
- `{projectName}` - Nom du projet (optionnel)
- `{assignerName}` - Nom de l'assigneur (optionnel)
- `{scheduledDate}` - Date formatée
- `{fileName}` - Nom du fichier

### 🔄 **Conditions**
```typescript
// Syntaxe pour les conditions
{paramName, select, undefined {} other {texte avec {paramName}}}
```

## 🚀 Test et Validation

### ✅ **Tests Effectués**
1. **Création** - Notifications créées avec paramètres
2. **Affichage** - Traduction selon la langue
3. **Changement** - Langue changée dynamiquement
4. **Paramètres** - Formatage des valeurs
5. **Conditions** - Gestion des paramètres optionnels

### 🔧 **Vérification**
1. Changer la langue dans les paramètres
2. Créer une nouvelle notification
3. Vérifier que l'affichage est traduit
4. Tester les paramètres dynamiques

## 📚 Documentation Technique

### 🏗️ **Architecture**
```
useNotifications (hook principal)
├── Récupération des notifications
├── Traduction automatique
├── Gestion temps réel
└── Formatage des paramètres

useNotificationTriggers (création)
├── Méthodes spécialisées
├── Paramètres structurés
└── Clés de traduction

translations.ts (traductions)
├── 4 langues supportées
├── Paramètres dynamiques
└── Conditions avancées
```

### 🔍 **Fonctionnement**
1. **Création** : Notification stockée avec clés + paramètres
2. **Récupération** : Notifications traduites selon la langue
3. **Affichage** : Texte formaté avec paramètres
4. **Changement** : Retraduction automatique

## 🎉 Résultat Final

- ✅ **Notifications multilingues** dans 4 langues
- ✅ **Changement automatique** selon la langue utilisateur
- ✅ **Paramètres dynamiques** correctement formatés
- ✅ **Conditions avancées** pour texte optionnel
- ✅ **Performance optimisée** avec cache et indexation
- ✅ **Compatibilité** avec notifications existantes

Le système de notifications est maintenant **complètement internationalisé** ! 🌍 