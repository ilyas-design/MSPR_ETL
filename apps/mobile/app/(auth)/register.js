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
import { colors, radius, spacing, typography } from '../../src/theme';

export default function Register() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit() {
    setError('');
    if (!username || !password) {
      setError('Identifiant et mot de passe requis.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }
    setLoading(true);
    try {
      await signUp(username.trim(), password, email.trim());
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setError(
        Array.isArray(detail) ? detail.join(' ') : detail || 'Inscription impossible.',
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
          <FadeInView delay={0} style={styles.header}>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoins la communauté HealthAI Coach</Text>
          </FadeInView>

          <FadeInView delay={100} style={styles.formCard}>
            <FormInput
              label="Identifiant"
              placeholder="Choisis un identifiant"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
            />
            <FormInput
              label="Email"
              placeholder="optionnel@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <FormInput
              label="Mot de passe"
              placeholder="8 caractères minimum"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              hint="Au moins 8 caractères"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button title="S'inscrire" onPress={onSubmit} loading={loading} style={styles.submit} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Déjà inscrit ?</Text>
              <Link href="/(auth)/login" style={styles.link}>
                Se connecter
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
  header: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  title: { ...typography.hero, color: colors.text, fontSize: 28, textAlign: 'center' },
  subtitle: { ...typography.subtitle, color: colors.textMuted, textAlign: 'center' },
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
