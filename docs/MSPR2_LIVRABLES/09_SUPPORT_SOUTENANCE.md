---
marp: true
title: HealthAI Coach — MSPR TPRE502
theme: default
paginate: true
size: 16:9
---

<!--
Support de soutenance — Bloc E6.2 (TPRE502).
Format : 20 min de présentation + 30 min d'entretien.
Rendu en slides : `npx @marp-team/marp-cli@latest 09_SUPPORT_SOUTENANCE.md -o slides.pdf`
ou extension VS Code "Marp for VS Code".
Découpage chrono visé : Intro 2' · Archi 3' · Démo 10' · Métriques 2' · Limites 3'.
-->

# HealthAI Coach
## API IA de coaching santé personnalisé

**MSPR TPRE502 — Bloc E6.2** · Développer un modèle prédictif d'une solution IA
EPSI — CDA / DIADS RNCP36581

Équipe projet · Juin 2026

---

## Plan (20 min)

1. **Contexte & objectif** — *2 min*
2. **Architecture** — *3 min*
3. **Démonstration** — *10 min*
4. **Métriques IA** — *2 min*
5. **Limites & perspectives** — *3 min*

---

<!-- ===================== 1. CONTEXTE (2') ===================== -->

# 1 · Contexte & objectif

---

## Le besoin client

HealthAI Coach : startup santé connectée, **50 000 utilisateurs actifs**.

Après la phase 1 (ETL + backend + dashboards — TPRE501), franchir le cap des
**capacités prédictives par IA** :

- 🥗 **Recommandations nutritionnelles** : photo de repas → aliments + macros + conseils
- 🏋️ **Recommandations d'activité** : moteur multi-critères, plans d'entraînement
- 🖥️ **Interface moderne, responsive, accessible AA**

> Différenciation : approche **holistique** (nutrition + sport) avec **IA générative**,
> là où les concurrents (MyFitnessPal, Yazio) restent mono-domaine et quantitatifs.

---

<!-- ===================== 2. ARCHITECTURE (3') ===================== -->

# 2 · Architecture

---

## Vue d'ensemble — micro-services

```
                    ┌──────────────────┐
   React (Vite) ◄──►│  Django REST API │  JWT, proxy, persistance
   frontend-user    │   (port 8000)    │
                    └───┬──────────┬───┘
                        │          │
         ┌──────────────▼──┐   ┌───▼───────────────┐
         │  nutrition-api  │   │   reco-engine     │
         │  FastAPI :8001  │   │  FastAPI :8002    │ ← micro-service séparé
         │  Vision + LLM   │   │  scoring + LLM    │
         └────────┬────────┘   └────────┬──────────┘
                  │                      │
        HF nateraw/food            MongoDB (NoSQL)
        + gpt-oss-120b             plans d'entraînement
```

Bases : **PostgreSQL** (profils, repas, séances) · **MongoDB** (plans IA flexibles)
· **SQLite** (données ETL en lecture). Orchestration **Docker Compose**.

---

## Choix techniques (benchmarkés — cf. livrable 02)

| Besoin | Choix | Pourquoi |
|---|---|---|
| Frontend | **React + Vite** | Écosystème, perf, réutilisation MSPR1, a11y (`jsx-a11y`) |
| API IA | **FastAPI** | Async, OpenAPI auto, typage Pydantic |
| Vision | **HF `nateraw/food`** | Food-101, gratuit, CPU, top-1 84% |
| LLM | **gpt-oss-120b** (OpenRouter) | Open-weight, gratuit, FR, fallback rule-based |
| NoSQL | **MongoDB** | Plans semi-structurés, exigé par le brief |
| Viz | **Chart.js** | Léger, accessible (table de données alternative) |

---

## Conformité au cahier des charges

- ✅ API IA développée + **doc OpenAPI** (Swagger auto FastAPI + drf-spectacular)
- ✅ Moteur de reco **micro-service séparé** connecté à **NoSQL**
- ✅ Frontend **responsive** + **WCAG/RGAA AA** (tests `jest-axe` en CI)
- ✅ Intégration robuste : **cache**, **rate-limit**, **fallback** LLM→rule-based
- ✅ Tests automatisés + couverture (reco-engine, frontend, backend)
- ✅ Modèle de données documenté (relationnel + collections Mongo)

---

<!-- ===================== 3. DÉMO (10') ===================== -->

# 3 · Démonstration

*Scénario : « Sarah, 28 ans, veut perdre 5 kg »*

---

## Parcours démo (10 min)

1. **Inscription + Onboarding** — objectif perte de poids, niveau débutant, équipement maison
2. **Analyser un repas** — upload photo → détection aliments (top-5) → macros calculées
3. **Coach nutrition** — apports vs cibles, déséquilibres détectés, **conseil IA gpt-oss**
4. **Plan repas IA** — menu sur mesure (allergies, budget) — comparé au rule-based
5. **Programme sport** — moteur multi-critères → plan adapté (sans matériel, sans blessure)
6. **Dashboard** — graphes de progression accessibles
7. **Accessibilité live** — navigation 100% clavier + skip link + VoiceOver

> Repli si réseau : mode fallback rule-based (sans appel LLM externe).

---

## Points à montrer pendant la démo

- 📷 Le **workflow checkbox** sur la détection (plats composés → multi-sélection)
- 🧠 La **différence rule-based vs LLM** (grammages précis, justification, diversité)
- ♿ La **navigation clavier** : `Tab`, `Échap` ferme les menus, focus visible
- 🛡️ La **résilience** : couper le LLM → fallback automatique, l'app reste utilisable

---

<!-- ===================== 4. MÉTRIQUES (2') ===================== -->

# 4 · Métriques IA

---

## Performance des modèles

**Modèle vision — `nateraw/food` (Food-101)**

| Métrique | Valeur |
|---|---|
| Top-1 accuracy (publiée) | 84,2 % |
| Top-5 accuracy (publiée) | 96,1 % |
| Top-1 effective (photos réelles) | ~75 % |
| Latence inférence (CPU / M1) | ~280 / 180 ms |

Pipeline d'évaluation reproductible : `scripts/eval_food_model.py`
→ accuracy, précision / rappel / **F1** par classe.

**LLM — gpt-oss-120b** : latence p50 ~3 s · parsing JSON 100% (fallback regex)
· cohérence FR 100% · taux d'erreur < 2%.

---

<!-- ===================== 5. LIMITES (3') ===================== -->

# 5 · Limites & perspectives

---

## Difficultés rencontrées & solutions

| Difficulté | Solution mise en place |
|---|---|
| Food-101 = 1 classe / image (plats composés) | Multi-sélection + cascade macros USDA |
| Plats français hors Food-101 | Fallback lookup texte USDA |
| Latence LLM jusqu'à 25 s | Cache + fallback rule-based + écran d'attente |
| Accessibilité AA exigeante | `jsx-a11y` dès J0 + `jest-axe` en CI |
| Intégration multi-services | Docker Compose, healthchecks, ordre `depends_on` |

---

## Perspectives

- 🎯 **Fine-tuning** ViT sur un sous-dataset de cuisine française (LoRA)
- 📈 **Évaluation continue** : correction utilisateur = ground truth → suivi du drift
- ⚡ **Streaming LLM** dans l'UI (afficher le plan au fil de la génération)
- 🔬 **A/B test** conseil LLM vs rule-based + analytics
- 🧹 Nettoyage en cascade MongoDB à la suppression d'un utilisateur (RGPD)

---

## Merci

**Questions ?**

Livrables : `docs/MSPR2_LIVRABLES/` (01→09)
Code : `nutrition-api/` · `reco-engine/` · `frontend-user/` · `backend/`
Démo : `docker compose up --build`

---

<!-- ===================== ANNEXE : Q&A probables ===================== -->

# Annexe — Q&A probables

---

## Questions techniques anticipées

- **Pourquoi MongoDB et pas tout en PostgreSQL ?**
  Plans IA = structure variable (nb de jours, exercices, repas) → document NoSQL adapté + exigé par le brief.
- **Pourquoi un micro-service séparé pour la reco ?**
  Scalabilité indépendante, évolutivité, exigence explicite du cahier des charges.
- **Que se passe-t-il si OpenRouter tombe ?**
  Fallback automatique sur le moteur rule-based ; l'app reste fonctionnelle (dégradée).
- **Comment garantissez-vous l'accessibilité AA ?**
  `jsx-a11y` en erreur au lint + 12 tests `jest-axe` en CI + audit manuel clavier/VoiceOver.
- **Sécurité des données de santé ?**
  JWT, isolation des données par utilisateur, pas de stockage d'images brutes (hash uniquement).
- **Coût des APIs IA ?**
  HF en local (gratuit) + gpt-oss en free tier OpenRouter ; cache pour limiter les appels.
