# Livrables MSPR2 — HealthAI Coach

Ce dossier rassemble la **documentation finale** demandée par le brief MSPR2
(TPRE502, Bloc E6.2). Chaque livrable nommé dans la section IV du sujet est
ici en un fichier dédié.

## Sommaire des livrables

| # | Document | Section du brief couverte |
|---|---|---|
| 01 | [Architecture](01_ARCHITECTURE.md) | Application frontend / API IA / Micro-service |
| 02 | [Choix techniques et benchmark](02_CHOIX_TECHNIQUES.md) | Benchmark frontend + justification choix technos |
| 03 | [Modèle de données](03_MODELE_DONNEES.md) | Modèle relationnel + NoSQL documentés |
| 04 | [Référence API](04_API_REFERENCE.md) | Documentation API OpenAPI |
| 05 | [Métriques de performance IA](05_METRIQUES_IA.md) | Précision, rappel, F1 du modèle vision |
| 06 | [Accessibilité WCAG/RGAA](06_ACCESSIBILITE.md) | Page déclaration + audit |
| 07 | [Conduite du changement](07_CONDUITE_CHANGEMENT.md) | Accompagnement et adoption |
| 08 | [Maquettes d'interface](08_MAQUETTES.md) | Maquettes responsive + design system |
| 09 | [Support de soutenance](09_SUPPORT_SOUTENANCE.md) | Slides (Marp) + Q&A pitch 20 min |

## Documents complémentaires (déjà présents dans `docs/`)

- [`MSPR2_PLAN.md`](../MSPR2_PLAN.md) — plan de développement initial (décisions structurantes)
- [`MSPR2_BACKLOG.md`](../MSPR2_BACKLOG.md) — backlog par sprint
- [`README_SOUTENANCE.md`](../README_SOUTENANCE.md) — soutenance MSPR1 (contexte ETL)

## Stack et code source

- **API IA microservice** : `nutrition-api/` (FastAPI)
- **API backend principale** : `backend/` (Django REST + JWT)
- **Frontend utilisateur** : `frontend-user/` (Vite + React)
- **Frontend admin** (MSPR1, conservé) : `frontend/`
- **Bases de données** :
  - PostgreSQL (Django : auth, profil, `MealEntry`, `WorkoutSession`)
  - MongoDB (plans IA flexibles : `meal_plans`, `workout_plans`)
  - SQLite (données ETL en lecture : `mspr_etl.db`)
- **Orchestration** : Docker Compose
