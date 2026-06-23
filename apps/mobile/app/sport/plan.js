import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';

import Screen from '../../src/components/Screen';
import FormInput from '../../src/components/FormInput';
import Button from '../../src/components/Button';
import {
  generateWorkoutPlanAI,
  saveWorkoutPlan,
  getMyProfile,
} from '../../src/api/health';
import {
  WORKOUT_GOAL_OPTIONS,
  LEVEL_OPTIONS,
  LOCATION_OPTIONS,
} from '../../src/constants/profileOptions';
import { arrayToCommaList, commaListToArray } from '../../src/utils/lists';
import { colors, radius, spacing } from '../../src/theme';

export default function WorkoutPlanScreen() {
  const [goal, setGoal] = useState('general_health');
  const [level, setLevel] = useState('beginner');
  const [daysPerWeek, setDaysPerWeek] = useState('3');
  const [durationMin, setDurationMin] = useState('45');
  const [location, setLocation] = useState('home');
  const [equipment, setEquipment] = useState('');
  const [preferences, setPreferences] = useState('');
  const [limitations, setLimitations] = useState('');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planSaving, setPlanSaving] = useState(false);
  const [planSavedId, setPlanSavedId] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const profile = await getMyProfile();
        if (profile.goal) setGoal(profile.goal);
        if (profile.experience_level) setLevel(profile.experience_level);
        if (profile.equipment_available) {
          setEquipment(
            Array.isArray(profile.equipment_available)
              ? profile.equipment_available.join(', ')
              : profile.equipment_available,
          );
        }
        if (profile.injuries?.length) setLimitations(arrayToCommaList(profile.injuries));
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
      const result = await generateWorkoutPlanAI({
        goal,
        level,
        days_per_week: Number(daysPerWeek),
        session_duration_min: Number(durationMin),
        location,
        equipment: equipment.split(',').map((s) => s.trim()).filter(Boolean),
        preferences: preferences.split(',').map((s) => s.trim()).filter(Boolean),
        limitations: commaListToArray(limitations),
      });
      setPlan(result);
    } catch {
      setError('Erreur lors de la génération.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePlan() {
    if (!plan) return;
    setPlanSaving(true);
    try {
      const saved = await saveWorkoutPlan(plan, {
        title: `Programme ${goal} — ${daysPerWeek} séances/sem`,
        goal,
        level,
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
      <Text style={styles.title}>Programme sport IA</Text>
      <Text style={styles.muted}>Plan personnalisé selon objectif, niveau et matériel.</Text>

      <Text style={styles.legend}>Objectif</Text>
      <View style={styles.chips}>
        {WORKOUT_GOAL_OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => setGoal(o.value)}
            style={[styles.chip, goal === o.value && styles.chipActive]}
          >
            <Text style={styles.chipText}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.legend}>Niveau</Text>
      <View style={styles.chips}>
        {LEVEL_OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => setLevel(o.value)}
            style={[styles.chip, level === o.value && styles.chipActive]}
          >
            <Text style={styles.chipText}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <FormInput label="Séances / semaine" value={daysPerWeek} onChangeText={setDaysPerWeek} keyboardType="number-pad" />
      <FormInput label="Durée (min)" value={durationMin} onChangeText={setDurationMin} keyboardType="number-pad" />

      <Text style={styles.legend}>Lieu</Text>
      <View style={styles.chips}>
        {LOCATION_OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => setLocation(o.value)}
            style={[styles.chip, location === o.value && styles.chipActive]}
          >
            <Text style={styles.chipText}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <FormInput label="Équipement" value={equipment} onChangeText={setEquipment} />
      <FormInput label="Activités appréciées" value={preferences} onChangeText={setPreferences} />
      <FormInput label="Limitations" value={limitations} onChangeText={setLimitations} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={loading ? "L'IA construit…" : 'Générer mon programme'}
        onPress={handleGenerate}
        loading={loading}
      />

      {plan && !loading && (
        <View style={styles.result}>
          <Text style={styles.muted}>
            {plan.weekly_plan?.length || 0} séance(s) · {plan.model || 'IA'}
          </Text>
          <Button
            title={planSaving ? 'Sauvegarde…' : planSavedId ? 'Sauvegardé ✓' : 'Sauvegarder'}
            onPress={handleSavePlan}
            loading={planSaving}
            disabled={Boolean(planSavedId)}
          />
          {saveSuccess ? <Text style={styles.success}>{saveSuccess}</Text> : null}
          {plan.progression_tips ? <Text style={styles.muted}>💡 {plan.progression_tips}</Text> : null}

          {plan.weekly_plan?.map((session, i) => (
            <View key={i} style={styles.sessionCard}>
              <Text style={styles.sessionTitle}>
                🏋️ {session.day_label} — {session.focus}
              </Text>
              <Text style={styles.muted}>
                {session.estimated_duration_min} min · {session.estimated_calories} kcal
              </Text>
              {session.exercises?.map((ex, j) => (
                <Text key={j} style={styles.exercise}>
                  • {ex.name}
                  {ex.sets && ex.reps ? ` — ${ex.sets} × ${ex.reps}` : ''}
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
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  sessionTitle: { color: colors.text, fontWeight: '700' },
  exercise: { color: colors.textMuted, fontSize: 13 },
});
