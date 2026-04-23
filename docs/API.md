# API Documentation

## 📡 Endpoints Principaux

### Authentification

#### Connexion
```typescript
POST /auth/v1/token
{
  "email": "user@example.com",
  "password": "password"
}
```

#### Inscription
```typescript
POST /auth/v1/signup
{
  "email": "user@example.com",
  "password": "password",
  "options": {
    "data": {
      "role": "intervenant",
      "full_name": "Jean Dupont"
    }
  }
}
```

### Projets

#### Lister les projets
```typescript
GET /rest/v1/projects
Headers: Authorization: Bearer <token>
```

#### Créer un projet
```typescript
POST /rest/v1/projects
{
  "name": "Projet Test",
  "description": "Description du projet",
  "client": "Client Name",
  "status": "active"
}
```

#### Mettre à jour un projet
```typescript
PATCH /rest/v1/projects/{id}
{
  "name": "Nouveau nom",
  "status": "completed"
}
```

### Tâches

#### Lister les tâches
```typescript
GET /rest/v1/task_assignments
Headers: Authorization: Bearer <token>
```

#### Créer une tâche
```typescript
POST /rest/v1/task_assignments
{
  "project_id": "uuid",
  "title": "Titre de la tâche",
  "description": "Description",
  "assigned_to": ["user_id"],
  "due_date": "2026-12-31"
}
```

### Vidéoconférence

#### Créer une réunion
```typescript
POST /rest/v1/video_meetings
{
  "title": "Réunion d'équipe",
  "description": "Discussion sur le projet",
  "scheduled_time": "2026-12-31T10:00:00Z",
  "is_instant": false
}
```

#### Rejoindre une réunion
```typescript
POST /rest/v1/video_meeting_participants
{
  "meeting_id": "uuid",
  "user_id": "uuid",
  "role": "participant"
}
```

---

## 🔐 Permissions (RLS)

### Règles de sécurité

#### Projets
```sql
-- Seuls les admins peuvent voir tous les projets
CREATE POLICY "Admins can view all projects" ON projects
FOR SELECT USING (auth.jwt()->>'role' = 'admin');

-- Les intervenants ne voient que leurs projets
CREATE POLICY "Intervenants can view assigned projects" ON projects
FOR SELECT USING (
  id IN (
    SELECT project_id FROM project_members 
    WHERE user_id = auth.uid()
  )
);
```

#### Tâches
```sql
-- Les utilisateurs voient leurs tâches assignées
CREATE POLICY "Users can view their tasks" ON task_assignments
FOR SELECT USING (
  assigned_to ? auth.uid() OR 
  created_by = auth.uid()
);
```

---

## 📊 Réponses

### Format de succès
```json
{
  "data": [...],
  "error": null
}
```

### Format d'erreur
```json
{
  "data": null,
  "error": {
    "message": "Erreur description",
    "code": "PGRST001"
  }
}
```

### Codes d'erreur communs

| Code | Description |
|------|-------------|
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Permission refusée |
| 404 | Ressource non trouvée |
| 422 | Validation échouée |

---

## 🔄 Webhooks

### Événements disponibles

- `user.created`: Nouvel utilisateur inscrit
- `project.created`: Nouveau projet créé
- `task.completed`: Tâche terminée
- `meeting.started`: Réunion démarrée

### Configuration webhook
```typescript
POST /functions/v1/webhook
{
  "url": "https://votre-app.com/webhook",
  "events": ["user.created", "project.created"],
  "secret": "webhook-secret"
}
```

---

## 📈 Rate Limiting

- **Authentification**: 100 requêtes/minute
- **API générale**: 1000 requêtes/minute
- **Upload fichiers**: 10 requêtes/minute

---

## 🔍 Debug

### Logs Supabase
```sql
-- Activer les logs
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 0;
```

### Monitoring
- Dashboard Supabase
- Logs Netlify
- Analytics Vercel (si utilisé)
