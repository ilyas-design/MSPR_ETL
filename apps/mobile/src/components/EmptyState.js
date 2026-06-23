import { StyleSheet, Text, View } from 'react-native';

import { FadeInView } from './motion';
import { colors, radius, spacing, typography } from '../theme';

export default function EmptyState({ title, subtitle, icon = '📭' }) {
  return (
    <FadeInView style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  icon: { fontSize: 32 },
  title: { ...typography.title, color: colors.text, textAlign: 'center', fontSize: 18 },
  subtitle: { ...typography.subtitle, color: colors.textMuted, textAlign: 'center' },
});
