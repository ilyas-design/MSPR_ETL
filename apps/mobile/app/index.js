import { Redirect } from 'expo-router';

import { useAuth } from '../src/auth/AuthContext';

export default function Index() {
  const { ready, signedIn } = useAuth();
  if (!ready) return null;
  return <Redirect href={signedIn ? '/(tabs)' : '/(auth)/login'} />;
}
