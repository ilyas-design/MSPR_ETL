import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { API_URL, REQUEST_TIMEOUT } from '../config';

const ACCESS_KEY = 'healthai_access';
const REFRESH_KEY = 'healthai_refresh';

// Cache mémoire pour un accès synchrone dans l'intercepteur de requête
// (SecureStore est asynchrone).
let accessToken = null;
let refreshToken = null;

// Callback déclenché quand la session expire définitivement (refresh KO).
let onAuthExpired = null;
export function setOnAuthExpired(cb) {
  onAuthExpired = cb;
}

/** Hydrate le cache mémoire depuis le stockage sécurisé au démarrage. */
export async function loadTokens() {
  try {
    accessToken = await SecureStore.getItemAsync(ACCESS_KEY);
    refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    accessToken = null;
    refreshToken = null;
  }
  return { access: accessToken, refresh: refreshToken };
}

export async function setTokens({ access, refresh }) {
  accessToken = access ?? accessToken;
  refreshToken = refresh ?? refreshToken;
  if (access) await SecureStore.setItemAsync(ACCESS_KEY, access);
  if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export function isAuthenticated() {
  return Boolean(accessToken);
}

const api = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// --- Auto-refresh du token sur 401 (avec file d'attente) ---
let isRefreshing = false;
let queue = [];

function flushQueue(error, newAccess) {
  queue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      config.headers.Authorization = `Bearer ${newAccess}`;
      resolve(api(config));
    }
  });
  queue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (
      status !== 401 ||
      original?._retry ||
      original?.url?.includes('/auth/token')
    ) {
      return Promise.reject(error);
    }

    if (!refreshToken) {
      await clearTokens();
      onAuthExpired?.();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject, config: original });
      });
    }

    isRefreshing = true;
    original._retry = true;

    try {
      const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, {
        refresh: refreshToken,
      });
      await setTokens({ access: data.access });
      flushQueue(null, data.access);
      original.headers.Authorization = `Bearer ${data.access}`;
      return api(original);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      await clearTokens();
      onAuthExpired?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
