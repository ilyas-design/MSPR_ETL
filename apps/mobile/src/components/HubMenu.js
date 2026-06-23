import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { FadeInView, ScalePressable } from './motion';
import { colors, gradients, radius, shadows, spacing, typography } from '../theme';

export default function HubMenu({ items, title, subtitle }) {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      {title ? (
        <FadeInView delay={0}>
          <Text style={styles.title}>{title}</Text>
        </FadeInView>
      ) : null}
      {subtitle ? (
        <FadeInView delay={40}>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </FadeInView>
      ) : null}
      <View style={styles.list}>
        {items.map((item, index) => (
          <FadeInView key={item.title} delay={80 + index * 60}>
            <ScalePressable
              onPress={() => router.push(item.href)}
              style={styles.cardOuter}
            >
              <LinearGradient
                colors={gradients.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, shadows.sm]}
              >
                <View style={styles.iconWrap}>
                  <Text style={styles.icon}>{item.icon}</Text>
                </View>
                <View style={styles.body}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.subtitle ? (
                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  ) : null}
                </View>
                <View style={styles.arrowWrap}>
                  <Text style={styles.arrow}>→</Text>
                </View>
              </LinearGradient>
            </ScalePressable>
          </FadeInView>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.subtitle, color: colors.textMuted },
  list: { gap: spacing.sm },
  cardOuter: { borderRadius: radius.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  body: { flex: 1, gap: 3 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  cardSubtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  arrowWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: { color: colors.primaryLight, fontSize: 16, fontWeight: '700' },
});
