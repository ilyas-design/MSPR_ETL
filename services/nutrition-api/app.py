import asyncio
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
import httpx

DB_PATH = os.getenv("NUTRITION_API_DB_PATH", "/data/mspr_etl.db")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-120b:free")
# Marge large : le modèle (raisonnement) consomme des tokens avant le JSON,
# une limite trop basse tronque la réponse (cause n°1 des échecs intermittents).
OPENROUTER_MAX_TOKENS = int(os.getenv("OPENROUTER_MAX_TOKENS", "6000"))
LLM_MAX_ATTEMPTS = int(os.getenv("LLM_MAX_ATTEMPTS", "3"))
MOCK_IA = os.getenv("MOCK_IA", "").lower() in ("1", "true", "yes")
USDA_API_KEY = os.getenv("USDA_API_KEY")
USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"

_usda_cache: dict = {}


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
# AI — meal plan generation (algo amélioré : composition logique + français)
# ---------------------------------------------------------------------------

# Traduction FR pour tous les food_items et catégories actuels en BDD
FR_TRANSLATIONS = {
    # Beverages
    "Coffee": "Café",
    "Green Tea": "Thé vert",
    "Milkshake": "Milkshake",
    "Orange Juice": "Jus d'orange",
    "Water": "Eau",
    # Dairy
    "Butter": "Beurre",
    "Cheese": "Fromage",
    "Milk": "Lait",
    "Paneer": "Paneer (fromage indien)",
    "Yogurt": "Yaourt",
    # Fruits
    "Apple": "Pomme",
    "Banana": "Banane",
    "Grapes": "Raisin",
    "Orange": "Orange",
    "Strawberry": "Fraises",
    # Grains
    "Bread": "Pain",
    "Oats": "Flocons d'avoine",
    "Pasta": "Pâtes",
    "Quinoa": "Quinoa",
    "Rice": "Riz",
    # Meat
    "Beef Steak": "Steak de bœuf",
    "Chicken Breast": "Blanc de poulet",
    "Eggs": "Œufs",
    "Pork Chop": "Côte de porc",
    "Salmon": "Saumon",
    # Snacks
    "Chips": "Chips",
    "Chocolate": "Chocolat",
    "Cookies": "Biscuits",
    "Nuts": "Fruits à coque",
    "Popcorn": "Popcorn",
    # Vegetables
    "Broccoli": "Brocoli",
    "Carrot": "Carotte",
    "Potato": "Pomme de terre",
    "Spinach": "Épinards",
    "Tomato": "Tomate",
    # Categories
    "Beverages": "Boissons",
    "Dairy": "Produits laitiers",
    "Fruits": "Fruits",
    "Grains": "Féculents",
    "Meat": "Protéines",
    "Snacks": "En-cas",
    "Vegetables": "Légumes",
}

# Whitelist d'aliments adaptés à chaque type de repas (cohérence culturelle FR).
# On ne se fie PAS au meal_type de la BDD qui reflète juste les habitudes
# alimentaires d'un dataset US (ex. quinoa au petit-déj). On définit nous-mêmes
# ce qui est culturellement cohérent pour un utilisateur français.
MEAL_FOOD_WHITELIST = {
    "Breakfast": {
        "Grains":    ["Bread", "Oats"],                          # pain, avoine OK ; pas riz/pâtes/quinoa
        "Dairy":     ["Yogurt", "Milk", "Cheese"],               # yaourt, lait, fromage
        "Fruits":    ["Apple", "Banana", "Orange", "Strawberry", "Grapes"],
        "Beverages": ["Coffee", "Green Tea", "Orange Juice"],    # boisson chaude ou jus
        "Snacks":    ["Chocolate", "Cookies"],                   # tartine chocolat / biscuits
    },
    "Lunch": {
        "Meat":       ["Chicken Breast", "Beef Steak", "Pork Chop", "Salmon", "Eggs"],
        "Grains":     ["Rice", "Pasta", "Quinoa", "Bread"],
        "Vegetables": ["Broccoli", "Carrot", "Potato", "Spinach", "Tomato"],
    },
    "Dinner": {
        "Meat":       ["Chicken Breast", "Salmon", "Eggs"],      # protéines plus maigres
        "Vegetables": ["Broccoli", "Carrot", "Spinach", "Tomato"],
        "Grains":     ["Rice", "Pasta", "Quinoa"],               # féculent léger
    },
    "Snack": {
        "Fruits": ["Apple", "Banana", "Orange", "Strawberry", "Grapes"],
        "Dairy":  ["Yogurt"],
        "Snacks": ["Nuts", "Chocolate", "Popcorn"],
    },
}

