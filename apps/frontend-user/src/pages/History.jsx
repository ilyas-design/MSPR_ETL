import { useEffect, useState } from 'react';
import { getMyMeals, getMealsToday, deleteMeal } from '../services/api';

const MEAL_TYPE_LABELS = {
  breakfast: '🥐 Petit-déjeuner',
  lunch: '🍽️ Déjeuner',
  dinner: '🌙 Dîner',
  snack: '🍎 Collation',
};

function MealHistory() {
  const [meals, setMeals] = useState([]);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [allMeals, todayData] = await Promise.all([
        getMyMeals(),
        getMealsToday(),
      ]);
      setMeals(allMeals);
      setToday(todayData);
    } catch (err) {
      setError('Erreur lors du chargement de l\'historique.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (mealId) => {
    if (!window.confirm('Supprimer ce repas de ton historique ?')) return;
    try {
      await deleteMeal(mealId);
      await loadData();
    } catch (err) {
      setError('Impossible de supprimer le repas.');
    }
  };

  if (loading) return <p role="status">Chargement de l'historique…</p>;

  return (
    <section className="history-page">
      <h2>Mon historique de repas</h2>

      {error && <p className="form-error" role="alert">{error}</p>}

      {/* Carte du jour */}
      {today && today.meals.length > 0 && (
        <section className="total-card" aria-label="Total du jour">
          <h3>Aujourd'hui</h3>
          <p className="total-calories">
            {Math.round(today.totals.calories)} <span>kcal</span>
          </p>
          <dl className="macros-grid">
            <div>
              <dt>Protéines</dt>
              <dd>{today.totals.protein.toFixed(1)} g</dd>
            </div>
            <div>
              <dt>Glucides</dt>
              <dd>{today.totals.carbohydrates.toFixed(1)} g</dd>
            </div>
            <div>
              <dt>Lipides</dt>
              <dd>{today.totals.fat.toFixed(1)} g</dd>
            </div>
          </dl>
          <p className="muted">{today.totals.meals_count} repas enregistrés</p>
        </section>
      )}

      {/* Liste complète */}
      <h3>Tous mes repas</h3>
      {meals.length === 0 ? (
        <p className="muted">
          Pas encore de repas enregistrés. Va sur <em>Analyser un repas</em> pour commencer.
        </p>
      ) : (
        <ul className="meals-list">
          {meals.map((meal) => (
            <li key={meal.id} className="prediction-card">
              <div className="prediction-header">
                <span className="prediction-label">
                  {MEAL_TYPE_LABELS[meal.meal_type] || 'Repas'}
                  {' — '}
                  <small>{new Date(meal.analyzed_at).toLocaleString('fr-FR')}</small>
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(meal.id)}
                  className="button-secondary"
                  aria-label="Supprimer ce repas"
                >
                  🗑️
                </button>
              </div>
              <p>
                <strong>{Math.round(meal.total_calories || 0)} kcal</strong>
                {' · '}
                P {meal.total_protein?.toFixed(1) || 0} g
                {' · '}
                G {meal.total_carbohydrates?.toFixed(1) || 0} g
                {' · '}
                L {meal.total_fat?.toFixed(1) || 0} g
              </p>
              {meal.detected_foods?.length > 0 && (
                <details>
                  <summary className="muted">Détail des aliments</summary>
                  <ul>
                    {meal.detected_foods.map((item, i) => (
                      <li key={i}>
                        {item.matched_name || item.pretty_label || item.label}
                        {item.source && <span className={`badge badge-${item.source}`}> {item.source}</span>}
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

export default MealHistory;
