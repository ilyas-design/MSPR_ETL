from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from llm import generate_workout_plan_ai
from main import app
from models import WorkoutExercise, WorkoutPlanAIResponse, WorkoutSessionAI


def test_workout_plan_ai_mock_llm():
    fake = WorkoutPlanAIResponse(
        weekly_plan=[
            WorkoutSessionAI(
                day_label='Jour 1',
                focus='Full body',
                estimated_duration_min=45,
                estimated_calories=250,
                warm_up=['Marche 5 min'],
                exercises=[
                    WorkoutExercise(name='Squats', sets=3, reps='10', rest_seconds=60),
                ],
                cool_down=['Étirements'],
            )
        ],
        progression_tips='Augmente les reps progressivement.',
        rotation_note='Change le focus la semaine prochaine.',
        model='mock-model',
    )

    with patch(
        'main.generate_workout_plan_ai',
        new=AsyncMock(return_value=fake),
    ):
        client = TestClient(app)
        resp = client.post(
            '/workout-plan-ai',
            json={'goal': 'general_health', 'level': 'beginner', 'days_per_week': 3},
        )

    assert resp.status_code == 200
    assert resp.json()['weekly_plan'][0]['day_label'] == 'Jour 1'


def test_workout_plan_ai_no_api_key_returns_503():
    with patch('llm.OPENROUTER_API_KEY', ''):
        client = TestClient(app)
        resp = client.post('/workout-plan-ai', json={'goal': 'endurance'})
    assert resp.status_code == 503
