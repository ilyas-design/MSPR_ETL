import api from './client';
import { USE_MOCKS } from '../config';
import {
  mockHealthProfile,
  mockCoachAdvice,
  mockAnalyzeMeal,
  mockMealPlanAI,
  mockWorkoutPlanAI,
  mockRecommendationsToday,
  mockMeals,
  mockWorkouts,
  mockSavedMealPlans,
  mockSavedWorkoutPlans,
  mockMealsToday,
  mockWorkoutsToday,
  mockMealsSummary,
  mockWorkoutsSummary,
  buildMockLookup,
  addMockMeal,
  deleteMockMeal,
  addMockWorkout,
  deleteMockWorkout,
  addMockSavedMealPlan,
  deleteMockSavedMealPlan,
  addMockSavedWorkoutPlan,
  deleteMockSavedWorkoutPlan,
} from './mockData';

const LLM_TIMEOUT = 120_000;
const ANALYZE_TIMEOUT = 90_000;

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

function guessMediaType(uri) {
  const lower = (uri || '').toLowerCase();
  if (lower.match(/\.png$/)) return 'image/png';
  if (lower.match(/\.gif$/)) return 'image/gif';
  return 'image/jpeg';
}

function fileFromUri(uri) {
  const type = guessMediaType(uri);
  const ext = type.split('/')[1] || 'jpg';
  const name = uri.split('/').pop() || `meal.${ext}`;
  return { uri, name, type };
}

