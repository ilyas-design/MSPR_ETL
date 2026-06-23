import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import Screen from '../../src/components/Screen';
import HubMenu from '../../src/components/HubMenu';
import { AnimatedProgressBar, FadeInView } from '../../src/components/motion';
import {
  getMyProfile,
  getRecommendationsToday,
  getWorkoutsToday,
  getWorkoutsSummary,
} from '../../src/api/health';
import {
  GOAL_LABELS,
  LEVEL_LABELS,
  DIET_LABELS,
  GENDER_LABELS,
} from '../../src/constants/profileOptions';
import { arrayToCommaList } from '../../src/utils/lists';
import { colors, gradients, radius, shadows, spacing, typography } from '../../src/theme';

function bmiCategory(bmi) {
  if (bmi == null) return null;
  if (bmi < 18.5) return { label: 'Sous-poids', color: '#0891b2' };
  if (bmi < 25) return { label: 'Normal', color: '#059669' };
  if (bmi < 30) return { label: 'Surpoids', color: '#d97706' };
  return { label: 'Obésité', color: '#dc2626' };
}

function StatCard({ label, value, unit, meta, percent, footer, color, delay = 0 }) {
  return (
    <FadeInView delay={delay} style={styles.statCardOuter}>
      <View style={[styles.statCard, shadows.sm]}>
        <View style={styles.statHeader}>
          <Text style={styles.statLabel}>{label}</Text>
          {meta ? <Text style={styles.statMeta}>{meta}</Text> : null}
        </View>
        <Text style={styles.statValue}>
          {value}
          {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
        </Text>
        {percent != null ? (
          <AnimatedProgressBar percent={percent} color={color || colors.primary} delay={delay + 100} />
        ) : null}
        {footer ? <Text style={styles.statFooter}>{footer}</Text> : null}
      </View>
    </FadeInView>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [reco, setReco] = useState(null);
  const [workoutsToday, setWorkoutsToday] = useState(null);
  const [weeklyActivity, setWeeklyActivity] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const profileData = await getMyProfile();
        if (!profileData.onboarded) {
          router.replace('/onboarding');
          return;
        }
        setProfile(profileData);

        const [recoData, workoutData, weeklyData] = await Promise.allSettled([
          getRecommendationsToday(),
          getWorkoutsToday(),
          getWorkoutsSummary(7),
        ]);
        if (recoData.status === 'fulfilled') setReco(recoData.value);
        if (workoutData.status === 'fulfilled') setWorkoutsToday(workoutData.value);
        if (weeklyData.status === 'fulfilled') setWeeklyActivity(weeklyData.value);
      } catch {
        setError('Erreur lors du chargement du tableau de bord.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <Screen>
        <Text style={styles.error}>{error}</Text>
      </Screen>
    );
  }

  if (!profile) return null;

  const kcalEaten = Math.round(reco?.totals_today?.calories || 0);
  const kcalTarget = reco?.targets?.calories || profile.daily_calorie_target || 2000;
  const kcalRemaining = Math.max(0, kcalTarget - kcalEaten);
  const kcalPercent = Math.min(100, Math.round((kcalEaten / kcalTarget) * 100));
  const proteinEaten = Math.round(reco?.totals_today?.protein || 0);
  const proteinTarget = Math.round(reco?.targets?.protein || 0);
  const mealsCount = reco?.totals_today?.meals_count || 0;
  const sessionsCount = workoutsToday?.totals?.sessions_count || 0;
  const workoutMinutes = workoutsToday?.totals?.duration_min || 0;
  const workoutKcalBurned = workoutsToday?.totals?.estimated_calories || 0;
  const bmiInfo = bmiCategory(profile.bmi);
  const maxWeeklyMin = Math.max(...weeklyActivity.map((r) => r.duration_min || 0), 1);

  return (
    <Screen>
      <FadeInView delay={0}>
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, shadows.md]}
        >
          <Text style={styles.eyebrow}>Bonjour {profile.first_name || ''} 👋</Text>
          <Text style={styles.heroTitle}>Ton tableau de bord</Text>
          <View style={styles.pills}>
            <Text style={styles.pill}>🎯 {GOAL_LABELS[profile.goal] || '—'}</Text>
            <Text style={styles.pill}>⚡ {LEVEL_LABELS[profile.experience_level] || '—'}</Text>
            {profile.weight_kg && profile.target_weight_kg ? (
              <Text style={styles.pill}>
                ⚖️ {profile.weight_kg} → {profile.target_weight_kg} kg
              </Text>
            ) : null}
          </View>
        </LinearGradient>
      </FadeInView>

      <View style={styles.statRow}>
        <StatCard
          label="Calories aujourd'hui"
          value={kcalEaten}
          unit={`/ ${kcalTarget} kcal`}
          meta={`${kcalPercent}%`}
          percent={kcalPercent}
          color={colors.primary}
          delay={80}
          footer={
            kcalRemaining > 0
              ? `Il te reste ${kcalRemaining} kcal`
              : 'Cible atteinte ✓'
          }
        />
        <StatCard
          label="Protéines"
          value={proteinEaten}
          unit="g"
          meta={`cible ${proteinTarget} g`}
          percent={
            proteinTarget > 0
              ? Math.min(100, Math.round((proteinEaten / proteinTarget) * 100))
              : 0
          }
          color={colors.accent}
          delay={140}
          footer={`${mealsCount} repas enregistré${mealsCount > 1 ? 's' : ''}`}
        />
        <StatCard
          label="Activité"
          value={workoutMinutes}
          unit="min"
          meta={`${sessionsCount} séance${sessionsCount > 1 ? 's' : ''}`}
          percent={Math.min(100, Math.round((workoutMinutes / 45) * 100))}
          color={colors.warning}
          delay={200}
          footer={
            workoutKcalBurned > 0
              ? `≈ ${workoutKcalBurned} kcal brûlées`
              : 'Pas encore d\'entraînement'
          }
        />
      </View>

      {weeklyActivity.length > 0 && (
        <FadeInView delay={260} style={styles.section}>
          <Text style={styles.sectionTitle}>Activité sur 7 jours</Text>
          <View style={[styles.weekCard, shadows.sm]}>
            {weeklyActivity.map((row) => {
              const pct = Math.round(((row.duration_min || 0) / maxWeeklyMin) * 100);
              return (
                <View key={row.day} style={styles.weekRow}>
                  <Text style={styles.weekDay}>{row.day}</Text>
                  <View style={styles.weekBarTrack}>
                    <AnimatedProgressBar
                      percent={pct}
                      color={colors.primaryLight}
                      height={6}
                      delay={300}
                    />
                  </View>
                  <Text style={styles.weekVal}>{row.duration_min || 0}m</Text>
                </View>
              );
            })}
          </View>
        </FadeInView>
      )}

      <FadeInView delay={320}>
        <Text style={styles.sectionTitle}>Mon profil</Text>
      </FadeInView>
      <FadeInView delay={360}>
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>📏 Mes mesures</Text>
          <Text style={styles.metric}>Âge : {profile.age ? `${profile.age} ans` : '—'}</Text>
          <Text style={styles.metric}>Genre : {GENDER_LABELS[profile.gender] || '—'}</Text>
          <Text style={styles.metric}>
            Taille : {profile.height_cm ? `${profile.height_cm} cm` : '—'}
          </Text>
          <Text style={styles.metric}>
            Poids actuel : {profile.weight_kg ? `${profile.weight_kg} kg` : '—'}
          </Text>
          {profile.target_weight_kg ? (
            <Text style={styles.metric}>Poids cible : {profile.target_weight_kg} kg</Text>
          ) : null}
          {profile.bmi != null ? (
            <View style={styles.bmiRow}>
              <Text style={styles.metric}>IMC : {profile.bmi}</Text>
              {bmiInfo ? (
                <Text style={[styles.bmiBadge, { color: bmiInfo.color, backgroundColor: `${bmiInfo.color}22` }]}>
                  {bmiInfo.label}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </FadeInView>
      <FadeInView delay={400}>
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardTitle}>🥗 Mes préférences</Text>
          <Text style={styles.metric}>
            Restrictions : {DIET_LABELS[profile.dietary_restrictions] || '—'}
          </Text>
          <Text style={styles.metric}>Allergies : {profile.allergies || '—'}</Text>
          <Text style={styles.metric}>
            Équipement : {profile.equipment_available || 'Poids du corps'}
          </Text>
          <Text style={styles.metric}>
            Limitations : {arrayToCommaList(profile.injuries) || '—'}
          </Text>
          {profile.meal_budget != null && profile.meal_budget !== '' ? (
            <Text style={styles.metric}>Budget repas : {profile.meal_budget} €/sem</Text>
          ) : null}
          <Text style={styles.metric}>
            Cible calorique :{' '}
            {profile.daily_calorie_target ? `${profile.daily_calorie_target} kcal/j` : '—'}
          </Text>
          <Pressable onPress={() => router.push('/health/profile')} style={styles.profileLink}>
            <Text style={styles.profileLinkText}>Modifier mon profil →</Text>
          </Pressable>
        </View>
      </FadeInView>

      <HubMenu
        title="Que veux-tu faire ?"
        items={[
          {
            icon: '📸',
            title: 'Analyser un repas',
            subtitle: 'Photo → macros + suggestions',
            href: '/meals/analysis',
          },
          {
            icon: '🧠',
            title: 'Mon coach IA',
            subtitle: 'Conseils nutritionnels personnalisés',
            href: '/meals/coach',
          },
          {
            icon: '🍽️',
            title: 'Plan repas IA',
            subtitle: 'Menu sur mesure pour la journée',
            href: '/meals/plan',
          },
          {
            icon: '🏋️',
            title: 'Mon programme',
            subtitle: 'Plan d\'entraînement personnalisé',
            href: '/sport/plan',
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  muted: { color: colors.textMuted },
  error: { color: colors.danger, fontSize: 15 },
  hero: {
    gap: spacing.xs,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  eyebrow: { color: colors.primaryLight, fontSize: 14, fontWeight: '600' },
  heroTitle: { ...typography.hero, color: colors.text, fontSize: 26 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  pill: {
    color: colors.text,
    fontSize: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  statRow: { gap: spacing.sm },
  statCardOuter: {},
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  statMeta: { color: colors.primaryLight, fontSize: 12, fontWeight: '700' },
  statValue: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  statUnit: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  statFooter: { color: colors.textMuted, fontSize: 13 },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.title, color: colors.text, fontSize: 18 },
  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weekDay: { color: colors.text, fontWeight: '600', width: 36, fontSize: 13 },
  weekBarTrack: { flex: 1 },
  weekVal: { color: colors.primaryLight, fontWeight: '700', width: 36, textAlign: 'right', fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  metric: { color: colors.textMuted, fontSize: 14, lineHeight: 22 },
  bmiRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  bmiBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  profileLink: { marginTop: spacing.sm },
  profileLinkText: { color: colors.primaryLight, fontWeight: '700', fontSize: 14 },
});
