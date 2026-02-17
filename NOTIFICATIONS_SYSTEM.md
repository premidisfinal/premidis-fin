# 📬 Système de Notifications Personnalisées - PREMIDIS

## ✅ Modifications Apportées

### 1. **Nouveau Système de Notifications**
Un système complet de notifications personnalisées a été implémenté dans le backend, remplaçant les anciennes notifications d'erreur.

---

## 📋 Fonctionnalités Implémentées

### 🔐 **Notifications de Connexion**
- **Déclencheur:** Chaque fois qu'un utilisateur se connecte
- **Destinataire:** Tous les administrateurs
- **Contenu:** Nom de l'utilisateur, rôle, et heure de connexion
- **Type:** `info`
- **Exemple:** "🔐 Nouvelle connexion: Jean Dupont (admin) s'est connecté le 13/02/2026 à 15:30"

**Implémentation:** Ligne 463 dans `/app/backend/server.py` - fonction `login()`

### 📅 **Rappels Automatiques de Congés**
- **Déclencheur:** Automatique, chaque jour à 8h00 UTC
- **Condition:** Congés approuvés commençant le lendemain
- **Destinataires:**
  - **Admin:** Notification pour chaque employé en congé demain
  - **Employé:** Notification personnelle de rappel
- **Contenu:** Nom de l'employé, type de congé, dates
- **Type:** `info`
- **Exemples:**
  - Admin: "📅 Rappel: Congé de Marie Martin demain (2026-02-14 au 2026-02-20)"
  - Employé: "📅 Rappel: Votre Congé annuel commence demain (2026-02-14 au 2026-02-20)"

**Implémentation:**
- Fonction principale: Ligne 2392 `send_leave_reminders_background()`
- Scheduler: Lignes 41-86 - tâche de fond lancée au démarrage de l'application

---

## 🎛️ Endpoints API Admin

### 1. **Créer une Notification Personnalisée**
```http
POST /api/notifications/create
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Titre de la notification",
  "message": "Message détaillé",
  "type": "info",  // "info", "success", "warning", "error"
  "target_users": ["all_admins"], // ou ["all_users"] ou ["user_id_1", "user_id_2"]
  "link": "/chemin/optionnel"  // optionnel
}
```

**Réponse:**
```json
{
  "message": "Notification envoyée à 8 utilisateur(s)",
  "count": 8
}
```

### 2. **Supprimer Toutes les Notifications d'Erreur**
```http
DELETE /api/notifications/clear-all
Authorization: Bearer <admin_token>
```

Supprime toutes les notifications de type `error` et `warning`.

**Réponse:**
```json
{
  "message": "5 notification(s) d'erreur supprimée(s)"
}
```

### 3. **Tester le Système de Rappel de Congés**
```http
POST /api/notifications/test-leave-reminders
Authorization: Bearer <admin_token>
```

Envoie immédiatement les rappels pour les congés commençant demain (utile pour tester).

**Réponse:**
```json
{
  "message": "Rappels envoyés pour 2 congé(s)"
}
```

### 4. **Gérer les Templates de Notifications**

#### Créer un Template
```http
POST /api/notifications/templates
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Bienvenue Nouvel Employé",
  "title_template": "Bienvenue {{employee_name}}!",
  "message_template": "Bienvenue dans l'équipe {{department}}. Votre période d'essai commence le {{start_date}}.",
  "type": "info",
  "trigger_event": "employee_created",
  "target_role": "all",
  "is_active": true
}
```

#### Lister les Templates
```http
GET /api/notifications/templates
Authorization: Bearer <admin_token>
```

#### Modifier un Template
```http
PUT /api/notifications/templates/{template_id}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Template Modifié",
  "title_template": "...",
  "message_template": "...",
  "type": "info",
  "trigger_event": "custom",
  "target_role": "admin",
  "is_active": true
}
```

#### Supprimer un Template
```http
DELETE /api/notifications/templates/{template_id}
Authorization: Bearer <admin_token>
```

---

## 🔧 Endpoints Utilisateur

### Récupérer ses Notifications
```http
GET /api/notifications?unread_only=false
Authorization: Bearer <token>
```

