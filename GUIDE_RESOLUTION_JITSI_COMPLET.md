# Guide de résolution complète - Erreurs Jitsi & Base de données

## 🔍 Problèmes rencontrés

### 1. Erreur Jitsi "membersOnly"
```
Session b4vqzm8h: Jitsi error:
error: {name: "conference.connectionError.membersOnly", params: ["aphs-meeting_1750686076644_780cc_csv2214u@lobby.meet.jit.si", true], recoverable: true, type: "CONFERENCE", isFatal: false}
```

### 2. Erreur base de données
```
[Error] Erreur lors de la récupération des réunions utilisateur: – {code: "42703", details: null, hint: null, message: "column profiles.id does not exist"}
```

## ✅ Solutions implémentées

### 🔧 **1. Correction de l'erreur base de données**

**Problème :** La requête tentait d'accéder à `profiles.id` qui n'existe pas.
**Solution :** Utiliser uniquement `user_id` comme identifiant.

**Fichier :** `src/hooks/useVideoMeetings.ts`
```typescript
// AVANT
.select('id, user_id, first_name, last_name, email')

// APRÈS  
.select('user_id, first_name, last_name, email')
```

### 🚫 **2. Changement du format des noms de salles**

**Problème :** Les préfixes comme `aphs-private_` et même `aphs-meeting_` déclenchent des restrictions Jitsi.
**Solution :** Format simple sans caractères spéciaux.

**Fichier :** `src/hooks/useVideoMeetings.ts`
```typescript
// AVANT
const roomId = `aphs-meeting_${timestamp}_${userFragment}_${randomPart}`;

// APRÈS
const roomId = `Room${timestamp}${randomPart}`;
```

### ⚙️ **3. Configuration Jitsi améliorée**

**Problème :** La configuration ne désactivait pas suffisamment les restrictions.
**Solution :** Configuration exhaustive pour forcer l'accès libre.

**Fichier :** `src/components/JitsiMeeting.tsx`
```typescript
configOverwrite: {
  prejoinPageEnabled: false,
  startWithAudioMuted: true,
  startWithVideoMuted: false,
  disableDeepLinking: true,
  enableClosePage: true,
  disableProfile: false,
  roomPasswordRequired: false,
  // Configuration pour éviter le lobby et les restrictions
  membersOnly: false,
  lobbyEnabled: false,
  enableLobbyChat: false,
  enableWelcomePage: false,
  requireDisplayName: false,
  // Forcer l'accès libre pour tous
  disableInviteFunctions: false,
  doNotStoreRoom: true, // Ne pas persister la config de salle
  // Désactiver les fonctionnalités qui peuvent causer des restrictions
  enableNoisyMicDetection: false,
  disableRemoteMute: true,
  desktopSharingChromeDisabled: true,
  // ... reste de la configuration
}
```

### 🔐 **4. Suppression de la logique de mot de passe**

**Problème :** La définition automatique de mots de passe créait des restrictions.
**Solution :** Supprimer complètement cette logique.

**Fichier :** `src/components/JitsiMeeting.tsx`
```typescript
// AVANT
if (isModerator) {
  const roomPassword = `aphs-${Math.random().toString(36).substring(2, 8)}`;
  jitsiApi.executeCommand('password', roomPassword);
}

// APRÈS
// Ne pas définir de mot de passe pour éviter les restrictions
console.log(`Conference joined successfully without password restrictions`);
```

### 📝 **5. Gestion d'erreur simplifiée**

**Problème :** La logique complexe de récupération créait des boucles.
**Solution :** Messages d'erreur clairs et directs.

```typescript
if (error && error.error === 'conference.connectionError.membersOnly') {
  if (onError) {
    onError(new Error('Accès à la salle refusé. Veuillez créer une nouvelle réunion ou contacter l\'organisateur.'));
  }
  return;
}
```

## 🎯 **Résultats attendus**

### ✅ Nouvelles salles Jitsi
- **Format :** `Room1750686076644abc123` (simple, sans caractères spéciaux)
- **Accès :** Libre, sans lobby, sans restrictions
- **Configuration :** Optimisée pour l'accès direct

### ✅ Base de données
- **Requêtes :** Utilisent correctement la structure de la table `profiles`
- **Erreurs SQL :** Éliminées

### ✅ Expérience utilisateur
- **Chargement :** Plus rapide, sans erreurs
- **Accès :** Direct aux salles de vidéoconférence
- **Messages :** D'erreur plus clairs

## 🧪 **Tests de validation**

1. **Build réussi :** ✅ Aucune erreur de compilation
2. **Configuration Jitsi :** ✅ Paramètres validés
3. **Génération de salles :** ✅ Nouveau format testé

## 📋 **Actions à effectuer**

1. **Déployer les changements** en production
2. **Informer les utilisateurs** que les anciennes réunions peuvent nécessiter d'être recréées
3. **Tester une nouvelle réunion** pour confirmer que l'erreur membersOnly ne se reproduit plus
4. **Surveiller les logs** pour vérifier l'absence d'erreurs de base de données

## 🔮 **Prévention future**

### Format des noms de salles
- ✅ Utiliser des formats simples (`Room` + timestamp + random)
- ❌ Éviter les préfixes comme `private`, `meeting`, `admin`
- ❌ Éviter les caractères spéciaux (`_`, `-`, `.`)

### Configuration Jitsi
- ✅ Toujours définir `membersOnly: false`
- ✅ Toujours définir `lobbyEnabled: false`
- ✅ Utiliser `doNotStoreRoom: true` pour éviter la persistance

### Base de données
- ✅ Vérifier la structure des tables avant les requêtes
- ✅ Utiliser les bons noms de colonnes (ex: `user_id` au lieu de `id`)

## 📊 **Récapitulatif des fichiers modifiés**

| Fichier | Changements |
|---------|-------------|
| `src/hooks/useVideoMeetings.ts` | Format des noms de salles + correction requête SQL |
| `src/components/JitsiMeeting.tsx` | Configuration Jitsi + gestion d'erreurs + suppression mots de passe |

Les modifications sont prêtes pour le déploiement et devraient résoudre définitivement les problèmes rencontrés ! 🎉 