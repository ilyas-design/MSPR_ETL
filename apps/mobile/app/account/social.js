import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import Avatar from '../../src/components/Avatar';
import Button from '../../src/components/Button';
import { useAuth } from '../../src/auth/AuthContext';
import { updateSocialProfile } from '../../src/api/social';
import { USE_MOCKS } from '../../src/config';
import { colors, radius, spacing } from '../../src/theme';

export default function SocialProfile() {
  const { profile, setProfile, refreshProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDisplayName(profile?.display_name || '');
  }, [profile]);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function onSave() {
    setMessage('');
    setSaving(true);
    try {
      const updated = await updateSocialProfile({ displayName, avatarUri });
      setProfile(updated);
      setAvatarUri(null);
      await refreshProfile();
      setMessage('Profil mis à jour.');
    } catch {
      setMessage('Échec de la mise à jour.');
    } finally {
      setSaving(false);
    }
  }

  function onLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const previewUri = avatarUri || profile?.avatar_url;
  const previewName = displayName || profile?.username;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarBlock}>
        <Avatar uri={previewUri} name={previewName} size={96} />
        <Pressable onPress={pickAvatar}>
          <Text style={styles.changePhoto}>Changer la photo</Text>
        </Pressable>
        <Text style={styles.username}>@{profile?.username || 'moi'}</Text>
        {USE_MOCKS ? <Text style={styles.mock}>Mode démo hors-ligne</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Nom d'affichage</Text>
        <TextInput
          style={styles.input}
          placeholder="Votre nom public"
          placeholderTextColor={colors.textMuted}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={50}
        />
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Button title="Enregistrer" onPress={onSave} loading={saving} />
      <Button title="Se déconnecter" variant="danger" onPress={onLogout} style={styles.logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  avatarBlock: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  changePhoto: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  username: { color: colors.textMuted, fontSize: 14 },
  mock: { color: colors.success, fontWeight: '600', fontSize: 13 },
  field: { gap: spacing.sm },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
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
  message: { color: colors.success, fontSize: 14, textAlign: 'center' },
  logout: { marginTop: spacing.sm },
});
