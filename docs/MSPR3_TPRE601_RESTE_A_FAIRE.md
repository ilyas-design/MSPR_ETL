# MSPR TPRE601 — Reste à faire

**Bloc E6.3 / E6.4 — Mise en production d'une solution IA (DevOps, observabilité, app mobile)**
Projet : HealthAI Coach · Date du point : 2026-06-23

> ⚠️ Cette MSPR n'évalue **pas** le re-développement de l'ETL / API / web (c'était TPRE501/502).
> Elle évalue **l'industrialisation de la mise en production** : conteneurisation, CI/CD,
> monitoring, multi-environnement, sauvegarde, documentation + une **app mobile sociale**.
>
> 🏠 **Tout est LOCAL** : « environnement de démonstration reproductible sur un poste local »
> (Docker Compose ou minikube). **Pas de VPS ni de nom de domaine.**

---

## ✅ Déjà fait (acquis pour cette MSPR)

- [x] **App mobile** (Expo / React Native) : flux unique, publication texte + média, panneau profil
- [x] API + BDD pour les publications et médias (`/api/social/posts/`, `/api/social/profile/`)
- [x] Stack conteneurisée Docker Compose (ETL, backend, 2 frontends, IA, Airflow, Postgres, Mongo)
- [x] Déploiement en 1 commande (`docker compose up --build` / `run.sh`)
- [x] Jeu de données de démonstration pré-chargé (pipeline ETL)
- [x] Authentification simplifiée mais fonctionnelle (JWT)
- [x] CI GitHub Actions : audit dépendances (pip/npm), SAST Bandit, Trivy (FS + images), tests + couverture, builds front/back
- [x] Mode offline mobile (`EXPO_PUBLIC_USE_MOCKS`)

---

## 🔴 Priorité 1 — Monitoring & observabilité (le plus gros manque)

> `infra/monitoring/` est vide. Exigé en III.3 + livrable « doc supervision avec liste exhaustive des données collectées ».

- [ ] Ajouter **Prometheus** au `docker-compose` (scrape config)
- [ ] Ajouter **Grafana** + provisioning d'au moins **1 dashboard** de supervision de la stack
- [ ] Exposer les métriques applicatives :
  - [ ] endpoint `/metrics` sur le **backend Django** (django-prometheus)
  - [ ] **node-exporter** (hôte) + **cAdvisor** (conteneurs)
  - [ ] **postgres-exporter** (BDD)
- [ ] **Logs centralisés** consultables localement : **Loki + Promtail** (léger, recommandé) ou ELK
- [ ] **Alertes basiques** (Prometheus Alertmanager ou alertes Grafana) pour la démo
- [ ] Doc `docs/monitoring/` : liste **exhaustive** des métriques + logs collectés, captures des dashboards

## 🔴 Priorité 2 — Configurations multi-environnement

> Exigé en III.4 : 3 configurations distinctes. Seul l'offline mobile existe aujourd'hui.

- [ ] **Configuration complète** : tous les services + IA + BDD complète + admin
- [ ] **Configuration offline** : mocks des APIs externes, données statiques, sans Internet
- [ ] **Configuration performance** : services allégés, BDD réduite, monitoring simplifié
- [ ] Implémenter via **Compose profiles** ou fichiers `docker-compose.<env>.yml`
- [ ] Documenter la commande de lancement de chaque configuration

## 🔴 Priorité 3 — Sauvegarde / restauration & nettoyage

> `infra/scripts/` est vide. Exigé en III.1 + III.5 + livrables.

- [ ] `infra/scripts/backup.sh` : dump Postgres + Mongo + volume SQLite + médias
- [ ] `infra/scripts/restore.sh` : restauration depuis une sauvegarde
- [ ] `infra/scripts/reset.sh` : nettoyage / remise à zéro complète
- [ ] Vérifier le **démarrage complet de la stack en < 10 min** (chronométrer + noter)

## 🟠 Priorité 4 — Compléter CI → CD + analyse de code

> La CI fait build + tests + sécurité ; il manque l'analyse SonarQube et l'étape de déploiement.

- [ ] Ajouter un job **SonarQube** (analyse qualité de code, explicitement recommandé p.7)
- [ ] Ajouter **build + push des images** vers un registry (ex. GHCR)
- [ ] Ajouter une **étape de déploiement** scriptée (cible = environnement **local**)
- [ ] Générer / archiver les **rapports de tests** et **indicateurs de qualité** en artefacts CI

## 🟠 Priorité 5 — Documentation industrielle

> Les dossiers `docs/monitoring|ci-cd|deployment|security|project-management/` ne contiennent que des `.gitkeep`.

- [ ] `docs/ci-cd/` : doc détaillée du **pipeline** (installation, utilisation, maintenance)
- [ ] `docs/deployment/` : doc des **images conteneurs** (contenu, config, bonnes pratiques) — étoffer `DOCKER.md`
- [ ] `docs/architecture/` : **diagrammes UML** + **schéma de déploiement** propre à la mise en prod
- [ ] **Plan de tests** rédigé + rapports automatisés + indicateurs qualité de code
- [ ] `docs/security/` : config sécurisée, variables d'environnement **documentées**, bonnes pratiques conteneurs (OWASP / RGPD)
- [ ] Fichier `.env.example` documenté pour **toute la stack** (pas seulement le mobile)

## 🟡 Priorité 6 — Gestion de projet (Partie IV.2)

- [ ] **Rapports de sprint** (objectifs + réalisations)
- [ ] **Tableau de suivi Kanban/Scrum** (Jira ou Trello) — captures d'écran
- [ ] **Cérémonies agiles** documentées (daily, revues, rétrospectives)

## 🟡 Priorité 7 — Support de soutenance (Partie IV.3)

- [ ] Support de présentation **dédié TPRE601** (le `09_SUPPORT_SOUTENANCE.md` est orienté MSPR2)
- [ ] Contenu : démarche, difficultés rencontrées, solutions, résultats, perspectives
- [ ] Préparer la **démo live** (stack locale + mobile sur le même réseau / hotspot)

## ⚪ Bonus (optionnel — points en plus)

- [ ] **Kubernetes mono-nœud (minikube)** : `infra/k8s/` est vide → manifests + doc associée

---

## Ordre conseillé

1. **Monitoring** (Prometheus + Grafana + Loki) — débloque la compétence centrale du bloc
2. **Multi-environnement** (3 profils)
3. **Backup / restore / reset**
4. **Docs** (au fil de l'eau, en documentant chaque brique posée)
5. **CD + SonarQube**
6. **Gestion de projet + soutenance**

> 💡 Astuce : documente chaque brique **au moment où tu la poses** (capture + paragraphe),
> ça t'évite de tout rédiger en panique la veille de la soutenance.
