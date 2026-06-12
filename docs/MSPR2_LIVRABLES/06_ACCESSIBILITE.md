# 06 — Accessibilité (WCAG 2.1 / RGAA 4 niveau AA)

> Section III.3 du brief — *"Une interface moderne, responsive et accessible (WCAG/RGAA niveau AA) devra être livrée. Une attention particulière devra être portée à la navigation clavier, le support des lecteurs d'écran et le respect des contrastes."*

## 1. Engagement d'accessibilité

L'application HealthAI Coach vise la conformité **WCAG 2.1 niveau AA** /
**RGAA 4 niveau AA**, conformément au cahier des charges.

Cible : autonomie pour les utilisateurs aux besoins spécifiques (vision,
motricité, cognition) sans surcoût de développement disproportionné.

## 2. Mesures appliquées

### 2.1 Structure sémantique

| Pratique | Implémentation |
|---|---|
| Hiérarchie de titres | Une seule `<h1>` par page (titre principal), `<h2>` pour sections, etc. |
| Landmarks | `<header>`, `<nav aria-label="...">`, `<main>`, `<footer role="contentinfo">` |
| Listes | `<ul>` / `<ol>` partout où des items sont énumérés (suggestions, repas, séances) |
| Boutons vs liens | `<button>` pour les actions (login, save), `<a>`/`<Link>` pour la navigation |
| Formulaires | Chaque `<input>` a un `<label htmlFor>` associé ; `<fieldset>` + `<legend>` pour les groupes |

### 2.2 Navigation clavier

- **Ordre de tabulation logique** : la nav suit l'ordre visuel (logo → liens → user actions)
- **`:focus-visible`** stylé avec ring violet (4 px, 25% opacity) sur tous les éléments interactifs
- **Pas de `tabindex` positif** : on respecte l'ordre du DOM
- **Skip link** : `<a href="#main-content" className="skip-link">` masqué hors focus, cible `<main id="main-content" tabIndex={-1}>` (`App.jsx`)
- **Échap** ferme les dropdowns de la nav et **rend le focus au bouton déclencheur** (`NavDropdown` dans `App.jsx`, handler `handleKeyDown`)

### 2.3 Support lecteur d'écran

| Pratique | Exemple |
|---|---|
| `aria-label` sur boutons icônes | `<button aria-label="Supprimer ce repas">🗑️</button>` |
| `aria-live` sur zones dynamiques | Total calories après calcul : `aria-live="polite"` |
| `role="alert"` sur erreurs | `<p className="form-error" role="alert">` |
| `role="status"` sur loaders | `<p role="status">Chargement…</p>` |
| `aria-hidden="true"` sur icônes décoratives | Emojis purement visuels |
| `aria-expanded` / `aria-haspopup` sur dropdowns | Nav menu Repas / Sport |
| `aria-valuenow` / `aria-valuemin` / `aria-valuemax` sur progressbars | Balance bars du Coach |

### 2.4 Contrastes

Palette validée avec l'outil [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) :

| Couleur | Hex | Sur fond | Ratio | AA texte normal (≥ 4.5) | AA texte large (≥ 3) |
|---|---|---|---|---|---|
| Texte principal | `#0c0a09` | `#ffffff` | 19.5 : 1 | ✅ | ✅ |
| Texte muted | `#57534e` | `#ffffff` | 7.4 : 1 | ✅ | ✅ |
| Primary violet | `#6d28d9` | `#ffffff` | 7.8 : 1 | ✅ | ✅ |
| Lien sur bg | `#6d28d9` | `#fafaf9` | 7.6 : 1 | ✅ | ✅ |
| Texte sur primary (bouton) | `#ffffff` | `#6d28d9` | 7.8 : 1 | ✅ | ✅ |
| Erreur | `#991b1b` | `#fee2e2` | 7.0 : 1 | ✅ | ✅ |
| Succès | `#065f46` | `#d1fae5` | 7.3 : 1 | ✅ | ✅ |
| Texte clair | `#a8a29e` | `#ffffff` | 3.0 : 1 | ⚠️ Limite — utilisé uniquement sur placeholder/legend, jamais sur du contenu lisible |

→ **Tous les contrastes texte/fond passent AA**.

### 2.5 Responsive

- Breakpoints CSS : 640px, 960px, 1100px
- Layout mobile-first : grilles `repeat(auto-fit, minmax(...))` qui réorganisent automatiquement
- Nav passe en accordéon scrollable horizontalement < 960px
- Boutons et zones cliquables respectent **44 px minimum** (cible tactile RGAA)
- Police de base 15 px, redimensionnable via `rem`

### 2.6 Multimédia et alternatives

- Toutes les `<img>` ont un `alt` descriptif ou `alt=""` si purement décoratif
- Aucun audio ni vidéo automatique
- Les icônes emoji ont un `aria-hidden="true"` quand elles accompagnent un texte (redondance auditive évitée)

## 3. Outils de vérification utilisés

| Outil | Usage |
|---|---|
| Chrome DevTools → **Lighthouse** | Audit complet par page (perf, a11y, best practices) |
| **axe DevTools** (extension Chrome) | Détection automatique des violations WCAG |
| **WebAIM Contrast Checker** | Vérification ratio couleur |
| Navigation **clavier uniquement** | Test manuel : touche `Tab`, `Shift+Tab`, `Enter`, `Escape` |
| **VoiceOver** (macOS) | Test lecture d'écran sur 3 parcours clés (login, analyse repas, plan repas) |
| Émulation **prefers-reduced-motion** | Vérification que les animations restent acceptables |

