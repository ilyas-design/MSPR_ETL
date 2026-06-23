import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import Button from '../../src/components/Button';
import { createPost } from '../../src/api/social';
import { colors, radius, spacing } from '../../src/theme';

export default function CreatePost() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [media, setMedia] = useState(null); // { uri }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function pickMedia() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setMedia({ uri: result.assets[0].uri });
    }
  }

  async function onSubmit() {
    setError('');
    if (!text.trim() && !media) {
      setError('Ajoutez un texte ou un média.');
      return;
    }
    setLoading(true);
    try {
      await createPost({ text: text.trim(), mediaUri: media?.uri });
      setText('');
      setMedia(null);
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
      router.replace('/(tabs)');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Publication impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.input}
          placeholder="Quoi de neuf dans votre parcours santé ?"
          placeholderTextColor={colors.textMuted}
          multiline
          value={text}
          onChangeText={setText}
          maxLength={2000}
        />

        {media ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: media.uri }} style={styles.preview} resizeMode="cover" />
            <Pressable style={styles.removeBtn} onPress={() => setMedia(null)}>
              <Text style={styles.removeText}>Retirer</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable style={styles.mediaBtn} onPress={pickMedia}>
          <Text style={styles.mediaBtnText}>🖼️  Ajouter une photo / vidéo</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Publier" onPress={onSubmit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.text,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  previewWrap: { position: 'relative' },
  preview: {
    width: '100%',
    height: 240,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  removeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  removeText: { color: '#fff', fontWeight: '600' },
  mediaBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  mediaBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 14 },
});
