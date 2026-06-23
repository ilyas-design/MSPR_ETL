/**
 * Jeu de données mocké pour le mode démo hors-ligne (EXPO_PUBLIC_USE_MOCKS=1).
 */

let nextId = 100;
let nextMealId = 10;
let nextWorkoutId = 20;
let nextPlanId = 1;

export const mockProfile = {
  username: 'demo',
  display_name: 'Utilisateur Démo',
  avatar_url: null,
};

export const mockHealthProfile = {
  first_name: 'Démo',
  goal: 'general_health',
  experience_level: 'beginner',
  dietary_restrictions: 'none',
  allergies: '',
  equipment_available: 'tapis, haltères',
  injuries: [],
  meal_budget: 80,
  age: 28,
  gender: 'M',
  height_cm: 175,
  weight_kg: 72,
  target_weight_kg: 70,
  daily_calorie_target: 2000,
  bmi: 23.5,
  onboarded: true,
};

export const mockFeed = [
  {
    id: 1,
    author: { id: 2, username: 'sarah', display_name: 'Sarah K.', avatar_url: null },
    text: 'Première séance HIIT de la semaine terminée ! 450 kcal brûlées 🔥',
    media_url: null,
    media_type: '',
    like_count: 12,
    comment_count: 2,
    liked_by_me: false,
    created_at: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 2,
    author: { id: 3, username: 'marc', display_name: 'Marc D.', avatar_url: null },
    text: 'Mon petit-déj équilibré du jour. Objectif prise de muscle 💪',
    media_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600',
    media_type: 'image',
    like_count: 28,
    comment_count: 5,
    liked_by_me: true,
    created_at: new Date(Date.now() - 7200_000).toISOString(),
  },
];

const mockComments = {
  1: [
    {
      id: 11,
      author: { id: 3, username: 'marc', display_name: 'Marc D.', avatar_url: null },
      text: 'Bravo, continue comme ça !',
      created_at: new Date(Date.now() - 3000_000).toISOString(),
    },
  ],
  2: [],
};

export const mockMeals = [
  {
    id: 1,
    meal_type: 'lunch',
    analyzed_at: new Date(Date.now() - 86400_000).toISOString(),
    total_calories: 520,
    total_protein: 42,
    total_carbohydrates: 48,
    total_fat: 14,
    detected_foods: [
      {
        label: 'chicken_rice',
        pretty_label: 'Poulet riz',
        matched_name: 'chicken_rice',
        source: 'food_log',
      },
    ],
  },
  {
    id: 2,
    meal_type: 'breakfast',
    analyzed_at: new Date().toISOString(),
    total_calories: 380,
    total_protein: 18,
    total_carbohydrates: 42,
    total_fat: 12,
    detected_foods: [
      {
        label: 'oatmeal',
        pretty_label: 'Oatmeal',
        matched_name: 'oatmeal',
        source: 'food_log',
      },
    ],
  },
];

export const mockWorkouts = [
  {
    id: 1,
    focus: 'full',
    focus_label: '🏋️ Full body',
    duration_min: 45,
    estimated_calories: 280,
    difficulty_rating: 3,
    notes: 'Séance démo',
    exercises_done: [{ name: 'Squats', sets: 3, reps: '12' }],
    done_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
  },
];

export function getMockComments(postId) {
  return mockComments[postId] ? [...mockComments[postId]] : [];
}

export function addMockComment(postId, text, profile) {
  const comment = {
    id: ++nextId,
    author: {
      id: 1,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    },
    text,
    created_at: new Date().toISOString(),
  };
  mockComments[postId] = [...(mockComments[postId] || []), comment];
  return comment;
}

export function addMockPost({ text, mediaUri, profile }) {
  const post = {
    id: ++nextId,
    author: {
      id: 1,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    },
    text,
    media_url: mediaUri || null,
    media_type: mediaUri ? 'image' : '',
    like_count: 0,
    comment_count: 0,
    liked_by_me: false,
    created_at: new Date().toISOString(),
  };
  mockFeed.unshift(post);
  mockComments[post.id] = [];
  return post;
}

export const mockCoachAdvice = {
  advice:
    'Mode démo : tu es légèrement en déficit protéique. ' +
    'Ajoute 150 g de fromage blanc 0 % ou 2 œufs au prochain repas.',
  model: 'mock-offline',
};

