# MSPR2 — Backlog de développement détaillé

Complément à [`MSPR2_PLAN.md`](MSPR2_PLAN.md). Ce document décompose le plan en **user stories** et **tâches techniques actionnables**, organisées en 4 sprints. Chaque tâche est estimée en points (1 = ~1h, 3 = ~½ journée, 5 = ~1 journée, 8 = ~2 jours).

**Conventions** :
- Tag `[C1]`/`[C2]`/`[C3]`/`[C4]` = chantier responsable (cf. plan).
- `DoD` = Definition of Done.
- `→` = dépendance (cette tâche en attend une autre).

---

## Sprint 0 — Fondations (J0 → J3)

**Objectif** : poser les rails. À la fin, chaque membre peut travailler indépendamment contre des mocks.

### US-00 — Aligner l'équipe sur l'architecture

- [ ] **T-001** [C4] Lire et valider en équipe `docs/MSPR2_PLAN.md` (1 pt)
- [ ] **T-002** [C4] Créer un board Trello/Jira/GitHub Projects avec les colonnes `Backlog / Sprint en cours / In progress / Review / Done` (1 pt)
- [ ] **T-003** [C4] Importer ce backlog comme cartes (3 pt)
- [ ] **T-004** [C4] Définir les conventions Git : branches `feat/<chantier>-<short>`, PR review obligatoire (1 pt)

### US-01 — Maquettes Figma `frontend-user/`

- [ ] **T-010** [C3] Wireframes basse fidélité (Excalidraw OK) des 6 pages : Landing, SignUp, Login, Dashboard, MealAnalysis, WorkoutReco (3 pt)
- [ ] **T-011** [C3] Maquettes haute fidélité Figma desktop des 6 pages (5 pt)
- [ ] **T-012** [C3] Variantes responsive (mobile + tablette) (3 pt)
- [ ] **T-013** [C3] Audit contrastes AA sur la palette retenue (1 pt)
- `DoD` : maquettes review et validées par l'équipe + screenshots dans `docs/maquettes/`.

### US-02 — Contrats OpenAPI figés

- [ ] **T-020** [C1] Spec OpenAPI `nutrition-api` : endpoints `POST /analyze` (multipart) + `POST /meal-plan` (JSON), schémas Pydantic des réponses (3 pt)
- [ ] **T-021** [C2] Spec OpenAPI `reco-engine` : endpoint `POST /recommend` + schéma exercice (3 pt)
- [ ] **T-022** [C4] Spec OpenAPI Django nouveaux endpoints user-facing : register, profile, /me/meals, /me/workouts (3 pt)
- [ ] **T-023** [C3] Mock MSW (Mock Service Worker) côté `frontend-user/` configuré sur ces contrats (3 pt)
- `DoD` : les 3 specs sont commitées dans `docs/openapi/`, les 4 chantiers peuvent coder en parallèle sans se bloquer.

### US-03 — Squelette `frontend-user/` initialisé

- [ ] **T-030** [C3] `npm create vite@latest frontend-user -- --template react` (1 pt)
- [ ] **T-031** [C3] Installer React Router, Axios, Chart.js, react-chartjs-2 (1 pt)
- [ ] **T-032** [C3] Installer dev : Vitest, RTL, jest-axe, MSW, @vitest/coverage-v8 (1 pt)
- [ ] **T-033** [C3] Configurer ESLint avec `jsx-a11y` en `error` (1 pt)
- [ ] **T-034** [C3] Configurer `vite.config.js` (proxy `/api` → `:8000`, test block) (1 pt)
- [ ] **T-035** [C3] Layout de base : `App.jsx` avec router + Header + Footer + skip-to-content link (3 pt)
- [ ] **T-036** [C3] `Dockerfile` + `nginx.conf` (calqué sur `frontend/`) (3 pt)
- `DoD` : `npm run dev` ouvre une page d'accueil vide accessible, `npm run test` exécute un test trivial, lint passe.

### US-04 — Squelette microservices `nutrition-api` et `reco-engine`