**Réponse:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "user_id": "user_id",
      "type": "info",
      "title": "Nouvelle connexion",
      "message": "Admin User s'est connecté",
      "link": null,
      "read": false,
      "created_at": "2026-02-13T15:30:00Z"
    }
  ],
  "unread_count": 5
}
```

### Marquer comme Lu
```http
PUT /api/notifications/{notification_id}/read
Authorization: Bearer <token>
```

### Marquer Tout comme Lu
```http
PUT /api/notifications/read-all
Authorization: Bearer <token>
```

### Supprimer une Notification
```http
DELETE /api/notifications/{notification_id}
Authorization: Bearer <token>
```

---

## 🗄️ Structure de la Base de Données

### Collection: `notifications`
```json
{
  "id": "uuid",
  "user_id": "user_id_destinataire",
  "type": "info | success | warning | error | custom",
  "title": "Titre court",
  "message": "Message détaillé",
  "link": "/optional/link",
  "read": false,
  "created_at": "2026-02-13T15:30:00Z"
}
```

### Collection: `notification_templates`
```json
{
  "id": "uuid",
  "name": "Nom du template",
  "title_template": "Titre avec {{variables}}",
  "message_template": "Message avec {{variables}}",
  "type": "info",
  "trigger_event": "login | leave_request | leave_reminder | custom",
  "target_role": "admin | all | specific",
  "is_active": true,
  "created_by": "admin_user_id",
  "created_at": "2026-02-13T10:00:00Z"
}
```

---

## 🛠️ Fonctions Helper Backend

### `create_notification(user_ids, title, message, type, link)`
Crée des notifications pour une liste d'utilisateurs.

```python
await create_notification(
    user_ids=["user1", "user2"],
    title="Titre",
    message="Message",
    notification_type="success",
    link="/dashboard"
)
```

### `create_admin_notification(title, message, type, link)`
Crée une notification pour tous les administrateurs.

```python
await create_admin_notification(
    title="Alerte Admin",
    message="Quelque chose nécessite votre attention",
    notification_type="warning",
    link="/admin/dashboard"
)
```

---

## ⏰ Scheduler Automatique

Le système démarre automatiquement un scheduler de tâches de fond au démarrage de l'application:

- **Fréquence:** Quotidienne à 8h00 UTC
- **Tâche:** Envoi des rappels de congés pour le lendemain
- **Logs:** Vérifiable dans `/var/log/supervisor/backend.err.log`

```
INFO:root:Leave reminder scheduler started
INFO:root:Next leave reminder scheduled in 26.7 hours
```

---

## 📊 Tests Effectués

### ✅ Test 1: Notification de Connexion
- **Action:** Login avec admin@example.com
- **Résultat:** ✅ Notification créée "🔐 Nouvelle connexion: Admin User"
- **Destinataires:** 8 admins

### ✅ Test 2: Notification Personnalisée
- **Action:** POST /api/notifications/create
- **Résultat:** ✅ "Notification envoyée à 8 utilisateur(s)"

### ✅ Test 3: Rappel de Congés
- **Action:** POST /api/notifications/test-leave-reminders
- **Résultat:** ✅ Système fonctionnel (0 congés demain au moment du test)

### ✅ Test 4: Scheduler Automatique
- **Résultat:** ✅ Démarré avec succès
- **Log:** "Next leave reminder scheduled in 26.7 hours"

---

## 🎯 Utilisation Recommandée

### Pour l'Admin:

1. **Connexion quotidienne:** Vérifiez les notifications de connexion pour surveiller l'activité
2. **Rappels de congés:** Consultez les rappels automatiques chaque matin à 8h
3. **Notifications personnalisées:** Utilisez `/api/notifications/create` pour des annonces importantes
4. **Nettoyage:** Utilisez `/api/notifications/clear-all` pour supprimer les anciennes erreurs

### Exemples de Cas d'Usage:

**Annonce générale:**
```json
{
  "title": "Réunion Générale",
  "message": "Réunion générale demain à 14h dans la salle de conférence",
  "type": "info",
  "target_users": ["all_users"]
}
```

**Alerte critique:**
```json
{
  "title": "🚨 Maintenance Système",
  "message": "Le système sera en maintenance ce soir de 22h à 23h",
  "type": "warning",
  "target_users": ["all_users"]
}
```

---

## 📝 Fichiers Modifiés

1. **`/app/backend/server.py`**
   - Lignes 195-209: Nouveaux modèles Pydantic
   - Lignes 41-86: Scheduler automatique
   - Lignes 463-481: Notification de connexion
   - Lignes 1001-1027: Fonctions helper
   - Lignes 2260-2441: Endpoints de notifications étendus

---

## 🔄 Migration depuis l'Ancien Système

Les anciennes notifications d'erreur peuvent être supprimées avec:
```bash
DELETE /api/notifications/clear-all
```

Le nouveau système ne génère plus de notifications d'erreur automatiquement, seulement des notifications intentionnelles et utiles.

---

## 🚀 Prochaines Améliorations Possibles

- [ ] Templates avec variables personnalisables via l'interface admin
- [ ] Notifications par email (intégration Resend déjà présente)
- [ ] Notifications push navigateur
- [ ] Filtres et recherche dans les notifications
- [ ] Statistiques de notifications envoyées/lues

---

**Date de Mise à Jour:** 13 Février 2026
**Version:** 2.0.0
