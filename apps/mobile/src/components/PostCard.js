import { memo } from 'react';
import { Image, Pressable, Text, View, StyleSheet } from 'react-native';

import Avatar from './Avatar';
import { colors, radius, spacing } from '../theme';
import { timeAgo } from '../utils/time';

function PostCard({ post, onToggleLike, onOpenComments, onDelete, canDelete }) {
  const author = post.author || {};
  const name = author.display_name || author.username || 'Utilisateur';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar uri={author.avatar_url} name={name} size={42} />
        <View style={styles.headerText}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>
            @{author.username} · {timeAgo(post.created_at)}
          </Text>
        </View>
        {canDelete ? (
          <Pressable hitSlop={10} onPress={() => onDelete?.(post)}>
            <Text style={styles.delete}>Suppr.</Text>
          </Pressable>
        ) : null}
      </View>

      {post.text ? <Text style={styles.text}>{post.text}</Text> : null}

      {post.media_url ? (
        <Image source={{ uri: post.media_url }} style={styles.media} resizeMode="cover" />
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.action} hitSlop={8} onPress={() => onToggleLike?.(post)}>
          <Text style={[styles.actionIcon, post.liked_by_me && styles.liked]}>
            {post.liked_by_me ? '♥' : '♡'}
          </Text>
          <Text style={styles.actionLabel}>{post.like_count ?? 0}</Text>
        </Pressable>

        <Pressable style={styles.action} hitSlop={8} onPress={() => onOpenComments?.(post)}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>{post.comment_count ?? 0}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1 },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  delete: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  text: { color: colors.text, fontSize: 15, lineHeight: 21 },
  media: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    marginTop: spacing.xs,
  },
  actions: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xs },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionIcon: { color: colors.textMuted, fontSize: 20 },
  liked: { color: colors.like },
  actionLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
});

export default memo(PostCard);