- [ ] **T-040** [C1] `nutrition_api/` : `main.py` FastAPI vide avec endpoints stubés (1 pt)
- [ ] **T-041** [C1] `nutrition_api/requirements.txt` + `Dockerfile` (1 pt)
- [ ] **T-042** [C2] `reco_engine/` : `main.py` FastAPI vide avec endpoints stubés (1 pt)
- [ ] **T-043** [C2] `reco_engine/requirements.txt` + `Dockerfile` (1 pt)
- [ ] **T-044** [C4] `docker-compose.yml` : ajouter services `nutrition-api`, `reco-engine`, `mongo` (healthchecks inclus) (3 pt)
- [ ] **T-045** [C4] `.env.example` mis à jour (clés HF, MongoDB URI) (1 pt)
- `DoD` : `docker compose up nutrition-api reco-engine mongo` → 3 services up, `curl :8001/openapi.json` et `curl :8002/openapi.json` répondent.

### US-05 — Backend prêt pour user-facing

- [ ] **T-050** [C4] Modèle `UserProfile` (managed=True) dans `backend/api/models.py` (3 pt)
- [ ] **T-051** [C4] `python manage.py makemigrations api && migrate` — vérifier que la migration ne touche PAS les tables ETL (1 pt)
- [ ] **T-052** [C4] `RegisterView` (POST `/api/auth/register/`) qui crée `User` + `UserProfile` (3 pt)
- [ ] **T-053** [C4] Tests : registration OK, registration en double échoue, profile créé (3 pt)
- `DoD` : `curl -X POST /api/auth/register/ -d '{"username":"u1","password":"…"}'` retourne 201 + tokens JWT.

---

## Sprint 1 — MVP fonctionnels (J3 → J10)

**Objectif** : chaque chantier a un MVP visible. End-to-end pas encore intégré.

### US-10 — IA Nutrition : analyse photo

- [ ] **T-100** [C1] `nutrition_api/vision.py` : charger modèle HF `nateraw/food-101` (lazy) (5 pt)
- [ ] **T-101** [C1] Endpoint `POST /analyze` : reçoit image multipart, retourne `{foods:[{label, confidence}], macros:{kcal, protein, carbs, fat}}` (5 pt)
- [ ] **T-102** [C1] Table de correspondance `label → macros` (depuis `daily_food_nutrition.csv`) (5 pt)
- [ ] **T-103** [C1] Tests pytest : mock HF, vérifier format réponse + gestion erreur format image (3 pt)
- [ ] **T-104** [C4] Proxy Django `MealAnalysisViewSet.analyze` : reçoit image, appelle nutrition-api, retourne réponse (5 pt)
- [ ] **T-105** [C4] Cache (`django.core.cache`) sur hash image, TTL 1h (3 pt)
- [ ] **T-106** [C4] Rate limit `django-ratelimit` 10/min/user (3 pt)
- [ ] **T-107** [C4] Persistance `MealEntry` à chaque analyse (3 pt)
- [ ] **T-108** [C4] Fallback si nutrition-api timeout → 503 + dernière analyse cached si dispo (3 pt)
- `DoD` : `curl -X POST -H "Bearer …" -F "image=@meal.jpg" /api/me/meals/analyze/` retourne JSON valide. Tests passent.

### US-11 — Meal plan généré

- [ ] **T-110** [C1] `nutrition_api/meal_planner.py` : algo scoring sur dataset pour proposer 3 repas (3 pt)
- [ ] **T-111** [C1] Endpoint `POST /meal-plan` : input `{goal, calorie_target, allergies, restrictions}` → output liste repas (5 pt)
- [ ] **T-112** [C4] Proxy Django `MealAnalysisViewSet.meal_plan` (3 pt)

### US-12 — Reco activité : moteur opérationnel

