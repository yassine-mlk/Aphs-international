# 🔐 Système de Gestion des Contacts par l'Admin

## 🎯 **Vue d'ensemble**

Le système de gestion des contacts par l'admin permet de contrôler précisément qui peut communiquer avec qui dans l'application. L'administrateur peut accorder ou révoquer des permissions de contact entre les intervenants.

## 🔧 **Installation**

### 1. Exécuter le script SQL
```bash
# Copier-coller le contenu de admin_contact_management.sql 
# dans Supabase Dashboard > SQL Editor
```

### 2. Ce que le script fait automatiquement
✅ **Tables créées :**
- `user_contact_permissions` - Stocke les permissions de contact entre utilisateurs

✅ **Fonctions RPC créées :**
- `admin_grant_contact_permission()` - Accorder une permission
- `admin_revoke_contact_permission()` - Révoquer une permission
- `admin_get_all_contact_permissions()` - Obtenir toutes les permissions
- `admin_get_user_contact_permissions()` - Obtenir les permissions d'un utilisateur
- `get_available_contacts_admin()` - Obtenir les contacts disponibles (avec gestion admin)
- `admin_get_all_users_for_contact_management()` - Obtenir tous les utilisateurs
- `admin_get_contact_permissions_stats()` - Obtenir les statistiques

✅ **Sécurité :**
- Politiques RLS configurées
- Seuls les admins peuvent gérer les permissions
- Les utilisateurs ne voient que leurs permissions actives

## 🚀 **Utilisation**

### Interface d'Administration

#### Accès à la page
1. Se connecter en tant qu'admin
2. Aller dans la sidebar → "Gestion des Contacts"
3. URL : `/dashboard/gestion-contacts`

#### Fonctionnalités disponibles

##### 📊 **Tableau de bord avec statistiques**
- Total utilisateurs
- Permissions actives
- Permissions révoquées
- Utilisateurs avec permissions
- Total permissions

##### 👥 **Gestion des permissions**
- **Accorder une permission** : Sélectionner un utilisateur et un contact
- **Révoquer une permission** : Cliquer sur l'icône de suppression
- **Recherche** : Filtrer par nom, email, statut
- **Filtres** : Tous, Actifs, Révoqués

##### 📋 **Vue des utilisateurs**
- Liste de tous les utilisateurs disponibles
- Informations : nom, email, rôle, spécialité, statut

### Workflow d'Administration

#### 1. **Accorder une permission**
```
1. Cliquer sur "Accorder une Permission"
2. Sélectionner l'utilisateur qui peut voir le contact
3. Sélectionner le contact qui peut être contacté
4. Ajouter des notes (optionnel)
5. Cliquer sur "Accorder la Permission"
```

#### 2. **Révoquer une permission**
```
1. Trouver la permission dans la liste
2. Cliquer sur l'icône de suppression (🗑️)
3. Confirmer la révocation
```

#### 3. **Surveiller les permissions**
```
1. Utiliser les filtres pour voir les permissions actives/révoquées
2. Rechercher par nom d'utilisateur ou de contact
3. Voir les statistiques en temps réel
```

## 🔐 **Sécurité et Contrôle d'Accès**

### Règles de Sécurité
- ✅ **Seuls les admins** peuvent accorder/révoquer des permissions
- ✅ **Les utilisateurs** ne voient que leurs contacts autorisés
- ✅ **Validation** : Un utilisateur ne peut pas se contacter lui-même
- ✅ **Audit** : Toutes les actions sont tracées (qui, quand, pourquoi)

### Politiques RLS
```sql
-- Seuls les admins peuvent voir toutes les permissions
CREATE POLICY "Admins can view all contact permissions" ON user_contact_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Les utilisateurs peuvent voir leurs propres permissions actives
CREATE POLICY "Users can view their own active permissions" ON user_contact_permissions
    FOR SELECT USING (
        user_id = auth.uid() AND is_active = TRUE
    );
```

## 📱 **Impact sur l'Interface Utilisateur**

### Page Messages
- Les utilisateurs ne voient que leurs contacts autorisés
- Impossible de créer des conversations avec des contacts non autorisés
- Fallback vers l'ancien système si la nouvelle fonction n'existe pas

### Hook useMessages
```typescript
// Nouvelle méthode avec gestion admin
const getAvailableContacts = useCallback(async (): Promise<Contact[]> => {
  // Utilise get_available_contacts_admin() qui respecte les permissions
  const { data: contactsData, error: contactsError } = await supabase
    .rpc('get_available_contacts_admin', { p_user_id: user.id });
  
  // Fallback vers l'ancienne méthode si nécessaire
  if (contactsError) {
    // Utilise l'ancienne méthode
  }
}, [user, supabase, getUsers]);
```

## 🔄 **Migration et Compatibilité**

### Migration Progressive
1. **Phase 1** : Installation du système (pas d'impact sur les utilisateurs)
2. **Phase 2** : L'admin accorde des permissions aux utilisateurs existants
3. **Phase 3** : Les utilisateurs ne voient que leurs contacts autorisés

### Fallback Automatique
- Si la nouvelle fonction RPC n'existe pas, le système utilise l'ancienne méthode
- Aucune interruption de service
- Migration transparente pour les utilisateurs

## 📊 **Monitoring et Maintenance**

### Statistiques Disponibles
```sql
-- Obtenir les statistiques
SELECT * FROM admin_get_contact_permissions_stats();
```

### Requêtes Utiles
```sql
-- Voir toutes les permissions d'un utilisateur
SELECT * FROM admin_get_user_contact_permissions('user-id');

-- Voir les permissions actives
SELECT * FROM user_contact_permissions WHERE is_active = TRUE;

-- Voir les permissions révoquées
SELECT * FROM user_contact_permissions WHERE is_active = FALSE;
```

## 🎯 **Avantages du Système**

### Pour l'Administrateur
- ✅ **Contrôle total** sur qui peut communiquer avec qui
- ✅ **Audit complet** de toutes les permissions
- ✅ **Interface intuitive** pour la gestion
- ✅ **Statistiques en temps réel**

### Pour les Utilisateurs
- ✅ **Sécurité renforcée** : seuls les contacts autorisés sont visibles
- ✅ **Pas de confusion** : liste de contacts claire et limitée
- ✅ **Performance** : moins de contacts à charger

### Pour l'Organisation
- ✅ **Conformité** : respect des règles de communication
- ✅ **Traçabilité** : historique complet des permissions
- ✅ **Flexibilité** : adaptation aux besoins de l'organisation

## 🚨 **Cas d'Usage Typiques**

### 1. **Nouvel Intervenant**
```
1. L'admin crée le compte de l'intervenant
2. L'admin accorde des permissions de contact avec les collègues appropriés
3. L'intervenant peut immédiatement communiquer avec ses contacts autorisés
```

### 2. **Changement d'Équipe**
```
1. L'admin révoque les anciennes permissions
2. L'admin accorde les nouvelles permissions
3. L'intervenant voit automatiquement ses nouveaux contacts
```

### 3. **Projet Terminé**
```
1. L'admin révoque les permissions temporaires
2. Les intervenants ne peuvent plus communiquer entre eux
3. Nettoyage automatique des permissions
```

## ✅ **État Final**

Après installation complète :
- ✅ Système de gestion des contacts 100% fonctionnel
- ✅ Interface d'administration intuitive
- ✅ Sécurité et contrôle d'accès garantis
- ✅ Migration transparente pour les utilisateurs
- ✅ Monitoring et audit complets

**Le système de gestion des contacts par l'admin est maintenant opérationnel ! 🎉** 