# Composition logique d'un repas par type : (catégories à choisir, nb d'items).
MEAL_COMPOSITION = {
    "Breakfast": [
        (["Grains", "Snacks"], 1),  # 1 céréale OU une tartine chocolat
        (["Dairy"], 1),              # 1 produit laitier
        (["Fruits"], 1),             # 1 fruit
        (["Beverages"], 1),          # 1 boisson
    ],
    "Lunch": [
        (["Meat"], 1),               # 1 source protéique
        (["Grains"], 1),             # 1 féculent
        (["Vegetables"], 1),         # 1 légume
    ],
    "Dinner": [
        (["Meat"], 1),               # protéine maigre
        (["Vegetables"], 1),         # légumes en quantité
        (["Grains"], 1),             # féculent léger
    ],
    "Snack": [
        (["Fruits", "Snacks", "Dairy"], 1),  # 1 item léger
    ],
}

MEAL_LABELS_FR = {
    "Breakfast": "Petit-déjeuner",
    "Lunch": "Déjeuner",
    "Dinner": "Dîner",
    "Snack": "Collation",
}


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


def _fr(name: str) -> str:
    """Traduit un nom EN → FR, fallback sur le nom EN si inconnu."""
    return FR_TRANSLATIONS.get(name, name)


def _score_food(food: dict, goal: str) -> float:
    """Score un aliment selon l'objectif user."""
    cal = food["avg_calories"] or 0.0
    prot = food["avg_protein"] or 0.0
    fiber = food["avg_fiber"] or 0.0
    if goal == "weight_loss":
        return prot * 2.0 + fiber * 1.5 - cal * 0.01
    if goal == "muscle_gain":
        return prot * 3.0 - abs(cal - 400) * 0.01
    return prot + fiber  # maintenance / endurance


