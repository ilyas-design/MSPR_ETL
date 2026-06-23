import { Text, View, StyleSheet } from 'react-native';

import { colors, spacing } from '../theme';

export default function EmptyState({ title, subtitle }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
