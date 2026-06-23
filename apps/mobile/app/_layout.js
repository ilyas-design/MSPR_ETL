import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { FadeInView } from '../src/components/motion';
import { colors, typography } from '../src/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { color: colors.text },
  contentStyle: { backgroundColor: colors.bg },
};

function RootNavigator() {
  const { ready, signedIn, healthProfile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!signedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (signedIn && inAuthGroup) {
      router.replace('/(tabs)/dashboard');
      return;
    }

    if (signedIn && healthProfile && !healthProfile.onboarded) {
      const onOnboarding = segments[0] === 'onboarding';
      if (!onOnboarding && segments[0] !== '(auth)') {
        router.replace('/onboarding');
      }
    }
  }, [ready, signedIn, healthProfile, segments, router]);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <FadeInView style={styles.splashInner}>
          <Text style={styles.splashIcon}>🌿</Text>
          <Text style={styles.splashTitle}>HealthAI Coach</Text>
        </FadeInView>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
        animationDuration: 280,
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="onboarding"
        options={{ ...stackScreenOptions, headerShown: true, title: 'Bienvenue' }}
      />
      <Stack.Screen
        name="meals/analysis"
        options={{ ...stackScreenOptions, headerShown: true, title: 'Analyser un repas' }}
      />
      <Stack.Screen
        name="meals/coach"
        options={{ ...stackScreenOptions, headerShown: true, title: 'Coach nutrition' }}
      />
      <Stack.Screen
        name="meals/plan"
        options={{ ...stackScreenOptions, headerShown: true, title: 'Plan repas IA' }}
      />
      <Stack.Screen
        name="meals/history"
        options={{ ...stackScreenOptions, headerShown: true, title: 'Historique repas' }}
      />
      <Stack.Screen
        name="sport/plan"
        options={{ ...stackScreenOptions, headerShown: true, title: 'Programme sport' }}
      />
      <Stack.Screen
        name="sport/history"
        options={{ ...stackScreenOptions, headerShown: true, title: 'Mes séances' }}
      />
      <Stack.Screen
        name="plans/saved"
        options={{ ...stackScreenOptions, headerShown: true, title: 'Plans sauvegardés' }}
      />
      <Stack.Screen
        name="health/profile"
        options={{ ...stackScreenOptions, headerShown: true, title: 'Profil santé' }}
      />
      <Stack.Screen
        name="health/onboarding"
        options={{ ...stackScreenOptions, headerShown: false }}
      />
      <Stack.Screen
        name="account/social"
        options={{ ...stackScreenOptions, headerShown: true, title: 'Profil social' }}
      />
      <Stack.Screen
        name="post/[id]"
        options={{
          headerShown: true,
          title: 'Publication',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          presentation: 'card',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  splashInner: { alignItems: 'center', gap: 8 },
  splashIcon: { fontSize: 56 },
  splashTitle: { ...typography.title, color: colors.text, fontSize: 22 },
});
