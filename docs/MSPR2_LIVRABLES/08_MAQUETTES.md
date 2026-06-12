# 08 — Maquettes d'interface responsive

> Section IV du brief — *« Maquettes d'interface responsive pour l'application. »*

Ce document présente les maquettes de l'application utilisateur `frontend-user/`.
La démarche a suivi trois niveaux : **wireframes basse fidélité** (structure),
**design system** (tokens validés), puis **réalisation haute fidélité** (l'app
React réelle, qui sert de maquette finale interactive).

> Les maquettes haute fidélité **sont** l'application livrée : `npm run dev`
> dans `frontend-user/` ouvre toutes les pages décrites ci-dessous. Les wireframes
> ci-dessous documentent les décisions de structure et de responsive.

## 1. Design system

### 1.1 Palette (contrastes validés AA — cf. `06_ACCESSIBILITE.md`)

| Rôle | Token | Hex |
|---|---|---|
| Primaire (violet startup) | `--color-primary` | `#6d28d9` |
| Primaire foncé | `--color-primary-dark` | `#5b21b6` |
| Accent santé (emerald) | `--color-accent` | `#059669` |
| Texte | `--color-text` | `#0c0a09` |
| Texte secondaire | `--color-text-muted` | `#57534e` |
| Fond | `--color-bg` | `#fafaf9` |
| Surface (cartes) | `--color-surface` | `#ffffff` |
| Bordure | `--color-border` | `#e7e5e4` |
| Alerte | `--color-danger` | `#dc2626` |
| Avertissement | `--color-warning` | `#d97706` |

Direction artistique : **sobre, startup, santé**. Violet profond (IA/premium)
+ emerald (santé/bien-être) sur fond stone clair. Pas de dégradés criards.

### 1.2 Typographie

| Usage | Police |
|---|---|
| Titres / display | **Manrope** (700–800) |
| Corps de texte | **DM Sans** (300–600) |
| Données / mono | **JetBrains Mono** |

Taille de base 15 px, échelle modulaire via `rem` (redimensionnable au zoom).

### 1.3 Espacements & rayons

Échelle d'espacement `--sp-1` (4px) → `--sp-10` (64px). Rayons `--radius-sm`
(6px) → `--radius-xl` (20px), `--radius-full` pour les pills/avatars.

### 1.4 Breakpoints responsive

| Breakpoint | Cible | Comportement |
|---|---|---|
| `< 640px` | Mobile (S→L) | 1 colonne, nav condensée, cartes empilées, cibles tactiles ≥ 44px |
| `640–960px` | Tablette portrait | grilles `auto-fit minmax`, nav scrollable horizontalement |
| `960–1100px` | Tablette paysage / petit laptop | 2–3 colonnes |
| `> 1100px` | Desktop | layout pleine largeur (max-width centré), dropdowns nav |

Layout **mobile-first** : les grilles utilisent `repeat(auto-fit, minmax(…))`
qui reflowent automatiquement sans media-query par composant.

## 2. Structure de navigation

```
HealthAI Coach
├─ Public
│   ├─ / ............... Landing (hero + CTA)
│   ├─ /login .......... Connexion
│   ├─ /register ....... Inscription
│   └─ /accessibilite .. Déclaration RGAA
└─ Connecté (AuthGate)
    ├─ /dashboard ........ Tableau de bord
    ├─ /onboarding ....... Configuration profil initial
    ├─ /profile .......... Mon profil
    ├─ Repas ▾
    │   ├─ /meal-analysis . Analyser un repas (photo → macros IA)
    │   ├─ /coach ......... Coach nutrition (conseils IA)
    │   ├─ /meal-plan ..... Plan repas IA
    │   ├─ /saved-plans ... Plans sauvegardés
    │   └─ /historique .... Historique repas
    └─ Sport ▾
        ├─ /workout-plan ... Générer un programme IA
        ├─ /saved-plans .... Programmes sauvegardés
        └─ /workout-history. Mes séances
```

## 3. Wireframes basse fidélité

### 3.1 Header (commun, connecté)

```
Desktop (> 960px)
┌────────────────────────────────────────────────────────────────┐
│ 🌿 HealthAI Coach   [Dashboard] [Repas ▾] [Sport ▾]    👤 [Déco] │
└────────────────────────────────────────────────────────────────┘

Mobile (< 640px)
┌──────────────────────────────────┐
│ 🌿 HealthAI      [Dashboard][Repas▾]│  ← nav scrollable horizontalement
│                          👤 [Déco] │
└──────────────────────────────────┘
```
- Skip link « Aller au contenu principal » (visible au focus clavier).
- Dropdowns `aria-haspopup` / `aria-expanded`, fermeture à la touche Échap.

### 3.2 Landing `/`

```
┌──────────────────────────────────────────┐
│              [Header public]              │
├──────────────────────────────────────────┤
│   Ton coach santé personnel, par l'IA     │  ← h1
│   Analyse photo, plans nutri & sport…     │  ← sous-titre
│   [ Commencer gratuitement ]  [ Connexion ]│  ← CTA
└──────────────────────────────────────────┘
```

### 3.3 Onboarding `/onboarding`

