# 05 — Métriques de performance IA (modèle vision alimentaire)

Modèle servi par `nutrition-api` : [`nateraw/food`](https://huggingface.co/nateraw/food) (101 classes Food-101).

## Contexte

`POST /analyze` classifie une photo de plat et retourne les 5 meilleures
prédictions avec un score de confiance. Pour la soutenance, on mesure la
qualité top-1 sur un petit jeu d'images étiquetées manuellement.

| Élément | Emplacement |
|---|---|
| Jeu d'évaluation | `eval_dataset/labels.csv` + `eval_dataset/images/` |
| Script de métriques | `scripts/eval_food_model.py` |
| Rapport généré | `reports/food_model_eval.json` |
| Tests | `nutrition-api/tests/test_eval.py` |

## Métriques calculées

- Accuracy (exactitude top-1)
- Précision / rappel / F1 par classe
- Précision / rappel / F1 macro (moyenne non pondérée sur les classes présentes)

Formules (classification mono-étiquette, prédiction top-1) :
précision = TP / (TP + FP), rappel = TP / (TP + FN), F1 = 2 × P × R / (P + R).

## Utilisation

1. Ajouter des photos dans `eval_dataset/images/` et compléter
   `eval_dataset/labels.csv` :

```csv
filename,true_label
mon_plat.jpg,apple_pie
```

Les libellés doivent correspondre aux classes Food-101 (`snake_case`).

2. Lancer l'évaluation :

```bash
# mode mock — prédictions simulées, sans téléchargement du modèle (CI)
python scripts/eval_food_model.py --mock

# mode réel — télécharge nateraw/food, nécessite les images
python scripts/eval_food_model.py --labels eval_dataset/labels.csv \
  --images-dir eval_dataset/images \
  --output reports/food_model_eval.json --top-k 1
```

3. Tests :

```bash
cd nutrition-api && pytest -v
```

## Résultats — mode mock (10 échantillons, sans images)

| Métrique | Valeur |
|---|---|
| Échantillons évalués | 10 / 10 |
| Accuracy | 0,80 |
| Macro precision | 0,727 |
| Macro recall | 0,727 |
| Macro F1 | 0,727 |

Détail par classe (support = nombre d'images étiquetées) :

| Classe | Précision | Rappel | F1 | Support |
|---|---:|---:|---:|---:|
| apple_pie | 1,00 | 1,00 | 1,00 | 1 |
| baby_back_ribs | 1,00 | 1,00 | 1,00 | 1 |
| baklava | 0,00 | 0,00 | 0,00 | 1 |
| beef_carpaccio | 1,00 | 1,00 | 1,00 | 1 |
| beet_salad | 1,00 | 1,00 | 1,00 | 1 |
| beignets | 1,00 | 1,00 | 1,00 | 1 |
| bibimbap | 0,00 | 0,00 | 0,00 | 1 |
| bread_pudding | 1,00 | 1,00 | 1,00 | 1 |
| breakfast_burrito | 1,00 | 1,00 | 1,00 | 1 |
| bruschetta | 1,00 | 1,00 | 1,00 | 1 |

Le mode `--mock` injecte volontairement 2 erreurs (indices 2 et 6) pour
valider le pipeline de métriques en CI — ce ne sont pas les performances
réelles du modèle.

## Résultats — mode live (à compléter)

Une fois des photos réelles ajoutées dans `eval_dataset/images/`, relancer
`python scripts/eval_food_model.py` et reporter les valeurs de
`reports/food_model_eval.json` :

| Métrique | Valeur live |
|---|---|
| Accuracy | _à mesurer_ |
| Macro precision | _à mesurer_ |
| Macro recall | _à mesurer_ |
| Macro F1 | _à mesurer_ |

## Interprétation

- **Accuracy** : part de photos reconnues du premier coup — la métrique la
  plus parlante pour l'utilisateur.
- **Rappel** : capacité à ne pas rater une classe présente dans le jeu.
- **Précision** : limiter les fausses alertes (ex. confondre pizza et
  flatbread).
- **F1 macro** : synthèse équilibrée quand chaque classe n'a qu'une ou deux
  photos.

Limites connues : jeu d'évaluation réduit tant que les photos ne sont pas
ajoutées ; Food-101 est entraîné sur des photos "studio", la performance
peut baisser sur des photos prises au téléphone ; l'API renvoie un top-5
mais l'évaluation porte sur le top-1.

## Traçabilité

- Code modèle : `nutrition-api/app.py` → `pipeline("image-classification", model="nateraw/food")`
- Rapport JSON régénérable : `reports/food_model_eval.json`
- Ne pas committer de gros dossiers d'images — seulement `labels.csv` et le README de `images/`
