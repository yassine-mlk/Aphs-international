# Guide d'utilisation : Système de Vidéoconférence APHS

## 📋 Vue d'ensemble

Le système de vidéoconférence APHS permet aux membres des projets de demander et organiser des réunions vidéo avec validation administrative.

## 🔄 Processus de fonctionnement

### Pour les Membres (Non-admins)
1. **Demande de réunion** : Les membres peuvent faire une demande via l'onglet "Demander une réunion"
2. **Détails requis** :
   - Titre de la réunion
   - Description/sujet à aborder
   - Date et heure souhaitées
   - Participants suggérés
3. **Attente d'approbation** : La demande est envoyée à l'administrateur
4. **Notification** : Le membre reçoit une confirmation une fois la demande traitée
5. **Accès à la réunion** : Si approuvée, la réunion apparaît dans "Mes réunions"

### Pour les Administrateurs
1. **Gestion des demandes** : Voir toutes les demandes via l'onglet "Demandes de réunion"
2. **Validation** : Approuver ou refuser chaque demande avec un message optionnel
3. **Création automatique** : Les demandes approuvées créent automatiquement la réunion
4. **Gestion directe** : Possibilité de créer des réunions instantanées ou programmées

## 🎯 Fonctionnalités principales

### Interface utilisateur
- **Navigation par onglets** selon le rôle utilisateur
- **Mes réunions** : Liste des réunions accessibles
- **Demander une réunion** (membres) : Formulaire de demande
- **Demandes de réunion** (admins) : Gestion des demandes

### Types de réunions
- **Réunions instantanées** : Démarrent immédiatement
- **Réunions programmées** : Planifiées à une date/heure précise
- **Réunions sur demande** : Créées après approbation administrative

### Gestion des participants
- **Rôles** : Hôte (organisateur) et participants
- **Statuts** : Invité, accepté, refusé, connecté
- **Permissions** : Les hôtes peuvent terminer les réunions

## 🔧 Installation de la base de données

### Script SQL requis
Exécutez le script `create_video_conference_system.sql` dans l'éditeur SQL de Supabase :

```sql
-- Le script crée les tables suivantes :
- video_meetings              -- Réunions vidéo
- video_meeting_participants  -- Participants aux réunions
- video_meeting_requests      -- Demandes de réunion
- video_meeting_request_participants -- Participants suggérés
```

### Tables créées

#### 1. `video_meetings`
- Stocke les informations des réunions
- Champs : titre, room_id (Jitsi), description, statut, dates

#### 2. `video_meeting_participants`
- Gère les participants de chaque réunion
- Champs : utilisateur, rôle (host/participant), statut

#### 3. `video_meeting_requests`
- Stocke les demandes de réunion des membres
- Champs : titre, description, demandeur, statut (pending/approved/rejected)

#### 4. `video_meeting_request_participants`
- Participants suggérés pour les demandes
- Liaison entre demandes et utilisateurs

## 🚀 Utilisation

### Étape 1 : Exécuter le script SQL
1. Aller dans Supabase Dashboard
2. Section "SQL Editor"
3. Coller et exécuter `create_video_conference_system.sql`

### Étape 2 : Tester le système
1. **En tant que membre** :
   - Aller dans Vidéoconférence > "Demander une réunion"
   - Remplir le formulaire
   - Attendre l'approbation admin

2. **En tant qu'admin** :
   - Voir les demandes dans l'onglet "Demandes de réunion"
   - Approuver/refuser avec message
   - Créer des réunions directement si besoin

### Étape 3 : Rejoindre les réunions
- Cliquer sur "Rejoindre" depuis la liste des réunions
- Interface Jitsi Meet intégrée
- Contrôles vidéo/audio disponibles

## 🔒 Sécurité et permissions

### Contrôle d'accès
- **Admins** : Création directe, gestion des demandes, accès à toutes les réunions
- **Membres** : Demandes de réunion, accès aux réunions où ils sont invités
- **Hôtes** : Peuvent terminer leurs réunions

### Sécurité des réunions
- IDs de salle uniques générés automatiquement
- Contrôle d'accès par participant
- Modération par les hôtes

## 📱 Interface utilisateur

### Navigation
- **Onglets adaptatifs** selon le rôle utilisateur
- **Statuts visuels** : badges pour en cours, programmée, terminée
- **Actions contextuelles** : rejoindre, terminer, copier ID

### Fonctionnalités visuelles
- **Avatars des participants** avec rôles
- **Informations de réunion** : horaires, descriptions, IDs
- **États temps réel** : réunions actives mises en évidence

## 🎥 Intégration Jitsi Meet

### Fonctionnalités vidéo
- **Vidéo/audio** haute qualité
- **Partage d'écran** intégré
- **Chat** pendant la réunion
- **Contrôles de modération** pour les hôtes

### Configuration automatique
- **Noms d'utilisateur** récupérés du profil
- **Salles privées** avec IDs uniques
- **Permissions de modération** selon le rôle

## 🔧 Maintenance

### Surveillance
- Surveiller les tables de base de données
- Vérifier les logs d'erreur Jitsi
- Nettoyer les anciennes réunions si nécessaire

### Support utilisateur
- Guide d'utilisation pour les nouveaux utilisateurs
- Formation administrative pour la gestion des demandes
- Documentation technique pour le développement

---

**Note** : Ce système est conçu pour s'intégrer parfaitement avec l'écosystème APHS existant, en utilisant les rôles et permissions déjà en place. 