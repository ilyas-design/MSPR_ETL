import { useState } from 'react';
import { Image, Pressable, Text, View, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import Screen from '../../src/components/Screen';
import Button from '../../src/components/Button';
import {
  analyzeMealPhoto,
  lookupMacros,
  saveMeal,
} from '../../src/api/health';
import { colors, radius, spacing } from '../../src/theme';

export default function MealAnalysis() {
  const [step, setStep] = useState('upload');
  const [preview, setPreview] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState(new Set());
  const [lookupResult, setLookupResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length) {
      setPreview(result.assets[0].uri);
      setError('');
    }
  }

  async function handleAnalyze() {
    if (!preview) {
      setError('Sélectionne d\'abord une photo.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const results = await analyzeMealPhoto(preview);
      setPredictions(results);
      setSelectedLabels(new Set(results.length > 0 ? [results[0].label] : []));
      setStep('select');
    } catch {
      setError('Erreur lors de l\'analyse. Réessaie.');
    } finally {
      setLoading(false);
    }
  }

  function toggleLabel(label) {
    setSelectedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  async function handleCalculate() {
    if (selectedLabels.size === 0) {
      setError('Coche au moins un aliment.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const labels = Array.from(selectedLabels);
      const result = await lookupMacros(labels, predictions);
      setLookupResult(result);
      setStep('result');
    } catch {
      setError('Erreur lors du calcul des macros.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep('upload');
    setPreview(null);
    setPredictions([]);
    setSelectedLabels(new Set());
    setLookupResult(null);
    setError('');
    setSavedMessage('');
  }

  async function handleSaveMeal() {
    if (!lookupResult) return;
    setSaving(true);
    setSavedMessage('');
    try {
      await saveMeal({
        detected_foods: lookupResult.items,
        total_calories: lookupResult.total.calories,
        total_protein: lookupResult.total.protein,
        total_carbohydrates: lookupResult.total.carbohydrates,
        total_fat: lookupResult.total.fat,
      });
      setSavedMessage('Repas enregistré dans ton historique !');
    } catch {
      setError('Impossible d\'enregistrer le repas.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.stepper}>
        <Text style={[styles.step, step === 'upload' && styles.stepActive]}>1. Photo</Text>
        <Text style={[styles.step, step === 'select' && styles.stepActive]}>2. Vérification</Text>
        <Text style={[styles.step, step === 'result' && styles.stepActive]}>3. Résultats</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {step === 'upload' && (
        <View style={styles.block}>
          <Text style={styles.muted}>Prends ou choisis une photo de ton assiette.</Text>
          {preview ? (
            <Image source={{ uri: preview }} style={styles.preview} />
          ) : (
            <Pressable style={styles.uploadZone} onPress={pickImage}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadText}>Choisir une photo</Text>
            </Pressable>
          )}
          <Button title="Choisir une photo" variant="ghost" onPress={pickImage} />
          {preview ? (
            <Button
              title={loading ? 'Analyse…' : 'Analyser ce repas'}
              onPress={handleAnalyze}
              loading={loading}
            />
          ) : null}
        </View>
      )}

      {step === 'select' && (
        <View style={styles.block}>
          <Text style={styles.muted}>Coche les aliments présents dans ton assiette.</Text>
          {preview ? <Image source={{ uri: preview }} style={styles.previewSmall} /> : null}
          {predictions.map((pred) => {
            const checked = selectedLabels.has(pred.label);
            return (
              <Pressable
                key={pred.label}
                onPress={() => toggleLabel(pred.label)}
                style={[styles.predRow, checked && styles.predRowActive]}
              >
                <Text style={styles.predName}>
                  {pred.matched_food || pred.label.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.predScore}>{Math.round((pred.score || 0) * 100)}%</Text>
              </Pressable>
            );
          })}
          <Button
            title={loading ? 'Calcul…' : `Calculer (${selectedLabels.size})`}
            onPress={handleCalculate}
            loading={loading}
            disabled={selectedLabels.size === 0}
          />
          <Button title="Recommencer" variant="ghost" onPress={handleReset} />
        </View>
      )}

      {step === 'result' && lookupResult && (
        <View style={styles.block}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total estimé</Text>
            <Text style={styles.totalKcal}>{lookupResult.total.calories} kcal</Text>
            <Text style={styles.muted}>
              P {lookupResult.total.protein} g · G {lookupResult.total.carbohydrates} g · L{' '}
              {lookupResult.total.fat} g
            </Text>
          </View>

          {lookupResult.items.map((item) => (
            <View key={item.label} style={styles.itemCard}>
              <Text style={styles.itemName}>
                {item.matched_name || item.pretty_label || item.label}
              </Text>
              {item.macros ? (
                <Text style={styles.muted}>
                  {item.macros.avg_calories} kcal · P {item.macros.avg_protein} g
                </Text>
              ) : (
                <Text style={styles.muted}>Aucune donnée nutritionnelle</Text>
              )}
            </View>
          ))}

          <Button
            title={saving ? 'Enregistrement…' : savedMessage ? 'Enregistré ✓' : 'Enregistrer'}
            onPress={handleSaveMeal}
            loading={saving}
            disabled={Boolean(savedMessage)}
          />
          <Button title="Nouvelle analyse" variant="ghost" onPress={handleReset} />
          {savedMessage ? <Text style={styles.success}>{savedMessage}</Text> : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  step: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  stepActive: { color: colors.primary },
  error: { color: colors.danger, fontSize: 14 },
  success: { color: colors.success, fontSize: 14 },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  block: { gap: spacing.md },
  uploadZone: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  uploadIcon: { fontSize: 32 },
  uploadText: { color: colors.text, fontWeight: '600' },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  previewSmall: {
    width: '100%',
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  predRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  predRowActive: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  predName: { color: colors.text, fontWeight: '600', flex: 1 },
  predScore: { color: colors.textMuted },
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalLabel: { color: colors.textMuted, fontSize: 13 },
  totalKcal: { color: colors.text, fontSize: 32, fontWeight: '800' },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  itemName: { color: colors.text, fontWeight: '700' },
});
