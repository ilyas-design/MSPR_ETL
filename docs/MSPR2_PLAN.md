# MSPR2 — HealthAI Coach : plan de développement

## Contexte

La **MSPR1** (ETL + Django REST + frontend admin + Airflow) est livrée. Elle a produit une **application admin/superviseur** qui consulte les données ETL et permet d'approuver des modifications.

La **MSPR2** (TPRE502, bloc E6.2) impose d'ajouter une **couche IA** par-dessus, et — décision équipe — de livrer en parallèle une **nouvelle application web destinée aux utilisateurs finaux** (Millennials, Gen Z), distincte de l'app admin existante.

**3 livrables techniques majeurs** (brief) :
1. Une **API IA nutrition** (vision sur photos de repas → macros + plans de repas).
2. Un **moteur de recommandation d'activité physique multi-critères**, **microservice séparé connecté à NoSQL**.
3. Un **frontend moderne, responsive et accessible WCAG/RGAA niveau AA**, avec cache/rate-limit/fallback.

**Livrables documentaires** : OpenAPI à jour, benchmark frontend justifié, maquettes responsive, modèle relationnel mis à jour, tests automatisés + rapport coverage, doc conduite du changement, support oral.

**Équipe** : 4 apprenants, répartition libre selon envies/compétences. Plan découpé en **4 chantiers parallélisables**.

## Décisions structurantes actées

- **Deux frontends distincts** :
  - `frontend/` (existant) → app **admin/superviseur** (gestion ETL, KPIs, approbation `PendingChange`). Pas refondue.
  - `frontend-user/` (**nouveau**) → app **utilisateur final** : inscription, login, journal aliment, soumission photo IA, recommandations d'activité, dashboards personnels.
- **Architecture hybride** : Django reste le seul point d'entrée API (JWT, permissions, cache, fallback déjà en place). Il **proxy** vers deux microservices FastAPI internes (`nutrition-api`, `reco-engine`). On coche la case "microservice" du brief sans réécrire la couche auth/CORS/Swagger.
- **Provider IA vision** : Hugging Face Transformers en primary (ex. `nateraw/food`), avec fallback configurable (exigence "mécanismes de fallback").
- **NoSQL** : MongoDB en container Docker, dédié au `reco-engine`. SQLite reste la BDD métier des données ETL.
- **Microservices IA** : FastAPI + Pydantic (async natif pour appels HF, OpenAPI auto-généré).
- **Stack `frontend-user/`** : Vite + React (cohérent équipe, Chart.js déjà connu) + React Router. **Pas de Next.js** (SSR pas critique pour une app école, lourdeur évitée).

## Architecture cible

```
   ┌───────────────────────┐         ┌────────────────────────────┐
   │ frontend/ (admin)     │         │ frontend-user/ (nouvelle)  │
   │ - KPIs, ETL, approval │         │ - signup / login           │
   │ - existant MSPR1      │         │ - journal aliment          │
   │ Audience : superviseur│         │ - photo repas → IA         │
   │                       │         │ - reco activité            │
   │                       │         │ - dashboard perso          │
   └──────────┬────────────┘         └────────────┬───────────────┘
              │ JWT                              │ JWT
              └───────────────┬──────────────────┘
                              │
            ┌─────────────────▼─────────────────┐
            │  Django API (passerelle unique)   │
            │  - JWT / register / profile       │
            │  - permissions par rôle           │
            │  - cache + rate-limit + fallback  │
            └───┬───────────────────────────┬───┘
                │                           │
    ┌───────────▼────┐              ┌───────▼──────────┐
    │ nutrition-api  │              │ reco-engine      │
    │ FastAPI + HF   │              │ FastAPI + Mongo  │
    └────────┬───────┘              └────────┬─────────┘
             │                               │
             ▼                               ▼
     SQLite (lecture          MongoDB (catalog
     données ETL / user)      exercices, plans)
```

## Comment fonctionne le flux "app web utilisateur + IA"

À ta question "comment on a une nouvelle app web avec connexion des utilisateurs et utilisation de l'IA" — voici concrètement ce qui se passe :

### 1. Inscription et connexion (auth)

