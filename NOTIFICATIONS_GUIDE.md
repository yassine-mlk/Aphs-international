# Guide du Système de Notifications en Temps Réel

## 🔔 Vue d'ensemble

Le système de notifications APHS fonctionne maintenant **en temps réel** ! Les notifications apparaissent instantanément dès qu'elles sont créées, avec des sons, animations et indicateurs visuels.

## ✨ Fonctionnalités Principales

### 📱 Interface Utilisateur
- **Cloche de notification** dans la barre supérieure avec badge du nombre de notifications non lues
- **Animations visuelles** : bounce, pulse, ping pour les nouvelles notifications
- **Indicateur de connexion** temps réel (vert = connecté, rouge = déconnecté)
- **Sons de notification** automatiques pour les nouvelles notifications
- **Bouton de reconnexion** en cas de perte de connexion

### 🎯 Types de Notifications

#### Pour les Administrateurs
- `file_uploaded` - Fichier uploadé par un intervenant
- `task_validated` - Tâche validée par un intervenant
- `new_message` - Nouveau message reçu
- `meeting_request` - Demande de réunion

#### Pour les Intervenants
- `task_assigned` - Nouvelle tâche assignée
- `project_added` - Ajouté à un nouveau projet
- `task_validation_request` - Demande de validation de tâche
- `file_validation_request` - Fichier à valider
- `message_received` - Message reçu
- `meeting_invitation` - Invitation à une réunion
- `meeting_accepted` - Réunion acceptée
- `meeting_declined` - Réunion refusée

## 🚀 Comment ça marche

### 1. Déclenchement Automatique
Les notifications sont automatiquement créées lors de :
- **Assignation de tâche** → Notification envoyée à l'intervenant
- **Ajout au projet** → Notification envoyée au nouveau membre
- **Envoi de message** → Notification envoyée aux destinataires
- **Upload de fichier** → Notification envoyée aux admins
- **Validation de tâche** → Notification envoyée aux admins

### 2. Réception en Temps Réel
- Utilise **Supabase Realtime** pour les mises à jour instantanées
- **Reconnexion automatique** en cas de perte de connexion
- **Logs détaillés** dans la console pour le débogage

### 3. Interface Interactive
- **Marquer comme lu** d'un clic
- **Supprimer** les notifications non désirées
- **Marquer tout comme lu** en une action
- **Voir toutes les notifications** (lien vers page dédiée)

## 🛠️ Configuration Technique

### Base de Données
```sql
-- Table optimisée avec index pour les performances
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT CHECK (type IN (...)),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index optimisés pour temps réel
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
```

### Sécurité (RLS)
```sql
-- Politique de sécurité : utilisateurs voient uniquement leurs notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);
```

### Realtime Configuration
```sql
-- Activer Realtime sur les tables critiques
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignments;
```

## 📝 Utilisation pour les Développeurs

### Créer une notification
```typescript
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';

const { notifyTaskAssigned } = useNotificationTriggers();

// Notifier l'assignation d'une tâche
await notifyTaskAssigned(
  intervenantId,
  'Révision du design',
  'Site Web Corporate',
  'Admin Name'
);
```

### Écouter les notifications
```typescript
import { useNotifications } from '@/hooks/useNotifications';

const { 
  notifications, 
  unreadCount, 
  isConnected,
  hasNewNotification 
} = useNotifications();
```

## 🧪 Tests

### Bouton de Test
Un bouton **"Test Notifications"** est disponible dans la barre supérieure pour tester tous les types de notifications :
- Message reçu
- Tâche assignée  
- Ajouté au projet
- Fichier uploadé
- Tâche validée
- Invitation réunion
- Demande validation

### Indicateurs de Debug
- **Console logs** détaillés pour suivre les connexions
- **Indicateur de connexion** visuel
- **Status dans le dropdown** (Connecté/Déconnecté)

## 🔧 Maintenance

### Nettoyage Automatique
```sql
-- Fonction pour nettoyer les anciennes notifications
SELECT cleanup_old_notifications();
```

### Optimisation des Performances
- **Limite de 50 notifications** chargées par défaut
- **Pagination** pour les notifications anciennes
- **Nettoyage automatique** des notifications lues > 30 jours
- **Maximum 100 notifications** par utilisateur

## 🎨 Personnalisation

### Styles et Animations
Les notifications utilisent Tailwind CSS avec animations :
- `animate-bounce` pour la cloche
- `animate-pulse` pour les badges
- `animate-ping` pour les nouvelles notifications
- Transitions fluides avec `transition-all duration-200`

### Sons
Les sons de notification sont générés via Web Audio API :
- Deux tonalités (800Hz → 600Hz)
- Durée de 0.3 secondes
- Volume à 30%

## 📊 Monitoring

### Métriques Importantes
- Taux de connexion temps réel
- Latence des notifications
- Nombre de reconnexions
- Notifications non lues par utilisateur

### Logs Console
```
🔄 Configuration de la connexion temps réel pour les notifications
🔔 Nouvelle notification reçue: {payload}
📝 Notification mise à jour: {payload}
📡 Statut de connexion notifications: SUBSCRIBED
⚠️ Connexion fermée, tentative de reconnexion...
```

## 🚨 Dépannage

### Problèmes Courants

1. **Notifications non reçues**
   - Vérifier la connexion internet
   - Vérifier l'indicateur de connexion (rouge = problème)
   - Cliquer sur le bouton de reconnexion

2. **Pas de son**
   - Vérifier les permissions du navigateur
   - Les sons nécessitent une interaction utilisateur

3. **Reconnexion en boucle**
   - Vérifier la configuration Supabase Realtime
   - Vérifier les politiques RLS

### Support
Pour tout problème, vérifier :
1. Console du navigateur pour les erreurs
2. Indicateur de connexion temps réel
3. État des tables dans Supabase
4. Configuration Realtime

---

🎉 **Le système de notifications est maintenant entièrement opérationnel en temps réel !** 