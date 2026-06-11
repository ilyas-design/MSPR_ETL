import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_exercises():
    return [
        {
            'exercise_id': 1,
            'name': 'push-up',
            'body_part': 'chest',
            'target': 'pectorals',
            'equipment': 'body weight',
            'level': 'beginner',
            'instructions': '...',
        },
        {
            'exercise_id': 2,
            'name': 'bodyweight squat',
            'body_part': 'legs',
            'target': 'quadriceps',
            'equipment': 'body weight',
            'level': 'beginner',
            'instructions': '...',
        },
        {
            'exercise_id': 4,
            'name': 'dumbbell row',
            'body_part': 'back',
            'target': 'lats',
            'equipment': 'dumbbell',
            'level': 'intermediate',
            'instructions': '...',
        },
    ]
