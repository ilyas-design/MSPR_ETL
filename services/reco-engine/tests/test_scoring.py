from unittest.mock import MagicMock, patch

import pytest

from scoring import (
    _equipment_matches,
    _injury_blocks,
    _level_allowed,
    score_exercises,
)


@pytest.mark.parametrize(
    ('available', 'equipment', 'expected'),
    [
        ([], 'body weight', True),
        (['dumbbell'], 'dumbbell', True),
        (['dumbbell'], 'body weight', False),
    ],
)
def test_equipment_matches(available, equipment, expected):
    assert _equipment_matches(available, equipment) is expected


@pytest.mark.parametrize(
    ('user_level', 'exercise_level', 'expected'),
    [
        ('beginner', 'beginner', True),
        ('beginner', 'advanced', False),
        ('advanced', 'beginner', True),
    ],
)
def test_level_allowed(user_level, exercise_level, expected):
    assert _level_allowed(user_level, exercise_level) is expected


def test_injury_blocks_knee_exercises():
    exercise = {'name': 'squat', 'body_part': 'legs', 'target': 'quadriceps'}
    assert _injury_blocks(exercise, ['genou']) is True
    assert _injury_blocks(exercise, ['dos']) is False


def test_score_exercises_respects_limitations(sample_exercises):
    mock_coll = MagicMock()
    mock_coll.find.return_value = sample_exercises

    with patch('scoring.exercises_collection', return_value=mock_coll):
        results = score_exercises(
            {
                'goal': 'general_health',
                'experience_level': 'beginner',
                'equipment': ['body weight'],
                'limitations': ['genou'],
                'count': 5,
            }
        )

    names = [item['name'] for item in results]
    assert 'push-up' in names
    assert 'bodyweight squat' not in names
    assert all('score' in item for item in results)


def test_score_exercises_prefers_goal_aligned_body_parts(sample_exercises):
    mock_coll = MagicMock()
    mock_coll.find.return_value = sample_exercises

    with patch('scoring.exercises_collection', return_value=mock_coll):
        results = score_exercises(
            {
                'goal': 'muscle_gain',
                'experience_level': 'intermediate',
                'equipment': ['dumbbell'],
                'limitations': [],
                'count': 3,
            }
        )

    assert results
    assert results[0]['score'] >= results[-1]['score']
