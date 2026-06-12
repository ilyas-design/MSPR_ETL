# 05 — Métriques de performance des modèles IA

> Section IV du brief — *"Les métriques de performance des modèles IA devront être fournies (ex. précision, rappel, F1-score)."*

## 1. Modèles utilisés

| Domaine | Modèle | Type | Provider |
|---|---|---|---|
| Vision (reconnaissance d'aliments) | `nateraw/food` (architecture ViT) | Classification d'images | Hugging Face |
| Recommandations / Coaching (texte) | `openai/gpt-oss-120b` (MoE 117B params) | LLM génératif | OpenRouter (open-weight) |

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

### 2.3 Métriques mesurées dans notre stack

Le pipeline `transformers.pipeline("image-classification", model="nateraw/food")`
expose un score de confiance par classe pour chaque image :

```python
results = classifier(image, top_k=5)
# [{'label': 'spaghetti_bolognese', 'score': 0.79},
#  {'label': 'lasagna',             'score': 0.08},
#  ...]
```

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
> du modèle, vérifiables sur la model card Hugging Face. Pour un projet en
> production, on instrumenterait une boucle d'évaluation continue avec
> labels validés par l'utilisateur (correction de la prédiction = ground
> truth, calcul drift dans le temps).

### 2.4 Limites identifiées

- **Plats composés** : Food-101 classifie une image en **une seule** classe.
  Si l'assiette contient saumon + riz + brocoli, le modèle ne renvoie que
  la classe dominante. → Mitigation : workflow checkboxes côté front
  qui permet à l'user de cocher plusieurs aliments + l'endpoint
  `/macros/lookup` qui agrège les macros par cascade.
- **Plats français non Food-101** : pas de "ratatouille", "blanquette",
  etc. → Mitigation : fallback USDA via lookup direct sur le label texte.
- **Photo bruitée** (low-light, flou) : dégradation rapide du score top-1.
  → Mitigation : seuil de confiance affiché à l'utilisateur, qui décide.

## 3. Métriques LLM — gpt-oss-120b

### 3.1 Caractéristiques du modèle

| Caractéristique | Valeur |
|---|---|
| **Paramètres totaux** | 117 milliards (Mixture of Experts) |
| **Paramètres actifs / forward pass** | 5,1 milliards (activations sparse, gain coût) |
| **Architecture** | MoE Transformer décodeur |
| **Contexte max** | 131 072 tokens |
| **Connaissance** | Jusqu'à juin 2024 |
| **Provider** | OpenAI open-weight, déployé sur OpenInference via OpenRouter |
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
| Fraicheur des aliments cités (français, courants) | 4,8 |
| Précision des grammages | 4,5 (parfois approximé) |
| Cohérence des macros estimés dans les plans | 4,2 (certains plats sous-estiment lipides) |
| Ton bienveillant et adapté | 5,0 |

### 3.4 Comparaison avec un système rule-based

Pour vérifier l'apport du LLM, nous avons aussi gardé un endpoint **rule-based**
(`/meal-plan` sans suffixe `-ai`). Comparaison sur 5 demandes identiques :

| Aspect | Rule-based (composition par catégorie) | LLM (gpt-oss) |
|---|---|---|
| Nom du plat | "Riz + Saumon + Brocoli" | "Salade tiède de quinoa au saumon poché" |
| Quantités | Macros moyennés de food_log | Grammages précis ("120 g quinoa") |
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
| Cache hit rate `_usda_cache` (in-memory) | ~60 % (les mêmes labels reviennent : "apple", "rice", ...) |
| Quota OpenRouter free tier consommé | < 5 % par jour pour un user moyen |
| Rate-limit Django (10/min/user `/analyze`) | Jamais atteint en usage normal |

## 5. Limites et axes d'amélioration

| Limite | Plan futur |
|---|---|
| Pas de fine-tuning sur cuisine française | Annotation d'un sous-dataset de plats FR + LoRA fine-tune sur ViT |
| Pas d'évaluation continue de drift | Logger ground-truth (correction user) → dashboard de précision réelle |
| LLM peut sous-estimer les lipides | Cross-check avec USDA après génération (TODO post-MSPR2) |
| Latence LLM 25 s sur plan complet | Migrer vers gpt-oss-20b plus rapide ; ou streaming UI (afficher progressivement) |
| Pas de A/B test conseil LLM vs rule-based | Mettre en place un toggle utilisateur + analytics |

## 6. Reproductibilité des métriques

Pour re-mesurer les métriques de notre côté :

```bash
# Test vision (latence + précision sur N images)
cd nutrition-api/
docker run --rm nutrition-api python -c "
import time, glob
from app import get_classifier
clf = get_classifier()
for path in glob.glob('test_images/*.jpg'):
    t = time.time()
    r = clf(path, top_k=5)
    print(f'{path}: {r[0][\"label\"]} ({r[0][\"score\"]:.2f}) en {(time.time()-t)*1000:.0f}ms')
"

# Test LLM (latence + cohérence JSON)
curl -X POST http://localhost:8001/meal-plan-ai \
  -H "Content-Type: application/json" \
  -d '{"goal":"weight_loss","calorie_target":1600,"meals_per_day":3}' \
  -w "Latence : %{time_total}s\n" -o /tmp/plan.json
python -c "import json; json.load(open('/tmp/plan.json'))" && echo "JSON valide"
```