- [ ] **T-120** [C2] `reco_engine/mongo.py` : client motor + connexion `mongodb://mongo:27017` (3 pt)
- [ ] **T-121** [C2] `reco_engine/seed.py` : ingère `exercises.json` + enrichit (MET, calories/h) (5 pt)
- [ ] **T-122** [C2] Initialisation : job init dans compose ou commande au démarrage (3 pt)
- [ ] **T-123** [C2] `reco_engine/scoring.py` : filtrage hard (équipement, blessures, niveau) + ranking par objectif (8 pt)
- [ ] **T-124** [C2] Endpoint `POST /recommend` : input critères → output 5 exercices triés (5 pt)
- [ ] **T-125** [C2] Tests pytest : seed OK, recommandation sans équipement OK, blessure exclut un exercice (5 pt)
- [ ] **T-126** [C4] `UserProfile` enrichi : `equipment_available`, `injuries`, `preferred_activities` + migration (3 pt)
- [ ] **T-127** [C4] Proxy Django `WorkoutRecoViewSet.recommend` (3 pt)
- [ ] **T-128** [C4] Persistance `WorkoutPlan` + champ `feedback` (3 pt)
- `DoD` : `curl /api/me/workouts/recommend/ -d '{"goal":"weight_loss","level":"beginner","equipment":["body weight"]}'` retourne 5 exercices.

### US-13 — Frontend user : auth fonctionnelle

- [ ] **T-130** [C3] `services/api.js` : Axios + interceptors JWT + refresh (calqué sur `frontend/`) (3 pt)
- [ ] **T-131** [C3] Page `Landing.jsx` : CTA, accessible (3 pt)
- [ ] **T-132** [C3] Page `SignUp.jsx` : formulaire avec validation accessible (labels, aria-describedby, erreurs aria-live) (5 pt)
- [ ] **T-133** [C3] Page `Login.jsx` (3 pt)
- [ ] **T-134** [C3] `AuthGate.jsx` : composant route guard (3 pt)
- [ ] **T-135** [C3] Page `Onboarding.jsx` : capture `UserProfile` initial (5 pt)
- [ ] **T-136** [C3] Tests : auth flow complet (RTL + MSW) (3 pt)
- `DoD` : un user nouveau peut s'inscrire, onboarder, se déconnecter, se reconnecter. Tests OK.

### US-14 — Frontend user : pages IA (mockées)

- [ ] **T-140** [C3] Page `MealAnalysis.jsx` : composant `FileUpload` accessible + affichage résultat (5 pt)
- [ ] **T-141** [C3] `FileUpload.jsx` : drag&drop + sélection fichier + navigation clavier + aria (5 pt)
- [ ] **T-142** [C3] `MacroChart.jsx` : Chart.js doughnut avec `chartA11y` (calqué sur `frontend/`) (3 pt)
- [ ] **T-143** [C3] Page `WorkoutReco.jsx` : formulaire critères + affichage cards exercices (5 pt)
- [ ] **T-144** [C3] Page `Dashboard.jsx` : graphes progression (calories/jour, séances/semaine) (5 pt)
- [ ] **T-145** [C3] Page `MealHistory.jsx` : liste paginée des `MealEntry` (3 pt)
- [ ] **T-146** [C3] Page `Profile.jsx` : éditer `UserProfile` (3 pt)
- `DoD` : toutes les pages affichent des données mockées (MSW), navigation clavier complète.

---

## Sprint 2 — Intégration end-to-end + a11y (J10 → J17)

**Objectif** : tout fonctionne ensemble en Docker, audit a11y AA passé.

### US-20 — Intégration Docker complète

- [ ] **T-200** [C4] `docker-compose.yml` : ajouter `frontend-user` (port 81 ou via reverse proxy) (3 pt)
- [ ] **T-201** [C4] Reverse proxy (nginx ou Traefik) pour router `app.local` → frontend-user, `admin.local` → frontend, `/api` → backend (5 pt)
- [ ] **T-202** [C4] Vérifier `depends_on` + healthchecks pour démarrage ordonné (3 pt)
- [ ] **T-203** [C4] Documenter dans `README.md` les nouvelles URLs et services (3 pt)
- `DoD` : `docker compose up --build` lance tout, démo end-to-end fonctionne.

### US-21 — Désactiver les mocks et brancher l'API réelle

