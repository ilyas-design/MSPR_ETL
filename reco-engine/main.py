"""reco-engine — activity recommendation microservice (MSPR2 Chantier 2).

Architecture:
- MongoDB: `exercises` (seeded catalog) + `workout_plans` (saved user plans)
- Django remains the JWT gateway; it proxies to this service on the Docker network
"""
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, HTTPException, Query
from pymongo.errors import PyMongoError

from llm import generate_workout_plan_ai
from models import (
    RecommendRequest,
    RecommendResponse,
    ScoredExercise,
    WorkoutPlanAIRequest,
    WorkoutPlanAIResponse,
    WorkoutPlanDocument,
    WorkoutPlanSaveRequest,
)
from mongo import workout_plans_collection
from scoring import score_exercises
from seed import seed_exercises

app = FastAPI(
    title='HealthAI Reco Engine',
    description='Rule-based activity recommendations + LLM workout plans (MongoDB)',
    version='1.0.0',
)


@app.on_event('startup')
def on_startup():
    try:
        seed_exercises()
    except PyMongoError:
        pass


@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'reco-engine'}


@app.post('/recommend', response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    try:
        results = score_exercises(req.model_dump())
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail=f'MongoDB inaccessible : {exc}') from exc

    return RecommendResponse(
        recommendations=[ScoredExercise(**item) for item in results],
        criteria_applied={
            'goal': req.goal,
            'experience_level': req.experience_level,
            'session_duration_min': req.session_duration_min,
            'equipment_filter': req.equipment,
            'limitations_filter': req.limitations,
        },
    )


@app.post('/workout-plan-ai', response_model=WorkoutPlanAIResponse)
async def workout_plan_ai(req: WorkoutPlanAIRequest):
    try:
        return await generate_workout_plan_ai(req)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f'LLM indisponible : {exc}') from exc


def _serialize_plan(doc: dict) -> WorkoutPlanDocument:
    created = doc.get('created_at')
    if created and created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return WorkoutPlanDocument(
        id=str(doc['_id']),
        user_id=doc['user_id'],
        username=doc.get('username', ''),
        title=doc.get('title', ''),
        plan=doc.get('plan', {}),
        goal=doc.get('goal'),
        level=doc.get('level'),
        created_at=created or datetime.now(timezone.utc),
    )


@app.get('/workout-plans', response_model=list[WorkoutPlanDocument])
def list_workout_plans(user_id: int = Query(..., ge=1)):
    try:
        cursor = (
            workout_plans_collection()
            .find({'user_id': user_id})
            .sort('created_at', -1)
            .limit(50)
        )
        return [_serialize_plan(doc) for doc in cursor]
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail=f'MongoDB inaccessible : {exc}') from exc


@app.post('/workout-plans', response_model=WorkoutPlanDocument, status_code=201)
def save_workout_plan(req: WorkoutPlanSaveRequest):
    document = {
        'user_id': req.user_id,
        'username': req.username,
        'title': req.title,
        'plan': req.plan,
        'goal': req.goal,
        'level': req.level,
        'created_at': datetime.now(timezone.utc),
    }
    try:
        result = workout_plans_collection().insert_one(document)
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail=f'MongoDB inaccessible : {exc}') from exc
    document['_id'] = result.inserted_id
    return _serialize_plan(document)


@app.delete('/workout-plans/{plan_id}', status_code=204)
def delete_workout_plan(plan_id: str, user_id: int = Query(..., ge=1)):
    try:
        oid = ObjectId(plan_id)
    except InvalidId as exc:
        raise HTTPException(status_code=400, detail='ID invalide.') from exc
    try:
        result = workout_plans_collection().delete_one({'_id': oid, 'user_id': user_id})
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail=f'MongoDB inaccessible : {exc}') from exc
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Plan introuvable.')
    return None
