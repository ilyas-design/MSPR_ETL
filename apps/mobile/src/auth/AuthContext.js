import { createContext, useContext, useEffect, useState, useCallback } from 'react';

import {
  loadTokens,
  clearTokens,
  isAuthenticated as hasToken,
  setOnAuthExpired,
} from '../api/client';
import { login as apiLogin, register as apiRegister, getSocialProfile } from '../api/social';
import { getMyProfile } from '../api/health';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await getSocialProfile();
      setProfile(data);
    } catch {
      // profil social non critique au boot
    }
  }, []);

  const refreshHealthProfile = useCallback(async () => {
    try {
      const data = await getMyProfile();
      setHealthProfile(data);
      return data;
    } catch {
      setHealthProfile(null);
      return null;
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearTokens();
    setSignedIn(false);
    setProfile(null);
    setHealthProfile(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    setOnAuthExpired(() => {
      setSignedIn(false);
      setProfile(null);
      setHealthProfile(null);
    });
    (async () => {
      await loadTokens();
      if (!mounted) return;
      const authed = hasToken();
      setSignedIn(authed);
      if (authed) {
        await refreshProfile();
        await refreshHealthProfile();
      }
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, [refreshProfile, refreshHealthProfile]);

  const signIn = useCallback(
    async (username, password) => {
      await apiLogin(username, password);
      setSignedIn(true);
      await refreshProfile();
      await refreshHealthProfile();
    },
    [refreshProfile, refreshHealthProfile],
  );

  const signUp = useCallback(
    async (username, password, email) => {
      await apiRegister(username, password, email);
      setSignedIn(true);
      await refreshProfile();
      await refreshHealthProfile();
    },
    [refreshProfile, refreshHealthProfile],
  );

  const value = {
    ready,
    signedIn,
    profile,
    healthProfile,
    setProfile,
    setHealthProfile,
    refreshProfile,
    refreshHealthProfile,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
