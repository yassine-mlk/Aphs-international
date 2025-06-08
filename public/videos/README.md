# Vidéos de Démonstration

Ce dossier doit contenir les vidéos de démonstration pour chaque langue.

## Noms de fichiers requis :

- **demo-fr.mp4** - Vidéo de démonstration en français
- **demo-en.mp4** - Vidéo de démonstration en anglais  
- **demo-es.mp4** - Vidéo de démonstration en espagnol
- **demo-ar.mp4** - Vidéo de démonstration en arabe

## Instructions :

1. Placez vos 4 vidéos dans ce dossier (`public/videos/`)
2. Assurez-vous que les noms correspondent exactement à ceux indiqués ci-dessus
3. Format recommandé : MP4 avec codec H.264
4. Résolution recommandée : 1920x1080 ou 1280x720
5. Durée recommandée : 2-5 minutes

## Fonctionnement :

- Quand un utilisateur clique sur "Voir la Démo" dans la hero section, la vidéo correspondant à la langue actuelle s'affiche dans un modal
- Si la vidéo n'existe pas, un message d'erreur sera affiché
- La vidéo peut être fermée en cliquant sur le bouton X, en appuyant sur Échap, ou en attendant la fin de la vidéo

## Note :

Si vous n'avez pas encore de vidéos, vous pouvez temporairement utiliser des vidéos de test ou désactiver le bouton "Voir la Démo" en commentant la fonctionnalité dans `src/components/HeroSection.tsx`. 