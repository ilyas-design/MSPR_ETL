import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import {
  listSavedPlans,
  deleteSavedPlan,
  listSavedWorkoutPlans,
  deleteSavedWorkoutPlan,
  logWorkoutSession,
} from '../../src/api/health';
import { MEAL_ICONS } from '../../src/constants/profileOptions';
import { colors, radius, spacing } from '../../src/theme';

function focusFromText(focus = '') {
  const f = focus.toLowerCase();
  if (f.includes('cardio') || f.includes('hiit')) return 'cardio';
  if (f.includes('haut') || f.includes('upper') || f.includes('pec')) return 'upper';
  if (f.includes('jamb') || f.includes('lower')) return 'lower';
  if (f.includes('full') || f.includes('global')) return 'full';
  if (f.includes('mobil') || f.includes('étir')) return 'mobility';
  return 'other';
}

export default function SavedPlans() {
  const params = useLocalSearchParams();
  const [tab, setTab] = useState(params.tab === 'workout' ? 'workout' : 'meal');
  const [mealPlans, setMealPlans] = useState([]);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [loggedKeys, setLoggedKeys] = useState(new Set());
  const [loggingKey, setLoggingKey] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [meals, workouts] = await Promise.all([
        listSavedPlans().catch(() => []),
        listSavedWorkoutPlans().catch(() => []),
      ]);
      setMealPlans(meals);
      setWorkoutPlans(workouts);
    } catch {
      setError('Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (params.tab === 'workout') setTab('workout');
  }, [params.tab]);

  function handleDeleteMeal(planId) {
    Alert.alert('Supprimer', 'Supprimer ce plan repas ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSavedPlan(planId);
            await loadAll();
          } catch {
            setError('Impossible de supprimer.');
          }
        },
      },
    ]);
  }

  function handleDeleteWorkout(planId) {
    Alert.alert('Supprimer', 'Supprimer ce programme ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSavedWorkoutPlan(planId);
            await loadAll();
          } catch {
            setError('Impossible de supprimer.');
          }
        },
      },
    ]);
  }

  async function handleLogSession(planId, sessionIdx, session) {
    const key = `${planId}:${sessionIdx}`;
    setLoggingKey(key);
    setError('');
    setSuccessMsg('');
    try {
      await logWorkoutSession({
        focus: focusFromText(session.focus),
        duration_min: session.estimated_duration_min || 45,
        estimated_calories: session.estimated_calories || null,
        exercises_done: session.exercises || [],
      });
      setLoggedKeys((prev) => new Set([...prev, key]));
      setSuccessMsg(`Séance "${session.day_label}" enregistrée.`);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'erreur';
      setError(`Impossible d'enregistrer : ${detail}`);
    } finally {
      setLoggingKey(null);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Text style={styles.muted}>Chargement…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Mes plans sauvegardés</Text>
      <Text style={styles.muted}>Repas et programmes générés par l'IA.</Text>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab('meal')}
          style={[styles.tab, tab === 'meal' && styles.tabActive]}
        >
          <Text style={styles.tabText}>🍽️ Repas ({mealPlans.length})</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('workout')}
          style={[styles.tab, tab === 'workout' && styles.tabActive]}
        >
          <Text style={styles.tabText}>🏋️ Sport ({workoutPlans.length})</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {successMsg ? <Text style={styles.success}>{successMsg}</Text> : null}

      {tab === 'meal' && (
        mealPlans.length === 0 ? (
          <Text style={styles.muted}>Aucun plan repas sauvegardé.</Text>
        ) : (
          mealPlans.map((p) => {
            const isExpanded = expandedId === `meal-${p.id}`;
            const planData = p.plan || {};
            return (
              <View key={p.id} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <View style={styles.planMeta}>
                    <Text style={styles.planTitle}>{p.title || 'Plan IA'}</Text>
                    <Text style={styles.muted}>
                      {new Date(p.created_at).toLocaleString('fr-FR')} · {planData.total_calories || 0} kcal
                    </Text>
                  </View>
                  <View style={styles.planActions}>
                    <Pressable onPress={() => setExpandedId(isExpanded ? null : `meal-${p.id}`)}>
                      <Text style={styles.link}>{isExpanded ? '▲' : '▼'}</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteMeal(p.id)}>
                      <Text>🗑️</Text>
                    </Pressable>
                  </View>
                </View>
                {isExpanded && (
                  <View style={styles.detail}>
                    {planData.advice ? <Text style={styles.muted}>💡 {planData.advice}</Text> : null}
                    {planData.meals?.map((meal, i) => (
                      <View key={i} style={styles.subCard}>
                        <Text style={styles.subTitle}>
                          {MEAL_ICONS[meal.meal_type] || '🍴'} {meal.meal_type} — {meal.dish_name}
                        </Text>
                        <Text style={styles.muted}>
                          {meal.estimated_calories} kcal · P {meal.estimated_protein} g
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )
      )}

      {tab === 'workout' && (
        workoutPlans.length === 0 ? (
          <Text style={styles.muted}>Aucun programme sauvegardé.</Text>
        ) : (
          workoutPlans.map((p) => {
            const isExpanded = expandedId === `workout-${p.id}`;
            const planData = p.plan || {};
            const sessions = planData.weekly_plan || [];
            return (
              <View key={p.id} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <View style={styles.planMeta}>
                    <Text style={styles.planTitle}>{p.title || 'Programme IA'}</Text>
                    <Text style={styles.muted}>
                      {new Date(p.created_at).toLocaleString('fr-FR')} · {sessions.length} séance(s)
                    </Text>
                  </View>
                  <View style={styles.planActions}>
                    <Pressable onPress={() => setExpandedId(isExpanded ? null : `workout-${p.id}`)}>
                      <Text style={styles.link}>{isExpanded ? '▲' : '▼'}</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteWorkout(p.id)}>
                      <Text>🗑️</Text>
                    </Pressable>
                  </View>
                </View>
                {isExpanded && (
                  <View style={styles.detail}>
                    {planData.progression_tips ? (
                      <Text style={styles.muted}>💡 {planData.progression_tips}</Text>
                    ) : null}
                    {sessions.map((session, i) => {
                      const key = `${p.id}:${i}`;
                      const isLogged = loggedKeys.has(key);
                      const isLogging = loggingKey === key;
                      return (
                        <View key={i} style={styles.subCard}>
                          <Text style={styles.subTitle}>
                            🏋️ {session.day_label} — {session.focus}
                          </Text>
                          <Text style={styles.muted}>
                            {session.estimated_duration_min} min · {session.estimated_calories} kcal
                          </Text>
                          {session.exercises?.map((ex, j) => (
                            <Text key={j} style={styles.muted}>
                              • {ex.name}
                              {ex.sets && ex.reps ? ` — ${ex.sets} × ${ex.reps}` : ''}
                            </Text>
                          ))}
                          <Button
                            title={
                              isLogged
                                ? 'Séance effectuée ✓'
                                : isLogging
                                  ? 'Enregistrement…'
                                  : "J'ai fait cette séance"
                            }
                            onPress={() => handleLogSession(p.id, i, session)}
                            loading={isLogging}
                            disabled={isLogged}
                            variant={isLogged ? 'ghost' : 'primary'}
                          />
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14 },
  success: { color: colors.success, fontSize: 14 },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  tabActive: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  tabText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  planMeta: { flex: 1, gap: 2 },
  planTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  planActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  link: { color: colors.primary, fontWeight: '700' },
  detail: { gap: spacing.sm },
  subCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  subTitle: { color: colors.text, fontWeight: '700' },
});
