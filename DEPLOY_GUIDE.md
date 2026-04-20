# Guide de Déploiement - Visa Workflow Edge Functions

## Prérequis

1. **CLI Supabase installée** :
   ```bash
   npm install -g supabase
   # ou
   brew install supabase/tap/supabase
   ```

2. **Connexion au projet** :
   ```bash
   supabase login
   supabase link --project-ref <votre-project-ref>
   # Trouvez votre project ref dans l'URL Supabase: https://app.supabase.com/project/<project-ref>
   ```

## Déploiement des Edge Functions

### Option 1: Déployer toutes les fonctions d'un coup

```bash
cd /Users/yassine/aps/Aphs-international
supabase functions deploy
```

### Option 2: Déployer une par une (recommandé pour debug)

```bash
cd /Users/yassine/aps/Aphs-international

# 1. Fonction de démarrage visa
supabase functions deploy start-visa

# 2. Fonction de soumission d'avis
supabase functions deploy submit-opinion

# 3. Fonction de resoumission
supabase functions deploy resubmit-document

# 4. Fonction de notification validateur
supabase functions deploy notify-validator

# 5. Fonction de notification émetteur
supabase functions deploy notify-emitter

# 6. Fonction email (si pas déjà déployée)
supabase functions deploy send-email
```

## Configuration des Secrets

### Variables requises

```bash
# Clé API Resend (obligatoire pour les emails)
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx

# Email d'expédition
supabase secrets set EMAIL_FROM=noreply@aphs-international.com
# ou pour tester : onboarding@resend.dev

# URL de l'application (pour les liens dans les emails)
supabase secrets set APP_URL=https://votre-app.com
# ou pour local : http://localhost:5173

# Les variables suivantes sont automatiquement injectées par Supabase:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - SUPABASE_ANON_KEY
```

### Vérifier les secrets

```bash
supabase secrets list
```

## Vérification du Déploiement

### 1. Vérifier les fonctions déployées

```bash
supabase functions list
```

### 2. Tester une fonction localement avant déploiement

```bash
# Démarrer le serveur local
supabase functions serve start-visa

# Tester avec curl (dans un autre terminal)
curl -X POST http://localhost:54321/functions/v1/start-visa \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": "test-submission-id",
    "circuit_id": "test-circuit-id",
    "emitted_by": "test-user-id",
    "emitted_by_role": "maitre_oeuvre"
  }'
```

### 3. Logs en temps réel

```bash
# Voir les logs d'une fonction
supabase functions logs start-visa --tail

# Voir tous les logs
supabase functions logs --tail
```

## Configuration CORS (déjà fait dans le code)

Les fonctions ont déjà les headers CORS configurés dans `index.ts` :

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Important**: En production, remplacez `*` par votre domaine exact.

## Invocation depuis le Frontend

Les fonctions sont automatiquement accessibles via le client Supabase :

```typescript
const { data, error } = await supabase.functions.invoke('start-visa', {
  body: {
    submission_id: 'xxx',
    circuit_id: 'yyy',
    emitted_by: 'zzz',
    emitted_by_role: 'maitre_oeuvre'
  }
});
```

URL directe si besoin :
```
https://<project-ref>.supabase.co/functions/v1/start-visa
```

## Rollback / Suppression

```bash
# Supprimer une fonction
supabase functions delete start-visa

# Redéployer une version antérieure (via git)
git checkout <commit-hash> -- supabase/functions/start-visa
supabase functions deploy start-visa
```

## Dépannage

### Erreur "Cannot find name 'Deno'"
- C'est normal en local, les types Deno sont uniquement disponibles dans l'environnement Supabase
- Le code fonctionne quand même après déploiement

### Erreur CORS
- Vérifiez que les headers CORS sont bien dans la réponse
- Vérifiez que le client Supabase utilise la bonne URL

### Erreur "Function not found"
- Vérifiez le déploiement : `supabase functions list`
- Redéployez la fonction : `supabase functions deploy <nom>`

### Erreur "Invalid JWT"
- Vérifiez que vous utilisez bien le `anon key` pour les appels clients
- Le `service role key` ne doit être utilisé que côté serveur

## Commandes Récapitulatives

```bash
# Déploiement complet
supabase login
supabase link --project-ref <ref>
supabase functions deploy

# Secrets
supabase secrets set RESEND_API_KEY=xxx
supabase secrets set EMAIL_FROM=noreply@votredomaine.com
supabase secrets set APP_URL=https://votredomaine.com

# Vérification
supabase functions list
supabase secrets list
supabase functions logs --tail
```

---

**Support**: Si vous avez des erreurs, vérifiez les logs avec `supabase functions logs <nom> --tail`