@app.post("/meal-plan", response_model=MealPlanResponse)
def generate_meal_plan(req: MealPlanRequest):
    """
    Génère un plan de repas RÉALISTE :
    - Compose chaque repas avec des catégories logiques (protéine + féculent + légume)
    - Filtre par meal_type (Breakfast / Lunch / Dinner / Snack) issu de food_log
    - Score les aliments selon l'objectif (perte/muscle/maintenance/endurance)
    - Traduit tout en français
    """
    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                food_item,
                category,
                meal_type,
                ROUND(AVG(calories_kcal), 1) AS avg_calories,
                ROUND(AVG(protein_g), 2)     AS avg_protein,
                ROUND(AVG(carbohydrates_g), 2) AS avg_carbs,
                ROUND(AVG(fat_g), 2)         AS avg_fat,
                ROUND(AVG(fiber_g), 2)       AS avg_fiber
            FROM food_log
            GROUP BY food_item, category, meal_type
        """).fetchall()

    candidates = [dict(r) for r in rows]

    # Filtre allergènes
    for allergen in req.allergies:
        allergen_lc = allergen.lower()
        candidates = [
            f for f in candidates
            if allergen_lc not in f["food_item"].lower()
            and allergen_lc not in (f["category"] or "").lower()
        ]

    # Restrictions diététiques basiques
    restrictions_lc = [r.lower() for r in req.restrictions]
    if "vegetarian" in restrictions_lc or "vegan" in restrictions_lc:
        candidates = [f for f in candidates if f["category"] != "Meat"]
    if "vegan" in restrictions_lc:
        candidates = [f for f in candidates if f["category"] != "Dairy"]

    # Trie par score décroissant (l'aliment le plus pertinent en premier)
    candidates.sort(key=lambda f: _score_food(f, req.goal), reverse=True)

    # Sélectionne la séquence des types de repas selon meals_per_day
    if req.meals_per_day == 3:
        meal_sequence = ["Breakfast", "Lunch", "Dinner"]
    elif req.meals_per_day == 4:
        meal_sequence = ["Breakfast", "Lunch", "Snack", "Dinner"]
    elif req.meals_per_day == 5:
        meal_sequence = ["Breakfast", "Snack", "Lunch", "Snack", "Dinner"]
    elif req.meals_per_day == 1:
        meal_sequence = ["Lunch"]
    elif req.meals_per_day == 2:
        meal_sequence = ["Lunch", "Dinner"]
    else:
        meal_sequence = (["Breakfast", "Lunch", "Dinner"] * req.meals_per_day)[:req.meals_per_day]

    meals = []
    total_cal = 0.0
    total_prot = 0.0
    used: set[str] = set()

    for meal_type in meal_sequence:
        meal_foods = []
        meal_cal = 0.0
        meal_prot = 0.0

        # Whitelist culturelle pour ce type de repas
        # (ex. au petit-déj on n'autorise PAS quinoa/riz/pâtes)
        whitelist = MEAL_FOOD_WHITELIST.get(meal_type, {})

        composition = MEAL_COMPOSITION.get(meal_type, [])
        for allowed_categories, count in composition:
            # Items autorisés = ceux dont la catégorie ET le nom sont dans la whitelist
            allowed_food_names = set()
            for cat in allowed_categories:
                allowed_food_names.update(whitelist.get(cat, []))

            picks = [
                f for f in candidates
                if f["category"] in allowed_categories
                and f["food_item"] in allowed_food_names
                and f["food_item"] not in used
            ][:count]
            for food in picks:
                meal_foods.append({
                    "food_item": _fr(food["food_item"]),
                    "food_item_en": food["food_item"],
                    "category": _fr(food["category"]),
                    "avg_calories": food["avg_calories"],
                    "avg_protein": food["avg_protein"],
                    "avg_carbs": food["avg_carbs"],
                    "avg_fat": food["avg_fat"],
                })
                used.add(food["food_item"])
                meal_cal += food["avg_calories"] or 0.0
                meal_prot += food["avg_protein"] or 0.0

        meals.append({
            "meal_type": meal_type,
            "meal_type_fr": MEAL_LABELS_FR.get(meal_type, meal_type),
            "foods": meal_foods,
            "total_calories": round(meal_cal, 1),
            "total_protein": round(meal_prot, 2),
        })
        total_cal += meal_cal
        total_prot += meal_prot

    return MealPlanResponse(
        goal=req.goal,
        calorie_target=req.calorie_target,
        meals=meals,
        total_calories=round(total_cal, 1),
        total_protein=round(total_prot, 1),
    )

# ---------------------------------------------------------------------------
# AI — macros lookup (cascade food_log → USDA)
# ---------------------------------------------------------------------------

class MacrosLookupRequest(BaseModel):
    labels: list[str]


class MacrosLookupItem(BaseModel):
    label: str
    pretty_label: str
    source: Optional[str]          # "food_log" | "usda" | None
    matched_name: Optional[str]
    macros: Optional[dict]


class MacrosLookupTotal(BaseModel):
    calories: float
    protein: float
    carbohydrates: float
    fat: float
    items_count: int


class MacrosLookupResponse(BaseModel):
    items: list[MacrosLookupItem]
    total: MacrosLookupTotal


async def _lookup_usda(label: str) -> tuple[Optional[str], Optional[dict]]:
    """
    Cherche un aliment sur USDA FoodData Central.
    Filtre dataType=Foundation/SR Legacy/Survey FNDDS pour avoir des valeurs
    par 100 g (et pas par portion industrielle des produits "Branded").
    """
    if not USDA_API_KEY:
        return None, None

    if label in _usda_cache:
        cached = _usda_cache[label]
        return cached if cached else (None, None)

    query = label.replace("_", " ").replace("-", " ").strip()

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                USDA_SEARCH_URL,
                params={
                    "query": query,
                    "api_key": USDA_API_KEY,
                    "pageSize": 1,
                    "dataType": ["Foundation", "SR Legacy", "Survey (FNDDS)"],
                },
            )
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        _usda_cache[label] = None
        return None, None

    foods = data.get("foods") or []
    if not foods:
        _usda_cache[label] = None
        return None, None

    food = foods[0]
    matched_name = food.get("description") or query

    nutrient_map = {
        "208": "calories",        # Energy (kcal)
        "203": "protein",         # Protein (g)
        "205": "carbohydrates",   # Carbohydrate, by difference (g)
        "204": "fat",             # Total lipid / fat (g)
    }
    macros = {
        "avg_calories": 0.0,
        "avg_protein": 0.0,
        "avg_carbohydrates": 0.0,
        "avg_fat": 0.0,
    }
    for n in food.get("foodNutrients", []):
        number = str(n.get("nutrientNumber", ""))
        if number in nutrient_map:
            value = n.get("value") or 0.0
            macros[f"avg_{nutrient_map[number]}"] = round(float(value), 2)

    _usda_cache[label] = (matched_name, macros)
    return matched_name, macros


@app.post("/macros/lookup", response_model=MacrosLookupResponse)
async def lookup_macros(req: MacrosLookupRequest):
    """
    Pour chaque label coché par l'utilisateur, cascade :
      1) food_log (fuzzy match sur la BDD ETL locale)
      2) USDA FoodData Central (fallback externe)
      3) null si rien trouvé

    Renvoie aussi le total agrégé pour les items dont les macros ont été trouvées.
    """
    # Charge food_log une seule fois
    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                food_item,
                ROUND(AVG(calories_kcal), 1)   AS avg_calories,
                ROUND(AVG(protein_g), 2)        AS avg_protein,
                ROUND(AVG(carbohydrates_g), 2)  AS avg_carbohydrates,
                ROUND(AVG(fat_g), 2)            AS avg_fat
            FROM food_log
            GROUP BY food_item
        """).fetchall()
    food_map = {row["food_item"].lower(): dict(row) for row in rows}

    items: list[MacrosLookupItem] = []
    total_cal = total_prot = total_carb = total_fat = 0.0
    items_count = 0

    for raw_label in req.labels:
        label = raw_label.strip()
        if not label:
            continue
        pretty = label.replace("_", " ").replace("-", " ").title()

        # 1) food_log
        matched, food_data = _fuzzy_match(label, food_map)
        macros = None
        source = None
        if food_data:
            macros = {
                "avg_calories": food_data["avg_calories"],
                "avg_protein": food_data["avg_protein"],
                "avg_carbohydrates": food_data["avg_carbohydrates"],
                "avg_fat": food_data["avg_fat"],
            }
            source = "food_log"

        # 2) USDA fallback
        if not macros:
            usda_name, usda_macros = await _lookup_usda(label)
            if usda_macros:
                matched = usda_name
                macros = usda_macros
                source = "usda"

        if macros:
            total_cal += macros.get("avg_calories") or 0.0
            total_prot += macros.get("avg_protein") or 0.0
            total_carb += macros.get("avg_carbohydrates") or 0.0
            total_fat += macros.get("avg_fat") or 0.0
            items_count += 1

        items.append(MacrosLookupItem(
            label=label,
            pretty_label=pretty,
            source=source,
            matched_name=matched,
            macros=macros,
        ))

    return MacrosLookupResponse(
        items=items,
        total=MacrosLookupTotal(
            calories=round(total_cal, 1),
            protein=round(total_prot, 2),
            carbohydrates=round(total_carb, 2),
            fat=round(total_fat, 2),
            items_count=items_count,
        ),
    )


