import api, { setTokens } from './client';
import { USE_MOCKS } from '../config';
import {
  mockProfile,
  mockFeed,
  getMockComments,
  addMockComment,
  addMockPost,
} from './mockData';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function guessMediaType(uri) {
  const lower = (uri || '').toLowerCase();
  if (lower.match(/\.(mp4|mov|webm|m4v)$/)) return 'video/mp4';
  if (lower.match(/\.png$/)) return 'image/png';
  if (lower.match(/\.gif$/)) return 'image/gif';
  return 'image/jpeg';
}

function fileFromUri(uri) {
  const type = guessMediaType(uri);
  const ext = type.split('/')[1] || 'jpg';
  const name = uri.split('/').pop() || `upload.${ext}`;
  return { uri, name, type };
}

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(username, password) {
  if (USE_MOCKS) {
    await delay();
    await setTokens({ access: 'mock-access', refresh: 'mock-refresh' });
    return { access: 'mock-access', refresh: 'mock-refresh' };
  }
  const { data } = await api.post('/auth/token/', { username, password });
  await setTokens(data);
  return data;
}

export async function register(username, password, email) {
  if (USE_MOCKS) {
    await delay();
    await setTokens({ access: 'mock-access', refresh: 'mock-refresh' });
    return { access: 'mock-access', refresh: 'mock-refresh' };
  }
  const payload = { username, password };
  if (email) payload.email = email;
  const { data } = await api.post('/auth/register/', payload);
  await setTokens(data);
  return data;
}

// ---------------------------------------------------------------------------
// Profil social (panneau de contrôle)
// ---------------------------------------------------------------------------

export async function getSocialProfile() {
  if (USE_MOCKS) {
    await delay();
    return { ...mockProfile };
  }
  const { data } = await api.get('/social/profile/');
  return data;
}

export async function updateSocialProfile({ displayName, avatarUri }) {
  if (USE_MOCKS) {
    await delay();
    if (displayName != null) mockProfile.display_name = displayName;
    if (avatarUri) mockProfile.avatar_url = avatarUri;
    return { ...mockProfile };
  }
  const form = new FormData();
  if (displayName != null) form.append('display_name', displayName);
  if (avatarUri) form.append('avatar', fileFromUri(avatarUri));
  const { data } = await api.patch('/social/profile/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ---------------------------------------------------------------------------
// Flux / publications
// ---------------------------------------------------------------------------

export async function getFeed() {
  if (USE_MOCKS) {
    await delay();
    return [...mockFeed];
  }
  const { data } = await api.get('/social/posts/');
  return data;
}

export async function getPost(postId) {
  if (USE_MOCKS) {
    await delay();
    return mockFeed.find((p) => p.id === Number(postId)) || null;
  }
  const { data } = await api.get(`/social/posts/${postId}/`);
  return data;
}

export async function createPost({ text, mediaUri }) {
  if (USE_MOCKS) {
    await delay();
    return addMockPost({ text, mediaUri, profile: mockProfile });
  }
  const form = new FormData();
  if (text) form.append('text', text);
  if (mediaUri) form.append('media', fileFromUri(mediaUri));
  const { data } = await api.post('/social/posts/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deletePost(postId) {
  if (USE_MOCKS) {
    await delay();
    const idx = mockFeed.findIndex((p) => p.id === postId);
    if (idx >= 0) mockFeed.splice(idx, 1);
    return;
  }
  await api.delete(`/social/posts/${postId}/`);
}

export async function toggleLike(postId) {
  if (USE_MOCKS) {
    await delay(150);
    const post = mockFeed.find((p) => p.id === postId);
    if (post) {
      post.liked_by_me = !post.liked_by_me;
      post.like_count += post.liked_by_me ? 1 : -1;
      return { liked: post.liked_by_me, like_count: post.like_count };
    }
    return { liked: false, like_count: 0 };
  }
  const { data } = await api.post(`/social/posts/${postId}/like/`);
  return data;
}

// ---------------------------------------------------------------------------
// Commentaires
// ---------------------------------------------------------------------------

export async function getComments(postId) {
  if (USE_MOCKS) {
    await delay();
    return getMockComments(postId);
  }
  const { data } = await api.get(`/social/posts/${postId}/comments/`);
  return data;
}

export async function addComment(postId, text) {
  if (USE_MOCKS) {
    await delay(150);
    const comment = addMockComment(postId, text, mockProfile);
    const post = mockFeed.find((p) => p.id === postId);
    if (post) post.comment_count += 1;
    return comment;
  }
  const { data } = await api.post(`/social/posts/${postId}/comments/`, { text });
  return data;
}
