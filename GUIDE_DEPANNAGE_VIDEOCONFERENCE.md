# Guide de dépannage - Vidéoconférence

## Problème : Rectangle noir pour la vidéo locale

### Symptômes
- Vous voyez les autres participants mais votre propre vidéo apparaît comme un rectangle noir
- La caméra semble fonctionner (pas d'erreur de permission) mais l'image n'apparaît pas

### Solutions à essayer (dans l'ordre)

#### 1. Vérifier les permissions de la caméra
1. **Chrome/Edge** : Cliquez sur l'icône caméra dans la barre d'adresse
2. **Firefox** : Cliquez sur l'icône caméra à gauche de l'URL
3. **Safari** : Menu Safari → Préférences → Sites web → Caméra
4. Assurez-vous que le site a l'autorisation d'utiliser la caméra

#### 2. Redémarrer la caméra
1. Fermez tous les onglets/applications utilisant la caméra
2. Redémarrez votre navigateur
3. Relancez la vidéoconférence

#### 3. Changer de navigateur
- **Recommandé** : Chrome, Edge, Firefox (versions récentes)
- **Éviter** : Navigateurs anciens, navigateurs mobiles pour de meilleures performances

#### 4. Vérifier les paramètres système
- **Windows** : Paramètres → Confidentialité → Caméra
- **macOS** : Préférences système → Sécurité et confidentialité → Caméra
- **Linux** : Vérifiez que votre caméra est reconnue avec `lsusb` ou `v4l2-ctl`

#### 5. Utiliser le diagnostic intégré
1. Cliquez sur le bouton **"Debug"** dans l'interface de vidéoconférence
2. Ouvrez la console développeur (F12)
3. Regardez les messages de diagnostic

### Messages d'erreur courants

#### "Permission d'accès refusée"
- **Solution** : Accordez les permissions caméra/micro dans le navigateur
- **Note** : Certains navigateurs bloquent par défaut en navigation privée

#### "Appareil déjà utilisé"
- **Solution** : Fermez les autres applications utilisant la caméra
- **Applications courantes** : Skype, Teams, Zoom, Discord

#### "Contraintes non supportées"
- **Solution** : Le système utilise maintenant des contraintes adaptatives
- **Automatique** : Fallback vers une qualité plus basse si nécessaire

### Optimisations appliquées

#### ✅ Contraintes adaptatives
- Tentative avec qualité "low" en premier
- Fallback vers des contraintes basiques si échec
- Meilleure compatibilité avec différentes caméras

#### ✅ Effet miroir automatique
- La vidéo locale affiche un effet miroir (comme un selfie)
- Plus naturel pour l'utilisateur

#### ✅ Diagnostic avancé
- Bouton "Debug" pour analyser les problèmes
- Logs détaillés dans la console
- Vérification des tracks vidéo/audio

#### ✅ Indicateurs visuels
- Spinner de chargement si la vidéo n'est pas prête
- Messages d'état clairs
- Bouton de diagnostic intégré

### Informations techniques pour les développeurs

#### Vérification des tracks vidéo
```javascript
// Dans la console développeur
const video = document.querySelector('video');
console.log('Video element:', video);
console.log('SrcObject:', video.srcObject);
if (video.srcObject) {
  console.log('Video tracks:', video.srcObject.getVideoTracks());
}
```

#### Paramètres de qualité
- **Low** : 640x360 @ 15fps (recommandé pour connexions lentes)
- **Medium** : 1280x720 @ 30fps (par défaut)
- **High** : 1920x1080 @ 30fps (pour connexions rapides)

### Browsers supportés
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 14+
- ✅ Edge 80+
- ⚠️ Safari iOS (limitations mobiles)
- ❌ Internet Explorer (non supporté)

### Si le problème persiste
1. Testez sur un autre appareil
2. Vérifiez votre connexion internet
3. Contactez l'support technique avec les logs de la console 