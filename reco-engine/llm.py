"""LLM workout plan generation (OpenRouter) — moved from nutrition-api."""
from __future__ import annotations

import json
import os
from typing import Any, Callable, Optional

import httpx

from models import WorkoutPlanAIRequest, WorkoutPlanAIResponse

OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'openai/gpt-oss-120b:free')
OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

WORKOUT_GOAL_LABELS_FR = {
    'weight_loss': 'perte de graisse — cardio modéré et polyarticulaires',
    'muscle_gain': 'prise de masse — hypertrophie 8-12 reps',
    'muscle_mass': 'prise de masse — hypertrophie 8-12 reps',
    'strength': 'force — séries lourdes 3-6 reps',
    'endurance': 'endurance — cardio progressif et HIIT',
    'general_health': 'santé générale — équilibre cardio et renforcement',
    'maintenance': 'maintien — programme équilibré',
}


def _extract_json(content: str) -> dict[str, Any]:
    text = content.strip()
    if text.startswith('```'):
        lines = text.splitlines()
        lines = lines[1:]
        if lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        text = '\n'.join(lines).strip()
    return json.loads(text)


async def generate_workout_plan_ai(
    req: WorkoutPlanAIRequest,
    *,
    llm_post: Optional[Callable[..., Any]] = None,
) -> WorkoutPlanAIResponse:
    if not OPENROUTER_API_KEY and llm_post is None:
        raise RuntimeError('OPENROUTER_API_KEY non configurée.')

    goal_fr = WORKOUT_GOAL_LABELS_FR.get(req.goal, req.goal)
    equipment_clause = (
        f"Équipement : {', '.join(req.equipment)}."
        if req.equipment
        else 'Poids du corps uniquement.'
    )
    limitations_clause = (
        f"Limitations : {', '.join(req.limitations)}. Les éviter."
        if req.limitations
        else ''
    )
    history_clause = ''
    if req.recent_sessions:
        summary = '; '.join(
            f"{s.get('focus', '?')} le {str(s.get('date', ''))[:10]}"
            for s in req.recent_sessions[:5]
        )
        history_clause = f'Séances récentes : {summary}. Varier les focus.'

    system_prompt = (
        'Coach sportif francophone. Réponds UNIQUEMENT en JSON pur, sans markdown.'
    )
    user_prompt = f"""Plan HEBDOMADAIRE :
- Objectif : {goal_fr}
- Niveau : {req.level}
- Lieu : {req.location}
- {equipment_clause}
- {req.days_per_week} séances/semaine, {req.session_duration_min} min/séance
- {limitations_clause}
- {history_clause}

JSON strict :
{{"weekly_plan":[{{"day_label":"...","focus":"...","estimated_duration_min":45,"estimated_calories":280,"warm_up":["..."],"exercises":[{{"name":"...","sets":3,"reps":"10-12","rest_seconds":60}}],"cool_down":["..."]}}],"progression_tips":"...","rotation_note":"..."}}"""

    if llm_post is not None:
        parsed = await llm_post(system_prompt, user_prompt)
    else:
        async with httpx.AsyncClient(timeout=100.0) as client:
            resp = await client.post(
                OPENROUTER_URL,
                headers={
                    'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': OPENROUTER_MODEL,
                    'messages': [
                        {'role': 'system', 'content': system_prompt},
                        {'role': 'user', 'content': user_prompt},
                    ],
                    'temperature': 0.7,
                    'max_tokens': 3000,
                },
            )
        resp.raise_for_status()
        data = resp.json()
        content = data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
        if not content:
            raise RuntimeError('Réponse LLM vide.')
        parsed = _extract_json(content)

    parsed['model'] = OPENROUTER_MODEL
    return WorkoutPlanAIResponse(**parsed)
