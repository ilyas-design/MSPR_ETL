import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecommendationsToday } from '../services/api';

const NUTRIENT_LABELS = {
  calories: { label: 'Calories', unit: 'kcal' },
  protein: { label: 'Protéines', unit: 'g' },
  carbohydrates: { label: 'Glucides', unit: 'g' },
  fat: { label: 'Lipides', unit: 'g' },
};

const STATUS_COLORS = {
  ok: { bg: '#d3f9d8', fg: '#2b8a3e', label: 'OK' },
  deficit: { bg: '#fff3bf', fg: '#845e09', label: 'Déficit' },
  excess: { bg: '#ffe3e3', fg: '#c92a2a', label: 'Excès' },
};

function Coach() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getRecommendationsToday();
      setData(result);
    } catch (err) {
      if (err.response?.status === 400) {
        setError('Termine ton onboarding pour activer les recommandations.');
      } else {
        setError('Erreur lors du chargement de tes recommandations.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <p role="status">Analyse de tes apports en cours…</p>;

  if (error) {
    return (
      <section className="coach-page">
        <h2>Mon coach nutritionnel</h2>
        <p className="form-error" role="alert">{error}</p>
        <Link to="/onboarding">→ Compléter mon profil</Link>
      </section>
    );
  }

  return (
    <section className="coach-page">
      <header>
        <h2>Mon coach nutritionnel</h2>
        <p className="muted">
          Objectif : <strong>{data.profile.goal_label}</strong>
        </p>
      </header>

      {/* Cibles vs réel — progress bars */}
      <section aria-labelledby="balance-heading" className="balance-section">
        <h3 id="balance-heading">Équilibre du jour</h3>
        <ul className="balance-list">
          {data.imbalances.map((imb) => {
            const { label, unit } = NUTRIENT_LABELS[imb.nutrient];
            const colors = STATUS_COLORS[imb.status];
            const fillWidth = Math.min(imb.percentage, 100);
            return (
              <li key={imb.nutrient} className="balance-row">
                <div className="balance-header">
                  <strong>{label}</strong>
                  <span
                    className="badge"
                    style={{ background: colors.bg, color: colors.fg }}
                  >
                    {colors.label}
                  </span>
                </div>
                <div className="balance-numbers">
                  <span>
                    {imb.eaten} / {imb.target} {unit}
                  </span>
                  <span className="muted">{imb.percentage}%</span>
                </div>
                <div
                  className="balance-bar"
                  role="progressbar"
                  aria-valuenow={imb.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${label} : ${imb.percentage}% de la cible`}
                >
                  <div
                    className="balance-bar-fill"
                    style={{
                      width: `${fillWidth}%`,
                      background: colors.fg,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="muted">
          Calculé sur {data.totals_today.meals_count} repas enregistrés aujourd'hui.
        </p>
      </section>

      {/* Suggestions */}
      <section aria-labelledby="suggestions-heading" className="suggestions-section">
        <h3 id="suggestions-heading">Recommandations personnalisées</h3>
        {data.suggestions.length === 0 ? (
          <p className="form-success">
            🎉 Tes apports sont équilibrés aujourd'hui, continue comme ça !
          </p>
        ) : (
          <ul className="suggestions-list">
            {data.suggestions.map((s, i) => (
              <li key={i} className={`suggestion-card priority-${s.priority}`}>
                <div className="suggestion-icon" aria-hidden="true">{s.icon}</div>
                <div className="suggestion-content">
                  <h4>{s.title}</h4>
                  <p>{s.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="preview-actions">
        <Link to="/meal-plan" className="button-link">
          🍽️ Générer un plan de repas personnalisé
        </Link>
        <button type="button" onClick={loadData} className="button-secondary">
          🔄 Rafraîchir
        </button>
      </div>
    </section>
  );
}

export default Coach;
