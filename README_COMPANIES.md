# Table Companies - Documentation

## 📋 Vue d'ensemble

Cette documentation présente la table `companies` créée à partir des formulaires et hooks existants de la page entreprises, **SANS RLS (Row Level Security)** comme demandé.

## 🗂️ Fichiers créés

### 1. Scripts SQL
- **`supabase/migrations/create_companies_table.sql`** - Migration Supabase pour la table
- **`create_companies_table.sql`** - Script SQL direct pour exécution immédiate avec données d'exemple

### 2. Types TypeScript  
- **`src/types/company.ts`** - Types complets pour la gestion des entreprises

### 3. Hook personnalisé
- **`src/hooks/useCompanies.ts`** - Hook React pour toutes les opérations CRUD

### 4. Page d'exemple
- **`src/pages/CompaniesExample.tsx`** - Interface complète de démonstration

## 🏗️ Structure de la table

```sql
CREATE TABLE companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    pays TEXT,
    secteur TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### Champs de la table

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | UUID | ✅ | Identifiant unique (auto-généré) |
| `name` | TEXT | ✅ | Nom de l'entreprise |
| `pays` | TEXT | ❌ | Pays de l'entreprise |
| `secteur` | TEXT | ❌ | Secteur d'activité |
| `logo_url` | TEXT | ❌ | URL du logo |
| `created_at` | TIMESTAMP | ✅ | Date de création (auto) |
| `updated_at` | TIMESTAMP | ✅ | Date de mise à jour (auto) |

## 🔧 Fonctionnalités du hook `useCompanies`

### Actions CRUD de base
```typescript
const {
  // État
  loading,
  companies,
  
  // Actions CRUD
  getCompanies,        // Récupérer toutes les entreprises
  searchCompanies,     // Recherche par terme
  getCompanyById,      // Récupérer par ID
  createCompany,       // Créer une nouvelle entreprise
  updateCompany,       // Mettre à jour une entreprise
  deleteCompany,       // Supprimer une entreprise
  
  // Actions spécialisées
  getCompanyStats,     // Statistiques
  getCompaniesByCountry,    // Filtrer par pays
  getCompaniesBySector,     // Filtrer par secteur
  uploadCompanyLogo,        // Upload de logo
} = useCompanies();
```

### Exemples d'utilisation

#### Créer une entreprise
```typescript
const newCompany = await createCompany({
  name: "Tech Innovation",
  pays: "France", 
  secteur: "Technologie",
  logo_url: "https://example.com/logo.png"
});
```

#### Rechercher des entreprises
```typescript
const results = await searchCompanies("tech");
const frenchCompanies = await getCompaniesByCountry("France");
const techCompanies = await getCompaniesBySector("Technologie");
```

#### Mettre à jour une entreprise
```typescript
const updated = await updateCompany("company-id", {
  name: "Nouveau nom",
  secteur: "Services numériques"
});
```

#### Récupérer des statistiques
```typescript
const stats = await getCompanyStats();
// Retourne:
// {
//   totalCompanies: 10,
//   companiesByCountry: { "France": 5, "Espagne": 3, ... },
//   companiesBySector: { "Technologie": 4, "Construction": 2, ... },
//   recentCompanies: [...]
// }
```

## 🎨 Interface utilisateur (Page d'exemple)

La page `CompaniesExample.tsx` propose une interface complète avec :

### Fonctionnalités visuelles
- ✅ **Liste des entreprises** avec cartes visuelles
- ✅ **Recherche en temps réel** par nom, pays ou secteur  
- ✅ **Dialogs de création/édition** avec formulaires complets
- ✅ **Confirmation de suppression** avec vérifications
- ✅ **Statistiques détaillées** en modal
- ✅ **Gestion des états de chargement**
- ✅ **Messages de toast** pour les feedbacks utilisateur

### Composants utilisés
- `Dialog` pour les formulaires de création/édition
- `AlertDialog` pour les confirmations de suppression
- `Card` pour l'affichage des entreprises
- `Select` pour les listes déroulantes (pays, secteurs)
- `Input` pour les champs de saisie
- `Button` pour toutes les actions

## 🚀 Installation et utilisation

### 1. Créer la table en base
```bash
# Option 1: Via migration Supabase
npx supabase db reset

# Option 2: Exécuter le script direct
psql -f create_companies_table.sql
```

### 2. Utiliser le hook dans votre composant
```typescript
import { useCompanies } from '@/hooks/useCompanies';
import { Company } from '@/types/company';

function MyComponent() {
  const { companies, getCompanies, createCompany } = useCompanies();
  
  useEffect(() => {
    getCompanies();
  }, []);
  
  return (
    <div>
      {companies.map(company => (
        <div key={company.id}>{company.name}</div>
      ))}
    </div>
  );
}
```

### 3. Accéder à la page d'exemple
```typescript
// Ajouter dans votre router
import CompaniesExample from '@/pages/CompaniesExample';

// Route: /companies-example
```

## 🛡️ Sécurité - SANS RLS

⚠️ **Important**: Cette table a été créée **SANS RLS (Row Level Security)** comme demandé.

- ✅ Toutes les opérations sont autorisées sans restriction
- ✅ Aucune politique de sécurité appliquée  
- ✅ Accès libre en lecture/écriture pour tous les utilisateurs authentifiés

## 📊 Données d'exemple incluses

Le script `create_companies_table.sql` inclut 5 entreprises d'exemple :

1. **Tech Innovation** (France, Technologie)
2. **Green Energy Corp** (Espagne, Énergies renouvelables) 
3. **Construction Plus** (Maroc, Construction)
4. **Digital Solutions** (Canada, Services numériques)
5. **Eco Transport** (France, Transport)

## 🔗 Intégration avec l'existant

### Compatibilité avec les formulaires existants
- ✅ Structure basée sur `CompanyForm.tsx` 
- ✅ Compatible avec les sélecteurs de `CreateUserForm.tsx`
- ✅ Utilise les mêmes champs que `useSupabase.getCompanies()`

### Référence dans d'autres tables
Cette table peut être référencée dans :
- **Table `profiles`** via `company_id` 
- **Table `projects`** via `company_id`

## 🚨 Points d'attention

1. **Upload de logos**: Le hook inclut `uploadCompanyLogo()` mais nécessite un bucket Supabase `companies`
2. **Validation**: Validation côté client intégrée avec messages d'erreur
3. **Vérifications de suppression**: Avant suppression, vérifie les références dans `profiles` et `projects`
4. **Performance**: Index créés sur `name`, `pays`, `secteur` et `created_at`

## 📞 Support

Cette implémentation est basée sur les formulaires et hooks existants de votre application. Pour toute question ou modification, les types TypeScript complets faciliteront les évolutions futures.

---

✨ **Table companies prête à l'emploi avec hook personnalisé et interface moderne !** 