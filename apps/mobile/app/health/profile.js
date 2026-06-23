import { useEffect, useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import Screen from '../../src/components/Screen';
import FormInput from '../../src/components/FormInput';
import Button from '../../src/components/Button';
import { getMyProfile, updateMyProfile } from '../../src/api/health';
import { useAuth } from '../../src/auth/AuthContext';
import {
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  DIET_OPTIONS,
  GENDER_OPTIONS,
} from '../../src/constants/profileOptions';
import { arrayToCommaList, commaListToArray } from '../../src/utils/lists';
import { colors, radius, spacing } from '../../src/theme';

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

export default function HealthProfile() {
  const { refreshHealthProfile } = useAuth();
  const [goal, setGoal] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('none');
  const [allergies, setAllergies] = useState('');
  const [equipment, setEquipment] = useState('');
  const [injuries, setInjuries] = useState('');
  const [mealBudget, setMealBudget] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyProfile();
        setGoal(data.goal || '');
        setExperienceLevel(data.experience_level || '');
        setDietaryRestrictions(data.dietary_restrictions || 'none');
        setAllergies(data.allergies || '');
        setEquipment(data.equipment_available || '');
        setInjuries(arrayToCommaList(data.injuries));
        setMealBudget(data.meal_budget != null ? String(data.meal_budget) : '');
        setAge(data.age ? String(data.age) : '');
        setGender(data.gender || '');
        setHeight(data.height_cm ? String(data.height_cm) : '');
        setWeight(data.weight_kg ? String(data.weight_kg) : '');
        setTargetWeight(data.target_weight_kg ? String(data.target_weight_kg) : '');
      } catch {
        setError('Erreur lors du chargement du profil.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    setError('');
    setSuccess('');
    const ageNum = Number(age);
    if (age && (ageNum < 12 || ageNum > 120)) {
      setError('Âge réaliste : 12–120 ans.');
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile({
        goal,
        experience_level: experienceLevel,
        dietary_restrictions: dietaryRestrictions,
        allergies,
        equipment_available: equipment,
        injuries: commaListToArray(injuries),
        meal_budget: mealBudget ? parseInt(mealBudget, 10) : null,
        age: age ? parseInt(age, 10) : null,
        gender,
        height_cm: height ? parseInt(height, 10) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
      });
      await refreshHealthProfile();
      setSuccess('Profil enregistré.');
    } catch {
      setError("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Text style={styles.muted}>Chargement du profil…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Mon profil santé</Text>
      <Text style={styles.subtitle}>Modifie tes préférences à tout moment.</Text>

      <Text style={styles.legend}>Objectif</Text>
      <RadioGroup options={GOAL_OPTIONS} value={goal} onChange={setGoal} disabled={saving} />

      <Text style={styles.legend}>Niveau</Text>
      <RadioGroup
        options={LEVEL_OPTIONS}
        value={experienceLevel}
        onChange={setExperienceLevel}
        disabled={saving}
      />

      <FormInput label="Âge" value={age} onChangeText={setAge} keyboardType="number-pad" />
      <Text style={styles.legend}>Genre</Text>
      <RadioGroup
        options={GENDER_OPTIONS.filter((o) => o.value !== '')}
        value={gender}
        onChange={setGender}
        disabled={saving}
      />
      <FormInput label="Taille (cm)" value={height} onChangeText={setHeight} keyboardType="number-pad" />
      <FormInput label="Poids (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <FormInput
        label="Poids cible (kg)"
        value={targetWeight}
        onChangeText={setTargetWeight}
        keyboardType="decimal-pad"
      />

      <Text style={styles.legend}>Restrictions</Text>
      <RadioGroup
        options={DIET_OPTIONS}
        value={dietaryRestrictions}
        onChange={setDietaryRestrictions}
        disabled={saving}
      />

      <FormInput label="Allergies" value={allergies} onChangeText={setAllergies} />
      <FormInput label="Équipement" value={equipment} onChangeText={setEquipment} />
      <FormInput label="Blessures / limitations" value={injuries} onChangeText={setInjuries} />
      <FormInput
        label="Budget repas hebdo (€)"
        value={mealBudget}
        onChangeText={setMealBudget}
        keyboardType="number-pad"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <Button title={saving ? 'Enregistrement…' : 'Enregistrer'} onPress={handleSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14 },
  muted: { color: colors.textMuted },
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
  success: { color: colors.success, fontSize: 14 },
});
