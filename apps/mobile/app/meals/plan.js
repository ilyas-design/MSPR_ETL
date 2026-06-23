import { useEffect, useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import Screen from '../../src/components/Screen';
import FormInput from '../../src/components/FormInput';
import Button from '../../src/components/Button';
import {
  generateMealPlanAI,
  getMyProfile,
  getRecommendationsToday,
  saveMealPlan,
} from '../../src/api/health';
import { MEAL_PLAN_GOAL_OPTIONS, MEAL_ICONS } from '../../src/constants/profileOptions';
import { colors, radius, spacing } from '../../src/theme';

export default function MealPlanScreen() {
  const [goal, setGoal] = useState('maintenance');
  const [calorieTarget, setCalorieTarget] = useState('2000');
  const [allergies, setAllergies] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [mealsPerDay, setMealsPerDay] = useState('3');
  const [useRemainingMode, setUseRemainingMode] = useState(true);
  const [todayStats, setTodayStats] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planSaving, setPlanSaving] = useState(false);
  const [planSavedId, setPlanSavedId] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [profile, reco] = await Promise.all([
          getMyProfile(),
          getRecommendationsToday().catch(() => null),
        ]);
        if (profile.goal) setGoal(profile.goal);
        if (profile.allergies) setAllergies(String(profile.allergies));
        if (profile.dietary_restrictions) setRestrictions(profile.dietary_restrictions);

        if (reco) {
          const eaten = Math.round(reco.totals_today?.calories || 0);
          const target = reco.targets?.calories || profile.daily_calorie_target || 2000;
          const remaining = Math.max(0, target - eaten);
          const mealsAlreadyEaten = reco.totals_today?.meals_count || 0;
          setTodayStats({ eaten, target, remaining, mealsAlreadyEaten });
          if (remaining > 0) {
            setCalorieTarget(String(remaining));
            setMealsPerDay(String(Math.max(1, 3 - mealsAlreadyEaten)));
          } else {
            setCalorieTarget(String(target));
          }
        } else {
          setCalorieTarget(String(profile.daily_calorie_target || 2000));
        }
      } catch {
        // silent
      }
    })();
  }, []);

  async function handleGenerate() {
    setError('');
    setSaveSuccess('');
    setPlanSavedId(null);
    setLoading(true);
    setPlan(null);
    try {
      const result = await generateMealPlanAI({
        goal,
        calorie_target: Number(calorieTarget),
        allergies: allergies.split(',').map((a) => a.trim()).filter(Boolean),
        restrictions: restrictions.split(',').map((r) => r.trim()).filter(Boolean),
        meals_per_day: Number(mealsPerDay),
        already_eaten_kcal: useRemainingMode && todayStats ? todayStats.eaten : 0,
      });
      setPlan(result);
    } catch (err) {
      if (err?.code === 'ECONNABORTED') {
        setError("L'IA prend trop de temps. Réessaie.");
      } else {
        setError('Erreur lors de la génération du plan.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePlan() {
    if (!plan) return;
    setPlanSaving(true);
    setError('');
    try {
      const saved = await saveMealPlan(plan, {
        title: `Plan ${goal} — ${calorieTarget} kcal`,
        goal,
        calorie_target: Number(calorieTarget),
      });
      setPlanSavedId(saved.id);
      setSaveSuccess('Plan sauvegardé !');
    } catch {
      setError('Erreur lors de la sauvegarde.');
    } finally {
      setPlanSaving(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Plan repas IA</Text>
      <Text style={styles.muted}>Menu adapté à ton objectif et tes contraintes.</Text>

      {todayStats && todayStats.mealsAlreadyEaten > 0 && (
        <View style={styles.recap}>
          <Text style={styles.muted}>
            Aujourd'hui : {todayStats.eaten} kcal sur {todayStats.target} kcal.
            {todayStats.remaining > 0 ? ` Reste ${todayStats.remaining} kcal.` : ''}
          </Text>
          <Pressable
            onPress={() => setUseRemainingMode(!useRemainingMode)}
            style={styles.checkboxRow}
          >
            <Text style={styles.muted}>
              {useRemainingMode ? '☑' : '☐'} Planifier seulement le reste de la journée
            </Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.legend}>Objectif</Text>
      <View style={styles.chips}>
        {MEAL_PLAN_GOAL_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setGoal(opt.value)}
            style={[styles.chip, goal === opt.value && styles.chipActive]}
          >
            <Text style={styles.chipText}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      <FormInput
        label="Calories cibles"
        value={calorieTarget}
        onChangeText={setCalorieTarget}
        keyboardType="number-pad"
      />
      <FormInput label="Nombre de repas" value={mealsPerDay} onChangeText={setMealsPerDay} keyboardType="number-pad" />
      <FormInput label="Allergies" value={allergies} onChangeText={setAllergies} />
      <FormInput label="Restrictions" value={restrictions} onChangeText={setRestrictions} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={loading ? "L'IA cuisine…" : 'Générer mon plan'}
        onPress={handleGenerate}
        loading={loading}
      />

      {plan && !loading && (
        <View style={styles.result}>
          <Text style={styles.big}>{plan.total_calories} kcal</Text>
          <Text style={styles.muted}>
            {plan.total_protein?.toFixed(0) || 0} g protéines · {plan.meals?.length || 0} repas
          </Text>
          <Button
            title={planSaving ? 'Sauvegarde…' : planSavedId ? 'Plan sauvegardé ✓' : 'Sauvegarder ce plan'}
            onPress={handleSavePlan}
            loading={planSaving}
            disabled={Boolean(planSavedId)}
          />
          {saveSuccess ? <Text style={styles.success}>{saveSuccess}</Text> : null}
          {plan.advice ? <Text style={styles.muted}>💡 {plan.advice}</Text> : null}

          {plan.meals?.map((meal, i) => (
            <View key={i} style={styles.mealCard}>
              <Text style={styles.mealTitle}>
                {MEAL_ICONS[meal.meal_type] || '🍴'} {meal.meal_type} — {meal.dish_name}
              </Text>
              <Text style={styles.muted}>
                {meal.estimated_calories} kcal · P {meal.estimated_protein} g
              </Text>
              {meal.description ? <Text style={styles.muted}>{meal.description}</Text> : null}
              {meal.ingredients?.map((ing, j) => (
                <Text key={j} style={styles.ingredient}>
                  • {ing.quantity || ing.quantity_g} {ing.item || ing.name}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  legend: { color: colors.text, fontWeight: '700', marginTop: spacing.sm },
  recap: { gap: spacing.sm },
  checkboxRow: { paddingVertical: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  chipText: { color: colors.text, fontSize: 13 },
  error: { color: colors.danger, fontSize: 14 },
  success: { color: colors.success, fontSize: 14 },
  result: { gap: spacing.md },
  big: { color: colors.text, fontSize: 28, fontWeight: '800' },
  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  mealTitle: { color: colors.text, fontWeight: '700' },
  ingredient: { color: colors.textMuted, fontSize: 13 },
});
