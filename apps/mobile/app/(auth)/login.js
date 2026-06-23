import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';

import Button from '../../src/components/Button';
import FormInput from '../../src/components/FormInput';
import GradientBackground from '../../src/components/GradientBackground';
import { FadeInView } from '../../src/components/motion';
import { useAuth } from '../../src/auth/AuthContext';
import { USE_MOCKS } from '../../src/config';
import { colors, radius, spacing, typography } from '../../src/theme';

export default function Login() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit() {
    setError('');
    if (!username || !password) {
      setError('Renseignez votre identifiant et mot de passe.');
      return;
    }
    setLoading(true);
    try {
      await signIn(username.trim(), password);
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          'Connexion impossible. Vérifiez vos identifiants ou le serveur.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeInView delay={0} style={styles.brandWrap}>
            <Text style={styles.logoIcon}>🌿</Text>
            <Text style={styles.logo}>HealthAI</Text>
            <Text style={styles.logoSuffix}>Coach</Text>
            <Text style={styles.subtitle}>Ton coach santé personnel, propulsé par l'IA</Text>
          </FadeInView>

          {USE_MOCKS ? (
            <FadeInView delay={60}>
              <View style={styles.mockBadge}>
                <Text style={styles.mockBadgeText}>Mode démo hors-ligne actif</Text>
              </View>
            </FadeInView>
          ) : null}

          <FadeInView delay={120} style={styles.formCard}>
            <FormInput
              label="Identifiant"
              placeholder="Votre identifiant"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
            />
            <FormInput
              label="Mot de passe"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button title="Se connecter" onPress={onSubmit} loading={loading} style={styles.submit} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Pas encore de compte ?</Text>
              <Link href="/(auth)/register" style={styles.link}>
                Créer un compte
              </Link>
            </View>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    paddingVertical: spacing.xxl * 2,
    gap: spacing.lg,
  },
  brandWrap: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  logoIcon: { fontSize: 48, marginBottom: spacing.sm },
  logo: { color: colors.text, fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  logoSuffix: { color: colors.primaryLight, fontSize: 36, fontWeight: '800', letterSpacing: -1, marginTop: -8 },
  subtitle: {
    ...typography.subtitle,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  mockBadge: {
    alignSelf: 'center',
    backgroundColor: colors.accentGlow,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  mockBadgeText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  formCard: {
    backgroundColor: 'rgba(22, 25, 34, 0.85)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  submit: { marginTop: spacing.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  footerText: { color: colors.textMuted },
  link: { color: colors.primaryLight, fontWeight: '700' },
});
