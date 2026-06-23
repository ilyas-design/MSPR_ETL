/**
 * Jeu de données mocké pour le mode démo hors-ligne (EXPO_PUBLIC_USE_MOCKS=1).
 * Permet de démontrer l'app sans backend ni connexion internet — exigence
 * "Configuration offline" du cahier des charges MSPR 6.3.
 */

let nextId = 100;

export const mockProfile = {
  username: 'demo',
  display_name: 'Utilisateur Démo',
  avatar_url: null,
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
