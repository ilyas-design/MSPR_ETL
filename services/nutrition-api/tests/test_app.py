import io
import sqlite3
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from PIL import Image


def _make_test_db(db_path):
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        CREATE TABLE food_log (
            food_item TEXT,
            category TEXT,
            meal_type TEXT,
            calories_kcal REAL,
            protein_g REAL,
            carbohydrates_g REAL,
            fat_g REAL,
            fiber_g REAL
        )
        """
    )
    conn.executemany(
        """
        INSERT INTO food_log VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            ('Chicken Breast', 'Meat', 'Lunch', 165, 31, 0, 3.6, 0),
            ('Rice', 'Grains', 'Lunch', 130, 2.7, 28, 0.3, 0.4),
            ('Broccoli', 'Vegetables', 'Lunch', 55, 3.7, 11, 0.6, 5),
            ('Apple', 'Fruits', 'Snack', 95, 0.5, 25, 0.3, 4.4),
            ('Oatmeal', 'Grains', 'Breakfast', 150, 5, 27, 3, 4),
            ('Yogurt', 'Dairy', 'Breakfast', 100, 10, 8, 2, 0),
        ],
    )
    conn.commit()
    conn.close()


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_path = tmp_path / 'nutrition_test.db'
    _make_test_db(db_path)
    monkeypatch.setattr('app.DB_PATH', str(db_path))

    from app import app as nutrition_app

    with TestClient(nutrition_app) as test_client:
        yield test_client


def test_health(client):
    resp = client.get('/health')
    assert resp.status_code == 200
    assert resp.json()['status'] == 'ok'


def test_analyze_returns_predictions(client, mock_classifier):
    image = Image.new('RGB', (64, 64), color='red')
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG')
    buffer.seek(0)

    resp = client.post(
        '/analyze',
        files={'file': ('meal.jpg', buffer.getvalue(), 'image/jpeg')},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]['label'] == 'apple_pie'
    assert 'score' in data[0]
    mock_classifier.assert_called_once()


def test_analyze_rejects_non_image(client):
    resp = client.post(
        '/analyze',
        files={'file': ('notes.txt', b'not-an-image', 'text/plain')},
    )
    assert resp.status_code == 422


def test_meal_plan_response_shape(client):
    resp = client.post(
        '/meal-plan',
        json={
            'goal': 'maintenance',
            'calorie_target': 2000,
            'allergies': [],
            'restrictions': [],
            'meals_per_day': 3,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data['goal'] == 'maintenance'
    assert data['calorie_target'] == 2000
    assert isinstance(data['meals'], list)
    assert len(data['meals']) >= 1
    assert 'total_calories' in data
    assert 'total_protein' in data
    meal = data['meals'][0]
    assert 'meal_type' in meal
    assert 'foods' in meal
