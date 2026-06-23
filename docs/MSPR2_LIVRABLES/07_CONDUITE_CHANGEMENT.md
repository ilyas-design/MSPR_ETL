# 07 — Conduite du changement

HealthAI Coach remplace un suivi santé "papier" ou multi-outils par un coach
unique alimenté par IA, qui centralise nutrition et activité physique. Ce
document décrit comment l'adoption est accompagnée selon les profils
d'utilisateurs et comment l'équipe la mesure.

## Enjeu

La cible est hétérogène : utilisateurs pressés (Millennials/GenZ, urbains
actifs), débutants en nutrition/sport, profils avec objectif précis (perte
de poids, prise de masse, endurance...). Le risque principal est le
décrochage précoce : un utilisateur qui ne perçoit pas de valeur dès
l'onboarding, ou qui rencontre des frictions (accessibilité, erreurs IA peu
claires), abandonne.

La conduite du changement vise donc à :

1. réduire le temps avant le premier conseil IA utile,
2. rassurer sur la fiabilité des recommandations (transparence, fallback),
3. mesurer l'adoption pour ajuster le produit.

## Profils et accompagnement

| Profil | Besoin | Réponse produit |
|---|---|---|
| Millennials/GenZ, urbains actifs | rapidité, peu de friction, mobile-first | analyse photo en un clic (`/meal-analysis`), dashboard Chart.js synthétique, SPA légère |
| Débutants nutrition/sport | pédagogie, pas de jugement | conseils du coach en tutoiement bienveillant, sans jargon ni diagnostic médical (prompt système : "tu ne moralises pas, tu ne diagnostiques aucune pathologie") |
| Objectif précis (perte de poids, prise de masse, endurance) | personnalisation forte | `UserProfile.goal` pilote le scoring des repas et des exercices, recalculé à chaque mise à jour du profil |
| Contraintes/blessures | sécurité | `UserProfile.injuries` exclut les exercices à risque côté `reco-engine` |
| Profils B2B / supervision | contrôle qualité des données | `frontend/` admin + workflow `PendingChange` |
| Freemium/premium | valeur claire avant engagement payant | fonctions cœur (analyse photo, plan repas par règles, recommandations d'exercices) en accès libre ; fonctions IA générative identifiées comme palier premium naturel, pas encore gatées techniquement |

## Onboarding

Flow dédié (`/onboarding`, protégé par `AuthGate`), juste après
l'inscription :

1. Inscription (email/mot de passe), sans questionnaire long.
2. Capture du profil santé/objectifs (`UserProfile` : objectif, niveau,
   restrictions alimentaires, allergies, équipement, blessures, données
   morphologiques).
3. Bascule `onboarded = True` → redirection vers `/dashboard`.
4. Première valeur immédiate : cible calorique du jour
   (`/api/me/recommendations/today/`) et suggestion d'essayer
   `/meal-analysis`.

Ce flow court (un seul écran de profil) répond au besoin de rapidité tout en
donnant à `reco-engine` et `nutrition-api` les critères nécessaires dès la
première recommandation.

## Accompagnement à l'usage

- **Coach conversationnel** (`/coach`, `POST /api/me/coach-advice/`) : point
  de contact permanent en langage naturel, sans formation nécessaire.
- **Historique et progression** (`/historique`, `/workout-history`,
  `/dashboard`) : graphiques Chart.js des tendances (calories, séances),
  renforce la perception de progrès.
- **Plans sauvegardés** (`/saved-plans`) : permet de retrouver une
  recommandation passée sans la régénérer.
- **Messages d'erreur** : en cas de panne d'un provider IA, l'API renvoie un
  code explicite (502/503, voir [04_API_REFERENCE.md](04_API_REFERENCE.md)) ;
  le frontend doit afficher un message compréhensible plutôt qu'un échec
  silencieux.

## Accessibilité

Un produit santé doit rester utilisable par des personnes en situation de
handicap, des utilisateurs moins à l'aise avec le numérique, ou en
navigation mobile contrainte. Voir [06_ACCESSIBILITE.md](06_ACCESSIBILITE.md) :
navigation clavier, lecteurs d'écran, `lang="fr"`. C'est traité comme un
prérequis d'adoption, pas une option.

## Côté supervision (B2B / back-office)

Pour `frontend/` (admin, conservé de MSPR1) :

- Le workflow `PendingChange` change la pratique : les utilisateurs
  non-superviseurs ne modifient plus directement les données ETL, ils
  soumettent une proposition que le superviseur approuve ou rejette via
  `/api/pending-changes/`.
- Les KPIs `/api/engagement/`, `/api/conversion/`, `/api/satisfaction/` et
  `/api/data-quality/` donnent aux superviseurs une vue objective de
  l'adoption (voir ci-dessous).

## Mesure de l'adoption

| Endpoint | Usage |
|---|---|
| `GET /api/engagement/` | fréquence d'utilisation (analyses repas, séances loggées) → détecte le décrochage précoce |
| `GET /api/conversion/` | taux de complétion de l'onboarding → mesure la friction d'entrée |
| `GET /api/satisfaction/` | `difficulty_rating` des séances → détecte une charge perçue trop élevée |
| `GET /api/data-quality/` | qualité des données → fiabilité des recommandations dans le temps |

Boucle d'amélioration continue : identifier un point de friction (ex. faible
conversion sur l'onboarding) → ajuster le produit (ex. simplifier
`/onboarding`) → re-mesurer.

## Déploiement

- Docker Compose (`docker compose up --build`) permet une montée en charge
  progressive : `nutrition-api` et `reco-engine` sont des microservices
  indépendants, scalables sans redéployer le reste.
- Le pipeline ETL (Airflow, quotidien à 02:00 Europe/Paris) garde les données
  de référence (`food_log`, `exercise`) à jour sans intervention manuelle.

## Limites et perspectives

- Le palier freemium/premium évoqué au brief n'est pas encore implémenté
  techniquement (pas de gating de fonctionnalités côté API) — évolution
  prioritaire pour une future stratégie de monétisation.
- Pas de notification proactive (ex. "tu n'as pas loggé de repas depuis 2
  jours") — levier de réactivation à étudier.
- Pas de programme de formation formel pour les superviseurs côté
  `frontend/` — à formaliser pour un déploiement B2B réel.
