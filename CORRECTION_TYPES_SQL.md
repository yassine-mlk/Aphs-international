# Correction des Types SQL - Erreur 42804

## Problème Identifié

L'erreur suivante apparaissait lors de l'appel de la fonction RPC `get_user_contacts` :

```
{code: "42804", details: "Returned type character varying(255) does not match expected type text in column 2.", hint: null, message: "structure of query does not match function result type"}
```

## Cause Racine

Le problème venait d'une incompatibilité entre les types de données :

- **Fonction SQL** : Retournait `VARCHAR(255)` pour les champs texte
- **Frontend TypeScript** : S'attendait à recevoir `TEXT` (type PostgreSQL)
- **Supabase** : Convertit automatiquement `VARCHAR(255)` en `character varying(255)`

## Solution Appliquée

### 1. Correction du Script SQL

**Fichier modifié :** `user_contacts_simple.sql`

**Changement :** Modification des types de retour de la fonction `get_user_contacts`

**Avant :**
```sql
CREATE OR REPLACE FUNCTION get_user_contacts(p_user_id UUID)
RETURNS TABLE (
    contact_id UUID,
    contact_email TEXT,           -- ❌ Type TEXT
    contact_first_name TEXT,      -- ❌ Type TEXT
    contact_last_name TEXT,       -- ❌ Type TEXT
    contact_role TEXT,            -- ❌ Type TEXT
    contact_specialty TEXT        -- ❌ Type TEXT
)
```

**Après :**
```sql
CREATE OR REPLACE FUNCTION get_user_contacts(p_user_id UUID)
RETURNS TABLE (
    contact_id UUID,
    contact_email VARCHAR(255),           -- ✅ Type VARCHAR(255)
    contact_first_name VARCHAR(255),      -- ✅ Type VARCHAR(255)
    contact_last_name VARCHAR(255),       -- ✅ Type VARCHAR(255)
    contact_role VARCHAR(255),            -- ✅ Type VARCHAR(255)
    contact_specialty VARCHAR(255)        -- ✅ Type VARCHAR(255)
)
```

### 2. Correction du Frontend TypeScript

**Fichier modifié :** `src/pages/Intervenants.tsx`

**Changements :**

#### A. Ajout du type `Contact`
```typescript
interface Contact {
  contact_id: string;
  contact_email: string;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_role: string | null;
  contact_specialty: string | null;
}
```

#### B. Utilisation du type correct dans les fonctions
```typescript
// Avant
const contactIds = contactsData?.map((contact: any) => contact.contact_id) || [];

// Après
const contactIds = (contactsData as Contact[])?.map((contact: Contact) => contact.contact_id) || [];
```

## Pourquoi Cette Correction Fonctionne

1. **VARCHAR(255)** est le type standard pour les champs texte dans Supabase
2. **TypeScript** peut maintenant mapper correctement les types
3. **Supabase** retourne des données compatibles avec le frontend
4. **Les champs null** sont gérés correctement avec `string | null`

## Types PostgreSQL vs TypeScript

| PostgreSQL | TypeScript | Description |
|------------|------------|-------------|
| `VARCHAR(255)` | `string` | Texte de longueur variable (max 255) |
| `UUID` | `string` | Identifiant unique |
| `TEXT` | `string` | Texte de longueur illimitée |
| `NULL` | `null` | Valeur nulle |

## Résultat Attendu

Après cette correction :

- ✅ L'erreur 42804 disparaît
- ✅ La fonction `get_user_contacts` fonctionne correctement
- ✅ Les contacts s'affichent dans l'interface
- ✅ Le typage TypeScript est correct
- ✅ Les valeurs null sont gérées proprement

## Déploiement

1. **Exécuter le script SQL corrigé** dans Supabase
2. **Recharger l'application** frontend
3. **Tester la fonctionnalité** de gestion des contacts

## Vérification

Pour vérifier que la correction fonctionne :

```sql
-- Tester la fonction avec un UUID valide
SELECT * FROM get_user_contacts(p_user_id := '00000000-0000-0000-0000-000000000000');
```

La fonction devrait maintenant retourner des données sans erreur de type.

---

**Note :** Cette correction résout définitivement le problème de compatibilité des types entre PostgreSQL et TypeScript pour les fonctions RPC Supabase. 