# Evaluation images — modèle vision alimentaire

Ce dossier contient les **photos étiquetées** utilisées par `scripts/eval_food_model.py`.

## Format attendu

- Fichiers image : `.jpg`, `.jpeg`, `.png` ou `.webp`
- Chaque ligne de `../labels.csv` référence un `filename` présent ici
- Libellé `true_label` : nom de classe **Food-101** (format `snake_case`, ex. `apple_pie`, `hamburger`)

Le modèle servi par `nutrition-api` est [`nateraw/food`](https://huggingface.co/nateraw/food) (101 classes Food-101).

## Ajouter des photos

1. Copier vos images dans ce dossier (éviter de committer de gros jeux de données).
2. Mettre à jour `../labels.csv` :

```csv
filename,true_label
ma_photo_01.jpg,apple_pie
ma_photo_02.jpg,bibimbap
```

3. Lancer l'évaluation :

```bash
python scripts/eval_food_model.py
```

En mode développement / CI sans images ni téléchargement du modèle :

```bash
python scripts/eval_food_model.py --mock
```

## Bonnes pratiques

- Viser **5 à 30 images minimum** pour un premier rapport, plus pour la soutenance
- Une ligne = une photo ; réutiliser la même classe sur plusieurs fichiers si possible
- Photographier des plats similaires à l'usage réel de l'app (Mobile, lumière naturelle)
