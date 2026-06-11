"""
Connexion MongoDB pour stocker les documents flexibles (plans de repas IA).

Pourquoi MongoDB en plus de PostgreSQL :
- PostgreSQL → données structurées et transactionnelles (auth, profil, MealEntry)
- MongoDB    → documents JSON flexibles (plans de repas IA : structure imbriquée,
              champs dynamiques selon le modèle LLM, schéma qui peut évoluer)

Le mix SQL + NoSQL est un point fort architecture pour la soutenance MSPR2.
"""
import os
from functools import lru_cache

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

MONGO_HOST = os.environ.get('MONGO_HOST', 'localhost')
MONGO_PORT = os.environ.get('MONGO_PORT', '27017')
MONGO_USER = os.environ.get('MONGO_USER', 'healthai')
MONGO_PASSWORD = os.environ.get('MONGO_PASSWORD', 'healthai')
MONGO_DB_NAME = os.environ.get('MONGO_DB_NAME', 'healthai_plans')


def _default_mongo_uri() -> str:
    return (
        f'mongodb://{MONGO_USER}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/'
        f'{MONGO_DB_NAME}?authSource=admin'
    )


MONGO_URI = os.environ.get('MONGO_URI') or _default_mongo_uri()


@lru_cache(maxsize=1)
def get_mongo_client() -> MongoClient:
    """Singleton client — évite de réouvrir une connexion par requête."""
    return MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)


def get_db() -> Database:
    return get_mongo_client()[MONGO_DB_NAME]


def meal_plans_collection() -> Collection:
    """Collection des plans de repas générés par l'IA."""
    coll = get_db()['meal_plans']
    # Index utiles pour les requêtes user-scoped
    coll.create_index([('user_id', 1), ('created_at', -1)])
    return coll
