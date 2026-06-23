import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInScreen } from './motion';
import { colors, spacing } from '../theme';

export default function Screen({
  children,
  scroll = true,
  style,
  contentStyle,
  edges = ['bottom'],
  animate = true,
}) {
  const body = scroll ? (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, style]}>{children}</View>
  );

  const wrapped = animate ? <FadeInScreen>{body}</FadeInScreen> : body;

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {wrapped}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },
});
