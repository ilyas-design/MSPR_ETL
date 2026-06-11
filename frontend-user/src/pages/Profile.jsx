import { useState, useEffect } from 'react';
import { getMyProfile, updateMyProfile } from '../services/api';
import { arrayToCommaList, commaListToArray } from '../utils/chartA11yHelpers';

const GOAL_OPTIONS = [
  { value: 'weight_loss', label: 'Perdre du poids' },
  { value: 'muscle_gain', label: 'Prendre du muscle' },
  { value: 'endurance', label: 'Améliorer mon endurance' },
  { value: 'general_health', label: 'Maintenir ma forme' },
];

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

const DIET_OPTIONS = [
  { value: 'none', label: 'Aucune restriction' },
  { value: 'vegetarian', label: 'Végétarien' },
  { value: 'vegan', label: 'Végan' },
  { value: 'gluten_free', label: 'Sans gluten' },
  { value: 'lactose_free', label: 'Sans lactose' },
];

function Profile() {
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

  // Au montage : on récupère le profil et on pré-remplit
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getMyProfile();
        setGoal(data.goal || '');
        setExperienceLevel(data.experience_level || '');
        setDietaryRestrictions(data.dietary_restrictions || 'none');
        setAllergies(data.allergies || '');
        setEquipment(data.equipment_available || '');
        setInjuries(arrayToCommaList(data.injuries));
        setMealBudget(data.meal_budget ?? '');
        setAge(data.age || '');
        setGender(data.gender || '');
        setHeight(data.height_cm || '');
        setWeight(data.weight_kg || '');
        setTargetWeight(data.target_weight_kg || '');
      } catch {
        setError('Erreur lors du chargement du profil.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (age && (age < 12 || age > 120)) {
      setError('Âge réaliste : entre 12 et 120 ans.');
      return;
    }
    if (height && (height < 100 || height > 250)) {
      setError('Taille réaliste : entre 100 et 250 cm.');
      return;
    }
    if (weight && (weight < 30 || weight > 300)) {
      setError('Poids réaliste : entre 30 et 300 kg.');
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
      setSuccess('Profil enregistré.');
    } catch {
      setError("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="onboarding-page">
        <p role="status">Chargement du profil…</p>
      </section>
    );
  }

  return (
    <section className="onboarding-page">
      <h2>Mon profil</h2>
      <p>Modifie tes préférences à tout moment.</p>

      <form onSubmit={handleSubmit} className="login-form" noValidate>
        <fieldset className="form-fieldset">
          <legend>Objectif principal</legend>
          <div className="radio-group">
            {GOAL_OPTIONS.map((option) => (
              <label key={option.value} className="radio-label">
                <input
                  type="radio"
                  name="goal"
                  value={option.value}
                  checked={goal === option.value}
                  onChange={(event) => setGoal(event.target.value)}
                  disabled={saving}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="form-fieldset">
          <legend>Niveau</legend>
          <div className="radio-group">
            {LEVEL_OPTIONS.map((option) => (
              <label key={option.value} className="radio-label">
                <input
                  type="radio"
                  name="level"
                  value={option.value}
                  checked={experienceLevel === option.value}
                  onChange={(event) => setExperienceLevel(event.target.value)}
                  disabled={saving}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="form-fieldset">
          <legend>Mes mesures</legend>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="age">Âge</label>
              <input
                id="age"
                type="number"
                min="12"
                max="120"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="form-field">
              <label htmlFor="gender">Genre</label>
              <select
                id="gender"
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                disabled={saving}
              >
                <option value="">— Choisir —</option>
                <option value="M">Homme</option>
                <option value="F">Femme</option>
                <option value="O">Autre / Ne pas préciser</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="height">Taille (cm)</label>
              <input
                id="height"
                type="number"
                min="100"
                max="250"
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="form-field">
              <label htmlFor="weight">Poids (kg)</label>
              <input
                id="weight"
                type="number"
                min="30"
                max="300"
                step="0.1"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="target-weight">Poids cible (kg, optionnel)</label>
            <input
              id="target-weight"
              type="number"
              min="30"
              max="300"
              step="0.1"
              value={targetWeight}
              onChange={(event) => setTargetWeight(event.target.value)}
              disabled={saving}
            />
          </div>
        </fieldset>

        <div className="form-field">
          <label htmlFor="diet">Restrictions alimentaires</label>
          <select
            id="diet"
            value={dietaryRestrictions}
            onChange={(event) => setDietaryRestrictions(event.target.value)}
            disabled={saving}
          >
            {DIET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="allergies-edit">Allergies</label>
          <input
            id="allergies-edit"
            type="text"
            value={allergies}
            onChange={(event) => setAllergies(event.target.value)}
            disabled={saving}
            placeholder="Sépare par des virgules"
          />
        </div>

        <div className="form-field">
          <label htmlFor="equipment-edit">Équipement disponible</label>
          <input
            id="equipment-edit"
            type="text"
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
            disabled={saving}
            placeholder="Sépare par des virgules"
          />
        </div>

        <div className="form-field">
          <label htmlFor="injuries-edit">Blessures / limitations</label>
          <input
            id="injuries-edit"
            type="text"
            value={injuries}
            onChange={(event) => setInjuries(event.target.value)}
            disabled={saving}
            placeholder="Ex : genou, dos — sépare par des virgules"
          />
        </div>

        <div className="form-field">
          <label htmlFor="meal-budget-edit">Budget repas hebdo (€)</label>
          <input
            id="meal-budget-edit"
            type="number"
            min="0"
            max="10000"
            value={mealBudget}
            onChange={(event) => setMealBudget(event.target.value)}
            disabled={saving}
            placeholder="Optionnel"
          />
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="form-success" role="status">
            {success}
          </p>
        )}

        <button type="submit" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </section>
  );
}

export default Profile;
