import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View, StyleSheet } from 'react-native';

import Screen from '../../src/components/Screen';
import { getMyMeals, getMealsToday, deleteMeal } from '../../src/api/health';
import { MEAL_TYPE_LABELS } from '../../src/constants/profileOptions';
import { colors, radius, spacing } from '../../src/theme';

export default function MealHistory() {
  const [meals, setMeals] = useState([]);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [allMeals, todayData] = await Promise.all([getMyMeals(), getMealsToday()]);
      setMeals(allMeals);
      setToday(todayData);
    } catch {
      setError('Erreur lors du chargement de l\'historique.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleDelete(mealId) {
    Alert.alert('Supprimer', 'Supprimer ce repas ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeal(mealId);
            await loadData();
          } catch {
            setError('Impossible de supprimer le repas.');
          }
        },
      },
    ]);
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
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {today && today.meals?.length > 0 && (
        <View style={styles.totalCard}>
          <Text style={styles.cardTitle}>Aujourd'hui</Text>
          <Text style={styles.big}>{Math.round(today.totals.calories)} kcal</Text>
          <Text style={styles.muted}>
            P {today.totals.protein?.toFixed(1)} g · G {today.totals.carbohydrates?.toFixed(1)} g ·
            L {today.totals.fat?.toFixed(1)} g
          </Text>
          <Text style={styles.muted}>{today.totals.meals_count} repas</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Tous mes repas</Text>
      {meals.length === 0 ? (
        <Text style={styles.muted}>Pas encore de repas enregistrés.</Text>
      ) : (
        meals.map((meal) => (
          <View key={meal.id} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealTitle}>
                {MEAL_TYPE_LABELS[meal.meal_type] || 'Repas'}
              </Text>
              <Pressable onPress={() => handleDelete(meal.id)}>
                <Text style={styles.delete}>🗑️</Text>
              </Pressable>
            </View>
            <Text style={styles.muted}>
              {new Date(meal.analyzed_at).toLocaleString('fr-FR')}
            </Text>
            <Text style={styles.mealStats}>
              {Math.round(meal.total_calories || 0)} kcal · P {meal.total_protein?.toFixed(1) || 0}{' '}
              g
            </Text>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  big: { color: colors.text, fontSize: 28, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  delete: { fontSize: 18 },
  mealStats: { color: colors.text, fontSize: 14 },
});
