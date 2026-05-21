import contextlib
import io
import os
import sqlite3

from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel
from transformers import pipeline

DB_PATH = os.getenv("NUTRITION_API_DB_PATH", "/data/mspr_etl.db")

_classifier = None


def get_classifier():
    global _classifier
    if _classifier is None:
        _classifier = pipeline("image-classification", model="nateraw/food")
    return _classifier


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_classifier()
    yield


app = FastAPI(title="Nutrition AI API", version="1.0.0", lifespan=lifespan)


@contextlib.contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Data endpoints — read from ETL SQLite
# ---------------------------------------------------------------------------

@app.get("/foods")
def list_foods():
    """Distinct food items with averaged macro-nutrients from the food_log table."""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                food_item,
                category,
                ROUND(AVG(calories_kcal), 1)    AS avg_calories,
                ROUND(AVG(protein_g), 2)         AS avg_protein,
                ROUND(AVG(carbohydrates_g), 2)   AS avg_carbohydrates,
                ROUND(AVG(fat_g), 2)             AS avg_fat,
                ROUND(AVG(fiber_g), 2)           AS avg_fiber,
                ROUND(AVG(sugars_g), 2)          AS avg_sugars,
                COUNT(*)                         AS log_count
            FROM food_log
            GROUP BY food_item, category
            ORDER BY food_item
        """).fetchall()
    return [dict(r) for r in rows]


@app.get("/exercises")
def list_exercises():
    """Full exercise catalog from the exercise table."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT exercise_id, name, body_part, target, equipment, level, instructions "
            "FROM exercise ORDER BY name"
        ).fetchall()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# AI — image food classification
# ---------------------------------------------------------------------------

class FoodPrediction(BaseModel):
    label: str
    score: float
    matched_food: Optional[str]
    macros: Optional[dict]


def _fuzzy_match(label: str, food_map: dict) -> tuple[Optional[str], Optional[dict]]:
    """Token overlap between a food-101 label and food_log food names."""
    label_tokens = set(label.replace("-", " ").replace("_", " ").lower().split())
    best_name = None
    best_score = 0.0
    for food_name in food_map:
        food_tokens = set(food_name.lower().split())
        union = len(label_tokens | food_tokens)
        if union == 0:
            continue
        overlap = len(label_tokens & food_tokens) / union
        if overlap > best_score:
            best_score = overlap
            best_name = food_name
    if best_score >= 0.2 and best_name:
        return best_name.title(), food_map[best_name]
    return None, None


@app.post("/analyze", response_model=list[FoodPrediction])
async def analyze_image(file: UploadFile = File(...)):
    """
    Classify a food image using nateraw/food (food-101).
    Returns top-5 predictions with confidence scores and matched macro-nutrients.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="Uploaded file must be an image.")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=422, detail="Cannot decode image file.")

    results = get_classifier()(image, top_k=5)

    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                food_item,
                ROUND(AVG(calories_kcal), 1)  AS avg_calories,
                ROUND(AVG(protein_g), 2)       AS avg_protein,
                ROUND(AVG(carbohydrates_g), 2) AS avg_carbohydrates,
                ROUND(AVG(fat_g), 2)           AS avg_fat
            FROM food_log
            GROUP BY food_item
        """).fetchall()

    food_map = {row["food_item"].lower(): dict(row) for row in rows}

    predictions = []
    for r in results:
        matched_food, food_data = _fuzzy_match(r["label"], food_map)
        macros = None
        if food_data:
            macros = {
                "avg_calories": food_data["avg_calories"],
                "avg_protein": food_data["avg_protein"],
                "avg_carbohydrates": food_data["avg_carbohydrates"],
                "avg_fat": food_data["avg_fat"],
            }
        predictions.append(FoodPrediction(
            label=r["label"],
            score=round(r["score"], 4),
            matched_food=matched_food,
            macros=macros,
        ))

    return predictions


# ---------------------------------------------------------------------------
# AI — meal plan generation
# ---------------------------------------------------------------------------

class MealPlanRequest(BaseModel):
    goal: str = "maintenance"
    calorie_target: int = 2000
    allergies: list[str] = []
    restrictions: list[str] = []
    meals_per_day: int = 3


class MealPlanResponse(BaseModel):
    goal: str
    calorie_target: int
    meals: list[dict]
    total_calories: float
    total_protein: float


@app.post("/meal-plan", response_model=MealPlanResponse)
def generate_meal_plan(req: MealPlanRequest):
    """
    Generate a scored meal plan from the food_log dataset.
    Scoring weights calories and protein according to the user's goal.
    """
    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                food_item,
                category,
                ROUND(AVG(calories_kcal), 1) AS avg_calories,
                ROUND(AVG(protein_g), 2)     AS avg_protein,
                ROUND(AVG(carbohydrates_g), 2) AS avg_carbs,
                ROUND(AVG(fat_g), 2)         AS avg_fat,
                ROUND(AVG(fiber_g), 2)       AS avg_fiber
            FROM food_log
            GROUP BY food_item, category
        """).fetchall()

    candidates = [dict(r) for r in rows]

    # Remove foods matching allergen substrings
    for allergen in req.allergies:
        allergen_lc = allergen.lower()
        candidates = [
            f for f in candidates
            if allergen_lc not in f["food_item"].lower()
            and allergen_lc not in (f["category"] or "").lower()
        ]

    def score_food(food: dict) -> float:
        cal = food["avg_calories"] or 0.0
        prot = food["avg_protein"] or 0.0
        fiber = food["avg_fiber"] or 0.0
        if req.goal == "weight_loss":
            return prot * 2.0 + fiber * 1.5 - cal * 0.01
        if req.goal == "muscle_gain":
            return prot * 3.0 - abs(cal - 400) * 0.01
        # maintenance / endurance: balanced
        return prot + fiber

    candidates.sort(key=score_food, reverse=True)

    budget_per_meal = req.calorie_target / max(req.meals_per_day, 1)
    meal_labels = ["Breakfast", "Lunch", "Dinner", "Snack"]
    meals = []
    total_cal = 0.0
    total_prot = 0.0
    used: set[str] = set()

    for i in range(req.meals_per_day):
        meal_foods = []
        meal_cal = 0.0
        for food in candidates:
            if food["food_item"] in used:
                continue
            food_cal = food["avg_calories"] or 0.0
            if meal_cal + food_cal <= budget_per_meal * 1.2:
                meal_foods.append(food)
                meal_cal += food_cal
                used.add(food["food_item"])
            if meal_cal >= budget_per_meal * 0.8:
                break

        meals.append({
            "meal_type": meal_labels[i % len(meal_labels)],
            "foods": meal_foods,
            "total_calories": round(meal_cal, 1),
        })
        total_cal += meal_cal
        total_prot += sum(f["avg_protein"] or 0.0 for f in meal_foods)

    return MealPlanResponse(
        goal=req.goal,
        calorie_target=req.calorie_target,
        meals=meals,
        total_calories=round(total_cal, 1),
        total_protein=round(total_prot, 1),
    )
