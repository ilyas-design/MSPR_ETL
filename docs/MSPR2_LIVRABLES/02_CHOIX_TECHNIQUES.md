# 02 — Choix techniques et benchmark frontend

> Section IV du brief — *"Benchmark des solutions frontend, accompagné d'une justification claire des choix technologiques retenus."*

## 1. Benchmark frontend

### 1.1 Critères d'évaluation

| Critère | Pondération | Pourquoi |
|---|---|---|
| Maîtrise équipe | ★★★ | Projet école, 4 apprenants, montée en compétence limitée |
| Écosystème mature | ★★★ | Composants, libs, ressources |
| Performance dev (DX) | ★★ | Vitesse d'itération |
| SSR / SEO | ★ | Pas critique (app authentifiée, pas indexée) |
| Bundle size | ★★ | App mobile-first, perf perçue |
| Accessibilité native | ★★ | Brief impose WCAG/RGAA AA |
| Stack cohérence MSPR1 | ★★★ | Frontend admin existant en React, mutualisation |

### 1.2 Comparatif

| Critère | **React + Vite** ✅ | Vue 3 + Vite | Angular | Next.js |
|---|---|---|---|---|
| Maîtrise équipe | Élevée (MSPR1) | Faible | Faible | Moyenne |
| Écosystème | Énorme | Grand | Grand | Moyen |
| Bundle size | ~145 ko (gzipped) | ~120 ko | ~210 ko | ~180 ko |
| Onboarding nouveau dev | Rapide (JSX très lisible) | Rapide | Lent (RxJS, decorators) | Moyen |
| SSR natif | ❌ (Vite SPA) | ❌ (Vite SPA) | ❌ (mode SPA classique) | ✅ |
| Routing | React Router (lib externe) | Vue Router (officiel) | Intégré | Intégré file-based |
| HMR (dev) | < 50 ms (Vite) | < 50 ms (Vite) | ~2 s | ~500 ms |
| State management | Hooks/Context natifs | Pinia | Services + RxJS | Hooks + actions serveur |

### 1.3 Décision

**Choix retenu : React + Vite + React Router** pour le `frontend-user/`.

**Justification** :
1. **Continuité MSPR1** — le `frontend/` admin est déjà en React. Mutualiser la stack évite la friction cognitive et réutilise les patterns (Axios, JWT, AuthGate).
2. **Bundle minimal** — Vite produit le plus petit bundle des stacks comparées, important pour Millennials/GenZ sur 4G.
3. **HMR ultra-rapide** — Vite < 50 ms vs Webpack 1-2 s. Critique pour itérer sur le design avec le coéquipier UI.
4. **Pas de SSR nécessaire** — l'app est 100% authentifiée derrière JWT, pas de besoin SEO. Next.js apporterait de la complexité (RSC, routing convention) sans bénéfice.
5. **Hooks natifs** — `useState`/`useEffect` couvrent 95% des besoins, pas besoin de Pinia/Vuex/NgRx.

## 2. Choix backend principal

### 2.1 Comparatif Django REST vs FastAPI vs Express

| Critère | **Django REST** ✅ | FastAPI | Express |
|---|---|---|---|
| Auth (JWT) | Intégrée (django-simple-jwt) | À implémenter (PyJWT) | À implémenter (passport) |
| ORM | Django ORM (mature) | SQLAlchemy ou Django ORM | Sequelize / Prisma |
| Migrations | makemigrations natif | Alembic externe | Sequelize-cli / Prisma migrate |
| Admin | Auto-généré | ❌ | ❌ |
| OpenAPI/Swagger | drf-spectacular | Auto-généré | swagger-jsdoc |
| Stack MSPR1 | Déjà en place | — | — |

### 2.2 Décision

**Django REST conservé** pour le backend principal car :
- Déjà déployé en MSPR1 (auth, permissions, JWT, ratelimit, cache : tout fonctionne)
- L'`UserProfile` et `MealEntry` sont des données transactionnelles **relationnelles** où Django ORM excelle
- Le réécrire en FastAPI aurait coûté 1 sprint sans valeur ajoutée

**FastAPI choisi** pour le microservice IA `nutrition-api` car :
- **Async natif** : appels concurrent à Hugging Face / OpenRouter sans bloquer
- **OpenAPI auto-généré** : `/docs` immédiat sans config (Swagger UI + ReDoc)
- **Pydantic** : validation forte des payloads IA (CoachAdviceRequest, MealPlanAIResponse, etc.)
- **Stack légère** : pas de couche ORM/admin/migrations inutile pour un microservice qui n'écrit jamais en BDD relationnelle

## 3. Choix IA / Vision

### 3.1 Vision par ordinateur

| Option | Coût | Précision | Latence | Décision |
|---|---|---|---|---|
| **Hugging Face `nateraw/food`** (Food-101) | Gratuit, exécution locale | ~84% top-1 sur Food-101 | ~300 ms CPU | ✅ Retenu |
| Google Cloud Vision API | Payant après quota | Très bonne sur produits emballés, faible sur plats cuisinés | ~500 ms | Coût hors budget projet école |
| OpenAI GPT-4o vision | Payant ($0.01/image) | Excellente (description naturelle) | ~2 s | Coût |
| Modèle custom CNN | — | Aurait demandé annotation + training | — | Pas dans le périmètre temps MSPR2 |

