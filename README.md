# Lancer l'ETL

Ce dépôt contient un script `etl.py` qui charge et nettoie trois fichiers CSV.

Prérequis
- Python 3.8+
- pip

Installation (recommandé)
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Exemples d'exécution
- Exécuter en utilisant le dossier du script (par défaut les CSV doivent être dans le même dossier que `etl.py`) :
```bash
python etl.py
```
- Spécifier explicitement le dossier contenant les CSV :
```bash
python etl.py --data-dir /chemin/vers/dossier_avec_csv
```

Remarques
- Le script vérifie la présence de `daily_food_nutrition.csv`, `diet_recommendations.csv` et `gym_members_exercise.csv` avant de démarrer.
- `pyspark` démarre Spark en mode local par défaut. Pour une exécution sur un cluster, configurez `SPARK_HOME` et les options Spark appropriées.
- Évitez les espaces superflus dans les chemins.

Si vous souhaitez, je peux aussi ajouter un petit script shell `run_etl.sh` pour automatiser l'activation du venv et le lancement.# MSPT_ETL_2
