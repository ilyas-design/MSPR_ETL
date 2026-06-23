import { memo, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

import Avatar from './Avatar';
import { FadeInView, ScalePressable } from './motion';
import { animation, colors, radius, shadows, spacing } from '../theme';
import { timeAgo } from '../utils/time';

function PostCard({ post, onToggleLike, onOpenComments, onDelete, canDelete, index = 0 }) {
  const author = post.author || {};
  const name = author.display_name || author.username || 'Utilisateur';
  const likeScale = useRef(new Animated.Value(1)).current;

  function handleLike() {
    Animated.sequence([
      Animated.spring(likeScale, {
        toValue: 1.35,
        damping: animation.springSnappy.damping,
        stiffness: animation.springSnappy.stiffness,
        useNativeDriver: true,
      }),
      Animated.spring(likeScale, {
        toValue: 1,
        damping: animation.spring.damping,
        stiffness: animation.spring.stiffness,
        useNativeDriver: true,
      }),
    ]).start();
    onToggleLike?.(post);
  }

  return (
    <FadeInView delay={Math.min(index * 50, 300)} style={styles.cardWrap}>
      <View style={[styles.card, shadows.sm]}>
        <View style={styles.header}>
          <Avatar uri={author.avatar_url} name={name} size={44} />
          <View style={styles.headerText}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.meta}>
              @{author.username} · {timeAgo(post.created_at)}
            </Text>
          </View>
          {canDelete ? (
            <ScalePressable onPress={() => onDelete?.(post)} scaleTo={0.92}>
              <Text style={styles.delete}>Suppr.</Text>
            </ScalePressable>
          ) : null}
        </View>

        {post.text ? <Text style={styles.text}>{post.text}</Text> : null}

        {post.media_url ? (
          <Image source={{ uri: post.media_url }} style={styles.media} resizeMode="cover" />
        ) : null}

        <View style={styles.actions}>
          <ScalePressable style={styles.action} onPress={handleLike} scaleTo={0.9}>
            <Animated.Text
              style={[
                styles.actionIcon,
                post.liked_by_me && styles.liked,
                { transform: [{ scale: likeScale }] },
              ]}
            >
              {post.liked_by_me ? '♥' : '♡'}
            </Animated.Text>
            <Text style={[styles.actionLabel, post.liked_by_me && styles.likedLabel]}>
              {post.like_count ?? 0}
            </Text>
          </ScalePressable>

          <ScalePressable
            style={styles.action}
            onPress={() => onOpenComments?.(post)}
            scaleTo={0.9}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionLabel}>{post.comment_count ?? 0}</Text>
          </ScalePressable>
        </View>
      </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  cardWrap: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1 },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  delete: { color: colors.danger, fontSize: 13, fontWeight: '600', padding: spacing.xs },
  text: { color: colors.text, fontSize: 15, lineHeight: 22 },
  media: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionIcon: { color: colors.textMuted, fontSize: 22 },
  liked: { color: colors.like },
  actionLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  likedLabel: { color: colors.like },
});

export default memo(PostCard);
