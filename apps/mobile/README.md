# HealthAI Mobile — application Expo

Client mobile **Expo / React Native** du projet HealthAI Coach : parité MSPR2 (nutrition, sport, coach IA) + réseau social TPRE601.

> Stack backend : `docker compose up --build` depuis la racine. Voir [README principal](../../README.md).

---

## Fonctionnalités

### MSPR2 (parité `frontend-user`)
- Tableau de bord (profil, recommandations, activité du jour, résumé 7 jours)
- Onboarding et profil santé
- Analyse repas (photo → macros), historique, coach nutrition, plan repas IA
- Programme sport IA, historique séances, plans sauvegardés (repas + sport)

### TPRE601 Social
- Fil, publication (texte/média), likes, commentaires
- Profil social (avatar, nom d'affichage)

### Technique
- Auth JWT, refresh automatique, SecureStore
- APIs via Django (`src/api/health.js`, `src/api/social.js`)
- Analyse photo via `POST /api/ai/analyze/` (pas nutrition-api direct)
- Mode offline : `EXPO_PUBLIC_USE_MOCKS=1`

---

## Navigation (5 onglets)

| Onglet | Route | Contenu |
|--------|-------|---------|
| Accueil | `(tabs)/dashboard` | Tableau de bord |
| Repas | `(tabs)/meals` | Hub repas |
| Sport | `(tabs)/sport` | Hub sport |
| Social | `(tabs)/index` | Fil |
| Compte | `(tabs)/profile` | Hub compte |

Écrans stack : `onboarding`, `meals/*`, `sport/*`, `plans/saved`, `health/profile`, `account/social`, `post/[id]`.

---

## Installation

```bash
cd apps/mobile
npm install
cp .env.example .env
npx expo start
```

Variables `.env` : `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_USE_MOCKS`.

---

## Structure

```
app/                    expo-router
src/api/health.js       API santé + IA (remplace ai.js)
src/api/social.js       API social
src/api/mockData.js     Mocks offline
src/components/         Screen, HubMenu, FormInput, …
src/constants/profileOptions.js
```

---

## Voir aussi

- [README principal](../../README.md)
- [`frontend-user`](../../apps/frontend-user/) — référence web MSPR2
