# 📨 GUIDE SYSTÈME DE MESSAGES WORKGROUPS

## 🎯 **Vue d'ensemble**

Ce système de messages permet aux membres des workgroups de communiquer entre eux via :
- **Messages de groupe automatiques** pour chaque workgroup
- **Conversations directes** entre membres du même workgroup  
- **Groupes personnalisés** avec plusieurs membres

## 🔧 **Installation**

### 1. Exécuter le script SQL
```bash
# Copier-coller le contenu de messaging_system_workgroups.sql 
# dans Supabase Dashboard > SQL Editor
```

### 2. Ce que le script fait automatiquement
✅ **Tables créées :**
- `conversations` - Stocke les conversations (direct/group/workgroup)
- `conversation_participants` - Lie les utilisateurs aux conversations
- `messages` - Stocke tous les messages
- `message_reads` - Marque les messages comme lus

✅ **Fonctions RPC créées :**
- `get_available_contacts()` - Récupère les contacts (membres même workgroup)
- `get_user_conversations()` - Récupère les conversations d'un utilisateur
- `create_direct_conversation()` - Crée une conversation 1:1
- `create_group_conversation()` - Crée un groupe personnalisé
- `get_unread_count()` - Compte les messages non lus

✅ **Automatisations :**
- Chaque nouveau workgroup crée automatiquement sa conversation
- Nouveaux membres ajoutés automatiquement à la conversation workgroup
- Timestamps mis à jour automatiquement

## 🔐 **Sécurité Workgroup-Only**

Le système garantit que **seuls les membres d'un même workgroup peuvent communiquer** :

### Conversations directes
```sql
-- Vérification automatique dans create_direct_conversation()
IF NOT EXISTS (
    SELECT 1 FROM workgroup_members wm1
    INNER JOIN workgroup_members wm2 ON wm1.workgroup_id = wm2.workgroup_id
    WHERE wm1.user_id = p_user1_id AND wm2.user_id = p_user2_id
) THEN
    RAISE EXCEPTION 'Les utilisateurs ne font pas partie du même workgroup';
END IF;
```

### Contacts disponibles
```sql
-- Seuls les membres des mêmes workgroups sont visibles
SELECT DISTINCT p.user_id, p.email, p.first_name, p.last_name
FROM profiles p
INNER JOIN workgroup_members wm1 ON p.user_id = wm1.user_id
INNER JOIN workgroup_members wm2 ON wm1.workgroup_id = wm2.workgroup_id
WHERE wm2.user_id = current_user_id
```

## 🚀 **Utilisation Frontend**

### Le frontend existant est déjà compatible ! 

La page `Messages.tsx` et le hook `useMessages.ts` fonctionnent directement avec :

1. **Hook useMessages** utilise les bonnes fonctions RPC
2. **Gestion automatique** des conversations workgroup
3. **Interface existante** prête à l'emploi

### Fonctionnalités disponibles

#### ✅ **Conversations automatiques par workgroup**
```typescript
// Chaque workgroup a automatiquement sa conversation
// Nom: "Discussion - [Nom du workgroup]"
// Tous les membres y sont automatiquement ajoutés
```

#### ✅ **Messages directs entre collègues**
```typescript
// Les utilisateurs peuvent créer des conversations directes
// uniquement avec des membres de leurs workgroups
```

#### ✅ **Groupes personnalisés**
```typescript
// Création de groupes avec plusieurs membres
// Vérification que tous partagent au moins un workgroup
```

#### ✅ **Gestion des messages non lus**
```typescript
// Comptage automatique des messages non lus
// Marquage automatique comme lu lors de la lecture
```

## 📊 **Vérification Post-Installation**

Après avoir exécuté le script, vous devriez voir :

```sql
-- Vérifier les conversations créées
SELECT 
    w.name as workgroup_name,
    c.name as conversation_name,
    (SELECT COUNT(*) FROM conversation_participants cp 
     WHERE cp.conversation_id = c.id) as nb_participants
FROM workgroups w
INNER JOIN conversations c ON w.id = c.workgroup_id
WHERE c.type = 'workgroup';
```

## 🎯 **Workflow Utilisateur**

### 1. **Accès à la page Messages**
- L'utilisateur voit automatiquement les conversations de ses workgroups
- Il peut voir ses collègues (membres des mêmes workgroups) dans "Contacts"

### 2. **Types de conversations visibles**
- **Workgroup** : Conversation automatique du groupe de travail
- **Direct** : Conversations 1:1 avec des collègues
- **Group** : Groupes personnalisés créés par l'utilisateur

### 3. **Restrictions de sécurité**
- ❌ Impossible de voir des utilisateurs d'autres workgroups
- ❌ Impossible de créer des conversations avec des non-collègues
- ✅ Communication limitée aux members du même workgroup

## 🔧 **Maintenance**

### Ajouter un membre à un workgroup
```sql
-- Le trigger se déclenche automatiquement
INSERT INTO workgroup_members (workgroup_id, user_id, role)
VALUES ('workgroup-id', 'user-id', 'member');
-- → L'utilisateur est automatiquement ajouté à la conversation workgroup
```

### Créer un nouveau workgroup
```sql
-- Le trigger se déclenche automatiquement  
INSERT INTO workgroups (name, description, created_by)
VALUES ('Nouveau Groupe', 'Description', 'creator-id');
-- → Une conversation workgroup est automatiquement créée
```

## 📱 **Interface Utilisateur**

Le frontend existant propose :
- **Liste des conversations** avec aperçu du dernier message
- **Messages en temps réel** avec envoi instantané
- **Gestion des participants** pour les conversations de groupe
- **Notifications** de nouveaux messages
- **Recherche** dans les conversations et contacts

## ✅ **État Final**

Après installation complète :
- ✅ Système de messages 100% fonctionnel
- ✅ Sécurité workgroup garantie
- ✅ Frontend prêt à utiliser
- ✅ Conversations automatiques créées
- ✅ Tous les membres peuvent communiquer

**La page Messages est maintenant opérationnelle ! 🎉** 