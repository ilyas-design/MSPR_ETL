import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';

import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import { getRecommendationsToday, getCoachAdvice } from '../../src/api/health';
import { colors, radius, spacing } from '../../src/theme';

const STATUS_COLORS = {
  ok: colors.success,
  deficit: '#d97706',
  excess: colors.danger,
};

export default function CoachScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiAdvice, setAiAdvice] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const result = await getRecommendationsToday();
      setData(result);
    } catch (err) {
      if (err?.response?.status === 400) {
        setError('Termine ton onboarding pour activer les recommandations.');
      } else {
        setError('Erreur lors du chargement.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAskAI() {
    setAiError('');
    setAiAdvice(null);
    setAiLoading(true);
    try {
      const result = await getCoachAdvice();
      setAiAdvice(result);
    } catch (err) {
      if (err?.response?.status === 502) {
        setAiError('Service IA indisponible.');
      } else if (err?.response?.status === 429) {
        setAiError('Trop de requêtes — attends 1 min.');
      } else {
        setAiError('Erreur lors de la génération des conseils IA.');
      }
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Text style={styles.muted}>Analyse de tes apports…</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Text style={styles.error}>{error}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Mon coach nutritionnel</Text>
      {data?.profile?.goal_label ? (
        <Text style={styles.muted}>Objectif : {data.profile.goal_label}</Text>
      ) : null}

      <Text style={styles.sectionTitle}>Équilibre du jour</Text>
      {data?.imbalances?.map((imb) => (
        <View key={imb.nutrient} style={styles.balanceRow}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>{imb.nutrient}</Text>
            <Text style={[styles.badge, { color: STATUS_COLORS[imb.status] || colors.textMuted }]}>
              {imb.status}
            </Text>
          </View>
          <Text style={styles.muted}>
            {imb.eaten} / {imb.target} ({imb.percentage}%)
          </Text>
          <View style={styles.bar}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(100, imb.percentage)}%`,
                  backgroundColor: STATUS_COLORS[imb.status] || colors.primary,
                },
              ]}
            />
          </View>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Recommandations</Text>
      {data?.suggestions?.length === 0 ? (
        <Text style={styles.success}>Tes apports sont équilibrés aujourd'hui !</Text>
      ) : (
        data?.suggestions?.map((s, i) => (
          <View key={i} style={styles.suggestion}>
            <Text style={styles.suggestionTitle}>{s.icon} {s.title}</Text>
            <Text style={styles.muted}>{s.detail}</Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Conseils IA</Text>
      {!aiAdvice && !aiLoading ? (
        <Button title="Demander des conseils à l'IA" onPress={handleAskAI} />
      ) : null}
      {aiLoading ? <Text style={styles.muted}>L'IA réfléchit…</Text> : null}
      {aiError ? <Text style={styles.error}>{aiError}</Text> : null}
      {aiAdvice ? (
        <View style={styles.aiCard}>
          <Text style={styles.muted}>Généré par {aiAdvice.model}</Text>
          <Text style={styles.aiText}>{aiAdvice.advice}</Text>
          <Button title="Regénérer" variant="ghost" onPress={handleAskAI} loading={aiLoading} />
        </View>
      ) : null}

      <Button title="Rafraîchir" variant="ghost" onPress={loadData} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14 },
  success: { color: colors.success, fontSize: 14 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: spacing.sm },
  balanceRow: { gap: spacing.xs },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { color: colors.text, fontWeight: '600' },
  badge: { fontSize: 12, fontWeight: '700' },
  bar: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: radius.pill },
  suggestion: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  suggestionTitle: { color: colors.text, fontWeight: '700' },
  aiCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiText: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