function aggregateMacrosFromPredictions(labels, predictions) {
  const predByLabel = Object.fromEntries(predictions.map((p) => [p.label, p]));
  const items = labels.map((label) => {
    const pred = predByLabel[label];
    const pretty = label.replace(/_/g, ' ').replace(/-/g, ' ');
    if (pred?.macros) {
      return {
        label,
        pretty_label: pretty,
        matched_name: pred.matched_food || pretty,
        macros: {
          avg_calories: pred.macros.avg_calories,
          avg_protein: pred.macros.avg_protein,
          avg_carbohydrates: pred.macros.avg_carbs ?? pred.macros.avg_carbohydrates,
          avg_fat: pred.macros.avg_fat,
        },
        source: pred.matched_food ? 'food_log' : 'usda',
      };
    }
    return { label, pretty_label: pretty, macros: null };
  });

  let calories = 0;
  let protein = 0;
  let carbohydrates = 0;
  let fat = 0;
  let items_count = 0;
  items.forEach((item) => {
    if (item.macros) {
      calories += item.macros.avg_calories || 0;
      protein += item.macros.avg_protein || 0;
      carbohydrates += item.macros.avg_carbohydrates || 0;
      fat += item.macros.avg_fat || 0;
      items_count += 1;
    }
  });

  return {
    items,
    total: {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbohydrates: Math.round(carbohydrates * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      items_count,
    },
  };
}

// ============================================================
// Profil santé (Django)
// ============================================================

export async function getMyProfile() {
  if (USE_MOCKS) {
    await delay();
    return { ...mockHealthProfile };
  }
  const { data } = await api.get('/me/profile/');
  return data;
}

export async function updateMyProfile(updates) {
  if (USE_MOCKS) {
    await delay();
    Object.assign(mockHealthProfile, updates);
    return { ...mockHealthProfile };
  }
  const { data } = await api.patch('/me/profile/', updates);
  return data;
}

// ============================================================
// Repas
// ============================================================

export async function saveMeal(mealData) {
  if (USE_MOCKS) {
    await delay();
    return addMockMeal(mealData);
  }
  const { data } = await api.post('/me/meals/', mealData);
  return data;
}

export async function getMyMeals() {
  if (USE_MOCKS) {
    await delay();
    return [...mockMeals];
  }
  const { data } = await api.get('/me/meals/');
  return data;
}

export async function getMealsToday() {
  if (USE_MOCKS) {
    await delay();
    return mockMealsToday();
  }
  const { data } = await api.get('/me/meals/today/');
  return data;
}

export async function getMealsSummary(days = 14) {
  if (USE_MOCKS) {
    await delay();
    return mockMealsSummary(days);
  }
  const { data } = await api.get(`/me/meals/summary/?days=${days}`);
  return data;
}

export async function deleteMeal(mealId) {
  if (USE_MOCKS) {
    await delay();
    deleteMockMeal(mealId);
    return;
  }
  await api.delete(`/me/meals/${mealId}/`);
}

// ============================================================
// Recommandations
// ============================================================

export async function getRecommendationsToday() {
  if (USE_MOCKS) {
    await delay();
    return mockRecommendationsToday;
  }
  const { data } = await api.get('/me/recommendations/today/');
  return data;
}

// ============================================================
// IA — analyse & plans (via Django proxy)
// ============================================================

export async function analyzeMealPhoto(imageUri) {
  if (USE_MOCKS) {
    await delay(800);
    return mockAnalyzeMeal;
  }
  const form = new FormData();
  form.append('file', fileFromUri(imageUri));
  const { data } = await api.post('/ai/analyze/', form, {
    timeout: ANALYZE_TIMEOUT,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Agrège les macros depuis les prédictions d'analyse (Django /ai/analyze/).
 * Le site web appelle nutrition-api/macros/lookup directement ; sur mobile
 * on reconstruit le total depuis les prédictions renvoyées par Django.
 */
export async function lookupMacros(labels, predictions = []) {
  if (USE_MOCKS) {
    await delay();
    return buildMockLookup(labels, predictions);
  }
  return aggregateMacrosFromPredictions(labels, predictions);
}

export async function generateMealPlan(params) {
  if (USE_MOCKS) {
    await delay(600);
    return mockMealPlanAI;
  }
  const { data } = await api.post('/ai/meal-plan/', params);
  return data;
}

export async function generateMealPlanAI(params = {}) {
  const body = {
    goal: 'maintenance',
    calorie_target: 2000,
    meals_per_day: 3,
    allergies: [],
    restrictions: [],
    already_eaten_kcal: 0,
    ...params,
  };
  if (USE_MOCKS) {
    await delay(1000);
    return mockMealPlanAI;
  }
  const { data } = await api.post('/ai/meal-plan-ai/', body, { timeout: LLM_TIMEOUT });
  return data;
}

export async function generateWorkoutPlanAI(params = {}) {
  const body = {
    goal: 'general_health',
    level: 'beginner',
    days_per_week: 3,
    session_duration_min: 45,
    equipment: [],
    location: 'home',
    limitations: [],
    ...params,
  };
  if (USE_MOCKS) {
    await delay(1000);
    return mockWorkoutPlanAI;
  }
  const { data } = await api.post('/ai/workout-plan-ai/', body, { timeout: LLM_TIMEOUT });
  return data;
}

export async function getCoachAdvice() {
  if (USE_MOCKS) {
    await delay();
    return mockCoachAdvice;
  }
  const { data } = await api.post('/me/coach-advice/', {}, { timeout: LLM_TIMEOUT });
  return data;
}

// ============================================================
// Plans repas sauvegardés
// ============================================================

export async function saveMealPlan(plan, meta = {}) {
  if (USE_MOCKS) {
    await delay();
    return addMockSavedMealPlan(plan, meta);
  }
  const { data } = await api.post('/me/meal-plans/', {
    plan,
    title: meta.title,
    goal: meta.goal,
    calorie_target: meta.calorie_target,
  });
  return data;
}

export async function listSavedPlans() {
  if (USE_MOCKS) {
    await delay();
    return [...mockSavedMealPlans];
  }
  const { data } = await api.get('/me/meal-plans/');
  return data;
}

export async function getSavedPlan(planId) {
  if (USE_MOCKS) {
    await delay();
    return mockSavedMealPlans.find((p) => p.id === planId);
  }
  const { data } = await api.get(`/me/meal-plans/${planId}/`);
  return data;
}

export async function deleteSavedPlan(planId) {
  if (USE_MOCKS) {
    await delay();
    deleteMockSavedMealPlan(planId);
    return;
  }
  await api.delete(`/me/meal-plans/${planId}/`);
}

// ============================================================
// Plans entraînement sauvegardés
// ============================================================

export async function saveWorkoutPlan(plan, meta = {}) {
  if (USE_MOCKS) {
    await delay();
    return addMockSavedWorkoutPlan(plan, meta);
  }
  const { data } = await api.post('/me/workout-plans/', {
    plan,
    title: meta.title,
    goal: meta.goal,
    level: meta.level,
  });
  return data;
}

export async function listSavedWorkoutPlans() {
  if (USE_MOCKS) {
    await delay();
    return [...mockSavedWorkoutPlans];
  }
  const { data } = await api.get('/me/workout-plans/');
  return data;
}

export async function deleteSavedWorkoutPlan(planId) {
  if (USE_MOCKS) {
    await delay();
    deleteMockSavedWorkoutPlan(planId);
    return;
  }
  await api.delete(`/me/workout-plans/${planId}/`);
}

// ============================================================
// Séances d'entraînement
// ============================================================

export async function logWorkoutSession(sessionData) {
  if (USE_MOCKS) {
    await delay();
    return addMockWorkout(sessionData);
  }
  const { data } = await api.post('/me/workouts/', sessionData);
  return data;
}

export async function getMyWorkouts() {
  if (USE_MOCKS) {
    await delay();
    return [...mockWorkouts];
  }
  const { data } = await api.get('/me/workouts/');
  return data;
}

export async function getWorkoutsToday() {
  if (USE_MOCKS) {
    await delay();
    return mockWorkoutsToday();
  }
  const { data } = await api.get('/me/workouts/today/');
  return data;
}

export async function getWorkoutsSummary(days = 14) {
  if (USE_MOCKS) {
    await delay();
    return mockWorkoutsSummary(days);
  }
  const { data } = await api.get(`/me/workouts/summary/?days=${days}`);
  return data;
}

export async function deleteWorkoutSession(workoutId) {
  if (USE_MOCKS) {
    await delay();
    deleteMockWorkout(workoutId);
    return;
  }
  await api.delete(`/me/workouts/${workoutId}/`);
}
