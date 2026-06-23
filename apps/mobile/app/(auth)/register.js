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
import { colors, radius, spacing } from '../../src/theme';

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Créer un compte</Text>

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
            placeholder="Email (optionnel)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe (8 caractères min.)"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button title="S'inscrire" onPress={onSubmit} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà inscrit ?</Text>
            <Link href="/(auth)/login" style={styles.link}>
              Se connecter
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
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xl,
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
