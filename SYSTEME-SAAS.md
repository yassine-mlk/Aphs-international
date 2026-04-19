# 🏢 Système SaaS - Documentation

## Architecture Multi-Tenant

### Tables Principales

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     tenants     │────▶│ tenant_members  │◄────│     profiles    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ user_id (PK)    │
│ name            │     │ tenant_id (FK)  │     │ tenant_id (FK)  │
│ slug (unique)   │     │ user_id (FK)    │     │ email           │
│ owner_email     │     │ role            │     │ is_super_admin  │
│ owner_user_id   │     │ status          │     │ ...             │
│ plan            │     └─────────────────┘     └─────────────────┘
│ max_projects    │              │
│ max_intervenants│              │
│ max_storage_gb  │              ▼
│ current_*       │     ┌─────────────────┐
│ status          │     │  auth.users     │
└─────────────────┘     │ (Supabase Auth) │
                        └─────────────────┘
```

### Tables avec tenant_id (Isolation)

Toutes ces tables ont une colonne `tenant_id` + RLS policies :

- ✅ `projects` - Projets par tenant
- ✅ `task_assignments` - Tâches par tenant
- ✅ `membre` - Intervenants par tenant
- ✅ `conversations` - Messages par tenant
- ✅ `messages` - Messages privés par tenant
- ✅ `companies` - Entreprises par tenant
- ✅ `video_meetings` - Réunions par tenant
- ✅ `notifications` - Notifications par tenant

## 🔐 Sécurité - Row Level Security (RLS)

Chaque table a des policies qui filtrent automatiquement par `tenant_id` :

```sql
-- Exemple pour la table projects
CREATE POLICY "tenant_isolation" ON projects
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tm.tenant_id FROM tenant_members tm
            WHERE tm.user_id = auth.uid()
        )
        OR is_super_admin()  -- Super Admin voit tout
    );
```

## 👤 Rôles Utilisateurs

### 1. Super Admin (Vous)
- ✅ Voir tous les tenants
- ✅ Créer des clients (tenants)
- ✅ Modifier forfaits et quotas
- ✅ Suspendre/réactiver des clients
- ✅ Associer des utilisateurs aux tenants

### 2. Admin de Tenant
- ✅ Voir uniquement SON tenant
- ✅ Créer des projets (si quota le permet)
- ✅ Ajouter des intervenants (si quota le permet)
- ✅ Gérer ses tâches
- ✅ Modifier son profil

### 3. Intervenant
- ✅ Voir les projets de son tenant
- ✅ Voir ses tâches assignées
- ✅ Modifier son profil

## 📊 Système de Quotas

### Forfaits Disponibles

| Plan | Projets | Intervenants | Stockage |
|------|---------|--------------|----------|
| Starter | 5 | 10 | 10 GB |
| Pro | 20 | 50 | 50 GB |
| Enterprise | 100 | 200 | 500 GB |
| Custom | ∞ | ∞ | ∞ |

### Comportement

- ✅ **Compteurs automatiques** : Triggers PostgreSQL mettent à jour `current_*`
- ✅ **Blocage création** : Si quota atteint, message explicite + proposition upgrader
- ✅ **Affichage quotas** : Barres de progression dans le dashboard
- ✅ **Vérification stockage** : Bloque les uploads si dépassement

## 🎯 Workflow Complet

### 1. Créer un Client (Super Admin)

```
Dashboard Super Admin → "Nouveau Client"
  ↓
Remplir formulaire :
  - Nom entreprise
  - Email admin client
  - Forfait (Starter/Pro/Enterprise)
  ↓
Tenant créé (owner_user_id = NULL)
```

### 2. Associer un Utilisateur

**Si l'utilisateur existe déjà dans Auth :**
```
Dashboard → Bouton 👤➕ sur le tenant
  ↓
Coller UUID utilisateur
  ↓
Choisir rôle (admin/intervenant)
  ↓
"Associer"
```

**Si l'utilisateur n'existe pas :**
```
Page Login → "S'inscrire"
  ↓
Créer compte avec email du tenant
  ↓
Puis l'associer via Dashboard
```

### 3. Utiliser l'Application (Client)

```
Se connecter avec compte associé
  ↓
Voir uniquement les données de SON tenant
  ↓
Créer projets/intervenants (vérification quotas)
  ↓
Compteurs mis à jour automatiquement
```

## 🛠️ Hooks à Utiliser

### useTenantIsolation (Nouveau)

```typescript
import { useTenantIsolation } from '@/hooks/useTenantIsolation';

function MyComponent() {
  const {
    tenantId,           // ID du tenant courant
    tenant,              // Objet tenant complet
    usage,               // Quotas utilisés
    canCreateProject,    // () => boolean
    canAddIntervenant,   // () => boolean
    canUploadFile,       // (size) => boolean
    getProjects,         // () => Promise
    createProject,       // (data) => Promise (avec vérif quota)
    getIntervenants,     // () => Promise
    addIntervenant,      // (data) => Promise (avec vérif quota)
  } = useTenantIsolation();
}
```

### TenantQuotaGuard (Nouveau)

```tsx
import { TenantQuotaGuard, TenantQuotaDisplay } from '@/components/TenantQuotaGuard';

// Bloquer l'accès si quota dépassé
<TenantQuotaGuard type="project">
  <CreateProjectForm />
</TenantQuotaGuard>

// Afficher les barres de quotas
<TenantQuotaDisplay />
```

## 📁 Fichiers Créés/Modifiés

### Nouveaux Fichiers

| Fichier | Description |
|---------|-------------|
| `src/hooks/useTenantIsolation.ts` | Hook pour requêtes isolées par tenant |
| `src/components/TenantQuotaGuard.tsx` | Composant de vérification quotas |
| `supabase-saas-ultra-simple.sql` | Migration complète SaaS |
| `supabase-saas-triggers.sql` | Triggers pour compteurs auto |

### Fichiers Modifiés

| Fichier | Modifications |
|---------|---------------|
| `src/contexts/TenantContext.tsx` | Fonctions Super Admin + quotas |
| `src/pages/SuperAdminDashboard.tsx` | Dashboard gestion clients + associer utilisateurs |
| `src/pages/IntervenantDashboard.tsx` | Affichage quotas + tenant info |

## 🚀 Prochaines Étapes (Optionnel)

- [ ] **Stripe Integration** : Paiement automatique forfaits
- [ ] **Email Templates** : Notifications aux nouveaux clients
- [ ] **Audit Logs** : Historique des actions par tenant
- [ ] **API Rate Limiting** : Limites requêtes par tenant
- [ ] **Custom Domain** : Sous-domaines par client

## ❓ Support

**Problèmes courants :**

1. **"Quota projets atteint"** → Passer à forfait supérieur ou supprimer anciens projets
2. **"Aucun tenant sélectionné"** → Vérifier que l'utilisateur est associé à un tenant
3. **"403 Forbidden"** → Vérifier RLS policies dans Supabase

**Contactez-moi pour toute question !**
