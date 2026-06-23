import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients } from '../theme';

export default function GradientBackground({
  children,
  variant = 'auth',
  style,
  contentStyle,
}) {
  const colorsList = gradients[variant] || gradients.auth;

  return (
    <View style={[styles.root, style]}>
      <LinearGradient colors={colorsList} style={StyleSheet.absoluteFill} />
      <View style={[styles.glow, styles.glowPrimary]} />
      <View style={[styles.glow, styles.glowAccent]} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  glow: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.35,
  },
  glowPrimary: {
    width: 280,
    height: 280,
    top: -80,
    right: -60,
    backgroundColor: colors.primaryGlow,
  },
  glowAccent: {
    width: 200,
    height: 200,
    bottom: 120,
    left: -80,
    backgroundColor: colors.accentGlow,
  },
});
