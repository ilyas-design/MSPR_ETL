import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  generateWorkoutPlanAI,
  saveWorkoutPlan,
  getMyProfile,
} from '../services/api';
import { arrayToCommaList, commaListToArray } from '../utils/chartA11yHelpers';
import PlanLoading from '../components/PlanLoading';

const GOAL_OPTIONS = [
  { value: 'weight_loss', label: 'Perte de graisse / sèche' },
  { value: 'muscle_mass', label: 'Prise de masse (muscle + volume)' },
  { value: 'strength', label: 'Renforcement musculaire (force pure)' },
  { value: 'endurance', label: 'Endurance / cardio' },
  { value: 'general_health', label: 'Santé générale' },
  { value: 'maintenance', label: 'Maintien de la forme' },
];

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

const LOCATION_OPTIONS = [
  { value: 'home', label: 'À la maison' },
  { value: 'gym', label: 'En salle de sport' },
  { value: 'outdoor', label: 'En extérieur' },
];


function WorkoutPlan() {
  const [goal, setGoal] = useState('general_health');
  const [level, setLevel] = useState('beginner');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [durationMin, setDurationMin] = useState(45);
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


  // Pré-remplir depuis le profil
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
        if (profile.injuries?.length) {
          setLimitations(arrayToCommaList(profile.injuries));
        }
      } catch {
        // silent
      }
    })();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setSaveSuccess('');
    setPlanSavedId(null);
    setLoading(true);
    setPlan(null);
    try {
      const params = {
        goal,
        level,
        days_per_week: Number(daysPerWeek),
        session_duration_min: Number(durationMin),
        location,
        equipment: equipment.split(',').map((s) => s.trim()).filter(Boolean),
        preferences: preferences.split(',').map((s) => s.trim()).filter(Boolean),
        limitations: commaListToArray(limitations),
      };
      const result = await generateWorkoutPlanAI(params);
      setPlan(result);
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError("L'IA prend trop de temps. Réessaie.");
      } else if (err.response?.status === 502) {
        setError("Service IA indisponible. Vérifie ta clé OpenRouter ou que nutrition-api tourne.");
      } else if (err.response?.status === 429) {
        setError("Trop de requêtes — attends 1 min.");
      } else {
        setError("Erreur lors de la génération. Réessaie.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!plan) return;
    setPlanSaving(true);
    setError('');
    try {
      const saved = await saveWorkoutPlan(plan, {
        title: `Programme ${goal} — ${daysPerWeek} séances/sem`,
        goal,
        level,
      });
      setPlanSavedId(saved.id);
      setSaveSuccess('✅ Plan d\'entraînement sauvegardé ! Va sur Plans sauvegardés pour marquer tes séances faites au fur et à mesure.');
    } catch (err) {
      if (err.response?.status === 503) {
        setError("MongoDB n'est pas accessible.");
      } else {
        setError("Erreur lors de la sauvegarde du plan.");
      }
    } finally {
      setPlanSaving(false);
    }
  };


  return (
    <section className="workout-plan-page" aria-labelledby="workout-plan-title">
      <header>
        <h1 id="workout-plan-title">Plan d&apos;entraînement personnalisé par l&apos;IA</h1>
        <p className="muted">
          Moteur de recommandation multi-critères (chantier 2 MSPR2) :
          objectif, niveau, équipement, préférences, limitations, et historique
          des séances pour rotation et progression adaptative.
        </p>
      </header>

      <form onSubmit={handleGenerate} className="meal-plan-form">
        <fieldset>
          <legend>Mes paramètres</legend>

          <label htmlFor="wgoal">Objectif</label>
          <select id="wgoal" value={goal} onChange={(e) => setGoal(e.target.value)}>
            {GOAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label htmlFor="wlevel">Niveau</label>
          <select id="wlevel" value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label htmlFor="wdays">Séances par semaine</label>
          <input
            id="wdays"
            type="number"
            min="1"
            max="7"
            value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(e.target.value)}
            required
          />

          <label htmlFor="wduration">Durée par séance (minutes)</label>
          <input
            id="wduration"
            type="number"
            min="10"
            max="180"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            required
          />

          <label htmlFor="wlocation">Lieu</label>
          <select id="wlocation" value={location} onChange={(e) => setLocation(e.target.value)}>
            {LOCATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label htmlFor="wequipment">Équipement disponible (séparé par virgules)</label>
          <input
            id="wequipment"
            type="text"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="Ex : haltères, tapis, élastiques"
          />

          <label htmlFor="wprefs">Activités appréciées (optionnel)</label>
          <input
            id="wprefs"
            type="text"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="Ex : course, vélo, HIIT"
          />

          <label htmlFor="wlimits">Limitations physiques (optionnel)</label>
          <input
            id="wlimits"
            type="text"
            value={limitations}
            onChange={(e) => setLimitations(e.target.value)}
            placeholder="Ex : genou gauche, dos"
          />
        </fieldset>

        <button type="submit" disabled={loading}>
          {loading ? "🤖 L'IA construit ton programme…" : "✨ Générer mon plan d'entraînement"}
        </button>
      </form>

      {error && <p className="form-error" role="alert">{error}</p>}

      {loading && <PlanLoading variant="workout" />}

      {!loading && plan && (
        <section className="meal-plan-result" aria-live="polite">
          <div className="total-card">
            <h3>Programme de la semaine</h3>
            <p className="muted">
              {plan.weekly_plan.length} séance{plan.weekly_plan.length > 1 ? 's' : ''} prévue{plan.weekly_plan.length > 1 ? 's' : ''}
              {plan.progression_tips && <> — modèle {plan.model}</>}
            </p>
            <div className="preview-actions" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                onClick={handleSavePlan}
                disabled={planSaving || Boolean(planSavedId)}
              >
                {planSaving
                  ? 'Sauvegarde…'
                  : planSavedId
                    ? '✓ Plan sauvegardé'
                    : '💾 Sauvegarder ce plan'}
              </button>
            </div>
            {saveSuccess && <p className="form-success" role="status">{saveSuccess}</p>}
          </div>

          {plan.progression_tips && (
            <article className="ai-advice-card">
              <header><h4>💡 Conseils de progression</h4></header>
              <p>{plan.progression_tips}</p>
              {plan.rotation_note && (
                <p><strong>Rotation :</strong> {plan.rotation_note}</p>
              )}
            </article>
          )}

          {plan.weekly_plan.map((session, i) => (
            <article key={i} className="meal-card">
              <header className="meal-card-header">
                <h4>
                  🏋️ {session.day_label} — <span className="meal-dish-name">{session.focus}</span>
                </h4>
                <div className="meal-card-stats">
                  <span><strong>{session.estimated_duration_min}</strong> min</span>
                  <span><strong>{session.estimated_calories}</strong> kcal</span>
                </div>
              </header>

              {session.warm_up?.length > 0 && (
                <details>
                  <summary>🔥 Échauffement</summary>
                  <ul className="meal-ingredients">
                    {session.warm_up.map((w, j) => (
                      <li key={j}><span className="ingredient-name">{w}</span></li>
                    ))}
                  </ul>
                </details>
              )}

              <details open>
                <summary>💪 Exercices ({session.exercises.length})</summary>
                <ul className="meal-ingredients">
                  {session.exercises.map((ex, j) => (
                    <li key={j} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div>
                        <strong>{ex.name}</strong>
                        {ex.sets && ex.reps && (
                          <span className="muted"> — {ex.sets} séries × {ex.reps}</span>
                        )}
                        {ex.rest_seconds && (
                          <span className="muted"> · repos {ex.rest_seconds}s</span>
                        )}
                      </div>
                      {ex.notes && (
                        <small className="muted" style={{ marginTop: '0.25rem' }}>{ex.notes}</small>
                      )}
                    </li>
                  ))}
                </ul>
              </details>

              {session.cool_down?.length > 0 && (
                <details>
                  <summary>❄️ Retour au calme</summary>
                  <ul className="meal-ingredients">
                    {session.cool_down.map((c, j) => (
                      <li key={j}><span className="ingredient-name">{c}</span></li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          ))}

          {planSavedId && (
            <article className="empty-state" style={{ borderColor: 'var(--color-primary)', background: 'var(--color-primary-50)' }}>
              <p>
                ✨ Ton plan est sauvegardé.{' '}
                <Link to="/saved-plans" style={{ fontWeight: 600 }}>
                  Ouvre tes plans sauvegardés
                </Link>{' '}
                pour marquer tes séances comme faites au fur et à mesure de la semaine.
              </p>
            </article>
          )}
        </section>
      )}
    </section>
  );
}

export default WorkoutPlan;
