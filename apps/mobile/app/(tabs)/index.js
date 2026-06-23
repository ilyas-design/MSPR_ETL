import { useCallback } from 'react';
import { Alert, FlatList, RefreshControl, View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import PostCard from '../../src/components/PostCard';
import EmptyState from '../../src/components/EmptyState';
import { getFeed, toggleLike, deletePost } from '../../src/api/social';
import { useAuth } from '../../src/auth/AuthContext';
import { colors, spacing } from '../../src/theme';

export default function Feed() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const {
    data: posts = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({ queryKey: ['feed'], queryFn: getFeed });

  const likeMutation = useMutation({
    mutationFn: (post) => toggleLike(post.id),
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const previous = queryClient.getQueryData(['feed']);
      queryClient.setQueryData(['feed'], (old = []) =>
        old.map((p) =>
          p.id === post.id
            ? {
                ...p,
                liked_by_me: !p.liked_by_me,
                like_count: p.like_count + (p.liked_by_me ? -1 : 1),
              }
            : p,
        ),
      );
      return { previous };
    },
    onError: (_err, _post, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['feed'], ctx.previous);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (post) => deletePost(post.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
    onError: () => Alert.alert('Erreur', 'Suppression impossible.'),
  });

  const confirmDelete = useCallback(
    (post) => {
      Alert.alert('Supprimer', 'Supprimer cette publication ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(post) },
      ]);
    },
    [deleteMutation],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <PostCard
        post={item}
        canDelete={profile?.username && item.author?.username === profile.username}
        onToggleLike={(p) => likeMutation.mutate(p)}
        onOpenComments={(p) => router.push(`/post/${p.id}`)}
        onDelete={confirmDelete}
      />
    ),
    [likeMutation, router, confirmDelete, profile],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <Text style={styles.info}>Chargement du fil…</Text>
          ) : isError ? (
            <EmptyState
              title="Connexion impossible"
              subtitle="Impossible de charger le fil. Tirez pour réessayer."
            />
          ) : (
            <EmptyState
              title="Aucune publication"
              subtitle="Soyez le premier à partager quelque chose !"
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { paddingTop: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  info: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
