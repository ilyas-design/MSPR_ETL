import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';

import Button from '../../src/components/Button';
import { useAuth } from '../../src/auth/AuthContext';
import { USE_MOCKS } from '../../src/config';
import { colors, radius, spacing } from '../../src/theme';

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>HealthAI</Text>
        <Text style={styles.subtitle}>Le réseau de votre communauté santé</Text>

        {USE_MOCKS ? (
          <Text style={styles.mockBadge}>Mode démo hors-ligne actif</Text>
        ) : null}

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Identifiant"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button title="Se connecter" onPress={onSubmit} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ?</Text>
            <Link href="/(auth)/register" style={styles.link}>
              Créer un compte
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  logo: { color: colors.primary, fontSize: 40, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  mockBadge: {
    color: colors.success,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  form: { gap: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  error: { color: colors.danger, fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.md },
  footerText: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
});
