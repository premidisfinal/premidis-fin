# Correction Calendrier - Couleurs des Noms

## Problème Identifié
Les noms des personnes en congé s'affichaient en **blanc** (`text-white`) dans le calendrier.
En mode clair, avec un fond blanc, les noms étaient **invisibles**.

## Solution Appliquée

### 1. Nouvelle fonction `getLeaveTextColor()`
Créée dans `/app/frontend/src/pages/TimeManagement.jsx` (ligne ~437)

```javascript
const getLeaveTextColor = (leaveType) => {
  const type = leaveTypes.find(t => t.value === leaveType);
  const bgColor = type?.color || 'bg-primary';
  
  // Convertir bg-* en text-*
  // Ex: bg-blue-500 -> text-blue-500
  return bgColor.replace('bg-', 'text-');
};
```

### 2. Modification de l'affichage calendrier
Ligne ~1063-1082

**Avant:**
```javascript
className={`... text-white font-medium ${leaveColor}`}
```

**Après:**
```javascript
className={`... font-bold ${leaveTextColor} bg-muted/20 dark:bg-muted/40`}
```

### Changements détaillés:
- ✅ Supprimé `text-white` fixe
- ✅ Ajouté `${leaveTextColor}` dynamique
- ✅ Remplacé couleur de fond pleine par `bg-muted/20` (léger)
- ✅ Ajouté fond sombre pour dark mode `dark:bg-muted/40`
- ✅ Augmenté épaisseur police: `font-medium` → `font-bold`

## Résultat

### Mode Clair
- Nom en **couleur du type de congé** (ex: bleu, jaune, rouge)
- Fond très léger (transparent à 80%)
- **Lisible** sur fond blanc

### Mode Sombre
- Nom en **couleur du type de congé** (même couleur)
- Fond un peu plus foncé (transparent à 60%)
- **Lisible** sur fond sombre

## Exemples de Couleurs

Si configuré dans les types de congés:
- Congé maladie (jaune) → Nom en `text-yellow-500`
- Congé annuel (bleu) → Nom en `text-blue-500`
- Congé maternité (rose) → Nom en `text-pink-500`

## Test de Validation

1. Créer un congé
2. L'approuver
3. Vérifier dans le calendrier:
   - Le nom apparaît avec la couleur du type
   - Lisible en mode clair
   - Lisible en mode sombre
   - Changement de mode ne cache pas le texte

## Fichiers Modifiés
- `/app/frontend/src/pages/TimeManagement.jsx` (2 modifications)
  - Ajout fonction `getLeaveTextColor()` 
  - Modification affichage calendrier

## Date
29 Janvier 2025
