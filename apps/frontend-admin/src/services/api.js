import axios from 'axios';

import { fetchAllPaged } from './pagination';

/** Taille de page par défaut (alignée sur le backend). */
const PAGE_SIZE_DEFAULT = 50;

function withPageDefaults(params = {}) {
  return { page_size: PAGE_SIZE_DEFAULT, ...params };
}

// Dev: Vite proxy forwards /api -> http://localhost:8000
// Prod: set VITE_API_URL (e.g. https://your-domain.tld/api)
const API_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'mspr_access_token';
const REFRESH_KEY = 'mspr_refresh_token';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** No interceptors — used to refresh tokens without recursion */
const apiPlain = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshInFlight = null;

async function refreshAccessToken() {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) {
    throw new Error('No refresh token');
  }
  const { data } = await apiPlain.post('/auth/token/refresh/', { refresh });
  localStorage.setItem(TOKEN_KEY, data.access);
  if (data.refresh) {
    localStorage.setItem(REFRESH_KEY, data.refresh);
  }
  return data.access;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Expired/invalid JWT: DRF returns 401 before IsAuthenticatedOrReadOnly runs.
    // Anonymous GET still works; with a bad Bearer, refresh or drop auth and retry GET once.
    if (status !== 401 || original?._authRetry) {
      return Promise.reject(error);
    }

    original._authRetry = true;

    const refresh = localStorage.getItem(REFRESH_KEY);
    if (refresh) {
      try {
        if (!refreshInFlight) {
          refreshInFlight = refreshAccessToken().finally(() => {
            refreshInFlight = null;
          });
        }
        await refreshInFlight;
        const access = localStorage.getItem(TOKEN_KEY);
        original.headers = original.headers ?? {};
        if (access) {
          original.headers.Authorization = `Bearer ${access}`;
        }
        return api(original);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }

    // Retry GET without Bearer so IsAuthenticatedOrReadOnly allows anonymous read.
    const method = (original.method || 'get').toLowerCase();
    if (method === 'get' || method === 'head' || method === 'options') {
      if (original.headers?.delete) {
        original.headers.delete('Authorization');
      } else {
        delete original.headers.Authorization;
      }
      return api(original);
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  // Auth
  login: async (username, password) => {
    const resp = await api.post('/auth/token/', { username, password });
    localStorage.setItem(TOKEN_KEY, resp.data.access);
    if (resp.data.refresh) {
      localStorage.setItem(REFRESH_KEY, resp.data.refresh);
    }
    return resp;
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  isAuthenticated: () =>
    !!(localStorage.getItem(TOKEN_KEY) || localStorage.getItem(REFRESH_KEY)),

  // Patients (listes paginées : ?page= & page_size= & search=)
  getPatients: (params = {}) => api.get('/patients/', { params: withPageDefaults(params) }),
  getPatient: (id) => api.get(`/patients/${id}/`),
  updatePatient: (id, payload) => api.patch(`/patients/${id}/`, payload),
  getAllPatientsPaged: () =>
    fetchAllPaged((p) => api.get('/patients/', { params: p })),

  // Health/Santé
  getHealthData: (params = {}) => api.get('/sante/', { params: withPageDefaults(params) }),
  updateHealth: (id, payload) => api.patch(`/sante/${id}/`, payload),
  getAllHealthPaged: () =>
    fetchAllPaged((p) => api.get('/sante/', { params: p })),

  // Nutrition
  getNutrition: (params = {}) => api.get('/nutrition/', { params: withPageDefaults(params) }),
  updateNutrition: (id, payload) => api.patch(`/nutrition/${id}/`, payload),
  getAllNutritionPaged: () =>
    fetchAllPaged((p) => api.get('/nutrition/', { params: p })),

  // Physical Activity
  getActivities: (params = {}) =>
    api.get('/activite-physique/', { params: withPageDefaults(params) }),
  updateActivity: (id, payload) => api.patch(`/activite-physique/${id}/`, payload),
  getAllActivitiesPaged: () =>
    fetchAllPaged((p) => api.get('/activite-physique/', { params: p })),

  // Gym Sessions
  getGymSessions: (params = {}) =>
    api.get('/gym-sessions/', { params: withPageDefaults(params) }),
  updateGymSession: (id, payload) => api.patch(`/gym-sessions/${id}/`, payload),
  getAllGymSessionsPaged: () =>
    fetchAllPaged((p) => api.get('/gym-sessions/', { params: p })),

  // Current user / workflow d'approbation
  getMe: () => api.get('/auth/me/'),
  getPendingChanges: (params = {}) => api.get('/pending-changes/', { params }),
  approvePendingChange: (id, comment = '') =>
    api.post(`/pending-changes/${id}/approve/`, { comment }),
  rejectPendingChange: (id, comment = '') =>
    api.post(`/pending-changes/${id}/reject/`, { comment }),

  // KPIs
  getKPIs: () => api.get('/kpis/'),
  getEngagementKPIs: () => api.get('/engagement/'),
  getConversionKPIs: () => api.get('/conversion/'),
  getSatisfactionKPIs: () => api.get('/satisfaction/'),
  getDataQualityKPIs: () => api.get('/data-quality/'),
};

export default api;
