import { createContext, useContext, useEffect, useState, useCallback } from 'react';

import {
  loadTokens,
  clearTokens,
  isAuthenticated as hasToken,
  setOnAuthExpired,
} from '../api/client';
import { login as apiLogin, register as apiRegister, getSocialProfile } from '../api/social';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState(null);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await getSocialProfile();
      setProfile(data);
    } catch {
      // profil non critique au boot
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearTokens();
    setSignedIn(false);
    setProfile(null);
  }, []);

  // Bootstrap : hydrate les tokens et l'état de session au démarrage.
  useEffect(() => {
    let mounted = true;
    setOnAuthExpired(() => {
      setSignedIn(false);
      setProfile(null);
    });
    (async () => {
      await loadTokens();
      if (!mounted) return;
      const authed = hasToken();
      setSignedIn(authed);
      if (authed) await refreshProfile();
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, [refreshProfile]);

  const signIn = useCallback(
    async (username, password) => {
      await apiLogin(username, password);
      setSignedIn(true);
      await refreshProfile();
    },
    [refreshProfile],
  );

  const signUp = useCallback(
    async (username, password, email) => {
      await apiRegister(username, password, email);
      setSignedIn(true);
      await refreshProfile();
    },
    [refreshProfile],
  );

  const value = {
    ready,
    signedIn,
    profile,
    setProfile,
    refreshProfile,
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