# ---------------------------------------------------------------------------
# AI — coach advice (LLM via OpenRouter / gpt-oss)
# ---------------------------------------------------------------------------

GOAL_LABELS_FR = {
    "weight_loss": "perte de poids",
    "muscle_gain": "prise de masse musculaire",
    "endurance": "amélioration de l'endurance",
    "maintenance": "maintien de la forme",
    "general_health": "santé générale",
}


class CoachAdviceRequest(BaseModel):
    goal: str = "maintenance"
    goal_label: Optional[str] = None
    totals_today: dict
    targets: dict
    imbalances: list[dict] = []
    allergies: list[str] = []
    restrictions: list[str] = []


class CoachAdviceResponse(BaseModel):
    advice: str
    model: str


def _build_coach_prompt(req: CoachAdviceRequest) -> str:
    """Construit un prompt structuré pour le LLM."""
    goal_fr = GOAL_LABELS_FR.get(req.goal, req.goal)

    deficits = [i for i in req.imbalances if i.get("status") == "deficit"]
    excesses = [i for i in req.imbalances if i.get("status") == "excess"]

    def fmt_imb(items):
        return ", ".join(
            f"{i['nutrient']} ({i['eaten']}/{i['target']}, {i['percentage']}%)"
            for i in items
        )

    parts = [
        f"Objectif : {goal_fr}.",
        f"Apports aujourd'hui : {req.totals_today.get('calories', 0)} kcal, "
        f"{req.totals_today.get('protein', 0)} g protéines, "
        f"{req.totals_today.get('carbohydrates', 0)} g glucides, "
        f"{req.totals_today.get('fat', 0)} g lipides "
        f"(sur {req.totals_today.get('meals_count', 0)} repas).",
        f"Cibles journalières : {req.targets.get('calories', 0)} kcal, "
        f"{req.targets.get('protein', 0)} g protéines, "
        f"{req.targets.get('carbohydrates', 0)} g glucides, "
        f"{req.targets.get('fat', 0)} g lipides.",
    ]
    if deficits:
        parts.append(f"Déficits : {fmt_imb(deficits)}.")
    if excesses:
        parts.append(f"Excès : {fmt_imb(excesses)}.")
    if req.allergies:
        parts.append(f"Allergies : {', '.join(req.allergies)}.")
    if req.restrictions:
        parts.append(f"Restrictions : {', '.join(req.restrictions)}.")
    return "\n".join(parts)


