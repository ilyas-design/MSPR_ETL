import { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import Screen from '../src/components/Screen';
import FormInput from '../src/components/FormInput';
import Button from '../src/components/Button';
import { updateMyProfile } from '../src/api/health';
import { useAuth } from '../src/auth/AuthContext';
import {
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  DIET_OPTIONS,
  GENDER_OPTIONS,
} from '../src/constants/profileOptions';
import { commaListToArray } from '../src/utils/lists';
import { colors, radius, spacing } from '../src/theme';

function RadioGroup({ options, value, onChange, disabled }) {
  return (
    <View style={styles.radioGroup}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => !disabled && onChange(opt.value)}
          style={[styles.radio, value === opt.value && styles.radioActive]}
        >
          <Text style={styles.radioText}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const { refreshHealthProfile } = useAuth();
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [goal, setGoal] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('none');
  const [allergies, setAllergies] = useState('');
  const [equipment, setEquipment] = useState('');
  const [injuries, setInjuries] = useState('');
  const [mealBudget, setMealBudget] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!goal) {
      setError('Choisis un objectif principal.');
      return;
    }
    if (!experienceLevel) {
      setError('Indique ton niveau actuel.');
      return;
    }
    const ageNum = Number(age);
    if (!age || ageNum < 12 || ageNum > 120) {
      setError('Indique un âge réaliste (12–120 ans).');
      return;
    }
    const heightNum = Number(height);
    if (!height || heightNum < 100 || heightNum > 250) {
      setError('Indique ta taille en cm (100–250).');
      return;
    }
    const weightNum = Number(weight);
    if (!weight || weightNum < 30 || weightNum > 300) {
      setError('Indique ton poids en kg (30–300).');
      return;
    }

    setLoading(true);
    try {
      await updateMyProfile({
        goal,
        experience_level: experienceLevel,
        dietary_restrictions: dietaryRestrictions,
        allergies,
        equipment_available: equipment,
        injuries: commaListToArray(injuries),
        meal_budget: mealBudget ? parseInt(mealBudget, 10) : null,
        age: parseInt(age, 10),
        gender,
        height_cm: parseInt(height, 10),
        weight_kg: parseFloat(weight),
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
        onboarded: true,
      });
      await refreshHealthProfile();
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Erreur lors de l\'enregistrement.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Bienvenue !</Text>
      <Text style={styles.subtitle}>
        Quelques questions pour personnaliser ton expérience.
      </Text>

      <Text style={styles.legend}>Objectif principal</Text>
      <RadioGroup options={GOAL_OPTIONS} value={goal} onChange={setGoal} disabled={loading} />

      <Text style={styles.legend}>Niveau</Text>
      <RadioGroup
        options={LEVEL_OPTIONS}
        value={experienceLevel}
        onChange={setExperienceLevel}
        disabled={loading}
      />

      <FormInput label="Âge" value={age} onChangeText={setAge} keyboardType="number-pad" />
      <Text style={styles.legend}>Genre</Text>
      <RadioGroup
        options={GENDER_OPTIONS.filter((o) => o.value !== '')}
        value={gender}
        onChange={setGender}
        disabled={loading}
      />
      <FormInput
        label="Taille (cm)"
        value={height}
        onChangeText={setHeight}
        keyboardType="number-pad"
      />
      <FormInput
        label="Poids actuel (kg)"
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
      />
      <FormInput
        label="Poids cible (kg, optionnel)"
        value={targetWeight}
        onChangeText={setTargetWeight}
        keyboardType="decimal-pad"
      />

      <Text style={styles.legend}>Restrictions alimentaires</Text>
      <RadioGroup
        options={DIET_OPTIONS}
        value={dietaryRestrictions}
        onChange={setDietaryRestrictions}
        disabled={loading}
      />

      <FormInput
        label="Allergies (optionnel)"
        value={allergies}
        onChangeText={setAllergies}
        placeholder="Ex : arachides, fruits de mer"
      />
      <FormInput
        label="Équipement (optionnel)"
        value={equipment}
        onChangeText={setEquipment}
        placeholder="tapis, haltères…"
      />
      <FormInput
        label="Blessures / limitations (optionnel)"
        value={injuries}
        onChangeText={setInjuries}
        placeholder="genou, dos…"
      />
      <FormInput
        label="Budget repas hebdo (€)"
        value={mealBudget}
        onChangeText={setMealBudget}
        keyboardType="number-pad"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={loading ? 'Enregistrement…' : 'Valider et accéder au tableau de bord'}
        onPress={handleSubmit}
        loading={loading}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  legend: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  radioGroup: { gap: spacing.sm },
  radio: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  radioText: { color: colors.text, fontSize: 15 },
  error: { color: colors.danger, fontSize: 14 },
});