```
┌──────────────────────────────────────────┐
│  Configurons ton profil (étape unique)    │
│  ┌── Objectif ───────────────────────┐    │
│  │ ○ Perte de poids  ○ Prise de masse│    │
│  │ ○ Endurance       ○ Santé générale│    │
│  └───────────────────────────────────┘    │
│  Niveau : [ Débutant ▾ ]                   │
│  Mesures : âge / taille / poids / cible    │
│  Restrictions : ☐ Végé ☐ Sans gluten …     │
│  Allergies : [ … ]   Budget repas : [ … ]  │
│  Équipement : ☐ Haltères ☐ Tapis ☐ Salle   │
│  Blessures : [ … ]                         │
│  [ Enregistrer et continuer → ]            │
└──────────────────────────────────────────┘
```
fieldset/legend pour chaque groupe ; erreurs `aria-live`.

### 3.4 Dashboard `/dashboard`

```
Desktop
┌───────────────┬───────────────┬──────────────┐
│ Profil résumé │ Apports du    │ Reco du jour │
│ (objectif,IMC)│ jour (kcal,   │ (repas+sport)│
│               │ macros)       │              │
├───────────────┴───────────────┴──────────────┤
│  Activité de la semaine  [BarChart Chart.js]  │  ← +table data accessible
└───────────────────────────────────────────────┘
Mobile : les 3 cartes s'empilent, le graphe passe pleine largeur.
```

### 3.5 Analyser un repas `/meal-analysis`

```
┌──────────────────────────────────────────┐
│  Analyser un repas                         │
│  ┌─────────────────────────────────────┐  │
│  │   [📷 Glisser une photo ou choisir] │  │  ← upload clavier + drag&drop
│  └─────────────────────────────────────┘  │
│  Aliments détectés (top-5) :               │
│   ☑ Spaghetti bolognese (0.79)             │  ← cases à cocher (multi)
│   ☐ Lasagna (0.08)  ☐ …                    │
│  → Macros calculées : kcal / P / G / L     │  aria-live
│  [ Enregistrer ce repas ]                  │
└──────────────────────────────────────────┘
```

### 3.6 Coach nutrition `/coach`

```
┌──────────────────────────────────────────┐
│  Coach nutrition                           │
│  Apports du jour vs cibles :               │
│   Protéines  ▓▓▓▓▓▓░░ 78%  (progressbar)   │  aria-valuenow/min/max
│   Glucides   ▓▓▓▓▓▓▓▓ 102% (excès)         │
│   Lipides    ▓▓▓░░░░░ 41%  (déficit)       │
│  Déséquilibres détectés : …                │
│  [ Demander un conseil IA ]                │
│  ┌── Conseil personnalisé (gpt-oss) ────┐  │
│  │ « Tu es légèrement au-dessus de … »   │  │
│  └───────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### 3.7 Plan repas IA `/meal-plan`

```
┌──────────────────────────────────────────┐
│  Générer un plan repas                     │
│  Objectif [▾]  Calories cible [____]       │
│  Repas/jour [3]  Allergies [____]          │
│  [ Générer (rule-based) ] [ Générer (IA) ] │
│  → 3 cartes repas (nom, grammages, macros) │
│  [ Sauvegarder ce plan ]                   │
└──────────────────────────────────────────┘
```

### 3.8 Programme sport `/workout-plan`

```
┌──────────────────────────────────────────┐
│  Générer un programme                      │
│  Objectif [▾] Niveau [▾] Lieu [▾]          │
│  Équipement ☐…  Limitations/blessures [__] │
│  [ Générer le programme IA ]               │
│  → Séances (jour, focus, exercices, durée) │
│  [ Sauvegarder ]                           │
└──────────────────────────────────────────┘
```

### 3.9 Historique / Plans sauvegardés / Séances

Listes de cartes (`<ul>`), carte « aujourd'hui » mise en avant, action
supprimer (`<button aria-label>`), onglets pour `saved-plans` (Repas / Sport).

## 4. États d'interface

| État | Traitement |
|---|---|
| Chargement | Composant `PlanLoading` / `role="status"` annoncé au lecteur d'écran |
| Vide | Message « Pas encore d'analyse / de plan » + CTA |
| Erreur API | Message `role="alert"`, fallback rule-based si LLM indisponible |
| Succès | Confirmation `aria-live="polite"` |

## 5. Correspondance maquette → code

| Écran | Composant React |
|---|---|
| Landing | `App.jsx` (`HomePage`) |
| Connexion / Inscription | `pages/Login.jsx`, `pages/SignUp.jsx` |
| Onboarding | `pages/Onboarding.jsx` |
| Dashboard | `pages/Dashboard.jsx` |
| Analyser un repas | `pages/MealAnalysis.jsx` |
| Coach | `pages/Coach.jsx` |
| Plan repas | `pages/MealPlan.jsx` |
| Programme sport | `pages/WorkoutPlan.jsx` |
| Historique / séances | `pages/History.jsx`, `pages/WorkoutHistory.jsx` |
| Plans sauvegardés | `pages/SavedPlans.jsx` |
| Profil | `pages/Profile.jsx` |
| Graphiques accessibles | `utils/chartA11y.jsx`, `components/ChartOptions.js` |

## 6. Visualiser les maquettes haute fidélité

```bash
cd frontend-user
npm install
npm run dev      # http://localhost:5173
```

Pour capturer des screenshots desktop/tablette/mobile pour le support de
soutenance : ouvrir les DevTools (mode responsive) aux largeurs 375px, 768px
et 1440px sur chaque page ci-dessus.