- L'app `frontend-user/` affiche un formulaire d'inscription → POST `/api/auth/register/` (à créer côté Django).
- Le backend crée un compte Django `User` + un `UserProfile` (objectif santé, allergies, équipement dispo, blessures, niveau).
- Login → POST `/api/auth/token/` (existe déjà, JWT SimpleJWT). Le frontend stocke `access` + `refresh` en `localStorage`.
- Toutes les requêtes suivantes envoient `Authorization: Bearer <access>`.

### 2. Utilisation de l'IA (analyse photo repas)

```
[User]              [frontend-user]            [Django]              [nutrition-api]      [HuggingFace]
  │                       │                       │                        │                    │
  │  upload photo         │                       │                        │                    │
  ├──────────────────────►│                       │                        │                    │
  │                       │ POST /api/me/meals/analyze (multipart, JWT)    │                    │
  │                       ├──────────────────────►│                        │                    │
  │                       │                       │ vérifie JWT + rate-limit                    │
  │                       │                       │ check cache (hash image)                    │
  │                       │                       │ POST :8001/analyze     │                    │
  │                       │                       ├───────────────────────►│                    │
  │                       │                       │                        │ inférence HF       │
  │                       │                       │                        ├───────────────────►│
  │                       │                       │                        │ labels + scores    │
  │                       │                       │                        │◄───────────────────┤
  │                       │                       │  {foods:[...], macros} │                    │
  │                       │                       │◄───────────────────────┤                    │
  │                       │                       │ persist MealEntry (lien user)               │
  │                       │  réponse JSON         │                        │                    │
  │                       │◄──────────────────────┤                        │                    │
  │  voit macros + reco   │                       │                        │                    │
  │◄──────────────────────┤                       │                        │                    │
```

**Points clés** :
- L'utilisateur ne parle JAMAIS directement aux microservices IA. Django est le seul interlocuteur (sécurité, audit, rate limit, JWT).
- Si `nutrition-api` est down → Django renvoie un fallback propre (503 + dernière analyse en cache, ou message UX clair). L'app user gère l'erreur sans crasher (exigence brief).

### 3. Recommandation activité (multi-critères)

Même principe : `frontend-user` → `POST /api/me/activity-reco` → Django → `reco-engine` (Mongo) → résultats triés/filtrés.

### 4. Modèle de données user-facing à ajouter