export const mockAnalyzeMeal = [
  {
    label: 'pizza',
    score: 0.82,
    matched_food: 'pizza',
    macros: { avg_calories: 285, avg_protein: 12, avg_carbs: 36, avg_fat: 10 },
  },
  {
    label: 'apple_pie',
    score: 0.09,
    matched_food: 'apple_pie',
    macros: { avg_calories: 320, avg_protein: 4, avg_carbs: 45, avg_fat: 14 },
  },
];

export const mockMealPlanAI = {
  meals: [
    {
      meal_type: 'Déjeuner',
      dish_name: 'Bowl poulet riz (démo)',
      estimated_calories: 520,
      estimated_protein: 42,
      estimated_carbs: 48,
      estimated_fat: 14,
      description: 'Repas équilibré post-training.',
      ingredients: [
        { item: 'Poulet grillé', quantity: '120 g' },
        { item: 'Riz complet', quantity: '150 g' },
      ],
    },
  ],
  total_calories: 520,
  total_protein: 42,
  advice: 'Plan repas mock — même API que le site web.',
  model: 'mock-offline',
};

export const mockSavedMealPlans = [
  {
    id: 'mock-meal-1',
    title: 'Plan maintenance — 1800 kcal',
    goal: 'maintenance',
    calorie_target: 1800,
    created_at: new Date(Date.now() - 3 * 86400_000).toISOString(),
    plan: null,
  },
];

export const mockSavedWorkoutPlans = [
  {
    id: 'mock-workout-1',
    title: 'Programme general_health — 3 séances/sem',
    goal: 'general_health',
    level: 'beginner',
    created_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
    plan: null,
  },
];

export const mockWorkoutPlanAI = {
  weekly_plan: [
    {
      day_label: 'Jour 1',
      focus: 'Full body',
      estimated_duration_min: 45,
      estimated_calories: 280,
      warm_up: ['5 min marche rapide', 'Rotations articulaires'],
      cool_down: ['Étirements quadriceps', 'Étirements dos'],
      exercises: [
        { name: 'Squats', sets: 3, reps: '12', rest_seconds: 60, notes: 'Dos droit' },
        { name: 'Pompes', sets: 3, reps: '10', rest_seconds: 45 },
      ],
    },
    {
      day_label: 'Jour 2',
      focus: 'Cardio léger',
      estimated_duration_min: 30,
      estimated_calories: 220,
      exercises: [{ name: 'Course', sets: 1, reps: '20 min', rest_seconds: 0 }],
    },
  ],
  progression_tips: 'Augmente les reps progressivement.',
  rotation_note: 'Varie le focus la semaine prochaine.',
  model: 'mock-offline',
};

mockSavedMealPlans[0].plan = mockMealPlanAI;
mockSavedWorkoutPlans[0].plan = mockWorkoutPlanAI;

export const mockRecommendationsToday = {
  profile: { goal_label: 'Maintenir ma forme' },
  targets: { calories: 2000, protein: 120, carbohydrates: 220, fat: 65 },
  totals_today: {
    calories: 380,
    protein: 18,
    carbohydrates: 42,
    fat: 12,
    meals_count: 1,
  },
  imbalances: [
    {
      nutrient: 'calories',
      eaten: 380,
      target: 2000,
      percentage: 19,
      status: 'deficit',
    },
    {
      nutrient: 'protein',
      eaten: 18,
      target: 120,
      percentage: 15,
      status: 'deficit',
    },
    {
      nutrient: 'carbohydrates',
      eaten: 42,
      target: 220,
      percentage: 19,
      status: 'deficit',
    },
    {
      nutrient: 'fat',
      eaten: 12,
      target: 65,
      percentage: 18,
      status: 'deficit',
    },
  ],
  suggestions: [
    {
      priority: 'high',
      icon: '🥩',
      title: 'Protéines insuffisantes',
      detail: 'Ajoute une source de protéines à ton prochain repas.',
    },
  ],
};

export function mockMealsToday() {
  const todayMeals = mockMeals.filter((m) => {
    const d = new Date(m.analyzed_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const totals = todayMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.total_calories || 0),
      protein: acc.protein + (m.total_protein || 0),
      carbohydrates: acc.carbohydrates + (m.total_carbohydrates || 0),
      fat: acc.fat + (m.total_fat || 0),
      meals_count: acc.meals_count + 1,
    }),
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0, meals_count: 0 },
  );
  return { meals: todayMeals, totals };
}

