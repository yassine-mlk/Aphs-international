# Guide de Déploiement

## 🚀 Environnements

### Développement
- **URL**: `http://localhost:8080`
- **Base de données**: Supabase dev
- **Build**: Development

### Staging
- **URL**: `https://staging-aps.netlify.app`
- **Base de données**: Supabase staging
- **Build**: Production

### Production
- **URL**: `https://aps-international.com`
- **Base de données**: Supabase production
- **Build**: Production

---

## 📋 Prérequis

1. **Node.js** 18+
2. **Compte Netlify** (pour déploiement)
3. **Compte Supabase** (base de données)
4. **Domaine personnalisé** (optionnel)

---

## ⚙️ Configuration Netlify

### 1. Connecter le repository

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Se connecter
netlify login

# Initialiser le site
netlify init
```

### 2. Variables d'environnement

Dans Netlify Dashboard > Site Settings > Environment:

```env
VITE_SUPABASE_URL=https://vcxcxhgmpcgdjabuxcuv.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anonyme
VITE_RESEND_API_KEY=votre-cle-resend
VITE_USE_REALTIME=true
VITE_USE_ROBUST_VIDEO_CONFERENCE=true
```

### 3. Configuration build

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
```

---

## 🗄️ Configuration Supabase

### 1. Créer le projet

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter l'URL et la clé anonyme

### 2. Activer les extensions

```sql
-- Activer l'authentification
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Activer Row Level Security
ALTER DATABASE postgres SET "row_security" = on;
```

### 3. Tables principales

```sql
-- Utilisateurs
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'intervenant',
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projets
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  client TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Politiques RLS

```sql
-- Activer RLS sur les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Politiques profiles
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Politiques projets
CREATE POLICY "Admins can view all projects" ON projects
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## 🚀 Déploiement Automatisé

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Netlify

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      
    - name: Build
      run: npm run build
      env:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        
    - name: Deploy to Netlify
      uses: netlify/actions/cli@master
      with:
        args: deploy --prod --dir=dist
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## 🔍 Monitoring

### 1. Logs Netlify

```bash
# Voir les logs de déploiement
netlify logs

# Logs en temps réel
netlify logs --tail
```

### 2. Monitoring Supabase

- Dashboard > Logs
- Dashboard > Database > Usage
- Alertes configurées pour:
  - Erreurs 5xx
  - Taux d'erreur > 5%
  - Latence > 2s

### 3. Performance

```bash
# Audit Lighthouse
npx lighthouse https://aps-international.com

# Core Web Vitals
npx web-vitals-report
```

---

## 🔄 Mises à jour

### Processus de release

1. **Development**: `main` → `staging`
2. **Testing**: Tests sur staging
3. **Production**: `staging` → `production`

### Rollback

```bash
# Netlify rollback
netlify deploy --prod --dir=dist --rollback

# Git rollback
git revert HEAD~1
git push origin main
```

---

## 🛠️ Dépannage

### Problèmes courants

#### 1. Build échoue
```bash
# Vérifier les variables
npm run build --mode production

# Logs détaillés
npm run build --debug
```

#### 2. Erreur 404
```bash
# Configuration redirects
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 3. Authentification
```bash
# Vérifier configuration Supabase
curl -X POST 'https://your-project.supabase.co/auth/v1/token' \
  -H 'apikey: your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password"}'
```

---

## 📊 Performance

### Optimisations

1. **Bundle size**: Code splitting implémenté
2. **Images**: Lazy loading activé
3. **Cache**: Headers de cache configurés
4. **CDN**: Netlify Edge Network

### Benchmarks

| Métrique | Cible | Actuel |
|---------|--------|---------|
| First Contentful Paint | <1.5s | 1.2s |
| Largest Contentful Paint | <2.5s | 2.1s |
| Cumulative Layout Shift | <0.1 | 0.05 |
| First Input Delay | <100ms | 80ms |

---

## 📞 Support

### Contacts

- **Développeur**: dev@aps-international.com
- **Support**: support@aps-international.com
- **Urgence**: +33640164997

### Documentation

- [Guide technique](./README.md)
- [API Reference](./API.md)
- [FAQ](./FAQ.md)
