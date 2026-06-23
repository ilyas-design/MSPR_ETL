# HealthAI Social — application mobile (Expo / React Native)

Mini réseau social de la plateforme HealthAI Coach, demandé par le cahier des
charges **MSPR 6.3 / 6.4**. Flux unique de publications (texte + photo/vidéo),
likes, commentaires, et panneau de contrôle utilisateur (nom d'affichage, photo
de profil, déconnexion). Compatible **Android et iOS** via Expo.

## Stack

- **Expo SDK 54** (React Native 0.81, React 19.1) — workflow managé, compatible Expo Go
- **expo-router** — navigation par fichiers (`app/`)
- **@tanstack/react-query** — cache & synchronisation du flux
- **axios** — client HTTP avec JWT + auto-refresh
- **expo-secure-store** — stockage sécurisé des tokens
- **expo-image-picker** — sélection photo/vidéo

L'app consomme l'API Django existante (`services/backend`) :

| Fonction | Endpoint |
|---|---|
| Connexion / inscription | `POST /api/auth/token/`, `POST /api/auth/register/` |
| Profil social (panneau de contrôle) | `GET/PATCH /api/social/profile/` |
| Flux | `GET /api/social/posts/` |
| Publier | `POST /api/social/posts/` (multipart) |
| Supprimer | `DELETE /api/social/posts/{id}/` |
| Like (toggle) | `POST /api/social/posts/{id}/like/` |
| Commentaires | `GET/POST /api/social/posts/{id}/comments/` |

## Installation

> Prérequis : Node.js 20.19+, l'app [Expo Go](https://expo.dev/go) (SDK 54) sur
> votre téléphone (ou un émulateur Android / simulateur iOS).

```bash
cd apps/mobile
npm install
```

> Note : le champ `overrides.react-dom` du `package.json` épingle `react-dom`
> sur la version de React du SDK 54 (les devtools web d'Expo tirent sinon une
> version plus récente, ce qui casse l'installation). Conservez-le tel quel.

## Configuration

```bash
cp .env.example .env
```

Renseignez l'URL de l'API selon votre cible :

| Cible | `EXPO_PUBLIC_API_BASE_URL` |
|---|---|
| Simulateur iOS | `http://localhost:8000` |
| Émulateur Android (AVD) | `http://10.0.2.2:8000` |
| Téléphone physique | `http://<IP-LAN-de-votre-PC>:8000` |

**Mode démo hors-ligne** (exigence « Configuration offline ») : mettez
`EXPO_PUBLIC_USE_MOCKS=1` pour faire tourner l'app avec des données mockées,
sans backend ni connexion internet.

## Lancer

```bash
npx expo start
```

Puis scannez le QR code avec Expo Go, ou pressez `a` (Android) / `i` (iOS).

## Structure

```
app/                       routes expo-router
  _layout.js               providers (Query, Auth, SafeArea) + garde d'auth
  index.js                 redirection selon l'état de connexion
  (auth)/login|register    écrans d'authentification
  (tabs)/                  navigation principale (Fil, Publier, Profil)
    index.js               flux unique + like + suppression
    create.js              création de publication (texte + média)
    profile.js             panneau de contrôle (nom, photo, déconnexion)
  post/[id].js             détail + commentaires
src/
  config.js                lecture des variables d'environnement
  theme.js                 tokens de design
  api/client.js            axios + JWT + auto-refresh + SecureStore
  api/social.js            appels API (avec bascule mock/offline)
  api/mockData.js          jeu de données démo hors-ligne
  auth/AuthContext.js      état de session
  components/              Avatar, Button, PostCard, EmptyState
  utils/time.js            formatage des dates relatives
```

## Correspondance cahier des charges (MSPR 6.3/6.4)

- **Application mobile Android + iOS** → Expo (un seul code base).
- **Flux unique** → onglet « Fil » (`app/(tabs)/index.js`).
- **Publications texte et/ou média** → `app/(tabs)/create.js` + `expo-image-picker`.
- **Likes & commentaires** → `PostCard` + `app/post/[id].js`.
- **Panneau de contrôle** (nom d'affichage, photo de profil, déconnexion) → `app/(tabs)/profile.js`.
- **Configuration offline** → `EXPO_PUBLIC_USE_MOCKS=1`.
