# APS International - Documentation Technique

## 📋 Table des matières

- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [Contributions](#contributions)

---

## 🏗️ Architecture

### Structure du projet

```
src/
├── components/          # Composants UI réutilisables
├── contexts/           # Contextes React globaux
├── hooks/              # Hooks personnalisés
├── lib/                # Utilitaires et configurations
├── pages/              # Pages de l'application
├── types/              # Définitions TypeScript
└── utils/              # Fonctions utilitaires
```

### Technologies principales

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Radix UI + Shadcn/ui
- **Backend**: Supabase (BaaS)
- **Tests**: Vitest + Testing Library
- **Build**: Vite

---

## 🚀 Installation

### Prérequis

- Node.js 18+ 
- npm ou yarn

### Installation

```bash
# Cloner le projet
git clone https://github.com/yassine-mlk/Aphs-international.git
cd Aphs-international

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
```

### Variables d'environnement

```env
# Supabase
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anonyme

# Email (Resend)
VITE_RESEND_API_KEY=re_votre-cle-api

# Configuration
VITE_USE_REALTIME=true
VITE_USE_ROBUST_VIDEO_CONFERENCE=true
```

---

## ⚙️ Configuration

### Base de données

Les tables Supabase sont créées automatiquement via les migrations SQL dans le dossier `/supabase/`.

### Rôles utilisateurs

- **admin**: Accès complet à toutes les fonctionnalités
- **maitre_ouvrage**: Gestion des projets et suivi
- **intervenant**: Accès aux tâches assignées
- **super_admin**: Administration système

---

## 🧪 Tests

### Lancer les tests

```bash
# Tests unitaires
npm test

# Interface graphique
npm run test:ui

# Couverture de code
npm run test:coverage
```

### Structure des tests

```
src/test/
├── components/         # Tests des composants
├── hooks/             # Tests des hooks
├── pages/             # Tests des pages
└── setup.ts           # Configuration globale des tests
```

### Bonnes pratiques

- Utiliser `describe` pour grouper les tests logiquement
- Tester le comportement, pas l'implémentation
- Mock les dépendances externes (API, base de données)
- Maintenir une couverture de code > 80%

---

## 🚀 Déploiement

### Développement local

```bash
npm run dev
```

### Production

```bash
# Build
npm run build

# Preview
npm run preview
```

### Déploiement sur Netlify

1. Connecter le repository GitHub
2. Configurer les variables d'environnement dans Netlify
3. Déployer automatiquement sur `main`

---

## 📝 Conventions de code

### React/TypeScript

- Utiliser les composants fonctionnels avec hooks
- Typage strict TypeScript
- Props interfaces explicites

### CSS

- Utiliser Tailwind CSS classes
- Éviter le CSS inline
- Responsive-first approach

### Git

- Commits descriptifs en français
- Branches: `feature/nom-feature`, `fix/nom-fix`
- Pull requests pour les changements importants

---

## 🔍 Débogage

### Outils

- **React DevTools**: Inspection des composants
- **Supabase Dashboard**: Gestion base de données
- **Vite DevTools**: Performance build

### Problèmes courants

1. **Erreur d'authentification**: Vérifier les clés Supabase
2. **Build échoue**: Vérifier les variables d'environnement
3. **Tests échouent**: Vérifier les mocks dans `setup.ts`

---

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Tailwind CSS](https://tailwindcss.com/docs)
- [Documentation Radix UI](https://www.radix-ui.com/docs)

---

## 🤝 Contributions

1. Fork le projet
2. Créer une branche feature
3. Faire les changements avec tests
4. Soumettre une pull request

### Code review checklist

- [ ] Tests passent
- [ ] Code suit les conventions
- [ ] Documentation mise à jour
- [ ] Pas de console.log en production

---

**Dernière mise à jour**: 2026-04-23
**Version**: 2.0.0
