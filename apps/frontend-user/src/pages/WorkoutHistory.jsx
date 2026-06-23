import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMyWorkouts,
  getWorkoutsToday,
  deleteWorkoutSession,
  logWorkoutSession,
} from '../services/api';

const FOCUS_OPTIONS = [
  { value: 'upper', label: '💪 Haut du corps' },
  { value: 'lower', label: '🦵 Bas du corps' },
  { value: 'full', label: '🏋️ Full body' },
  { value: 'cardio', label: '🏃 Cardio' },
  { value: 'hiit', label: '🔥 HIIT' },
  { value: 'mobility', label: '🧘 Mobilité' },
  { value: 'other', label: '🏋️ Autre' },
];

const FOCUS_LABELS = Object.fromEntries(FOCUS_OPTIONS.map((o) => [o.value, o.label]));

function WorkoutHistory() {
  const [sessions, setSessions] = useState([]);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Formulaire d'ajout manuel
  const [showForm, setShowForm] = useState(false);
  const [formFocus, setFormFocus] = useState('full');
  const [formDuration, setFormDuration] = useState(45);
  const [formCalories, setFormCalories] = useState('');
  const [formDifficulty, setFormDifficulty] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [all, todayData] = await Promise.all([
        getMyWorkouts(),
        getWorkoutsToday(),
      ]);
      setSessions(all);
      setToday(todayData);
    } catch (err) {
      setError("Erreur lors du chargement de tes séances.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette séance ?')) return;
    try {
      await deleteWorkoutSession(id);
      await loadData();
    } catch (err) {
      setError("Impossible de supprimer cette séance.");
    }
  };

  const resetForm = () => {
    setFormFocus('full');
    setFormDuration(45);
    setFormCalories('');
    setFormDifficulty('');
    setFormNotes('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      setSuccess('✅ Séance ajoutée à ton historique !');
      resetForm();
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error('Add session error:', err.response?.data || err);
      const data = err.response?.data;
      const detail = data?.detail
        || (data && typeof data === 'object'
            ? Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ')
            : null)
        || err.message
        || 'erreur inconnue';
      setError(`Impossible d'ajouter la séance : ${detail}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p role="status" className="loading-message">Chargement de tes séances…</p>;

  return (
    <section className="history-page">
      {/* Header */}
      <header className="history-header">
        <div>
          <h2>Mes séances</h2>
          <p className="muted">
            Tracking de tes entraînements — manuel ou depuis tes plans IA.
          </p>
        </div>
        <div className="history-actions">
          <button
            type="button"
            onClick={() => { setShowForm(!showForm); setSuccess(''); setError(''); }}
            className={showForm ? 'button-secondary' : ''}
          >
            {showForm ? '✕ Annuler' : '➕ Ajouter une séance'}
          </button>
        </div>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="form-success" role="status">{success}</p>}

      {/* Formulaire d'ajout manuel */}
      {showForm && (
        <article className="manual-form-card" aria-label="Formulaire d'ajout manuel">
          <h3>Nouvelle séance</h3>
          <form onSubmit={handleSubmit} className="manual-form">
            <div className="manual-form-grid">
              <div>
                <label htmlFor="form-focus">Type</label>
                <select
                  id="form-focus"
                  value={formFocus}
                  onChange={(e) => setFormFocus(e.target.value)}
                  required
                >
                  {FOCUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="form-duration">Durée (min)</label>
                <input
                  id="form-duration"
                  type="number"
                  min="1"
                  max="240"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="form-calories">Calories brûlées (optionnel)</label>
                <input
                  id="form-calories"
                  type="number"
                  min="0"
                  max="3000"
                  value={formCalories}
                  onChange={(e) => setFormCalories(e.target.value)}
                  placeholder="Ex : 320"
                />
              </div>

              <div>
                <label htmlFor="form-difficulty">Difficulté ressentie (1-5)</label>
                <select
                  id="form-difficulty"
                  value={formDifficulty}
                  onChange={(e) => setFormDifficulty(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="1">1 — très facile</option>
                  <option value="2">2 — facile</option>
                  <option value="3">3 — moyen</option>
                  <option value="4">4 — difficile</option>
                  <option value="5">5 — très difficile</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="form-notes">Notes (optionnel)</label>
              <textarea
                id="form-notes"
                rows="2"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Comment t'es-tu senti ? Records ? Sensations ?"
              />
            </div>

            <div className="preview-actions">
              <button type="submit" disabled={submitting}>
                {submitting ? 'Ajout en cours…' : '✓ Enregistrer la séance'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="button-secondary"
                disabled={submitting}
              >
                Annuler
              </button>
            </div>
          </form>
        </article>
      )}

      {/* Récap du jour */}
      {today && today.totals.sessions_count > 0 && (
        <section className="total-card" aria-label="Récap du jour">
          <h3>Aujourd'hui</h3>
          <p className="total-calories">
            {today.totals.duration_min} <span>min</span>
          </p>
          <dl className="macros-grid">
            <div>
              <dt>Calories brûlées</dt>
              <dd>{today.totals.estimated_calories || 0} kcal</dd>
            </div>
            <div>
              <dt>Séances</dt>
              <dd>{today.totals.sessions_count}</dd>
            </div>
          </dl>
        </section>
      )}

      {/* Liste complète */}
      <h3 className="dashboard-section-title">Toutes mes séances</h3>
      {sessions.length === 0 ? (
        <article className="empty-state">
          <p className="muted">
            Pas encore de séance enregistrée.{' '}
            <Link to="/workout-plan">Génère un plan IA</Link> et marque
            tes séances comme faites, ou clique sur <strong>➕ Ajouter une séance</strong> en haut.
          </p>
        </article>
      ) : (
        <ul className="meals-list">
          {sessions.map((s) => (
            <li key={s.id} className="prediction-card">
              <div className="prediction-header">
                <span className="prediction-label">
                  {FOCUS_LABELS[s.focus] || s.focus_label || 'Séance'}
                  {' — '}
                  <small className="muted">
                    {new Date(s.done_at).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="button-secondary delete-btn"
                  aria-label="Supprimer cette séance"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
              <p className="session-stats">
                <strong>{s.duration_min} min</strong>
                {s.estimated_calories && (
                  <> · ≈ <strong>{s.estimated_calories} kcal</strong> brûlées</>
                )}
                {s.difficulty_rating && (
                  <> · difficulté <strong>{s.difficulty_rating}/5</strong></>
                )}
              </p>
              {s.notes && (
                <p className="session-notes">💬 {s.notes}</p>
              )}
              {s.exercises_done?.length > 0 && (
                <details>
                  <summary>
                    Détail ({s.exercises_done.length} exercice{s.exercises_done.length > 1 ? 's' : ''})
                  </summary>
                  <ul className="exercises-detail-list">
                    {s.exercises_done.map((ex, i) => (
                      <li key={i}>
                        <strong>{ex.name}</strong>
                        {ex.sets && ex.reps && (
                          <span className="muted"> — {ex.sets} × {ex.reps}</span>
                        )}
                        {ex.rest_seconds && (
                          <span className="muted"> · repos {ex.rest_seconds}s</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default WorkoutHistory;