@app.post("/coach-advice", response_model=CoachAdviceResponse)
async def coach_advice(req: CoachAdviceRequest):
    """
    Génère un conseil nutritionnel personnalisé via OpenRouter (gpt-oss).
    Utilise les données de l'utilisateur (apports, cibles, déséquilibres)
    pour produire 2-3 paragraphes de coaching en français.
    """
    if MOCK_IA:
        return CoachAdviceResponse(
            advice=(
                "Mode offline : privilégie une collation riche en protéines "
                "(150 g de fromage blanc 0 % ou 2 œufs) pour combler ton déficit. "
                "Ajoute des légumes verts au dîner pour les fibres."
            ),
            model="mock-offline",
        )

    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OPENROUTER_API_KEY non configurée. Ajoute-la au .env du service.",
        )

    user_data = _build_coach_prompt(req)

    system_prompt = (
        "Tu es un coach nutritionniste sympathique et pédagogue, qui s'adresse "
        "à l'utilisateur en français, à la 2e personne du singulier (tu). "
        "Tu donnes des conseils CONCRETS, ACTIONNABLES et BIENVEILLANTS. "
        "Tu cites des aliments précis avec leurs quantités (ex. \"100 g de "
        "blanc de poulet apporte 25 g de protéines\"). "
        "Tu réponds en 2 à 3 paragraphes courts, sans markdown, sans liste à puces, "
        "sans titres. Tu ne moralises pas. Tu ne diagnostiques aucune pathologie."
    )

    user_prompt = (
        f"Voici les données nutritionnelles de l'utilisateur pour aujourd'hui :\n\n"
        f"{user_data}\n\n"
        f"Donne-lui un conseil personnalisé pour la suite de la journée, "
        f"en tenant compte de son objectif et de ses déséquilibres."
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5174",
                    "X-Title": "HealthAI Coach MSPR2",
                },
                json={
                    "model": OPENROUTER_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 500,
                },
            )
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"OpenRouter a renvoyé une erreur : {exc.response.status_code} {exc.response.text[:200]}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Impossible de joindre OpenRouter : {exc}",
        )

    advice = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )
    if not advice:
        raise HTTPException(
            status_code=502,
            detail="OpenRouter n'a pas renvoyé de contenu.",
        )

    return CoachAdviceResponse(advice=advice, model=OPENROUTER_MODEL)


