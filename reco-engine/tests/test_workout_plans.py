from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from bson import ObjectId
from fastapi.testclient import TestClient

from main import app


def test_save_and_list_workout_plans():
    store: dict = {}
    oid = ObjectId()

    mock_coll = MagicMock()

    def insert_one(doc):
        doc = dict(doc)
        doc['_id'] = oid
        store['doc'] = doc
        result = MagicMock()
        result.inserted_id = oid
        return result

    mock_cursor = MagicMock()

    def limit_fn(_n):
        return [store['doc']] if store.get('doc') else []

    mock_coll.insert_one.side_effect = insert_one
    mock_coll.find.return_value = mock_cursor
    mock_cursor.sort.return_value.limit.side_effect = limit_fn
    mock_coll.create_index = MagicMock()

    with patch('main.workout_plans_collection', return_value=mock_coll):
        client = TestClient(app)
        save = client.post(
            '/workout-plans',
            json={
                'user_id': 42,
                'username': 'alice',
                'title': 'Plan test',
                'plan': {'weekly_plan': []},
                'goal': 'general_health',
                'level': 'beginner',
            },
        )
        assert save.status_code == 201
        assert save.json()['id'] == str(oid)

        listing = client.get('/workout-plans', params={'user_id': 42})
        assert listing.status_code == 200
        assert len(listing.json()) == 1


def test_delete_workout_plan():
    oid = ObjectId()
    mock_coll = MagicMock()
    mock_coll.delete_one.return_value = MagicMock(deleted_count=1)
    mock_coll.create_index = MagicMock()

    with patch('main.workout_plans_collection', return_value=mock_coll):
        client = TestClient(app)
        resp = client.delete(f'/workout-plans/{oid}', params={'user_id': 7})

    assert resp.status_code == 204
    mock_coll.delete_one.assert_called_once()
