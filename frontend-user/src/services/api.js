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

export default api;
