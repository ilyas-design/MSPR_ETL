import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Avatar from '../../src/components/Avatar';
import Button from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import { getPost, getComments, addComment } from '../../src/api/social';
import { colors, radius, spacing } from '../../src/theme';
import { timeAgo } from '../../src/utils/time';

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const postId = Number(id);
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const cachedPost = (queryClient.getQueryData(['feed']) || []).find((p) => p.id === postId);

  const { data: post } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => getPost(postId),
    initialData: cachedPost,
  });

  const {
    data: comments = [],
    isLoading,
  } = useQuery({ queryKey: ['comments', postId], queryFn: () => getComments(postId) });

  const mutation = useMutation({
    mutationFn: (value) => addComment(postId, value),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  function onSend() {
    const value = text.trim();
    if (!value) return;
    mutation.mutate(value);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          post ? (
            <View style={styles.postBlock}>
              <View style={styles.postHeader}>
                <Avatar
                  uri={post.author?.avatar_url}
                  name={post.author?.display_name || post.author?.username}
                  size={42}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.author}>
                    {post.author?.display_name || post.author?.username}
                  </Text>
                  <Text style={styles.meta}>{timeAgo(post.created_at)}</Text>
                </View>
              </View>
              {post.text ? <Text style={styles.postText}>{post.text}</Text> : null}
              <Text style={styles.commentsTitle}>Commentaires</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Avatar
              uri={item.author?.avatar_url}
              name={item.author?.display_name || item.author?.username}
              size={32}
            />
            <View style={styles.commentBody}>
              <Text style={styles.commentAuthor}>
                {item.author?.display_name || item.author?.username}{' '}
                <Text style={styles.commentTime}>· {timeAgo(item.created_at)}</Text>
              </Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState title="Aucun commentaire" subtitle="Lancez la conversation !" />
          )
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ajouter un commentaire…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
        />
        <Button title="Envoyer" onPress={onSend} loading={mutation.isPending} style={styles.send} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },
  postBlock: { gap: spacing.sm, marginBottom: spacing.md },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  author: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12 },
  postText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  commentsTitle: {
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: spacing.md,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  comment: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  commentBody: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  commentAuthor: { color: colors.text, fontWeight: '600', fontSize: 14 },
  commentTime: { color: colors.textMuted, fontWeight: '400', fontSize: 12 },
  commentText: { color: colors.text, fontSize: 14, lineHeight: 19 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    maxHeight: 100,
  },
  send: { paddingHorizontal: spacing.lg },
});
