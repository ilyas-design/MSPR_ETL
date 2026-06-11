# 05 — Métriques de performance IA (modèle vision alimentaire)

**Brief MSPR2 — Bloc E6.2** · Modèle servi par `nutrition-api` : [`nateraw/food`](https://huggingface.co/nateraw/food) (101 classes Food-101)

## Contexte

L'endpoint `POST /analyze` de `nutrition-api` classifie une photo de plat et retourne les **5 meilleures prédictions** avec scores de confiance. Pour la soutenance, nous mesurons la **qualité top-1** sur un petit jeu d'images étiquetées manuellement.

| Élément | Emplacement |
|---|---|
| Jeu d'évaluation | `eval_dataset/labels.csv` + `eval_dataset/images/` |
| Script de métriques | `scripts/eval_food_model.py` |
| Rapport JSON généré | `reports/food_model_eval.json` |
| Tests automatisés | `nutrition-api/tests/test_eval.py` |

## Métriques calculées

- **Accuracy** (exactitude top-1)
- **Précision / Rappel / F1** par classe (`per_class`)
- **Macro precision / recall / F1** (moyenne non pondérée sur les classes présentes dans le jeu)

Formules (classification mono-étiquette, prédiction top-1) :

- Précision(classe) = TP / (TP + FP)
- Rappel(classe) = TP / (TP + FN)
- F1(classe) = 2 × P × R / (P + R)

## Utilisation

### 1. Préparer le jeu de données

1. Ajouter des photos dans `eval_dataset/images/` (voir `eval_dataset/images/README.md`).
2. Compléter `eval_dataset/labels.csv` :

```csv
filename,true_label
mon_plat.jpg,apple_pie
```

Les libellés doivent correspondre aux classes Food-101 (`snake_case`).

### 2. Lancer l'évaluation

**Mode CI / sans téléchargement du modèle** (prédictions simulées, structure identique) :

```bash
python scripts/eval_food_model.py --mock
```

**Mode réel** (télécharge `nateraw/food` via Hugging Face Transformers, nécessite les images) :

```bash
python scripts/eval_food_model.py
```

Options utiles :

```bash
python scripts/eval_food_model.py --labels eval_dataset/labels.csv \
  --images-dir eval_dataset/images \
  --output reports/food_model_eval.json \
  --top-k 1
```

### 3. Tests automatisés

```bash
cd nutrition-api && pytest -v
```

Les tests couvrent le calcul des métriques et un run CLI `--mock` sans dépendance GPU/modèle.

## Résultats — mode mock (10 échantillons CSV, sans images)

Exécution de référence : `python scripts/eval_food_model.py --mock`

| Métrique | Valeur |
|---|---|
| Échantillons évalués | 10 / 10 |
| **Accuracy** | **0,8000** |
| **Macro precision** | **0,7273** |
| **Macro recall** | **0,7273** |
| **Macro F1** | **0,7273** |

Détail par classe (support = nombre d'images étiquetées pour la classe) :

| Classe | Précision | Rappel | F1 | Support |
|---|---:|---:|---:|---:|
| apple_pie | 1,0000 | 1,0000 | 1,0000 | 1 |
| baby_back_ribs | 1,0000 | 1,0000 | 1,0000 | 1 |
| baklava | 0,0000 | 0,0000 | 0,0000 | 1 |
| beef_carpaccio | 1,0000 | 1,0000 | 1,0000 | 1 |
| beet_salad | 1,0000 | 1,0000 | 1,0000 | 1 |
| beignets | 1,0000 | 1,0000 | 1,0000 | 1 |
| bibimbap | 0,0000 | 0,0000 | 0,0000 | 1 |
| bread_pudding | 1,0000 | 1,0000 | 1,0000 | 1 |
| breakfast_burrito | 1,0000 | 1,0000 | 1,0000 | 1 |
| bruschetta | 1,0000 | 1,0000 | 1,0000 | 1 |

> **Note :** le mode `--mock` injecte volontairement 2 erreurs (indices 2 et 6) pour valider le pipeline de métriques en CI. Ce ne sont **pas** les performances réelles du modèle.

## Résultats — mode live (à compléter)

Après ajout de photos réelles dans `eval_dataset/images/` :

```bash
python scripts/eval_food_model.py
```

Recopier ici les valeurs de `reports/food_model_eval.json` :

| Métrique | Valeur live |
|---|---|
| Accuracy | _à mesurer_ |
| Macro precision | _à mesurer_ |
| Macro recall | _à mesurer_ |
| Macro F1 | _à mesurer_ |

## Interprétation pour la soutenance

- **Accuracy** : part de photos correctement reconnues du premier coup — métrique la plus parlante pour l'utilisateur.
- **Rappel** : capacité à ne pas « rater » une classe présente dans le jeu (important si certaines classes sont sous-représentées).
- **Précision** : limiter les fausses alertes (ex. confondre `pizza` et `flatbread`).
- **F1 macro** : synthèse équilibrée lorsque chaque classe n'a qu'une ou quelques photos.

Limites connues :

- Jeu d'évaluation réduit tant que les photos annotées ne sont pas ajoutées (placeholder CSV fourni).
- Le modèle Food-101 est entraîné sur des photos de plats « studio » ; la performance peut baisser sur photos mobile/utilisateur.
- L'API renvoie top-5 ; l'évaluation mesure le **top-1** (aligné sur l'usage principal « meilleure prédiction »).

## Traçabilité

- Code modèle : `nutrition-api/app.py` → `pipeline("image-classification", model="nateraw/food")`
- Rapport JSON versionné localement : `reports/food_model_eval.json` (régénérable)
- Ne pas committer de gros dossiers d'images — seulement `labels.csv` et le README du dossier `images/`
