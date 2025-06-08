# Corrections de la Base de Données

## Problèmes identifiés

1. **Colonne `start_date` manquante** : La table `projects` ne contient pas la colonne `start_date`
2. **Colonne `image_url` manquante** : La table `projects` ne contient pas la colonne `image_url`
3. **Bucket de stockage manquant** : Pas de bucket pour stocker les images de projets

## Solutions

### Option 1: Script complet (recommandé)
Exécutez le script complet qui ajoute toutes les colonnes manquantes :

```bash
# Depuis le répertoire du projet
PGPASSWORD=9eeKOhKmFRk5HgV5 psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 -U postgres.xaajljjgtbcgwfptogzy -d postgres -f supabase/fix_projects_table.sql
```

### Option 2: Script minimal (images uniquement)
Si vous voulez seulement activer les images de projets :

```bash
# Depuis le répertoire du projet
PGPASSWORD=9eeKOhKmFRk5HgV5 psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 -U postgres.xaajljjgtbcgwfptogzy -d postgres -f supabase/create_project_images_bucket.sql
```

### Option 3: Via l'interface Supabase
1. Connectez-vous à votre dashboard Supabase
2. Allez dans l'éditeur SQL
3. Copiez-collez le contenu de `supabase/create_project_images_bucket.sql`
4. Exécutez le script

## Fonctionnalités activées après correction

✅ **Upload d'images pour les projets**
- Interface d'upload avec drag & drop
- Validation des types de fichiers (JPG, PNG, WebP)
- Limitation de taille (5MB par défaut)
- Stockage sécurisé dans Supabase Storage
- Suppression automatique des anciennes images

✅ **Affichage des images**
- Aperçu dans la liste des projets
- Gestion des erreurs de chargement
- Images responsives

## Structure de la table projects après correction

```sql
-- Colonnes existantes
id UUID PRIMARY KEY
name TEXT NOT NULL
description TEXT NOT NULL
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE

-- Nouvelles colonnes ajoutées
image_url TEXT                    -- URL de l'image du projet
start_date DATE                   -- Date de début du projet (optionnel)
deadline DATE                     -- Date limite du projet (optionnel)
status TEXT DEFAULT 'active'      -- Statut du projet (optionnel)
company_id UUID REFERENCES companies(id)  -- Référence vers l'entreprise (optionnel)
```

## Bucket de stockage

- **Nom** : `project-images`
- **Accès** : Public en lecture
- **Dossier** : `projects/` (organisé par type)
- **Politiques** : Upload, lecture et suppression autorisées

## Utilisation

Après avoir exécuté les scripts, l'interface de création/modification de projets inclura automatiquement :

1. Un composant d'upload d'images
2. La validation des fichiers
3. L'affichage des images dans la liste des projets
4. La gestion de la suppression des images

## Dépannage

### Erreur "bucket does not exist"
Exécutez le script de création du bucket :
```bash
PGPASSWORD=9eeKOhKmFRk5HgV5 psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 -U postgres.xaajljjgtbcgwfptogzy -d postgres -c "INSERT INTO storage.buckets (id, name, public) VALUES ('project-images', 'project-images', true) ON CONFLICT (id) DO NOTHING;"
```

### Erreur "column does not exist"
Vérifiez que les colonnes ont été ajoutées :
```bash
PGPASSWORD=9eeKOhKmFRk5HgV5 psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 -U postgres.xaajljjgtbcgwfptogzy -d postgres -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'projects';"
``` 