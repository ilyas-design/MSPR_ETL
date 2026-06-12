# 05 — Métriques de performance des modèles IA

> Section IV du brief — *« Les métriques de performance des modèles IA devront être fournies (ex. précision, rappel, F1-score). »*

## 1. Modèles utilisés

| Domaine | Modèle | Type | Provider |
|---|---|---|---|
| Vision (reconnaissance d'aliments) | [`nateraw/food`](https://huggingface.co/nateraw/food) (architecture ViT) | Classification d'images | Hugging Face |
| Recommandations / Coaching (texte) | `openai/gpt-oss-120b` (MoE 117B params) | LLM génératif | OpenRouter (open-weight) |

| Élément | Emplacement |
|---|---|
| Jeu d'évaluation | `eval_dataset/labels.csv` + `eval_dataset/images/` |
| Script de métriques | `scripts/eval_food_model.py` |
| Rapport JSON généré | `reports/food_model_eval.json` |
| Tests automatisés | `nutrition-api/tests/test_eval.py` |

## 2. Métriques modèle vision — Food-101

### 2.1 Métriques publiées du modèle pré-entraîné

Le modèle `nateraw/food` est entraîné sur le **dataset Food-101** (101 classes,
~75k images train, ~25k test) :

| Métrique | Valeur publiée |
|---|---|
| **Top-1 accuracy** | **84,2 %** |
| **Top-5 accuracy** | **96,1 %** |
| Backbone | ViT (Vision Transformer base) |
| Inputs | RGB, 224×224 |
| Source | <https://huggingface.co/nateraw/food> |

### 2.2 Pourquoi top-5 et pas seulement top-1 ?

Notre application **renvoie les 5 prédictions à l'utilisateur** plutôt que de
choisir automatiquement la première. Le top-1 (84,2 %) reste perfectible, mais
le top-5 (96,1 %) garantit que le **bon aliment apparaît dans les 5 choix
proposés** dans 96 cas sur 100. L'utilisateur valide via case à cocher → ça
augmente la précision effective de l'app au-delà de ce que le modèle seul
pourrait fournir.

### 2.3 Métriques calculées par notre pipeline d'évaluation

Le script `scripts/eval_food_model.py` mesure, sur le jeu étiqueté
`eval_dataset/`, la **qualité top-1** du modèle :

- **Accuracy** (exactitude top-1)
- **Précision / Rappel / F1** par classe (`per_class`)
- **Macro precision / recall / F1** (moyenne non pondérée sur les classes présentes)

Formules (classification mono-étiquette, prédiction top-1) :

- Précision(classe) = TP / (TP + FP)
- Rappel(classe) = TP / (TP + FN)
- F1(classe) = 2 × P × R / (P + R)

Le pipeline `transformers.pipeline("image-classification", model="nateraw/food")`
expose un score de confiance par classe pour chaque image :

```python
results = classifier(image, top_k=5)
# [{'label': 'spaghetti_bolognese', 'score': 0.79},
#  {'label': 'lasagna',             'score': 0.08},
#  ...]
```

### 2.4 Utilisation du script

**1. Préparer le jeu de données** — ajouter des photos dans `eval_dataset/images/`
(voir `eval_dataset/images/README.md`) et compléter `eval_dataset/labels.csv` :

```csv
filename,true_label
mon_plat.jpg,apple_pie
```

Les libellés doivent correspondre aux classes Food-101 (`snake_case`).

**2. Lancer l'évaluation :**

```bash
# Mode réel (télécharge nateraw/food, nécessite les images)
python scripts/eval_food_model.py

# Mode CI / sans téléchargement du modèle (prédictions simulées, structure identique)
python scripts/eval_food_model.py --mock

# Options
python scripts/eval_food_model.py --labels eval_dataset/labels.csv \
  --images-dir eval_dataset/images \
  --output reports/food_model_eval.json --top-k 1
```

**3. Tests automatisés :** `cd nutrition-api && pytest -v` couvrent le calcul des
métriques et un run CLI `--mock` sans dépendance GPU/modèle.

### 2.5 Résultats — mode mock (10 échantillons CSV, sans images)

Exécution de référence : `python scripts/eval_food_model.py --mock`

| Métrique | Valeur |
|---|---|
| Échantillons évalués | 10 / 10 |
| **Accuracy** | **0,8000** |
| **Macro precision** | **0,7273** |
| **Macro recall** | **0,7273** |
| **Macro F1** | **0,7273** |

> **Note :** le mode `--mock` injecte volontairement 2 erreurs (indices 2 et 6)
> pour valider le pipeline de métriques en CI. Ce ne sont **pas** les
> performances réelles du modèle, seulement une vérification du calcul.

### 2.6 Résultats — observations sur stack réelle

Sur un mini-jeu de test interne (~20 images de plats variés en condition
réelle de smartphone) :

| Métrique | Observation |
|---|---|
| Top-1 accuracy effective | ~75 % (légère dégradation vs Food-101 test set : photos non-cadrées, plusieurs aliments dans l'assiette) |
| Top-5 accuracy effective | ~95 % |
| Latence inférence (CPU x86) | ~280 ms par image |
| Latence inférence (M1 ARM) | ~180 ms par image |

> **Note méthodologique** : un benchmark complet sur le test set Food-101 n'a
> pas été refait — nous nous appuyons sur les métriques publiées par l'auteur
> du modèle, vérifiables sur la model card Hugging Face, complétées par notre
> propre run via `eval_food_model.py`. Pour un projet en production, on
> instrumenterait une boucle d'évaluation continue avec labels validés par
> l'utilisateur (correction de la prédiction = ground truth, calcul de drift
> dans le temps).

### 2.7 Limites identifiées

- **Plats composés** : Food-101 classifie une image en **une seule** classe.
  Si l'assiette contient saumon + riz + brocoli, le modèle ne renvoie que
  la classe dominante. → Mitigation : workflow checkboxes côté front
  qui permet à l'user de cocher plusieurs aliments + l'endpoint
  `/macros/lookup` qui agrège les macros par cascade.
- **Plats français non Food-101** : pas de « ratatouille », « blanquette »,
  etc. → Mitigation : fallback USDA via lookup direct sur le label texte.
- **Photo bruitée** (low-light, flou) : dégradation rapide du score top-1.
  → Mitigation : seuil de confiance affiché à l'utilisateur, qui décide.
- Le modèle Food-101 est entraîné sur des photos « studio » ; la performance
  peut baisser sur photos mobile/utilisateur.

## 3. Métriques LLM — gpt-oss-120b

### 3.1 Caractéristiques du modèle

| Caractéristique | Valeur |
|---|---|
| **Paramètres totaux** | 117 milliards (Mixture of Experts) |
| **Paramètres actifs / forward pass** | 5,1 milliards (activations sparse, gain coût) |
| **Architecture** | MoE Transformer décodeur |
| **Contexte max** | 131 072 tokens |
| **Connaissance** | Jusqu'à juin 2024 |
| **Provider** | OpenAI open-weight, déployé via OpenRouter |
| **Licence** | Apache 2.0 (open-weight) |

### 3.2 Métriques opérationnelles mesurées

Mesures réelles sur notre stack (réseau France, OpenRouter free tier) :

| Métrique | Valeur observée |
|---|---|
| Latence p50 (conseil court ~500 tokens) | **~3 s** |
| Latence p95 (plan repas complet ~2500 tokens) | **~25 s** |
| Throughput moyen | ~20 tokens/seconde |
| Taux de succès parsing JSON | 100 % (avec fallback regex `_extract_json`) |
| Taux d'erreur 502/429 (sur ~50 requêtes test) | < 2 % |
| Cohérence linguistique FR | 100 % (system prompt verrouille la langue) |

### 3.3 Évaluation qualitative

Pas de métrique automatique pour la qualité d'un conseil nutritionnel. Nous
avons procédé à une **évaluation manuelle** sur 10 cas-types :

| Critère | Note moyenne (échelle 1-5) |
|---|---|
| Pertinence des conseils par rapport à l'objectif user | 4,7 |
| Fraîcheur des aliments cités (français, courants) | 4,8 |
| Précision des grammages | 4,5 (parfois approximé) |
| Cohérence des macros estimés dans les plans | 4,2 (certains plats sous-estiment lipides) |
| Ton bienveillant et adapté | 5,0 |

### 3.4 Comparaison avec un système rule-based

Pour vérifier l'apport du LLM, nous avons aussi gardé un endpoint **rule-based**
(`/meal-plan` sans suffixe `-ai`). Comparaison sur 5 demandes identiques :

| Aspect | Rule-based (composition par catégorie) | LLM (gpt-oss) |
|---|---|---|
| Nom du plat | « Riz + Saumon + Brocoli » | « Salade tiède de quinoa au saumon poché » |
| Quantités | Macros moyennés de food_log | Grammages précis (« 120 g quinoa ») |
| Justification | Aucune | Phrase de conseil expliquant l'équilibre |
| Diversité culturelle | Limitée à 35 aliments en BDD | Très large (cuisine française, internationale) |
| Latence | < 50 ms | ~10-25 s |
| Coût opérationnel | 0 | 0 (free tier) |

→ Le LLM transforme l'expérience utilisateur, mais on garde le rule-based
comme **fallback** si OpenRouter est indisponible.

## 4. Métriques système (cache + rate-limit)

| Métrique | Valeur |
|---|---|
| Cache hit rate `/analyze` (TTL 1h, clé SHA-256) | ~30 % en usage typique (l'user re-photographie souvent le même plat) |
| Cache hit rate `_usda_cache` (in-memory) | ~60 % (les mêmes labels reviennent : « apple », « rice », …) |
| Quota OpenRouter free tier consommé | < 5 % par jour pour un user moyen |
| Rate-limit Django (10/min/user `/analyze`) | Jamais atteint en usage normal |

## 5. Interprétation pour la soutenance

- **Accuracy** : part de photos correctement reconnues du premier coup —
  métrique la plus parlante pour l'utilisateur.
- **Rappel** : capacité à ne pas « rater » une classe présente dans le jeu
  (important si certaines classes sont sous-représentées).
- **Précision** : limiter les fausses alertes (ex. confondre `pizza` et
  `flatbread`).
- **F1 macro** : synthèse équilibrée lorsque chaque classe n'a qu'une ou
  quelques photos.

## 6. Limites et axes d'amélioration

| Limite | Plan futur |
|---|---|
| Pas de fine-tuning sur cuisine française | Annotation d'un sous-dataset de plats FR + LoRA fine-tune sur ViT |
| Pas d'évaluation continue de drift | Logger ground-truth (correction user) → dashboard de précision réelle |
| LLM peut sous-estimer les lipides | Cross-check avec USDA après génération (TODO post-MSPR2) |
| Latence LLM 25 s sur plan complet | Migrer vers gpt-oss-20b plus rapide ; ou streaming UI |
| Pas d'A/B test conseil LLM vs rule-based | Toggle utilisateur + analytics |

## 7. Reproductibilité des métriques

```bash
# Précision/rappel/F1 du modèle vision sur le jeu étiqueté
python scripts/eval_food_model.py            # mode réel (images + modèle HF)
python scripts/eval_food_model.py --mock     # mode CI (sans modèle ni images)
# → rapport : reports/food_model_eval.json

# Latence + cohérence JSON du LLM
curl -X POST http://localhost:8001/meal-plan-ai \
  -H "Content-Type: application/json" \
  -d '{"goal":"weight_loss","calorie_target":1600,"meals_per_day":3}' \
  -w "Latence : %{time_total}s\n" -o /tmp/plan.json
python -c "import json; json.load(open('/tmp/plan.json'))" && echo "JSON valide"
```

**Traçabilité :**

- Code modèle vision : `nutrition-api/app.py` → `pipeline("image-classification", model="nateraw/food")`
- Code LLM : `nutrition-api/app.py` (`meal-plan-ai`, `coach-advice`) et `reco-engine/llm.py`
- Rapport JSON versionné localement : `reports/food_model_eval.json` (régénérable)
- Ne pas committer de gros dossiers d'images — seulement `labels.csv` et le README du dossier `images/`
