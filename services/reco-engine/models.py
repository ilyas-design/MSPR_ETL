from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


MAX_LIST_ITEMS = 20
MAX_STRING_LEN = 200


class RecentSession(BaseModel):
    focus: str = Field(default='', max_length=50)
    date: str = Field(default='', max_length=30)
    duration_min: Optional[int] = Field(default=None, ge=0, le=600)


class RecommendRequest(BaseModel):
    goal: str = Field(default='general_health', max_length=50)
    experience_level: str = Field(default='beginner', max_length=30)
    equipment: list[str] = Field(default_factory=list, max_length=MAX_LIST_ITEMS)
    limitations: list[str] = Field(default_factory=list, max_length=MAX_LIST_ITEMS)
    recent_sessions: list[RecentSession] = Field(default_factory=list, max_length=10)
    session_duration_min: int = Field(default=45, ge=10, le=180)
    count: int = Field(default=8, ge=1, le=30)

    @field_validator('equipment', 'limitations', mode='before')
    @classmethod
    def validate_string_list(cls, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError('must be a list')
        if len(value) > MAX_LIST_ITEMS:
            raise ValueError(f'max {MAX_LIST_ITEMS} items')
        cleaned = []
        for item in value:
            text = str(item)
            if len(text) > MAX_STRING_LEN:
                raise ValueError(f'max {MAX_STRING_LEN} characters per item')
            cleaned.append(text)
        return cleaned


class ScoredExercise(BaseModel):
    exercise_id: int
    name: str
    body_part: str
    target: str
    equipment: str
    level: str
    score: float
    reasons: list[str]


class RecommendResponse(BaseModel):
    recommendations: list[ScoredExercise]
    criteria_applied: dict[str, Any]


class WorkoutPlanAIRequest(BaseModel):
    goal: str = Field(default='general_health', max_length=50)
    level: str = Field(default='beginner', max_length=30)
    days_per_week: int = Field(default=3, ge=1, le=7)
    session_duration_min: int = Field(default=45, ge=10, le=180)
    equipment: list[str] = Field(default_factory=list, max_length=MAX_LIST_ITEMS)
    location: str = Field(default='home', max_length=30)
    preferences: list[str] = Field(default_factory=list, max_length=MAX_LIST_ITEMS)
    limitations: list[str] = Field(default_factory=list, max_length=MAX_LIST_ITEMS)
    recent_sessions: list[dict[str, Any]] = Field(default_factory=list, max_length=10)


class WorkoutExercise(BaseModel):
    name: str
    sets: Optional[int] = None
    reps: Optional[str] = None
    rest_seconds: Optional[int] = None
    notes: Optional[str] = None


class WorkoutSessionAI(BaseModel):
    day_label: str
    focus: str
    estimated_duration_min: int
    estimated_calories: int
    warm_up: list[str]
    exercises: list[WorkoutExercise]
    cool_down: list[str]


class WorkoutPlanAIResponse(BaseModel):
    weekly_plan: list[WorkoutSessionAI]
    progression_tips: str
    rotation_note: Optional[str] = None
    model: str


class WorkoutPlanSaveRequest(BaseModel):
    user_id: int = Field(ge=1)
    username: str = Field(max_length=150)
    title: str = Field(default="Plan d'entraînement IA", max_length=200)
    plan: dict[str, Any]
    goal: Optional[str] = Field(default=None, max_length=50)
    level: Optional[str] = Field(default=None, max_length=30)


class WorkoutPlanDocument(BaseModel):
    id: str
    user_id: int
    username: str
    title: str
    plan: dict[str, Any]
    goal: Optional[str] = None
    level: Optional[str] = None
    created_at: datetime