# ---------------------------------------------------------------------------
# AI — meal plan généré par LLM (vraies recettes avec ingrédients)
# ---------------------------------------------------------------------------

import json as _json
import re as _re


class MealPlanAIRequest(BaseModel):
    goal: str = "maintenance"
    calorie_target: int = 2000
    allergies: list[str] = []
    restrictions: list[str] = []
    meals_per_day: int = 3
    already_eaten_kcal: int = 0  # déjà consommé aujourd'hui


class MealPlanAIIngredient(BaseModel):
    item: str
    quantity: str


class MealPlanAIMeal(BaseModel):
    meal_type: str
    dish_name: str
    description: Optional[str] = None
    ingredients: list[MealPlanAIIngredient]
    estimated_calories: int
    estimated_protein: float
    estimated_carbs: Optional[float] = None
    estimated_fat: Optional[float] = None


class MealPlanAIResponse(BaseModel):
    meals: list[MealPlanAIMeal]
    total_calories: int
    total_protein: float
    advice: str
    model: str


def _extract_json(text: str) -> dict:
    """Récupère un objet JSON depuis la réponse LLM, même si markdown autour."""
    text = text.strip()
    try:
        return _json.loads(text)
    except _json.JSONDecodeError:
        pass
    # Extrait entre ```json ... ``` ou ``` ... ```
    match = _re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, _re.DOTALL)
    if match:
        return _json.loads(match.group(1))
    # Fallback : premier { ... dernier }
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        return _json.loads(text[start:end + 1])
    raise ValueError("Aucun JSON valide trouvé dans la réponse LLM.")


