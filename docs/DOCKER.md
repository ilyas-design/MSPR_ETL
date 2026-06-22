# Documentation Docker — HealthAI Coach

## La grande image

Imagine une ville avec plusieurs bâtiments. Docker est la ville, chaque container est un bâtiment, et ils communiquent par des "rues" internes (le réseau Docker).

```
                        INTERNET / TON NAVIGATEUR
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
         localhost:80                             localhost:81
         ┌────────────┐                         ┌──────────────┐
         │  FRONTEND  │                         │  FRONTEND    │
         │   ADMIN    │                         │ UTILISATEUR  │
         │  (nginx)   │                         │   (nginx)    │
         └─────┬──────┘                         └──────┬───────┘
               │                                       │
               └──────────────┬────────────────────────┘
                              │ /api/*
                     ┌────────▼────────┐
                     │    BACKEND      │
                     │    (Django)     │ ← le cerveau
                     └──┬──────┬───┬──┘
                        │      │   │
           ┌────────────┘      │   └──────────────┐
           │                   │                  │
    ┌──────▼──────┐   ┌────────▼────────┐  ┌─────▼──────┐
    │ PostgreSQL  │   │  nutrition-api  │  │  MongoDB   │
    │  (comptes,  │   │   (IA / LLM)    │  │  (plans IA)│
    │   repas...) │   │   port 8001     │  │            │
    └────────────┘   └────────┬────────┘  └────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   reco-engine     │
                    │  (sport / plans)  │
                    │   port 8002       │
                    └───────────────────┘
```

---

## Les services un par un

### `etl` — le préparateur de données
- S'exécute **une seule fois** au démarrage, puis s'arrête
- Lit les fichiers CSV (`gym_members_exercise.csv`, `daily_food_nutrition.csv`…)
- Les nettoie, les transforme, et les charge dans `mspr_etl.db` (SQLite)
- Produit la base de données de référence que tous les autres services liront

### `app-postgres` — la mémoire principale
- Base de données relationnelle PostgreSQL
- Stocke tout ce qui est "utilisateur" : comptes, profils, repas consommés, séances de sport faites
- Géré par Django via son ORM

### `mongo` — le tiroir à plans IA
- Base NoSQL MongoDB
- Stocke les plans repas et programmes sport générés par l'IA
- Format flexible car les réponses du LLM varient

### `nutrition-api` — le service IA nutrition (port 8001)
- Microservice FastAPI indépendant
- Fait 4 choses :
  - Reconnaît un aliment sur une **photo** (modèle HuggingFace Food-101)
  - Génère des **plans repas** (algo rule-based ou LLM)
  - Donne des **conseils coach** (LLM gpt-oss via OpenRouter)
  - Cherche les **macronutriments** (food_log SQLite → fallback USDA)

### `reco-engine` — le service IA sport (port 8002)
- Microservice FastAPI indépendant
- Recommande des **exercices** selon objectif/niveau/équipement
- Génère des **programmes d'entraînement hebdomadaires** via LLM
- Stocke et récupère les plans dans MongoDB

