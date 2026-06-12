# 07 — Conduite du changement

> Section IV du brief — *"Documentation dédiée à la conduite du changement, explicitant les choix opérés pour assurer l'accessibilité de la solution et accompagner son adoption auprès de différents profils d'utilisateurs."*

## 1. Contexte du changement

HealthAI Coach passe d'une **application admin/superviseur ETL (MSPR1)** à
une **plateforme grand public B2C** ajoutant deux moteurs IA (nutrition,
activité physique). Le changement touche trois populations :

| Population | Nature du changement |
|---|---|
| **Utilisateurs finaux** (Millennials, GenZ) | Découverte d'un nouvel outil. Adhésion à l'IA et au tracking santé. |
| **Équipe technique interne** | Maintenir 2 frontends, 2 microservices, 3 bases. |
| **Partenaires B2B** (futurs : salles de sport, mutuelles) | Intégrer la plateforme en marque blanche. |

## 2. Stratégie d'accompagnement utilisateurs finaux

### 2.1 Réduction de la friction d'entrée

| Mesure | Implémentation |
|---|---|
| **Inscription en 30 secondes** | Email + mot de passe uniquement. Profil détaillé via Onboarding séparé après le 1er login. |
| **Onboarding progressif** | 1ʳᵉ visite → questions essentielles (objectif, niveau, biométrie). Le reste est demandé "juste à temps" sur les pages où c'est utile. |
| **Pré-remplissage intelligent** | Le profil renseigné à l'onboarding alimente automatiquement les forms de Plan repas, Plan entraînement, Coach. |
| **Plein-écran d'accueil pré-login** | Hero CTA "Commencer gratuitement" qui dirige droit au sign-up. |

### 2.2 Confiance dans l'IA

| Mesure | Implémentation |
|---|---|
| **Transparence des sources** | Chaque macro affichée indique sa source : `food_log`, `usda`, ou aucune. Badges colorés explicites. |
| **L'humain garde la main** | La détection photo Food-101 propose Top-5 prédictions avec **cases à cocher** : l'IA suggère, l'user décide. |
| **Justification des chiffres** | Les cibles caloriques affichées (`Coach`) sont calculées par formule médicale connue (Mifflin-St Jeor). |
| **Pas de promesse santé** | Le LLM est briefé pour ne **pas** diagnostiquer de pathologie et donner des conseils bienveillants, jamais culpabilisants. |
| **Mention "généré par IA"** | Le modèle utilisé (`gpt-oss-120b`) est nommé sur chaque conseil. |

### 2.3 Accessibilité comme levier d'adoption

L'accessibilité n'est pas qu'une obligation légale — c'est un **levier d'adoption** :
- Une app utilisable au clavier = utilisable rapidement par un power-user (Tab, Enter)
- Des contrastes corrects = lisibles en plein soleil sur smartphone
- Une structure sémantique = SEO et copies-collés vers d'autres outils
- Une nav explicite avec labels descriptifs = moins de confusion pour les débutants en nutrition

Voir [`06_ACCESSIBILITE.md`](06_ACCESSIBILITE.md) pour le détail.

### 2.4 Différents profils — différents besoins

| Profil utilisateur | Besoin dominant | Réponse dans l'app |
|---|---|---|
| Débutant en nutrition | Conseils simples, pas de jargon | Suggestions règle-based avec priority + conseil LLM en français accessible |
| Sportif intermédiaire | Plans cohérents, progressifs | Plan d'entraînement multi-critères avec progression adaptative |
| Personne avec restriction (vegan, allergies) | Filtrage strict | Champs allergies/restrictions du profil propagés automatiquement aux plans repas/entraînement |
| Power-user data-driven | Métriques précises | Dashboard avec barres de progression et chiffres exacts |
| Utilisateur en surcharge cognitive (pas le temps) | Décision rapide | "Que veux-tu faire ?" → 4 actions visuelles sur le Dashboard |

## 3. Stratégie d'accompagnement équipe technique

### 3.1 Documentation du code

