# Correction Calendrier - Contour Coloré sur Noms

## Problème Identifié
Les noms des personnes en congé s'affichaient en **blanc** (`text-white`) dans le calendrier.
En mode clair, avec un fond blanc, les noms étaient **invisibles**.

## Évolution de la Solution

### ❌ Première tentative (rejetée)
Colorer le texte du nom avec la couleur du type de congé.
**Problème** : Texte apparaissait en noir, pas assez visible.

### ✅ Solution finale (appliquée)
**Contour coloré** autour du nom, texte lisible standard.

## Solution Appliquée

### 1. Fonction `getLeaveBorderColor()`
Créée dans `/app/frontend/src/pages/TimeManagement.jsx` (ligne ~433)

```javascript
const getLeaveBorderColor = (leaveType) => {
  const type = leaveTypes.find(t => t.value === leaveType);
  const bgColor = type?.color || 'bg-primary';
  
  // Convertir bg-* en border-*
  // Ex: bg-blue-500 -> border-blue-500
  return bgColor.replace('bg-', 'border-');
};
```

### 2. Modification de l'affichage calendrier
Ligne ~1074

**Classes CSS appliquées:**
```jsx
className="... 
  text-foreground           // Texte lisible (noir/blanc selon thème)
  bg-background/95          // Fond adaptatif avec légère transparence
  border-2                  // Contour épais (2px)
  ${leaveBorderColor}       // Couleur du contour = couleur du type de congé
  font-semibold             // Police semi-grasse pour lisibilité
"
```

## Résultat Final

### Mode Clair 🌞
- **Texte** : Noir (lisible)
- **Fond** : Blanc (95% opacité)
- **Contour** : Couleur du type de congé (ex: jaune, bleu, rouge)

### Mode Sombre 🌙
- **Texte** : Blanc (lisible)
- **Fond** : Sombre (95% opacité)
- **Contour** : Couleur du type de congé (même couleur qu'en mode clair)

## Exemples Visuels

Si configuré dans les types de congés:

| Type de Congé | Couleur Config | Contour Nom |
|---------------|----------------|-------------|
| Congé maladie | `bg-yellow-500` | `border-yellow-500` 🟨 |
| Congé annuel | `bg-blue-500` | `border-blue-500` 🟦 |
| Congé maternité | `bg-pink-500` | `border-pink-500` 🟥 |
| Congé formation | `bg-green-500` | `border-green-500` 🟩 |

### Rendu dans le calendrier:
```
┌─────────────────┐
│ 15 Janvier      │
│ ┏━━━━━━━━━━━┓  │ ← Contour jaune (congé maladie)
│ ┃ John Doe  ┃  │ ← Texte noir (mode clair)
│ ┗━━━━━━━━━━━┛  │
└─────────────────┘
```

## Avantages

✅ **Lisibilité parfaite** : Texte toujours visible (adaptatif au thème)
✅ **Identification rapide** : Couleur du contour = type de congé
✅ **Cohérence visuelle** : Respecte les couleurs configurées
✅ **Élégant** : Contour plus subtil et professionnel que texte coloré
✅ **Accessible** : Fonctionne pour tous les types de congés

## Test de Validation

1. ✅ Créer un congé (Congé maladie avec couleur jaune)
2. ✅ Approuver le congé
3. ✅ Ouvrir le calendrier
4. ✅ Vérifier : nom avec **contour jaune**, texte noir/blanc
5. ✅ Mode clair → texte noir, contour jaune, **lisible**
6. ✅ Mode sombre → texte blanc, contour jaune, **lisible**
7. ✅ Créer plusieurs congés types différents → contours couleurs différentes

## Fichiers Modifiés
- `/app/frontend/src/pages/TimeManagement.jsx`
  - Fonction `getLeaveTextColor()` → `getLeaveBorderColor()` 
  - Modification affichage calendrier (ligne 1074)
    - `${leaveTextColor}` → `text-foreground`
    - Ajout `border-2 ${leaveBorderColor}`

## Date
29 Janvier 2025 (v2 - contour coloré)
