from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from main import app


def test_health():
    client = TestClient(app)
    resp = client.get('/health')
    assert resp.status_code == 200
    assert resp.json()['service'] == 'reco-engine'


def test_recommend_filters_equipment_and_limitations(sample_exercises):
    mock_coll = MagicMock()
    mock_coll.find.return_value = sample_exercises

    with patch('scoring.exercises_collection', return_value=mock_coll):
        client = TestClient(app)
        resp = client.post(
            '/recommend',
            json={
                'goal': 'general_health',
                'experience_level': 'beginner',
                'equipment': ['body weight'],
                'limitations': ['genou'],
                'session_duration_min': 45,
                'count': 5,
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    names = [item['name'] for item in data['recommendations']]
    assert 'push-up' in names
    assert 'bodyweight squat' not in names
    assert 'dumbbell row' not in names


def test_recommend_rejects_oversize_payload():
    client = TestClient(app)
    resp = client.post(
        '/recommend',
        json={
            'equipment': ['x' * 300] * 25,
        },
    )
    assert resp.status_code == 422
