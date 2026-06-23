"""Rule-based multi-criteria exercise scoring (Mongo catalog)."""
from __future__ import annotations

from typing import Any

from mongo import exercises_collection

LEVEL_RANK = {'beginner': 1, 'intermediate': 2, 'advanced': 3}

GOAL_BODY_PARTS = {
    'weight_loss': {'cardio', 'legs', 'waist', 'full body'},
    'muscle_gain': {'chest', 'back', 'legs', 'shoulders', 'arms'},
    'muscle_mass': {'chest', 'back', 'legs', 'shoulders', 'arms'},
    'strength': {'back', 'legs', 'chest'},
    'endurance': {'cardio', 'legs', 'waist'},
    'general_health': {'chest', 'back', 'legs', 'waist', 'cardio'},
    'maintenance': {'chest', 'back', 'legs', 'waist'},
}

INJURY_KEYWORDS = {
    'genou': {'legs', 'quadriceps', 'quads', 'knee'},
    'knee': {'legs', 'quadriceps', 'quads', 'knee'},
    'dos': {'back', 'lats', 'spine'},
    'back': {'back', 'lats', 'spine'},
    'epaule': {'shoulders', 'delts', 'shoulder'},
    'shoulder': {'shoulders', 'delts', 'shoulder'},
    'poignet': {'wrist', 'forearms'},
    'wrist': {'wrist', 'forearms'},
}


def _normalize(text: str) -> str:
    return (text or '').strip().lower()


def _equipment_matches(available: list[str], exercise_equipment: str) -> bool:
    if not available:
        return _normalize(exercise_equipment) in ('body weight', 'bodyweight', '')
    avail = {_normalize(x) for x in available}
    eq = _normalize(exercise_equipment)
    if eq in ('body weight', 'bodyweight'):
        return any('body' in a or 'poids' in a or not a for a in avail)
    return any(eq in a or a in eq for a in avail)


def _level_allowed(user_level: str, exercise_level: str) -> bool:
    user_rank = LEVEL_RANK.get(_normalize(user_level), 1)
    ex_rank = LEVEL_RANK.get(_normalize(exercise_level), 1)
    return ex_rank <= user_rank + 1


def _injury_blocks(exercise: dict[str, Any], limitations: list[str]) -> bool:
    blob = ' '.join(
        [
            _normalize(exercise.get('body_part', '')),
            _normalize(exercise.get('target', '')),
            _normalize(exercise.get('name', '')),
        ]
    )
    for limitation in limitations:
        key = _normalize(limitation)
        blocked = INJURY_KEYWORDS.get(key, {key})
        if any(term in blob for term in blocked):
            return True
    return False


def _recent_focus_penalty(exercise: dict[str, Any], recent_sessions: list[dict]) -> float:
    if not recent_sessions:
        return 0.0
    body = _normalize(exercise.get('body_part', ''))
    last_focus = _normalize(recent_sessions[0].get('focus', ''))
    if not last_focus or not body:
        return 0.0
    if last_focus in body or body in last_focus:
        return 15.0
    return 0.0


def score_exercises(criteria: dict[str, Any]) -> list[dict[str, Any]]:
    goal = _normalize(criteria.get('goal', 'general_health'))
    level = _normalize(criteria.get('experience_level', 'beginner'))
    equipment = criteria.get('equipment') or []
    limitations = criteria.get('limitations') or []
    recent = criteria.get('recent_sessions') or []
    count = int(criteria.get('count') or 8)

    preferred_parts = GOAL_BODY_PARTS.get(goal, GOAL_BODY_PARTS['general_health'])
    scored: list[dict[str, Any]] = []

    for doc in exercises_collection().find():
        if not _equipment_matches(equipment, doc.get('equipment', '')):
            continue
        if not _level_allowed(level, doc.get('level', 'beginner')):
            continue
        if _injury_blocks(doc, limitations):
            continue

        score = 50.0
        reasons: list[str] = []

        body_part = _normalize(doc.get('body_part', ''))
        if body_part in preferred_parts or any(p in body_part for p in preferred_parts):
            score += 25.0
            reasons.append(f'aligné objectif {goal}')

        ex_level = _normalize(doc.get('level', 'beginner'))
        if ex_level == level:
            score += 10.0
            reasons.append('niveau adapté')

        penalty = _recent_focus_penalty(doc, recent)
        if penalty:
            score -= penalty
            reasons.append('rotation (focus récent)')

        scored.append(
            {
                'exercise_id': doc['exercise_id'],
                'name': doc['name'],
                'body_part': doc.get('body_part', ''),
                'target': doc.get('target', ''),
                'equipment': doc.get('equipment', ''),
                'level': doc.get('level', ''),
                'score': round(max(score, 0.0), 1),
                'reasons': reasons or ['critères de base OK'],
            }
        )

    scored.sort(key=lambda x: x['score'], reverse=True)
    return scored[:count]