- [ ] **T-210** [C3] Variable d'env `VITE_USE_MOCKS` : true en dev, false en build prod (1 pt)
- [ ] **T-211** [C3] Brancher `analyzeMealPhoto`, `getWorkoutReco`, `getMealPlan` sur les vrais endpoints (3 pt)
- [ ] **T-212** [C3] Brancher `register`, `getProfile`, `updateProfile`, `getStats` (3 pt)
- [ ] **T-213** [C3] Gestion d'erreur : 401 → logout, 403 → message, 503 → composant `ErrorFallback` (5 pt)
- [ ] **T-214** [C3] Cache navigateur (sessionStorage) sur résultats IA récents (3 pt)
- `DoD` : démo end-to-end fonctionnelle sans mock.

### US-22 — Audit et fix accessibilité AA

- [ ] **T-220** [C3] Run `jest-axe` automatique dans chaque test page (3 pt)
- [ ] **T-221** [C3] Audit Lighthouse a11y sur les 6 pages (cible ≥ 95) (3 pt)
- [ ] **T-222** [C3] Audit manuel : navigation clavier complète sur toutes les pages (5 pt)
- [ ] **T-223** [C3] Audit screen reader : VoiceOver (macOS) ou NVDA sur les flows critiques (3 pt)
- [ ] **T-224** [C3] Fix systématique des violations (contrastes, labels, focus visible, aria-live) (8 pt)
- [ ] **T-225** [C3] Rédiger `AccessibilityDeclaration.jsx` avec le rapport d'audit RGAA (3 pt)
- `DoD` : 0 violation axe AA, Lighthouse ≥ 95, navigation clavier complète documentée.

### US-23 — Métriques IA mesurées

- [ ] **T-230** [C1] Constituer un mini-dataset d'évaluation (50-100 photos étiquetées) (5 pt)
- [ ] **T-231** [C1] Script d'évaluation : calcule précision, rappel, F1 sur le dataset (3 pt)
- [ ] **T-232** [C1] Rapport `docs/ia_metrics.md` avec courbes + matrice de confusion (3 pt)

### US-24 — Coverage et CI verts

- [ ] **T-240** [C4] Abaisser `.coveragerc` `fail_under` à 70 (1 pt)
- [ ] **T-241** [C4] Étendre `run_coverage.sh` : ajoute `nutrition_api`, `reco_engine` (pytest) + `frontend-user` (vitest) (3 pt)
- [ ] **T-242** [C4] Créer `.github/workflows/ci.yml` : lint Python (ruff/flake8) + JS (eslint) + tests + coverage (5 pt)
- [ ] **T-243** [C4] Badge CI dans le README (1 pt)
- [ ] **T-244** [C1] Compléter tests `nutrition_api/tests/` à 70%+ (5 pt)
- [ ] **T-245** [C2] Compléter tests `reco_engine/tests/` à 70%+ (5 pt)
- [ ] **T-246** [C4] Compléter tests `backend/api/tests.py` à 70%+ sur les nouveaux endpoints (5 pt)
- [ ] **T-247** [C3] Compléter tests `frontend-user/` à 70%+ (5 pt)
- `DoD` : CI verte, coverage report affiche ≥ 70% partout.

---

## Sprint 3 — Polish, doc, démo (J17 → J21)

**Objectif** : prêt pour soutenance.

### US-30 — Documentation finale

- [ ] **T-300** [C4] `docs/architecture.md` : diagramme Mermaid global + flux séquence (3 pt)
- [ ] **T-301** [C4] `docs/data_model.md` : ER des tables ETL + tables user + collections Mongo (3 pt)
- [ ] **T-302** [C3] `docs/frontend_benchmark.md` : tableau React vs Vue vs Angular justifiant React (3 pt)
- [ ] **T-303** [C4] `docs/conduite_du_changement.md` : onboarding user, choix a11y, accompagnement adoption (5 pt)
- [ ] **T-304** [C1+C2+C4] Mettre à jour le README principal avec les nouveaux services et la nouvelle app user (3 pt)
- [ ] **T-305** [C1] `docs/ia_documentation.md` : modèle HF utilisé, prompt engineering éventuel, limitations (3 pt)

### US-31 — Démo end-to-end scriptée