- **README** racine avec démarrage en 3 commandes
- **CLAUDE.md** : guide pour LLM ou nouveau dev sur les conventions du projet
- **README_SOUTENANCE.md** : narrative pour la défense
- **docs/MSPR2_LIVRABLES/** : ce dossier (architecture, choix techno, modèle de données, API, métriques, a11y)
- **OpenAPI auto-généré** pour les 2 APIs (toujours à jour)
- **Comments dans le code** : seulement quand le pourquoi n'est pas évident (CLAUDE.md le précise)

### 3.2 Cohabitation MSPR1 / MSPR2

Le code MSPR1 est **conservé intact** :
- `frontend/` reste l'app admin/superviseur
- `BDD.sql` reste la source de vérité pour les tables ETL
- Les modèles Django ETL restent `managed = False`
- Les nouveaux modèles MSPR2 (`UserProfile`, `MealEntry`, `WorkoutSession`) ne touchent pas l'ETL

→ Un dev qui revient sur la MSPR1 ne casse rien, et inversement.

### 3.3 Modularité pour la suite

| Évolution future | Impact code |
|---|---|
| Remplacer Food-101 par un meilleur modèle vision | 1 ligne dans `get_classifier()` |
| Changer de LLM (passer à GPT-4, Claude...) | 1 variable d'env `OPENROUTER_MODEL` |
| Ajouter une nouvelle API IA (ex. analyse hydratation) | Endpoint FastAPI séparé + 1 proxy Django |
| Séparer le moteur d'activité physique en service dédié | Extraction de `/workout-*` vers nouveau microservice `reco-engine` |
| App mobile React Native | Réutilise l'API JWT Django sans modification backend |

## 4. Stratégie d'accompagnement partenaires B2B (futur)

### 4.1 Marque blanche

- Le frontend est entièrement **CSS variables-driven** (`--color-primary`, fonts, radius...) : changer la charte d'un client B2B = modifier les vars dans une feuille de style override
- Les emails de notification (à venir) pourraient être templatables par client
- L'API JWT permet d'isoler les utilisateurs par client (multi-tenant à terme)

### 4.2 SLA et monitoring

À mettre en place pour passer en production B2B :
- Sentry (suivi erreurs frontend + backend)
- Prometheus / Grafana sur les services FastAPI + Django (latence p50/p95, taux d'erreur)
- Statuspage publique pour les partenaires
- Healthcheck `/health` déjà en place côté nutrition-api (à généraliser sur Django)

### 4.3 Documentation API pour intégrateurs

L'**OpenAPI spec auto-générée** (`/api/schema/`) est **directement consommable**
par des outils comme Postman, Insomnia, ou pour générer des SDK clients
(`openapi-generator`).

## 5. Plan de formation interne

### 5.1 Pour un nouveau dev de l'équipe

1. **Jour 1** — Lecture `README.md` + `CLAUDE.md` + `docs/MSPR2_LIVRABLES/01_ARCHITECTURE.md`
2. **Jour 1** — `./run.sh` → app qui tourne en local
3. **Jour 2** — Parcours utilisateur complet (inscription → analyse → plan)
4. **Jour 2** — Lecture `02_CHOIX_TECHNIQUES.md` + `03_MODELE_DONNEES.md`
5. **Jour 3** — Premier ticket : modifier un endpoint (review obligatoire avant merge)

### 5.2 Pour la maintenance opérationnelle

- **Logs** : `logs/backend.log` (Django) + `docker logs nutrition-api`
- **Erreurs LLM** : OpenRouter dashboard pour quota et latence
- **Backup BDD** : `pg_dump` quotidien + `mongodump` quotidien (à scheduler post-MSPR2)

## 6. Risques identifiés et mitigation

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Modèle Food-101 défaillant sur plats peu cadrés | Moyenne | Moyen | Top-5 + checkboxes user + fallback USDA texte |
| OpenRouter free tier épuisé | Basse | Élevé | Code prévoit déjà un fallback `OPENROUTER_MODEL` env var (swap vers payant) |
| Charge soudaine sur nutrition-api | Basse | Moyen | Rate-limit Django en amont + microservice scalable horizontalement |
| Rejet utilisateur du tracking santé | Moyenne | Élevé | Onboarding non-bloquant : pas obligé de tout renseigner. Pas de partage avec tiers (RGPD by default). |
| RGPD / consentement | Moyenne | Élevé (légal) | Page mentions légales + bouton "Exporter mes données" + "Supprimer mon compte" à implémenter post-MSPR2 |
| Désinscription en cascade (Postgres + Mongo) | Basse | Faible | Job nightly de cleanup MongoDB pour les user_id orphelins |

## 7. Indicateurs de succès post-déploiement (à suivre)

- Taux d'inscription complétée (Sign-up → Onboarding terminé)
- Taux de rétention J+7, J+30
- Nombre d'analyses photo / user / semaine
- Taux d'utilisation des plans IA générés (% sauvegardés)
- % de séances marquées comme effectuées vs proposées dans le plan
- NPS (Net Promoter Score) trimestriel
- Erreurs 5xx et latence p95 sur endpoints IA
