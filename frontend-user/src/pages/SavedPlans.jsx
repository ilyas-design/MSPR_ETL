import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSavedPlans, deleteSavedPlan } from '../services/api';

const MEAL_ICONS = {
  'Petit-déjeuner': '🥐',
  'Déjeuner': '🍽️',
  'Dîner': '🌙',
  'Collation': '🍎',
};

function SavedPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listSavedPlans();
      setPlans(data);
    } catch (err) {
      if (err.response?.status === 503) {
        setError("MongoDB n'est pas accessible. Vérifie que le container 'mongo' tourne.");
      } else {
        setError("Erreur lors du chargement de tes plans sauvegardés.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleDelete = async (planId) => {
    if (!window.confirm('Supprimer définitivement ce plan ?')) return;
    try {
      await deleteSavedPlan(planId);
      await loadPlans();
    } catch (err) {
      setError("Impossible de supprimer ce plan.");
    }
  };

  if (loading) return <p role="status">Chargement de tes plans IA…</p>;

  return (
    <section className="saved-plans-page">
      <h2>Mes plans IA sauvegardés</h2>
      <p className="muted">
        Stockés dans MongoDB sous forme de documents JSON. Tu peux les consulter,
        les réutiliser ou les supprimer.
      </p>

      {error && <p className="form-error" role="alert">{error}</p>}

      {plans.length === 0 ? (
        <p className="muted">
          Pas encore de plans sauvegardés. Va sur{' '}
          <Link to="/meal-plan">Plan de repas</Link> pour en générer un et le sauvegarder.
        </p>
      ) : (
        <ul className="saved-plans-list">
          {plans.map((p) => {
            const isExpanded = expandedId === p.id;
            const planData = p.plan || {};
            return (
              <li key={p.id} className="saved-plan-card">
                <header className="saved-plan-header">
                  <div>
                    <h3>{p.title || 'Plan IA'}</h3>
                    <p className="muted">
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
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className="button-secondary"
                    >
                      {isExpanded ? '▲ Réduire' : '▼ Voir le détail'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="button-secondary"
                      aria-label="Supprimer ce plan"
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
      )}
    </section>
  );
}

export default SavedPlans;