- [ ] **T-310** [C4] Script de seed : crée 2 users démo (`demo_user`, `demo_premium`) avec profil pré-rempli (3 pt)
- [ ] **T-311** [C4] Banque de 5 photos repas réalistes dans `docs/demo_assets/` (1 pt)
- [ ] **T-312** [C4] Scénario démo écrit : "Sarah, 28 ans, veut perdre 5 kg" → parcours complet (3 pt)
- [ ] **T-313** [C4] Test à blanc de la démo en équipe (5 pt)

### US-32 — Support de soutenance

- [ ] **T-320** [Tous] Plan de pitch 20 min (Intro 2', Archi 3', Démo 10', Métriques 2', Limites/Perspectives 3') (3 pt)
- [ ] **T-321** [Tous] Slides (équivalent Keynote/Slides) (5 pt)
- [ ] **T-322** [Tous] Préparer les Q&A probables (cf. `README_SOUTENANCE.md` pour le format) (5 pt)
- [ ] **T-323** [Tous] Répétition générale chrono en main (3 pt)

### US-33 — Polish UX

- [ ] **T-330** [C3] Toast notifications (succès analyse, erreur, etc.) accessibles (3 pt)
- [ ] **T-331** [C3] Loading states partout (skeleton/spinner annoncés au screen reader) (3 pt)
- [ ] **T-332** [C3] Empty states (pas encore d'analyse, pas de plan) (3 pt)
- [ ] **T-333** [C3] Responsive final sur 320px (mobile S) → 1920px+ (1 pt)

---

## Estimation globale

| Sprint | Tâches | Points |
|---|---|---|
| Sprint 0 — Fondations | 25 | ~50 pt |
| Sprint 1 — MVP fonctionnels | 35 | ~140 pt |
| Sprint 2 — Intégration + a11y | 25 | ~95 pt |
| Sprint 3 — Polish + démo | 18 | ~60 pt |
| **Total** | **~103 tâches** | **~345 pt** |

À 4 personnes, ~85 pt par tête sur 3 semaines = ~28 pt/semaine/personne. Réaliste avec la charge école.

## Cérémonies agiles (à mettre en place dès Sprint 0)

Même si MSPR2 ne l'exige pas explicitement (MSPR3 si), c'est un bon entraînement :

- **Daily** (10 min, chaque matin) : qu'est-ce que j'ai fait hier / ce que je vais faire aujourd'hui / blockers.
- **Sprint planning** (1h, début de chaque sprint) : sélectionner les US, estimer.
- **Sprint review** (30 min, fin de sprint) : démo de ce qui marche.
- **Rétrospective** (30 min, fin de sprint) : ce qui a marché, ce qui n'a pas marché, ce qu'on change.

Documentation à conserver pour MSPR3 (rapports de sprint demandés explicitement).

## Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Modèle HF trop lourd / lent | Moyenne | Fort | Lazy load + cache disque + GPU pas nécessaire (food-101 tourne CPU) |
| `food_label → macros` incomplet | Élevée | Moyen | Fallback "valeurs nutritionnelles indisponibles" + estimation par catégorie |
| Audit a11y trop ambitieux pour le temps | Moyenne | Fort | Démarrer dès J0 avec jsx-a11y en error → fix au fil de l'eau |
| Intégration Docker complexe (réseau, ports) | Moyenne | Fort | Faire Sprint 0 US-04 sérieusement pour figer la topologie tôt |
| Coverage 100% du `.coveragerc` casse la CI | Certaine | Bloquant | Tâche T-240 : abaisser à 70% **avant** d'ajouter du code |
| Maquettes Figma en retard → frontend bloqué | Moyenne | Moyen | Wireframes basse fidélité suffisent pour démarrer le code |

## Définitions transverses

**Definition of Ready (DoR)** — une US est prête à être prise quand :
- Critères d'acceptation clairs
- Maquettes (si UI) ou contrat OpenAPI (si API) figés
- Dépendances satisfaites

**Definition of Done (DoD)** — une US est terminée quand :
- Code mergé sur `main`
- Tests passent en local et en CI
- Coverage maintenu ≥ 70%
- Doc à jour (README ou docs/)
- Aucune violation a11y AA (si UI)
- Review par un autre membre faite
