import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  listSavedPlans,
  deleteSavedPlan,
  listSavedWorkoutPlans,
  deleteSavedWorkoutPlan,
  logWorkoutSession,
} from '../services/api';

const MEAL_ICONS = {
  'Petit-déjeuner': '🥐',
  'Déjeuner': '🍽️',
  'Dîner': '🌙',
  'Collation': '🍎',
};

// Helper : devine la valeur de focus à partir du texte du LLM
const focusFromText = (focus = '') => {
  const f = focus.toLowerCase();
  if (f.includes('cardio') || f.includes('hiit')) return 'cardio';
  if (f.includes('haut') || f.includes('upper') || f.includes('pec') || f.includes('épaul')) return 'upper';
  if (f.includes('jamb') || f.includes('lower')) return 'lower';
  if (f.includes('full') || f.includes('global')) return 'full';
  if (f.includes('mobil') || f.includes('étir')) return 'mobility';
  return 'other';
};

function SavedPlans() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'workout' ? 'workout' : 'meal';
  const [tab, setTabState] = useState(initialTab);

  const setTab = (next) => {
    setTabState(next);
    setSearchParams({ tab: next }, { replace: true });
  };

  const [mealPlans, setMealPlans] = useState([]);
  const [workoutPlans, setWorkoutPlans] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [expandedId, setExpandedId] = useState(null);
  const [loggedKeys, setLoggedKeys] = useState(new Set());
  const [loggingKey, setLoggingKey] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [meals, workouts] = await Promise.all([
        listSavedPlans().catch(() => []),
        listSavedWorkoutPlans().catch(() => []),
      ]);
      setMealPlans(meals);
      setWorkoutPlans(workouts);
    } catch (err) {
      setError("Erreur lors du chargement de tes plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleDeleteMeal = async (planId) => {
    if (!window.confirm('Supprimer ce plan repas ?')) return;
    try {
      await deleteSavedPlan(planId);
      await loadAll();
    } catch (err) {
      setError("Impossible de supprimer ce plan.");
    }
  };

  const handleDeleteWorkout = async (planId) => {
    if (!window.confirm('Supprimer ce plan d\'entraînement ?')) return;
    try {
      await deleteSavedWorkoutPlan(planId);
      await loadAll();
    } catch (err) {
      setError("Impossible de supprimer ce plan.");
    }
  };

  const handleLogWorkoutSession = async (planId, sessionIdx, session) => {
    const key = `${planId}:${sessionIdx}`;
    setLoggingKey(key);
    setError('');
    setSuccessMsg('');
    try {
      await logWorkoutSession({
        focus: focusFromText(session.focus),
        duration_min: session.estimated_duration_min || 45,
        estimated_calories: session.estimated_calories || null,
        exercises_done: session.exercises || [],
      });
      setLoggedKeys((prev) => new Set([...prev, key]));
      setSuccessMsg(`✅ Séance "${session.day_label}" enregistrée dans Mes séances.`);
    } catch (err) {
      console.error('Log session error:', err.response?.data || err);
      const data = err.response?.data;
      const detail = data?.detail
        || (data && typeof data === 'object'
            ? Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ')
            : null)
        || err.message
        || 'erreur inconnue';
      setError(`Impossible d'enregistrer la séance : ${detail}`);
    } finally {
      setLoggingKey(null);
    }
  };

  if (loading) {
    return <p role="status" className="loading-message">Chargement de tes plans…</p>;
  }

  return (
    <section className="saved-plans-page">
      <header className="history-header">
        <div>
          <h2>Mes plans sauvegardés</h2>
          <p className="muted">
            Tes programmes générés par l'IA, stockés dans MongoDB. Tu peux marquer
            tes séances comme effectuées au fur et à mesure de la semaine.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'meal'}
          className={`tab ${tab === 'meal' ? 'active' : ''}`}
          onClick={() => setTab('meal')}
        >
          🍽️ Plans repas <span className="tab-count">{mealPlans.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'workout'}
          className={`tab ${tab === 'workout' ? 'active' : ''}`}
          onClick={() => setTab('workout')}
        >
          🏋️ Programmes <span className="tab-count">{workoutPlans.length}</span>
        </button>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {successMsg && <p className="form-success" role="status">{successMsg}</p>}

      {/* === TAB REPAS === */}
      {tab === 'meal' && (
        mealPlans.length === 0 ? (
          <article className="empty-state">
            <p className="muted">
              Aucun plan repas sauvegardé. Va sur{' '}
              <Link to="/meal-plan">Plan repas</Link> pour en générer un.
            </p>
          </article>
        ) : (
          <ul className="saved-plans-list">
            {mealPlans.map((p) => {
              const isExpanded = expandedId === `meal-${p.id}`;
              const planData = p.plan || {};
              return (
                <li key={p.id} className="saved-plan-card">
                  <header className="saved-plan-header">
                    <div>
                      <h3>{p.title || 'Plan IA'}</h3>
                      <p className="muted small">
                        {new Date(p.created_at).toLocaleString('fr-FR')}
                        {' · '}
                        <strong>{planData.total_calories || 0} kcal</strong>
                        {' · '}
                        {planData.meals?.length || 0} repas
                        {p.goal && <> · objectif <em>{p.goal}</em></>}
                      </p>
                    </div>
                    <div className="saved-plan-actions">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : `meal-${p.id}`)}
                        className="button-secondary"
                      >
                        {isExpanded ? '▲ Réduire' : '▼ Voir détail'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMeal(p.id)}
                        className="button-secondary delete-btn"
                        aria-label="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </header>

                  {isExpanded && (
                    <div className="saved-plan-detail">
                      {planData.advice && (
                        <p className="meal-description">💡 {planData.advice}</p>
                      )}
                      {planData.meals?.map((meal, i) => (
                        <article key={i} className="meal-card">
                          <header className="meal-card-header">
                            <h4>
                              {MEAL_ICONS[meal.meal_type] || '🍴'} {meal.meal_type}
                              {' — '}
                              <span className="meal-dish-name">{meal.dish_name}</span>
                            </h4>
                            <div className="meal-card-stats">
                              <span><strong>{meal.estimated_calories}</strong> kcal</span>
                              <span><strong>{meal.estimated_protein}</strong> g P</span>
                            </div>
                          </header>
                          {meal.description && (
                            <p className="meal-description">{meal.description}</p>
                          )}
                          <ul className="meal-ingredients">
                            {meal.ingredients?.map((ing, j) => (
                              <li key={j}>
                                <span className="ingredient-quantity">{ing.quantity}</span>
                                <span className="ingredient-name">{ing.item}</span>
                              </li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}

      {/* === TAB ENTRAÎNEMENT === */}
      {tab === 'workout' && (
        workoutPlans.length === 0 ? (
          <article className="empty-state">
            <p className="muted">
              Aucun programme d'entraînement sauvegardé. Va sur{' '}
              <Link to="/workout-plan">Entraînement</Link> pour en générer un et le sauvegarder.
            </p>
          </article>
        ) : (
          <ul className="saved-plans-list">
            {workoutPlans.map((p) => {
              const isExpanded = expandedId === `workout-${p.id}`;
              const planData = p.plan || {};
              const sessions = planData.weekly_plan || [];
              return (
                <li key={p.id} className="saved-plan-card">
                  <header className="saved-plan-header">
                    <div>
                      <h3>{p.title || 'Programme IA'}</h3>
                      <p className="muted small">
                        {new Date(p.created_at).toLocaleString('fr-FR')}
                        {' · '}
                        <strong>{sessions.length} séance{sessions.length > 1 ? 's' : ''}</strong>
                        {p.goal && <> · {p.goal}</>}
                        {p.level && <> · {p.level}</>}
                      </p>
                    </div>
                    <div className="saved-plan-actions">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : `workout-${p.id}`)}
                        className="button-secondary"
                      >
                        {isExpanded ? '▲ Réduire' : '▼ Voir les séances'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWorkout(p.id)}
                        className="button-secondary delete-btn"
                        aria-label="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </header>

                  {isExpanded && (
                    <div className="saved-plan-detail">
                      {planData.progression_tips && (
                        <p className="meal-description">💡 {planData.progression_tips}</p>
                      )}

                      {sessions.map((session, i) => {
                        const key = `${p.id}:${i}`;
                        const isLogged = loggedKeys.has(key);
                        const isLogging = loggingKey === key;
                        return (
                          <article key={i} className="meal-card">
                            <header className="meal-card-header">
                              <h4>
                                🏋️ {session.day_label}
                                {' — '}
                                <span className="meal-dish-name">{session.focus}</span>
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
                              <summary>💪 Exercices ({session.exercises?.length || 0})</summary>
                              <ul className="meal-ingredients">
                                {session.exercises?.map((ex, j) => (
                                  <li key={j} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <div>
                                      <strong>{ex.name}</strong>
                                      {ex.sets && ex.reps && (
                                        <span className="muted"> — {ex.sets} × {ex.reps}</span>
                                      )}
                                      {ex.rest_seconds && (
                                        <span className="muted"> · repos {ex.rest_seconds}s</span>
                                      )}
                                    </div>
                                    {ex.notes && (
                                      <small className="muted">{ex.notes}</small>
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

                            <div className="preview-actions" style={{ marginTop: '0.75rem' }}>
                              <button
                                type="button"
                                onClick={() => handleLogWorkoutSession(p.id, i, session)}
                                disabled={isLogged || isLogging}
                                className={isLogged ? 'button-secondary' : ''}
                              >
                                {isLogged
                                  ? '✓ Séance effectuée'
                                  : isLogging
                                    ? 'Enregistrement…'
                                    : '✅ J\'ai fait cette séance'}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}
    </section>
  );
}

export default SavedPlans;
