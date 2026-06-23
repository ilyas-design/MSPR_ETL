import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View, StyleSheet } from 'react-native';

import Screen from '../../src/components/Screen';
import FormInput from '../../src/components/FormInput';
import Button from '../../src/components/Button';
import {
  getMyWorkouts,
  getWorkoutsToday,
  deleteWorkoutSession,
  logWorkoutSession,
} from '../../src/api/health';
import { FOCUS_OPTIONS, FOCUS_LABELS } from '../../src/constants/profileOptions';
import { colors, radius, spacing } from '../../src/theme';

export default function WorkoutHistory() {
  const [sessions, setSessions] = useState([]);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formFocus, setFormFocus] = useState('full');
  const [formDuration, setFormDuration] = useState('45');
  const [formCalories, setFormCalories] = useState('');
  const [formDifficulty, setFormDifficulty] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [all, todayData] = await Promise.all([getMyWorkouts(), getWorkoutsToday()]);
      setSessions(all);
      setToday(todayData);
    } catch {
      setError('Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleDelete(id) {
    Alert.alert('Supprimer', 'Supprimer cette séance ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWorkoutSession(id);
            await loadData();
          } catch {
            setError('Impossible de supprimer.');
          }
        },
      },
    ]);
  }

  async function handleSubmit() {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const payload = {
        focus: formFocus,
        duration_min: Number(formDuration),
        exercises_done: [],
      };
      if (formCalories) payload.estimated_calories = Number(formCalories);
      if (formDifficulty) payload.difficulty_rating = Number(formDifficulty);
      if (formNotes.trim()) payload.notes = formNotes.trim();

      await logWorkoutSession(payload);
      setSuccess('Séance ajoutée !');
      setShowForm(false);
      setFormNotes('');
      await loadData();
    } catch (err) {
      const detail = err?.response?.data?.detail || 'erreur inconnue';
      setError(`Impossible d'ajouter : ${detail}`);
    } finally {
      setSubmitting(false);
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
      <Button
        title={showForm ? 'Annuler' : 'Ajouter une séance'}
        variant={showForm ? 'ghost' : 'primary'}
        onPress={() => setShowForm(!showForm)}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Nouvelle séance</Text>
          <Text style={styles.legend}>Type</Text>
          <View style={styles.chips}>
            {FOCUS_OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                onPress={() => setFormFocus(o.value)}
                style={[styles.chip, formFocus === o.value && styles.chipActive]}
              >
                <Text style={styles.chipText}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
          <FormInput label="Durée (min)" value={formDuration} onChangeText={setFormDuration} keyboardType="number-pad" />
          <FormInput label="Calories (optionnel)" value={formCalories} onChangeText={setFormCalories} keyboardType="number-pad" />
          <FormInput label="Difficulté 1-5" value={formDifficulty} onChangeText={setFormDifficulty} keyboardType="number-pad" />
          <FormInput
            label="Notes"
            value={formNotes}
            onChangeText={setFormNotes}
            multiline
            numberOfLines={2}
          />
          <Button title="Enregistrer la séance" onPress={handleSubmit} loading={submitting} />
        </View>
      )}

      {today && today.totals?.sessions_count > 0 && (
        <View style={styles.totalCard}>
          <Text style={styles.cardTitle}>Aujourd'hui</Text>
          <Text style={styles.big}>{today.totals.duration_min} min</Text>
          <Text style={styles.muted}>
            {today.totals.estimated_calories || 0} kcal · {today.totals.sessions_count} séance(s)
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Toutes mes séances</Text>
      {sessions.length === 0 ? (
        <Text style={styles.muted}>Pas encore de séance enregistrée.</Text>
      ) : (
        sessions.map((s) => (
          <View key={s.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionTitle}>
                {FOCUS_LABELS[s.focus] || s.focus_label || 'Séance'}
              </Text>
              <Pressable onPress={() => handleDelete(s.id)}>
                <Text>🗑️</Text>
              </Pressable>
            </View>
            <Text style={styles.muted}>
              {new Date(s.done_at).toLocaleString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.stats}>
              {s.duration_min} min
              {s.estimated_calories ? ` · ${s.estimated_calories} kcal` : ''}
              {s.difficulty_rating ? ` · diff. ${s.difficulty_rating}/5` : ''}
            </Text>
            {s.notes ? <Text style={styles.muted}>💬 {s.notes}</Text> : null}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
  success: { color: colors.success, fontSize: 14 },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  legend: { color: colors.text, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12 },
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontWeight: '700' },
  big: { color: colors.text, fontSize: 28, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sessionTitle: { color: colors.text, fontWeight: '700' },
  stats: { color: colors.text, fontSize: 14 },
});
