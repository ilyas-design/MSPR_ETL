# 02 — Choix techniques et benchmark

## Benchmark frontend

Pour `frontend-user/`, trois frameworks ont été comparés : React, Vue et
Angular.

| Critère | React + Vite | Vue 3 + Vite | Angular |
|---|---|---|---|
| Courbe d'apprentissage | Moyenne (JSX) | Faible (templates proches du HTML) | Élevée (TypeScript strict, DI, RxJS) |
| Accessibilité outillée | `eslint-plugin-jsx-a11y`, `jest-axe`, `@testing-library/react` | `eslint-plugin-vuejs-accessibility`, moins d'outils de test a11y | Bon support ARIA (Angular Material), tests a11y plus lourds à mettre en place |
| Build/dev | Excellent avec Vite | Excellent avec Vite | Correct mais plus lourd |
| Graphiques | `react-chartjs-2`, large choix | `vue-chartjs`, moins de bindings | `ng2-charts`, plus de boilerplate |
| Expérience équipe | Déjà utilisé en MSPR1 (`frontend/`) | Aucune | Aucune |

**React 19 + Vite** est retenu pour `frontend-user/` :

1. **Continuité** : `frontend/` (MSPR1) est déjà en React, ce qui permet de
   réutiliser les patterns existants (intercepteurs Axios JWT, structure de
   pages, config ESLint/Vite).
2. **Accessibilité** : `eslint-plugin-jsx-a11y` (en `error`) et `jest-axe`
   répondent directement à l'exigence AA du brief — voir
   [06_ACCESSIBILITE.md](06_ACCESSIBILITE.md).
3. Vue et Angular ont été écartés faute d'expérience préalable de l'équipe et
   pour ne pas gérer deux paradigmes différents entre les deux frontends ;
   Angular en plus pour sa courbe d'apprentissage, incompatible avec un
   planning de 3 semaines.

## Autres choix techniques

| Brique | Choix | Pourquoi |
|---|---|---|
| Microservice nutrition | FastAPI (`nutrition-api/`) | Validation Pydantic, appels async vers OpenRouter/USDA, OpenAPI auto-généré |
| Microservice activité | FastAPI (`reco-engine/`) séparé | Le brief exige un moteur de recommandation en micro-service à part, connecté à une base NoSQL |
| Vision repas | HF Transformers, `pipeline("image-classification", model="nateraw/food")` | Tourne en local, pas de clé API, modèle Food-101 adapté à la nutrition, chargement lazy + cache disque |
| LLM (coach, plans) | OpenRouter, `gpt-oss-120b:free` | Évite de télécharger un modèle de plusieurs Go ; modèle interchangeable via `OPENROUTER_MODEL` |
| Macros fallback | USDA FoodData Central | API publique gratuite, complète le référentiel `food_log` |
| Stockage applicatif | PostgreSQL | Écritures concurrentes (MealEntry, WorkoutSession), agrégations pour les KPIs |
| Stockage plans IA | MongoDB | Le brief exige du NoSQL ; les plans générés par LLM ont une structure imbriquée et évolutive |
| Authentification | JWT (`simplejwt`) | API stateless, prête pour un futur client mobile |
| Cache réponses IA | `django.core.cache` (filebased), clé `sha256(image)`, TTL 1h | Suffisant pour un projet mono-instance ; migration Redis possible plus tard |
| Rate limiting | `django-ratelimit`, 10-20 req/min/user | Ciblé sur les endpoints IA coûteux |
| Référentiel ETL | SQLite `mspr_etl.db`, lecture seule | Conserve le pipeline MSPR1 (`Pipelines/pipeline.py`, Airflow) ; ces données sont des référentiels, pas des données utilisateur |

## Stack finale

| Couche | Technologie |
|---|---|
| Frontend admin | React 19 + Vite + React Router + Chart.js |
| Frontend utilisateur | React 19 + Vite + React Router + Chart.js + jsx-a11y + jest-axe |
| API principale | Django 5.2 + DRF + simplejwt + drf-spectacular + django-ratelimit |
| Microservice nutrition | FastAPI + Transformers (HF) + httpx |
| Microservice activité | FastAPI + PyMongo + httpx |
| Base relationnelle applicative | PostgreSQL 16 |
| Base documentaire IA | MongoDB 7 |
| Référentiel ETL | SQLite (`mspr_etl.db`), alimenté par `Pipelines/pipeline.py` |
| Orchestration | Docker Compose (+ Airflow pour l'ETL) |
