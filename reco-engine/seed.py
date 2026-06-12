"""Seed MongoDB exercises collection from SQLite ETL catalog (read-only)."""
import json
import os
import sqlite3
from pathlib import Path

from mongo import exercises_collection

DB_PATH = os.environ.get('RECO_ENGINE_DB_PATH', '/data/mspr_etl.db')
LOCAL_EXERCISES_JSON = Path(__file__).resolve().parent / 'exercises.json'


def _load_from_sqlite() -> list[dict]:
    if not os.path.isfile(DB_PATH):
        return []
    conn = sqlite3.connect(f'file:{DB_PATH}?mode=ro', uri=True)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            'SELECT exercise_id, name, body_part, target, equipment, level, instructions '
            'FROM exercise ORDER BY exercise_id'
        ).fetchall()
    finally:
        conn.close()
    return [
        {
            'exercise_id': row['exercise_id'],
            'name': row['name'],
            'body_part': row['body_part'] or '',
            'target': row['target'] or '',
            'equipment': row['equipment'] or 'body weight',
            'level': row['level'] or 'beginner',
            'instructions': row['instructions'] or '',
            'met': 5.0,
            'calories_per_hour': 300,
        }
        for row in rows
    ]


def _load_from_json_fallback() -> list[dict]:
    if not LOCAL_EXERCISES_JSON.is_file():
        return []
    data = json.loads(LOCAL_EXERCISES_JSON.read_text(encoding='utf-8'))
    docs = []
    for item in data:
        docs.append(
            {
                'exercise_id': item['id'],
                'name': item['name'],
                'body_part': item.get('bodyPart', ''),
                'target': item.get('target', ''),
                'equipment': item.get('equipment', 'body weight'),
                'level': item.get('level', 'beginner'),
                'instructions': item.get('instructions', ''),
                'met': 5.0,
                'calories_per_hour': 300,
            }
        )
    return docs


def seed_exercises(force: bool = False) -> int:
    coll = exercises_collection()
    if not force and coll.estimated_document_count() > 0:
        return coll.estimated_document_count()

    docs = _load_from_sqlite() or _load_from_json_fallback()
    if not docs:
        return 0

    coll.delete_many({})
    coll.insert_many(docs)
    return len(docs)


if __name__ == '__main__':
    count = seed_exercises()
    print(f'Seeded {count} exercises into MongoDB')
