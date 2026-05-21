import { useState } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { updateMyProfile } from '../services/api';

const GOAL_OPTIONS = [
    { value: 'weight_loss', label: 'Perte de poids' },
    { value: 'muscle_gain', label: 'Prise de muscle' },
    { value: 'endurance', label: 'Amélioration de l\'endurance' },
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

function Onboarding() {
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!goal) {
      setError('Choisis un objectif principal.');
      return;
    }
    if (!experienceLevel) {
      setError('Indique ton niveau actuel.');
      return;
    }
    if (!age || age < 12 || age > 120) {
      setError('Indique un âge réaliste (entre 12 et 120 ans).');
      return;
    }
    if (!height || height < 100 || height > 250) {
      setError('Indique ta taille en cm (entre 100 et 250).');
      return;
    }
    if (!weight || weight < 30 || weight > 300) {
      setError('Indique ton poids en kg (entre 30 et 300).');
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
        age: parseInt(age, 10),
        gender,
        height_cm: parseInt(height, 10),
        weight_kg: parseFloat(weight),
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
        onboarded: true,
      });

      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.response?.data) {
        setError(JSON.stringify(err.response.data));
      } else {
        setError('Erreur lors de l\'enregistrement.');
      }
    } finally {
      setLoading(false);
    }
    };

    return (
    <section className="onboarding-page">
      <h2>Bienvenue ! Quelques questions pour personnaliser ton expérience</h2>

      <form onSubmit={handleSubmit} className="login-form" noValidate>
        <fieldset className="form-fieldset">
          <legend>Quel est ton objectif principal ?</legend>
          <div className="radio-group">
            {GOAL_OPTIONS.map((option) => (
              <label key={option.value} className="radio-label">
                <input
                  type="radio"
                  name="goal"
                  value={option.value}
                  checked={goal === option.value}
                  onChange={(event) => setGoal(event.target.value)}
                  disabled={loading}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="form-fieldset">
          <legend>Quel est ton niveau ?</legend>
          <div className="radio-group">
            {LEVEL_OPTIONS.map((option) => (
              <label key={option.value} className="radio-label">
                <input
                  type="radio"
                  name="level"
                  value={option.value}
                  checked={experienceLevel === option.value}
                  onChange={(event) => setExperienceLevel(event.target.value)}
                  disabled={loading}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

                <fieldset className="form-fieldset">
          <legend>Tes mesures</legend>

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
                required
                disabled={loading}
              />
            </div>

            <div className="form-field">
              <label htmlFor="gender">Genre</label>
              <select
                id="gender"
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                disabled={loading}
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
                required
                disabled={loading}
              />
            </div>

            <div className="form-field">
              <label htmlFor="weight">Poids actuel (kg)</label>
              <input
                id="weight"
                type="number"
                min="30"
                max="300"
                step="0.1"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                required
                disabled={loading}
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
              disabled={loading}
              aria-describedby="target-weight-hint"
            />
            <small id="target-weight-hint" className="form-hint">
              Utile surtout si tu veux perdre ou prendre du poids.
            </small>
          </div>
        </fieldset>



        <div className="form-field">
          <label htmlFor="diet">Restrictions alimentaires</label>
          <select
            id="diet"
            value={dietaryRestrictions}
            onChange={(event) => setDietaryRestrictions(event.target.value)}
            disabled={loading}
          >
            {DIET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="allergies">Allergies (optionnel)</label>
          <input
            id="allergies"
            type="text"
            value={allergies}
            onChange={(event) => setAllergies(event.target.value)}
            placeholder="Ex : arachides, fruits de mer"
            disabled={loading}
            aria-describedby="allergies-hint"
          />
          <small id="allergies-hint" className="form-hint">
            Sépare les allergies par des virgules.
          </small>
        </div>

        <div className="form-field">
          <label htmlFor="equipment">Équipement disponible (optionnel)</label>
          <input
            id="equipment"
            type="text"
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
            placeholder="Ex : tapis, haltères, élastiques"
            disabled={loading}
            aria-describedby="equipment-hint"
          />
          <small id="equipment-hint" className="form-hint">
            Sépare les équipements par des virgules. Laisse vide si tu fais du poids du corps uniquement.
          </small>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

                <button type="submit" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Valider et accéder à mon tableau de bord'}
        </button>
      </form>
    </section>
  );
}

export default Onboarding;

