export function mockWorkoutsToday() {
  const todaySessions = mockWorkouts.filter((w) => {
    const d = new Date(w.done_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const totals = todaySessions.reduce(
    (acc, w) => ({
      duration_min: acc.duration_min + (w.duration_min || 0),
      estimated_calories: acc.estimated_calories + (w.estimated_calories || 0),
      sessions_count: acc.sessions_count + 1,
    }),
    { duration_min: 0, estimated_calories: 0, sessions_count: 0 },
  );
  return { sessions: todaySessions, totals };
}

export function mockMealsSummary(days = 14) {
  const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  return labels.map((day, i) => ({
    day,
    calories: i === 6 ? 380 : Math.round(1200 + i * 80),
    protein: 40 + i * 5,
    count: i % 2 === 0 ? 2 : 1,
  }));
}

export function mockWorkoutsSummary(days = 14) {
  const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  return labels.map((day, i) => ({
    day,
    duration_min: i % 2 === 0 ? 45 : 0,
    count: i % 2 === 0 ? 1 : 0,
  }));
}

export function buildMockLookup(labels, predictions = mockAnalyzeMeal) {
  const predMap = Object.fromEntries(predictions.map((p) => [p.label, p]));
  const items = labels.map((label) => {
    const pred = predMap[label];
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
        source: 'food_log',
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

export function addMockMeal(mealData) {
  const meal = {
    id: ++nextMealId,
    meal_type: 'lunch',
    analyzed_at: new Date().toISOString(),
    total_calories: mealData.total_calories,
    total_protein: mealData.total_protein,
    total_carbohydrates: mealData.total_carbohydrates,
    total_fat: mealData.total_fat,
    detected_foods: mealData.detected_foods || [],
  };
  mockMeals.unshift(meal);
  return meal;
}

export function deleteMockMeal(mealId) {
  const idx = mockMeals.findIndex((m) => m.id === mealId);
  if (idx >= 0) mockMeals.splice(idx, 1);
}

export function addMockWorkout(sessionData) {
  const session = {
    id: ++nextWorkoutId,
    focus: sessionData.focus || 'full',
    focus_label: FOCUS_LABELS[sessionData.focus] || sessionData.focus,
    duration_min: sessionData.duration_min,
    estimated_calories: sessionData.estimated_calories,
    difficulty_rating: sessionData.difficulty_rating,
    notes: sessionData.notes,
    exercises_done: sessionData.exercises_done || [],
    done_at: new Date().toISOString(),
  };
  mockWorkouts.unshift(session);
  return session;
}

export function deleteMockWorkout(workoutId) {
  const idx = mockWorkouts.findIndex((w) => w.id === workoutId);
  if (idx >= 0) mockWorkouts.splice(idx, 1);
}

export function addMockSavedMealPlan(plan, meta = {}) {
  const saved = {
    id: `mock-meal-${++nextPlanId}`,
    title: meta.title || 'Plan IA',
    goal: meta.goal,
    calorie_target: meta.calorie_target,
    created_at: new Date().toISOString(),
    plan,
  };
  mockSavedMealPlans.unshift(saved);
  return saved;
}

export function deleteMockSavedMealPlan(planId) {
  const idx = mockSavedMealPlans.findIndex((p) => p.id === planId);
  if (idx >= 0) mockSavedMealPlans.splice(idx, 1);
}

export function addMockSavedWorkoutPlan(plan, meta = {}) {
  const saved = {
    id: `mock-workout-${++nextPlanId}`,
    title: meta.title || 'Programme IA',
    goal: meta.goal,
    level: meta.level,
    created_at: new Date().toISOString(),
    plan,
  };
  mockSavedWorkoutPlans.unshift(saved);
  return saved;
}

export function deleteMockSavedWorkoutPlan(planId) {
  const idx = mockSavedWorkoutPlans.findIndex((p) => p.id === planId);
  if (idx >= 0) mockSavedWorkoutPlans.splice(idx, 1);
}

const FOCUS_LABELS = {
  upper: '💪 Haut du corps',
  lower: '🦵 Bas du corps',
  full: '🏋️ Full body',
  cardio: '🏃 Cardio',
  hiit: '🔥 HIIT',
  mobility: '🧘 Mobilité',
  other: '🏋️ Autre',
};
