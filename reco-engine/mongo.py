"""MongoDB access for reco-engine (exercises catalog + saved workout_plans)."""
import os
from functools import lru_cache

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

MONGO_HOST = os.environ.get('MONGO_HOST', 'mongo')
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
    return MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)


def get_db() -> Database:
    return get_mongo_client()[MONGO_DB_NAME]


def exercises_collection() -> Collection:
    coll = get_db()['exercises']
    coll.create_index('exercise_id', unique=True)
    coll.create_index([('level', 1), ('equipment', 1)])
    return coll


def workout_plans_collection() -> Collection:
    coll = get_db()['workout_plans']
    coll.create_index([('user_id', 1), ('created_at', -1)])
    return coll
