import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ScalePressable } from './motion';
import { colors, gradients, radius, shadows, spacing } from '../theme';

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  size = 'md',
}) {
  const isDisabled = disabled || loading;
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';

  const content = loading ? (
    <ActivityIndicator color={isGhost ? colors.primary : '#fff'} />
  ) : (
    <Text
      style={[
        styles.text,
        isGhost && styles.ghostText,
        size === 'sm' && styles.textSm,
      ]}
    >
      {title}
    </Text>
  );

  if (variant === 'primary' && !isDisabled) {
    return (
      <ScalePressable
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.wrap, size === 'sm' && styles.wrapSm, style]}
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, styles.gradient, size === 'sm' && styles.baseSm, shadows.glow]}
        >
          {content}
        </LinearGradient>
      </ScalePressable>
    );
  }

  return (
    <ScalePressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        size === 'sm' && styles.baseSm,
        isGhost && styles.ghost,
        isDanger && styles.danger,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {content}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md, overflow: 'hidden' },
  wrapSm: { alignSelf: 'flex-start' },
  base: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  baseSm: {
    minHeight: 40,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  gradient: { minHeight: 52 },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.45 },
  text: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.2 },
  textSm: { fontSize: 14 },
  ghostText: { color: colors.text },
});
