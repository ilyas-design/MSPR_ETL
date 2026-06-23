/**
 * Configuration runtime de l'app mobile.
 *
 * Les valeurs proviennent des variables d'environnement Expo (EXPO_PUBLIC_*),
 * ce qui permet de basculer entre les configurations multi-environnement
 * (complète / offline) exigées par le cahier des charges MSPR 6.3.
 */

const DEFAULT_API_BASE_URL = 'http://localhost:8000';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '');

export const API_URL = `${API_BASE_URL}/api`;

/** Mode démo hors-ligne : sert des données mockées sans backend. */
export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === '1';

/** Délai par défaut des requêtes réseau (ms). */
export const REQUEST_TIMEOUT = 15000;