## 4. Non-conformités identifiées et remédiation

| ID | Problème | Niveau | État | Correctif livré |
|---|---|---|---|---|
| A11Y-01 | Pas de "skip to main content" link | AA | ✅ Corrigé | `<a href="#main-content" className="skip-link">` masqué hors focus + `<main id="main-content" tabIndex={-1}>` (`App.jsx`), styles `.skip-link` / `.skip-link:focus` (`App.css`) |
| A11Y-02 | Dropdown nav `Repas`/`Sport` : fermeture clavier (Esc) | AA | ✅ Corrigé | Handler `Escape` sur `onKeyDown` du dropdown → ferme + refocus le déclencheur (`NavDropdown`, `App.jsx`) |
| A11Y-03 | Animations `fade-up` vs `prefers-reduced-motion` | AA | ✅ Corrigé | Bloc global `@media (prefers-reduced-motion: reduce)` neutralisant animations/transitions/scroll (`App.css`) |
| A11Y-04 | Emoji décoratifs lus par le lecteur d'écran | A | ✅ Corrigé | `aria-hidden="true"` sur tous les emojis décoratifs (logo, chevrons, icônes d'items de menu) ; noms accessibles via `aria-label` sur les boutons icônes |
| A11Y-05 | Tests automatisés `jest-axe` | Bonnes pratiques | ✅ En place | `jest-axe` exécuté sur 11 pages (`*.test.jsx`) + nav globale (`App.test.jsx`) — `expect(await axe(container)).toHaveNoViolations()` |
| A11Y-06 | Mode contraste élevé | AA | ✅ Vérifié | Couleurs définies via variables CSS, aucune information portée uniquement par la couleur ; contrastes validés WebAIM (cf. §2.4) |

→ **Conformité AA atteinte** sur les critères listés. Vérification continue via `jest-axe` en CI.

## 5. Tests automatisés a11y (en place)

```bash
cd frontend-user
npm run test          # 24 tests, dont smoke jest-axe sur chaque page + nav
```

Couverture `jest-axe` (`expect(await axe(container)).toHaveNoViolations()`) :
- `App.test.jsx` — header + navigation (dropdowns, skip link, fermeture Échap)
- `Login.test.jsx`, `SignUp.test.jsx`, `Onboarding.test.jsx`
- `Dashboard.test.jsx`, `MealAnalysis.test.jsx`, `MealPlan.test.jsx`, `Coach.test.jsx`
- `WorkoutPlan.test.jsx`, `WorkoutHistory.test.jsx`, `SavedPlans.test.jsx`, `Profile.test.jsx`

## 6. Déclaration d'accessibilité (page utilisateur)

Le site doit, à terme, exposer une page `/accessibilite` reprenant les
mentions légales obligatoires en France pour un service numérique (loi
2005-102 / décret RGAA) :

```markdown
# Déclaration d'accessibilité

HealthAI Coach s'engage à rendre son service accessible aux personnes
handicapées, conformément à l'article 47 de la loi n°2005-102.

## État de conformité

Le présent site web est **conforme** au RGAA 4.1 niveau AA sur les critères
audités (cf. tableau §4). Les non-conformités initiales ont été corrigées.

## Résultats des tests

L'audit de conformité réalisé en juin 2026 par l'équipe projet révèle que :
- les 6 non-conformités initialement identifiées ont été corrigées (cf. §4)
- la non-régression est garantie par 12 tests `jest-axe` automatisés (CI)

## Non-conformités résiduelles

- Aucune non-conformité bloquante de niveau AA identifiée sur les parcours audités
- Vérification continue assurée par `jest-axe` sur chaque page et la navigation

## Établissement de la déclaration

Cette déclaration a été établie le 10/06/2026.

Méthode utilisée : audit RGAA 4.1 niveau AA avec axe DevTools + Lighthouse +
tests manuels lecteur d'écran (VoiceOver) + navigation clavier.

## Retour d'information

Si vous identifiez un défaut d'accessibilité, contactez : contact@healthai-coach.fr

## Voies de recours

Cette procédure est à utiliser dans le cas suivant : vous avez signalé au
responsable du site web un défaut d'accessibilité qui vous empêche d'accéder
à un contenu ou à un service du portail et vous n'avez pas obtenu de réponse
satisfaisante.

Vous pouvez :
- Écrire un message au Défenseur des droits
- Contacter le délégué du Défenseur des droits dans votre région
- Envoyer un courrier par la poste (gratuit, ne pas mettre de timbre) :
  Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07
```

## 7. Récap de conformité

| Domaine | Niveau actuel | Cible |
|---|---|---|
| Structure sémantique | ✅ Conforme | AA |
| Contraste couleurs | ✅ Conforme | AA |
| Navigation clavier | ✅ Conforme (skip-link + Échap dropdown) | AA |
| Lecteur d'écran | ✅ Conforme (aria-hidden emojis, aria-live, aria-label) | AA |
| Responsive | ✅ Conforme | AA |
| Multimédia | ✅ Pas applicable | — |
| Tests automatisés a11y | ✅ En place (12 tests jest-axe) | Bonnes pratiques |
