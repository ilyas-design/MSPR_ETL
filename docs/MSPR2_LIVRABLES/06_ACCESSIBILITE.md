# 06 — Accessibilité WCAG/RGAA AA

## Périmètre

Ce document couvre `frontend-user/` (application utilisateur final), la
cible principale du brief en matière d'accessibilité. `frontend/` (admin,
hérité de MSPR1) n'a pas reçu le même travail d'audit — voir les limites
plus bas.

Une déclaration d'accessibilité publique, sur le modèle
[accessibilite.numerique.gouv.fr](https://accessibilite.numerique.gouv.fr/),
est exposée dans l'application :

- Page : `/accessibilite`
- Source : [`frontend-user/src/pages/AccessibilityDeclaration.jsx`](../../frontend-user/src/pages/AccessibilityDeclaration.jsx)
- Référentiel : RGAA 4.1, niveau AA
- État déclaré : partiellement conforme (audit interne du 11 juin 2026)

## Mesures mises en œuvre

**Structure et navigation**

- `<html lang="fr">` dans `frontend-user/index.html`
- Lien d'évitement "Aller au contenu principal" en premier élément du DOM
- Landmarks ARIA dans `App.jsx` : `<header role="banner">`,
  `<nav aria-label="Navigation principale">`, `<main id="main-content" tabIndex={-1}>`
- Titres de section reliés par `aria-labelledby`

**Lint automatisé — `eslint-plugin-jsx-a11y`**

Configuré dans `frontend-user/eslint.config.js`, avec les règles critiques
passées en `error` (le lint échoue si elles sont violées) :
`alt-text`, `anchor-is-valid`, `aria-props`,
`label-has-associated-control`, `no-static-element-interactions`,
`click-events-have-key-events`, `interactive-supports-focus`,
`role-has-required-aria-props`.

**Tests automatisés — `jest-axe`**

`axe-core` est exécuté via `jest-axe` (`toHaveNoViolations`) dans les tests
Vitest des pages critiques : `Login.test.jsx`, `SignUp.test.jsx`,
`MealAnalysis.test.jsx`.

```bash
cd frontend-user
npm run test           # Vitest + assertions jest-axe
npm run test:coverage  # idem + couverture
```

**Graphiques Chart.js**

Les graphiques (Dashboard, Coach) sont accompagnés d'un résumé textuel et
d'un tableau de données équivalent (masqué visuellement, accessible aux
lecteurs d'écran).

## Périmètre testé (audit du 11 juin 2026)

| Page | Statut |
|---|---|
| `/login`, `/register` | auditées (axe + clavier) |
| `/dashboard` | auditée |
| `/meal-analysis` | auditée |
| `/coach` | auditée |
| `/workout-plan` | auditée |
| Navigation principale | auditée |
| `/onboarding`, `/profile`, `/historique`, `/saved-plans`, `/workout-history`, page d'accueil | non couvertes par l'audit automatisé récent |

## Non-conformités connues

Issues de la déclaration `/accessibilite` (source de vérité, à maintenir à
jour) :

| Écart | Critère RGAA | Détail |
|---|---|---|
| Contraste | 3.2 | certains textes secondaires potentiellement sous 4,5:1 sur fonds clairs |
| Animations | 13.8 | transitions CSS pas toutes désactivées sous `prefers-reduced-motion: reduce` |
| Graphiques Chart.js | 1.1 / 1.3 | résumé textuel et tableau présents, mais interaction canvas limitée au pointeur |
| Emojis décoratifs | — | pas systématiquement `aria-hidden` ou doublés d'un libellé |
| Messages d'erreur réseau | 11.10 | parfois génériques ("une erreur est survenue") |
| Pages non auditées | — | MealPlan, SavedPlans, WorkoutHistory, Onboarding, Profile sans tests `jest-axe` |
| Upload de fichiers | — | `input type="file"` natif masqué, label associé (clavier OK), expérience variable selon navigateur |

## Outils et méthodologie

- axe-core via `jest-axe` (tests Vitest automatisés)
- ESLint `jsx-a11y` en `error`, bloquant
- Tests clavier manuels (Tab, Entrée, Échap)
- Lighthouse accessibilité, ponctuel

`frontend/` (admin) n'a que `eslint-plugin-jsx-a11y` dans ses
devDependencies, pas `jest-axe`/`@testing-library` — l'app reste utilisable
par les superviseurs mais n'a pas reçu le même niveau d'audit que
`frontend-user/`.

## Conformité légale et contact

- Engagement au titre de l'article 47 de la loi n° 2005-102 du 11 février 2005
- Contact : `accessibilite@healthai-coach.example`, réponse en 30 jours ouvrés
- La déclaration ne revendique pas une conformité AA complète — c'est un
  engagement de transparence cohérent avec le statut "partiellement
  conforme".

## Plan d'amélioration

1. Étendre `jest-axe` aux pages non couvertes (Onboarding, Profile,
   MealPlan, SavedPlans, WorkoutHistory) — voir T-220/T-247 dans
   `docs/MSPR2_BACKLOG.md`.
2. Auditer les contrastes (textes secondaires, pastilles dashboard) et
   ajuster le thème pour atteindre 4,5:1.
3. Ajouter une règle `prefers-reduced-motion` globale.
4. Étendre `eslint-plugin-jsx-a11y` + `jest-axe` à `frontend/` (admin) pour
   homogénéiser le niveau d'accessibilité entre les deux frontends.
5. Mettre à jour la date d'audit et le périmètre testé dans
   `AccessibilityDeclaration.jsx` à chaque nouvelle campagne.