@app.post("/meal-plan-ai", response_model=MealPlanAIResponse)
async def meal_plan_ai(req: MealPlanAIRequest):
    """
    Génère un plan de repas via LLM (gpt-oss) avec de vraies recettes,
    ingrédients précis et grammages. Bien plus riche que le rule-based.
    """
    if MOCK_IA:
        return MealPlanAIResponse(
            meals=[
                MealPlanAIMeal(
                    meal_type="lunch",
                    dish_name="Déjeuner offline",
                    ingredients=[
                        MealPlanAIIngredient(name="Poulet grillé", quantity_g=120),
                        MealPlanAIIngredient(name="Riz complet cuit", quantity_g=150),
                    ],
                    estimated_calories=520,
                    estimated_protein=42.0,
                )
            ],
            total_calories=520,
            total_protein=42.0,
            advice="Plan statique de démonstration (sans appel OpenRouter).",
            model="mock-offline",
        )

    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OPENROUTER_API_KEY non configurée.",
        )

    goal_fr = GOAL_LABELS_FR.get(req.goal, req.goal)
    meal_count_label = (
        f"{req.meals_per_day} repas (petit-déjeuner, déjeuner, dîner)"
        if req.meals_per_day == 3
        else f"{req.meals_per_day} repas"
    )

    context_eaten = ""
    if req.already_eaten_kcal > 0:
        context_eaten = (
            f"L'utilisateur a déjà consommé {req.already_eaten_kcal} kcal aujourd'hui. "
            f"Le plan doit couvrir UNIQUEMENT le reste de la journée "
            f"({req.calorie_target} kcal restants). "
        )

    allergies_clause = (
        f"L'utilisateur est allergique à : {', '.join(req.allergies)}. " if req.allergies else ""
    )
    restrictions_clause = (
        f"Restrictions alimentaires : {', '.join(req.restrictions)}. " if req.restrictions else ""
    )

    system_prompt = (
        "Tu es un chef-nutritionniste français. Tu proposes des plats RÉELS, "
        "concrets, avec des grammages précis (ex. 100 g de blanc de poulet). "
        "Tu réponds UNIQUEMENT en JSON pur, SANS markdown, SANS commentaire, "
        "SANS texte avant ni après. Ton JSON doit être directement parsable."
    )

    user_prompt = f"""Génère un plan de repas pour aujourd'hui adapté à :
- Objectif : {goal_fr}
- Calories cibles : {req.calorie_target} kcal
- Nombre de repas : {meal_count_label}
- {context_eaten}{allergies_clause}{restrictions_clause}

Réponds en JSON STRICT avec cette structure exacte (et rien d'autre) :

{{
  "meals": [
    {{
      "meal_type": "Petit-déjeuner",
      "dish_name": "Nom du plat en français",
      "description": "Phrase courte décrivant le plat",
      "ingredients": [
        {{"item": "Flocons d'avoine", "quantity": "60 g"}},
        {{"item": "Yaourt grec 0%", "quantity": "200 g"}}
      ],
      "estimated_calories": 420,
      "estimated_protein": 28,
      "estimated_carbs": 55,
      "estimated_fat": 12
    }}
  ],
  "total_calories": 1850,
  "total_protein": 130,
  "advice": "Phrase de conseil global pour ce plan, adapté à l'objectif."
}}

Important : meal_type doit être l'un de "Petit-déjeuner", "Déjeuner", "Dîner", "Collation".
Plats français réalistes, plaisants, équilibrés. Pas de répétitions entre repas."""

    # Boucle de retry : le tier `:free` rate-limite (429) et le modèle de
    # raisonnement renvoie parfois une réponse vide/tronquée. On réessaie.
    last_error: Exception | None = None
    for attempt in range(LLM_MAX_ATTEMPTS):
        try:
            async with httpx.AsyncClient(timeout=100.0) as client:
                resp = await client.post(
                    OPENROUTER_URL,
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:5174",
                        "X-Title": "HealthAI Coach MSPR2",
                    },
                    json={
                        "model": OPENROUTER_MODEL,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.7,
                        "max_tokens": OPENROUTER_MAX_TOKENS,
                    },
                )
            resp.raise_for_status()
            data = resp.json()
            # OpenRouter peut renvoyer HTTP 200 avec un corps {"error": ...}
            # (rate-limit ou erreur provider) — à retenter, pas à parser.
            if data.get("error"):
                raise ValueError(f"OpenRouter: {data['error']}")
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            if not content:
                raise ValueError("Réponse LLM vide.")
            parsed = _extract_json(content)
            parsed["model"] = OPENROUTER_MODEL
            return MealPlanAIResponse(**parsed)
        except Exception as exc:  # on retente tout échec transitoire (429, timeout, JSON tronqué)
            last_error = exc
            if attempt < LLM_MAX_ATTEMPTS - 1:
                await asyncio.sleep(1.5 * (attempt + 1))  # backoff progressif

    raise HTTPException(
        status_code=502,
        detail=f"Génération du plan repas échouée après {LLM_MAX_ATTEMPTS} tentatives : {last_error}",
    )

# Workout recommendation moved to reco-engine (POST /workout-plan-ai on port 8002).