**Justification HF Food-101** :
- Modèle pré-entraîné sur 101 catégories de plats, **directement utilisable**
- Pipeline Hugging Face `transformers.pipeline("image-classification")` : 3 lignes de code
- Téléchargement initial ~300 Mo, cache local après
- Le brief mentionne **explicitement Hugging Face Transformers** comme ressource fournie

### 3.2 LLM pour conseil + plans IA

| Option | Coût | Qualité FR | Latence | Décision |
|---|---|---|---|---|
| **OpenRouter `gpt-oss-120b:free`** | 0 € (free tier) | Excellente | ~1-15 s | ✅ Retenu |
| OpenAI `gpt-4o-mini` | $0.15/M tokens | Excellente | ~1-3 s | Bon, mais payant |
| Anthropic Claude Haiku | $1/M tokens | Excellente | ~1-3 s | Payant |
| Ollama local `llama3.2:3b` | 0 €, mais 2 Go disque + CPU | Moyenne (FR moyen) | ~10-30 s | Disque insuffisant en dev |

**Justification gpt-oss via OpenRouter** :
- **gpt-oss** est le modèle **open-weight officiel d'OpenAI** (sortie août 2025), 120 B paramètres MoE
- **OpenRouter** propose un accès **gratuit** au modèle avec rate-limit doux (20 req/min)
- API **compatible OpenAI** (`/v1/chat/completions`) → swap trivial vers GPT-4 ou Claude si besoin
- Pas de download, pas d'infra, démarrage immédiat
- Storytelling fort pour la soutenance : "on utilise un LLM open source via une API agnostique"

### 3.3 Source nutritionnelle externe (USDA)

Cascade adoptée :
1. **`food_log` SQLite ETL** — données locales, latence < 1 ms
2. **USDA FoodData Central API** — gratuit, sans CB, base scientifique
3. **`null`** si aucune source ne match

**Pourquoi pas Open Food Facts** : OFF est barcode-oriented (produits emballés), moins pertinent pour des aliments bruts détectés par Food-101.

## 4. Choix base de données

### 4.1 PostgreSQL (relationnel transactionnel)

**Utilisé pour** : `User`, `UserProfile`, `MealEntry`, `WorkoutSession`, `PendingChange`.

**Justification** :
- Données fortement structurées avec contraintes (`unique_email`, FK `user`)
- Requêtes agrégées fréquentes (`Sum('total_calories') GROUP BY date`) → bien plus rapide qu'en NoSQL
- Migrations Django bien rodées (makemigrations + migrate)
- ACID indispensable pour l'auth

### 4.2 MongoDB (NoSQL document)

**Utilisé pour** : `meal_plans`, `workout_plans` (plans IA sauvegardés).

**Justification** :
- Documents fortement **imbriqués** (un plan = liste de sessions, chaque session = liste d'exercices, chaque exercice = sets/reps/notes)
- **Schéma évolutif** — l'IA peut renvoyer de nouveaux champs (ex. `equipment_used`) sans migration
- **Brief impose explicitement NoSQL** pour le moteur de recommandation
- PyMongo très simple à utiliser depuis Django
- Indexation par `user_id + created_at` pour list/sort O(log n)

### 4.3 SQLite ETL (lecture seule, partagée)

**Utilisé pour** : `food_log`, `exercise`, `patient`, `sante` (alimentés par le pipeline ETL MSPR1).

**Justification** :
- Données de **référence** chargées une fois par jour par Airflow
- Pas de besoin de concurrence en écriture
- Partagée entre Django (router DB) et nutrition-api (volume Docker)
- Aucune raison de migrer ces données vers Postgres → coût sans bénéfice

## 5. Choix librairies clés

| Domaine | Choix | Alternative | Justification |
|---|---|---|---|
| HTTP client | `axios` (frontend) | fetch native | Intercepteurs (auth + refresh JWT), error handling unifié |
| HTTP client | `httpx` (backend) | requests | Async support, indispensable pour FastAPI |
| Graphes | Chart.js (préparé) | D3, Plotly | Brief mentionne Chart.js, courbe d'apprentissage la plus douce |
| Auth | django-simple-jwt | OAuth2 | Stateless, simple, suffit pour le scope |
| Rate-limit | django-ratelimit | nginx limit_req | Décorateurs Python explicites, plus lisibles |

## 6. Récap visuel des couches

```
PRESENTATION  → React + Vite + React Router + Axios + DM Sans/Manrope
APPLICATION   → Django REST (auth, profil, MealEntry, WorkoutSession, proxy IA)
                FastAPI (vision, LLM, recommandations)
INTELLIGENCE  → Hugging Face Food-101 + OpenRouter gpt-oss-120b + USDA
PERSISTANCE   → PostgreSQL + MongoDB + SQLite
INFRASTRUCTURE → Docker Compose + Airflow + Nginx
```
