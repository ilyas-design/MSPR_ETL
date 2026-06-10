import axios from 'axios';

// Clés utilisées pour stocker les tokens dans localStorage.
const ACCESS_TOKEN_KEY = 'healthai_access';
const REFRESH_TOKEN_KEY = 'healthai_refresh';

// Instance Axios partagée par toute l'app.
// baseURL: '/api' → grâce au proxy Vite, ça tape vers http://localhost:8000/api
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur de requête : ajoute le Bearer token à chaque appel API.
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ----------------------------------------------------------------
// Intercepteur de réponse : auto-refresh du token sur 401
// ----------------------------------------------------------------
let isRefreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // On ne touche pas aux requêtes qui ne sont pas 401, déjà retentées,
    // ou qui parlent justement au endpoint token (sinon boucle infinie).
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/token')
    ) {
      return Promise.reject(error);
    }

    const refresh = getRefreshToken();
    if (!refresh) {
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Si un refresh est déjà en cours, on met cette requête en file d'attente.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject, originalRequest });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const response = await axios.post('/api/auth/token/refresh/', { refresh });
      const newAccess = response.data.access;
      localStorage.setItem(ACCESS_TOKEN_KEY, newAccess);

      // Rejoue toutes les requêtes mises en attente pendant le refresh.
      refreshQueue.forEach(({ resolve, originalRequest: req }) => {
        req.headers.Authorization = `Bearer ${newAccess}`;
        resolve(api(req));
      });
      refreshQueue = [];

      // Rejoue la requête qui a déclenché le refresh.
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Le refresh token est lui aussi expiré → on force la reconnexion.
      refreshQueue.forEach(({ reject }) => reject(refreshError));
      refreshQueue = [];
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);



// ============================================================
// Helpers de stockage des tokens
// ============================================================

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens({ access, refresh }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

// ============================================================
// Méthodes d'authentification
// ============================================================

export async function login(username, password) {
  const response = await api.post('/auth/token/', { username, password });
  setTokens(response.data);
  return response.data;
}

export async function register(username, password, email) {
  const payload = { username, password};
  if (email) payload.email = email;
  const response = await api.post('/auth/register/', payload);
  setTokens(response.data);
  return response.data;
}

export function logout() {
  clearTokens();
}

export async function getMyProfile() {
  const response = await api.get('/me/profile/');
  return response.data;
}

export async function updateMyProfile(updates) {
  const response = await api.patch('/me/profile/', updates);
  return response.data;
}

// IA Nutrition

const aiApi = axios.create({
  baseURL: '/nutrition-api',
  timeout: 30000,
});

export async function analyzeMealPhoto(imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await aiApi.post('/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function lookupMacros(labels) {
  const response = await aiApi.post('/macros/lookup', { labels });
  return response.data;
}



// ============================================================
// Historique des repas (PostgreSQL via Django)
// ============================================================

export async function saveMeal(mealData) {
  // mealData = { detected_foods, total_calories, total_protein, total_carbohydrates, total_fat }
  const response = await api.post('/me/meals/', mealData);
  return response.data;
}

export async function getMyMeals() {
  const response = await api.get('/me/meals/');
  return response.data;
}

export async function getMealsToday() {
  const response = await api.get('/me/meals/today/');
  return response.data; // { meals: [...], totals: {calories, protein, ...} }
}

export async function getMealsSummary(days = 14) {
  const response = await api.get(`/me/meals/summary/?days=${days}`);
  return response.data; // [{day, calories, protein, ...}, ...]
}

export async function deleteMeal(mealId) {
  await api.delete(`/me/meals/${mealId}/`);
}


// ============================================================
// Recommandations IA (chantier 1 MSPR2)
// ============================================================

export async function getRecommendationsToday() {
  const response = await api.get('/me/recommendations/today/');
  return response.data;
}

export async function generateMealPlan(params) {
  // params = { goal, calorie_target, allergies: [...], restrictions: [...], meals_per_day }
  const response = await api.post('/ai/meal-plan/', params);
  return response.data;
}

export async function generateMealPlanAI(params) {
  // Version LLM (gpt-oss) — recettes complètes avec ingrédients
  // params = { goal, calorie_target, allergies, restrictions, meals_per_day, already_eaten_kcal }
  const response = await api.post('/ai/meal-plan-ai/', params, {
    timeout: 120000, // LLM peut prendre 30-90s sur la free tier OpenRouter
  });
  return response.data;
}

// ============================================================
// Plans de repas sauvegardés (MongoDB)
// ============================================================

export async function saveMealPlan(plan, meta = {}) {
  // plan = l'objet complet renvoyé par /ai/meal-plan-ai/
  // meta = { title?, goal?, calorie_target? }
  const response = await api.post('/me/meal-plans/', {
    plan,
    title: meta.title,
    goal: meta.goal,
    calorie_target: meta.calorie_target,
  });
  return response.data;
}

export async function listSavedPlans() {
  const response = await api.get('/me/meal-plans/');
  return response.data;
}

export async function getSavedPlan(planId) {
  const response = await api.get(`/me/meal-plans/${planId}/`);
  return response.data;
}

export async function deleteSavedPlan(planId) {
  await api.delete(`/me/meal-plans/${planId}/`);
}


export async function getCoachAdvice() {
  // Le backend récupère lui-même le profil + les meals du jour
  const response = await api.post('/me/coach-advice/');
  return response.data; // { advice: "...", model: "..." }
}


export default api;