### `backend` (Django) — la passerelle centrale
- Le seul service que le frontend touche directement
- Gère l'**authentification JWT** (login, register, refresh token)
- **Proxifie** les requêtes IA vers nutrition-api et reco-engine
- Applique le **rate limiting** (max 10 requêtes/min vers l'IA)
- Applique le **cache** (une même photo = même résultat pendant 1h)

### `frontend` — l'interface admin (port 80)
- Application React construite en mode production, servie par nginx
- Interface pour les superviseurs : voir les données ETL, KPIs, valider des modifications

### `frontend-user` — l'interface utilisateur (port 81)
- Application React Vite pour les utilisateurs finaux
- Journal alimentaire, analyse photo, recommandations sport, dashboard perso

### Airflow (4 containers) — l'orchestrateur ETL
- Relance le pipeline ETL automatiquement **chaque nuit à 2h**
- `airflow-apiserver` : interface web (port 8080, login : airflow/airflow)
- `airflow-scheduler` : surveille les horaires et déclenche les DAGs
- `airflow-dag-processor` : lit et charge les fichiers DAG
- `airflow-triggerer` : gère les tâches asynchrones

---

## Le rôle de Docker dans tout ça

**Sans Docker** : tu devrais installer Python, Node, PostgreSQL, MongoDB, Airflow… sur ta machine, gérer les conflits de versions, configurer les connexions manuellement.

**Avec Docker** : chaque service tourne dans sa propre boîte isolée, avec exactement les bonnes versions. Un seul `docker compose up --build` démarre tout.

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | La recette : qui démarre, dans quel ordre, avec quelles variables |
| `docker-compose.override.yml` | Surcharge dev : expose les ports sur localhost |
| `Dockerfile.*` | Comment construire chaque image (ce qu'on installe dedans) |
| `.env` | Les secrets et config (clés API, mots de passe) |

---

## Ordre de démarrage

L'ordre est automatique grâce aux `depends_on` avec vérification de santé (`healthy`) :

```
airflow-permissions & airflow-postgres       (setup initial)
         ↓
    etl (crée mspr_etl.db)    app-postgres    mongo    airflow-init
         ↓                         ↓             ↓
    nutrition-api            reco-engine    airflow-scheduler / apiserver / ...
         ↓                         ↓
              backend (Django)
                   ↓
         frontend  +  frontend-user
```

---

## Flux d'une requête typique : analyse d'une photo de repas

```
1. L'utilisateur prend une photo dans frontend-user (localhost:81)
2. → POST /api/me/meals/analyze  vers le backend Django
3. Django vérifie le JWT (token d'auth) et applique le rate-limit
4. Django vérifie son cache : déjà vu cette image ? → retourne directement
5. Sinon → Django envoie la photo à nutrition-api (http://nutrition-api:8001/analyze)
6. nutrition-api passe la photo dans le modèle HuggingFace Food-101
7. → retourne les 5 aliments les plus probables avec leur score de confiance
8. Django stocke le résultat en cache (TTL 1h) et le renvoie au frontend
9. L'utilisateur coche les aliments → POST /macros/lookup pour récupérer les macros
10. L'utilisateur valide → POST /api/me/meals/ → Django enregistre dans PostgreSQL
```

---

## Commandes utiles

```bash
# Démarrer la stack complète (premier lancement ou après modification)
docker compose up --build

# Démarrer sans rebuild (si rien n'a changé dans le code)
docker compose up

# Voir l'état de tous les services
docker compose ps

# Suivre les logs d'un service en temps réel
docker compose logs -f backend
docker compose logs -f nutrition-api

# Vérifier manuellement la santé des services
curl http://localhost:8001/health   # nutrition-api
curl http://localhost:8002/health   # reco-engine
curl http://localhost/api/schema/   # backend via nginx

# Arrêter sans supprimer les données
docker compose down

# Tout supprimer y compris les volumes (repart de zéro)
docker compose down -v

# Reconstruire uniquement un service modifié
docker compose up --build nutrition-api
```

---

## URLs disponibles une fois la stack démarrée

| Service | URL | Credentials |
|---|---|---|
| Frontend admin | http://localhost | compte Django |
| Frontend utilisateur | http://localhost:81 | compte Django |
| Backend API + Swagger | http://localhost/api/docs/ | — |
| Backend API + ReDoc | http://localhost/api/redoc/ | — |
| Airflow | http://localhost:8080 | airflow / airflow |
| nutrition-api docs | http://localhost:8001/docs | — |
| reco-engine docs | http://localhost:8002/docs | — |

---

## Variables d'environnement clés (`.env`)

| Variable | Utilisée par | Obligatoire |
|---|---|---|
| `SECRET_KEY` | backend Django | ✅ |
| `OPENROUTER_API_KEY` | nutrition-api, reco-engine | ✅ pour les fonctions LLM |
| `POSTGRES_*` | backend (natif) | ✅ |
| `MONGO_URI` | backend (natif) | ✅ |
| `NUTRITION_API_URL` | backend (natif) | ✅ |
| `USDA_API_KEY` | nutrition-api | ❌ optionnel (fallback macros) |