Nouvelles tables Django **managées** (donc gérées par migrations, pas par l'ETL — séparation claire vs tables ETL `managed=False`) :

- `UserProfile` : OneToOne avec `User`, contient `goal` (perte poids / muscle / endurance / santé), `allergies`, `dietary_restrictions`, `equipment_available[]`, `injuries[]`, `experience_level`, `daily_calorie_target`.
- `MealEntry` : FK `User`, `image_url`, `analyzed_at`, `detected_foods` (JSONField), `total_calories`, `macros` (JSONField), `meal_type`.
- `WorkoutPlan` : FK `User`, `generated_at`, `goal`, `exercises` (JSONField), `feedback` (pour rotation/adaptation).

**Important** : un `User` Django **n'est pas un `Patient` ETL**. Les tables ETL sont analytiques (cohorte de patients fictifs pour démo). Les tables user sont les vraies données utilisateur. C'est une décision propre — on l'écrit clairement dans le rapport.

---

## Chantier 1 — IA Nutrition (vision + meal plans)

**Périmètre** : microservice `nutrition-api` (FastAPI) + endpoints Django + intégration HF.

**Fichiers à créer / modifier** :
- Nouveau dossier `nutrition_api/` à la racine :
  - `main.py` (FastAPI app), `models.py` (Pydantic), `vision.py` (HF inference), `meal_planner.py` (génération plans)
  - `Dockerfile`, `requirements.txt`
- `docker-compose.yml` : service `nutrition-api` (port 8001, volume cache HF).
- `backend/api/views.py` : `MealAnalysisViewSet` avec `analyze` (POST multipart) et `meal_plan` (POST JSON). Permission `IsAuthenticated`, scopé `request.user`.
- `backend/api/models.py` : ajouter `MealEntry` (managed).
- `backend/api/urls.py` : router `/api/me/meals/`.
- `backend/api/serializers.py` : `MealEntrySerializer`.
- `backend/config/settings.py` : `NUTRITION_API_URL`.

**Points techniques** :
- Modèle HF : `nateraw/food` (classifieur 101 classes) ou équivalent ; lazy load + cache disque.
- Calcul macros : table de correspondance `food_label → kcal/protéines/glucides/lipides` (constituée depuis `daily_food_nutrition.csv` déjà dans le repo).
- Meal plan : algo de scoring simple sur le dataset existant en v1 ; option LLM HF en v2.
- Côté Django : `requests.post(NUTRITION_API_URL + "/analyze", timeout=10)` + `try/except` → fallback (503 + suggestion cached).
- **Cache** : `django.core.cache` sur hash de l'image, TTL 1h.
- **Rate limit** : `django-ratelimit` (ex. 10 photos/min/user).

**Métriques IA à produire (livrable doc)** : précision, rappel, F1-score sur un mini set d'évaluation (50-100 photos étiquetées).

## Chantier 2 — Reco activité physique (microservice + NoSQL)

**Périmètre** : microservice `reco-engine` (FastAPI + MongoDB) + endpoints Django + ingestion catalogue.

**Fichiers à créer / modifier** :
- Nouveau dossier `reco_engine/` à la racine :
  - `main.py`, `models.py` (Pydantic), `scoring.py` (algo multi-critères), `mongo.py` (motor/pymongo)
  - `seed.py` : charge `exercises.json` + agrégats de `gym_members_exercise.csv` dans Mongo
  - `Dockerfile`, `requirements.txt`
- `docker-compose.yml` : `mongo` (image `mongo:7`, volume `mongo_data`) + `reco-engine` (port 8002, `depends_on: mongo`).
- `backend/api/views.py` : `WorkoutRecoViewSet` avec action `recommend` (POST JSON, scopée user).
- `backend/api/models.py` : ajouter `WorkoutPlan` (managed) + étendre `UserProfile` avec `equipment_available`, `injuries`, `preferred_activities`.
- `backend/api/urls.py` : router `/api/me/workouts/`.

**Points techniques** :
- Collections Mongo : `exercises` (bodyPart, target, equipment, level, met, calories_per_hour), `programs` (plans générés/cachés).
- Scoring : filtrage hard (équipement, blessures, niveau) puis ranking par adéquation à l'objectif.
- **Progression adaptative** : `WorkoutPlan.feedback` ajuste la difficulté du prochain plan (MVP = règle simple, doc évolution).
- **Rotation exercices** : tirage pondéré pour éviter répétition.
- Seeding : `python reco_engine/seed.py` au démarrage container (job init dans compose).

**Modèle NoSQL** à documenter dans le livrable "modèle relationnel mis à jour".

## Chantier 3 — Nouvelle app web utilisateur `frontend-user/`

**Périmètre** : créer l'app de A à Z, accessible WCAG/RGAA AA, avec tests.

**Structure à créer** :
```
frontend-user/
├── package.json          # Vite + React + React Router + Axios + Chart.js
├── vite.config.js        # proxy /api → backend:8000, test config
├── eslint.config.js      # plugin-jsx-a11y en error
├── nginx.conf            # build prod
├── Dockerfile
├── src/
│   ├── main.jsx
│   ├── App.jsx           # router + skip-to-content + focus management
│   ├── pages/
│   │   ├── Landing.jsx       # page publique, CTA inscription
│   │   ├── SignUp.jsx        # formulaire inscription accessible
│   │   ├── Login.jsx
│   │   ├── Onboarding.jsx    # capture profil : goal, allergies, équipement…
│   │   ├── Dashboard.jsx     # tableau de bord perso (chart progression)
│   │   ├── MealAnalysis.jsx  # upload photo → IA → macros
│   │   ├── MealHistory.jsx   # historique repas (paginé)
│   │   ├── WorkoutReco.jsx   # formulaire critères → reco
│   │   ├── Profile.jsx       # éditer son UserProfile
│   │   └── AccessibilityDeclaration.jsx
│   ├── components/
│   │   ├── FileUpload.jsx        # drag&drop accessible (label, aria, keyboard)
│   │   ├── AuthGate.jsx          # redirige vers /login si pas de token
│   │   ├── LoadingState.jsx
│   │   ├── ErrorFallback.jsx     # affiche fallback IA propre
│   │   ├── RecoCard.jsx
│   │   ├── MacroChart.jsx        # Chart.js
│   │   └── Header.jsx, Footer.jsx
│   ├── services/
│   │   ├── api.js                # Axios + JWT + refresh + retry (réutilise pattern frontend/)
│   │   └── aiClient.js           # analyzeMeal, getWorkoutReco, generateMealPlan
│   ├── utils/
│   │   ├── cache.js              # sessionStorage cache résultats IA
│   │   └── focusManagement.js
│   └── setupTests.js
└── tests/                # Vitest + RTL + jest-axe
```

**Endpoints backend nécessaires** (chantier 4 ou shared) :
- `POST /api/auth/register/` (nouveau)
- `GET/PATCH /api/me/profile/` (nouveau, scopé user)
- `GET/POST /api/me/meals/` + `POST /api/me/meals/analyze/`
- `POST /api/me/workouts/recommend/`
- `GET /api/me/stats/` (KPIs perso)

**Accessibilité (WCAG/RGAA AA)** :
- `eslint-plugin-jsx-a11y` en `error` dans la config ESLint.
- Audit `jest-axe` automatique sur chaque page (cible 0 violation AA).
- Lighthouse a11y ≥ 95 par page.
- Skip-to-content, focus visible, `aria-live` pour résultats IA, contrastes AA, labels explicites, navigation clavier complète.
- `AccessibilityDeclaration.jsx` rempli avec le rapport d'audit final (livrable RGAA).

**Tests** : Vitest + React Testing Library + jest-axe + MSW (mock backend pour développement parallèle).
- `npm i -D vitest @testing-library/react @testing-library/jest-dom jest-axe @vitest/coverage-v8 msw`
- Coverage cible ≥ 70% sur pages IA et auth.

**Maquettes Figma** à produire **avant le code** pour les 6 pages clés (Landing, SignUp, Login, Dashboard, MealAnalysis, WorkoutReco) — livrable explicitement demandé par le brief.

## Chantier 4 — Backend user-facing, infra, tests, docs, démo

**Périmètre** : tout le reste, à distribuer en parallèle.

### 4a. Backend user-facing (à faire en parallèle de chantiers 1 et 2)
- `backend/api/views.py` : `RegisterView`, `UserProfileViewSet`, `PersonalStatsView`.
- `backend/api/models.py` : `UserProfile` (managed), migrations Django.
- `backend/api/serializers.py` : sérializers pour les nouveaux modèles.
- `backend/api/permissions.py` : permission `IsOwner` pour scope `request.user` partout dans `/api/me/`.
- `backend/api/urls.py` : router `/api/me/`.
- Tests `backend/api/tests.py` : couverture des nouveaux endpoints (register, scope user, fallback IA mocké).

### 4b. Infra Docker & CI
- Étendre `docker-compose.yml` : `nutrition-api`, `reco-engine`, `mongo`, `frontend-user` (port 81 ou même réseau).
- `.env.example` documenté (clés HF, MongoDB URI, secrets).
- GitHub Actions (`.github/workflows/ci.yml`) : lint Python + JS (les deux frontends), tests backend + ETL + frontends, coverage report.

### 4c. Tests & coverage
- Tests microservices : `nutrition_api/tests/`, `reco_engine/tests/` (pytest async).
- Mettre à jour `run_coverage.sh` pour inclure les 2 microservices + les 2 frontends.
- **`.coveragerc` actuel impose 100%** — abaisser à un seuil réaliste (70%) avant d'ajouter du code, sinon CI rouge.

### 4d. Documentation
- **OpenAPI** : auto-généré par FastAPI sur `nutrition-api` et `reco-engine` ; drf-spectacular met à jour Django Swagger automatiquement.
- **Benchmark frontend** (livrable obligatoire) : tableau React vs Vue vs Angular justifiant React (écosystème a11y, équipe formée, Chart.js déjà en place).
- **Modèle de données mis à jour** : diagramme ER Mermaid (tables ETL + nouvelles tables user-facing + collections Mongo).
- **Conduite du changement** (livrable obligatoire) : doc onboarding utilisateur, choix a11y, accompagnement adoption (profils : utilisateur final, product manager B2B, partenaire).

### 4e. Démo & soutenance
- Scénario end-to-end : inscription user → onboarding profil → photo repas → analyse macros → reco activité associée → dashboard avec progression.
- Comptes de seed représentatifs.
- Support oral (20 min) : architecture, démo, métriques IA, accessibilité.

## Dépendances entre chantiers

```
Chantier 4a (backend user-facing) ──→ débloque chantiers 1, 2, 3
Chantier 1 (nutrition-ai)         ──┐
Chantier 2 (reco-engine)          ──┼──→ Chantier 3 (frontend-user) ──→ Chantier 4e (démo)
Chantier 4b (Docker/CI)           ──┘
```

- **Contrats OpenAPI rédigés en premier** → chantiers 1, 2, 3 peuvent avancer en parallèle contre des mocks (MSW côté frontend).
- Chantier 3 démarre sur les maquettes Figma + l'auth (pages SignUp/Login fonctionnelles) **sans attendre** l'IA.
- Chantier 4b (Docker) doit être prêt en milieu de parcours pour intégration end-to-end.

## Jalons proposés

| Jalon | Contenu |
|---|---|
| **J+3j** | Contrats OpenAPI figés. Maquettes Figma validées. Squelette `frontend-user/` (Vite + routing). Backend : `UserProfile` + endpoint register + login. |
| **J+1sem** | MVP `nutrition-api` (endpoint `/analyze` fonctionnel sur HF). `reco-engine` seedé en Mongo. `frontend-user` : auth fonctionnelle + pages mockées (MSW). |
| **J+2sem** | Intégration end-to-end via Docker Compose. Audit a11y passé (axe + Lighthouse). Tests à 70% coverage. |
| **J+3sem** | Polish démo, support oral, doc conduite du changement, métriques IA mesurées. |

## Répartition entre les 4 membres

Affinités proposées (à choisir librement) :

| Membre | Chantier | Livrables produits |
|---|---|---|
| **"Data scientist"** | 1 — IA Nutrition | nutrition-api, métriques précision/rappel/F1, doc modèles HF |
| **"Architecte data"** | 2 — Reco activité | reco-engine, modèle NoSQL, algo scoring, seed Mongo |
| **"Frontend / designer"** | 3 — `frontend-user/` | App user complète, maquettes Figma, audit a11y, tests Vitest/axe |
| **"Backend / ops / qualité"** | 4 — Backend user + infra + docs | Endpoints `/api/me/`, Docker, CI, OpenAPI consolidé, conduite du changement, démo |

Charge équilibrée ; chaque chantier produit une partie identifiable des livrables du brief.

## Vérification (recette finale)

End-to-end manuel :
1. `docker compose up --build` → tous services up (backend, frontend admin, frontend-user, nutrition-api, reco-engine, mongo, airflow…), healthchecks verts.
2. `frontend-user` : inscription → onboarding → upload photo repas → réponse macros visible.
3. Formulaire activité → reco affichée avec exercices issus de Mongo.
4. `frontend` admin : inchangé, fonctionne comme avant.
5. `curl /api/schema/` (Django) + `curl :8001/openapi.json` + `curl :8002/openapi.json` → tous valides.
6. Lighthouse a11y `frontend-user` ≥ 95, audit axe : 0 violation AA.
7. `./run_coverage.sh --html` → coverage backend + ETL ≥ 70%.
8. `cd frontend-user && npm run test:coverage` → coverage ≥ 70%.
9. Couper `nutrition-api` → `frontend-user` affiche le fallback proprement.

## Livrables MSPR à cocher avant soutenance

- [ ] Doc détaillée (algos, APIs, ergonomie, accessibilité, métriques IA)
- [ ] Benchmark frontend justifié (React vs Vue vs Angular)
- [ ] Maquettes responsive (Figma) des pages `frontend-user/`
- [ ] App frontend (`frontend-user/`) livrée
- [ ] API IA (`nutrition-api`)
- [ ] Doc OpenAPI à jour (3 surfaces : Django + 2 micro-services)
- [ ] Moteur de reco (`reco-engine` + MongoDB)
- [ ] Modèle de données mis à jour (ER + Mongo)
- [ ] Tests automatisés + rapport coverage
- [ ] Doc conduite du changement
- [ ] Support de présentation orale
