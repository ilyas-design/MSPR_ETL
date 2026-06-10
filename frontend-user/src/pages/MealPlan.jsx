import { useEffect, useState } from 'react';
import {
  generateMealPlan,
  getMyProfile,
  getRecommendationsToday,
} from '../services/api';

const GOAL_OPTIONS = [
  { value: 'weight_loss', label: 'Perdre du poids' },
  { value: 'muscle_gain', label: 'Prendre du muscle' },
  { value: 'endurance', label: 'Améliorer mon endurance' },
  { value: 'maintenance', label: 'Maintenir ma forme' },
];

function MealPlan() {
  const [goal, setGoal] = useState('maintenance');
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [allergies, setAllergies] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [mealsPerDay, setMealsPerDay] = useState(3);

  // État pour afficher / utiliser ce qui a déjà été mangé aujourd'hui
  const [todayStats, setTodayStats] = useState(null); // {eaten, target, remaining, mealsAlreadyEaten}
  const [useRemainingMode, setUseRemainingMode] = useState(true);

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pré-remplir avec le profil de l'user + déduire ce qui a été mangé aujourd'hui
  useEffect(() => {
    (async () => {
      try {
        // Charge en parallèle profil + recommandations du jour
        const [profile, reco] = await Promise.all([
          getMyProfile(),
          getRecommendationsToday().catch(() => null),
        ]);

        if (profile.goal) setGoal(profile.goal);
        if (profile.allergies) {
          setAllergies(
            Array.isArray(profile.allergies)
              ? profile.allergies.join(', ')
              : profile.allergies,
          );
        }
        if (profile.dietary_restrictions) {
          setRestrictions(profile.dietary_restrictions);
        }

        if (reco) {
          const eaten = Math.round(reco.totals_today.calories || 0);
          const target = reco.targets.calories || profile.daily_calorie_target || 2000;
          const remaining = Math.max(0, target - eaten);
          const mealsAlreadyEaten = reco.totals_today.meals_count || 0;

          setTodayStats({ eaten, target, remaining, mealsAlreadyEaten });

          // Mode par défaut : on planifie pour le reste de la journée
          if (remaining > 0) {
            setCalorieTarget(remaining);
            // Ajuste aussi le nombre de repas restants (cible 3/jour par défaut)
            const remainingMeals = Math.max(1, 3 - mealsAlreadyEaten);
            setMealsPerDay(remainingMeals);
          } else {
            setCalorieTarget(target);
          }
        } else {
          // Pas de reco dispo → fallback sur la cible quotidienne brute
          setCalorieTarget(profile.daily_calorie_target || 2000);
        }
      } catch (err) {
        // Silent fail : on garde les defaults
      }
    })();
  }, []);

  // Switch entre "reste de la journée" et "journée complète"
  const handleToggleMode = () => {
    if (!todayStats) return;
    if (useRemainingMode) {
      // Passer en mode journée complète
      setCalorieTarget(todayStats.target);
      setMealsPerDay(3);
    } else {
      // Repasser en mode reste de la journée
      setCalorieTarget(todayStats.remaining);
      setMealsPerDay(Math.max(1, 3 - todayStats.mealsAlreadyEaten));
    }
    setUseRemainingMode(!useRemainingMode);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setPlan(null);
    try {
      const params = {
        goal,
        calorie_target: Number(calorieTarget),
        allergies: allergies
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        restrictions: restrictions
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
        meals_per_day: Number(mealsPerDay),
      };
      const result = await generateMealPlan(params);
      setPlan(result);
    } catch (err) {
      if (err.response?.status === 502) {
        setError("Le service IA est indisponible. Vérifie que nutrition-api tourne.");
      } else {
        setError('Erreur lors de la génération du plan. Réessaie.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="meal-plan-page">
      <header>
        <h2>Plan de repas personnalisé</h2>
        <p className="muted">
          L'IA génère un plan adapté à ton objectif, ton budget calorique et tes contraintes alimentaires.
        </p>
      </header>

      {/* Récap des apports du jour si déjà mangé */}
      {todayStats && todayStats.mealsAlreadyEaten > 0 && (
        <section className="today-recap" aria-label="Apports déjà consommés aujourd'hui">
          <p>
            <strong>Aujourd'hui</strong> : tu as déjà mangé{' '}
            <strong>{todayStats.eaten} kcal</strong> sur {todayStats.target} kcal
            ({todayStats.mealsAlreadyEaten} repas).
            {todayStats.remaining > 0 && (
              <>
                {' '}Il te reste <strong>{todayStats.remaining} kcal</strong> à consommer.
              </>
            )}
          </p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useRemainingMode}
              onChange={handleToggleMode}
            />
            <span>Planifier seulement le reste de la journée</span>
          </label>
        </section>
      )}

      <form onSubmit={handleGenerate} className="meal-plan-form">
        <fieldset>
          <legend>Mes paramètres</legend>

          <label htmlFor="goal">Objectif</label>
          <select
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          >
            {GOAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <label htmlFor="calories">Calories cibles par jour</label>
          <input
            id="calories"
            type="number"
            min="500"
            max="5000"
            step="1"
            value={calorieTarget}
            onChange={(e) => setCalorieTarget(e.target.value)}
            required
          />

          <label htmlFor="meals">Nombre de repas par jour</label>
          <select
            id="meals"
            value={mealsPerDay}
            onChange={(e) => setMealsPerDay(e.target.value)}
          >
            <option value="3">3 repas</option>
            <option value="4">4 repas (+ collation)</option>
            <option value="5">5 repas</option>
          </select>

          <label htmlFor="allergies">Allergies (séparées par virgules)</label>
          <input
            id="allergies"
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="Ex : arachides, fruits de mer"
          />

          <label htmlFor="restrictions">Restrictions / régime</label>
          <input
            id="restrictions"
            type="text"
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
            placeholder="Ex : vegetarian, gluten_free"
          />
        </fieldset>

        <button type="submit" disabled={loading}>
          {loading ? 'Génération en cours…' : '🍽️ Générer mon plan'}
        </button>
      </form>

      {error && (
        <p className="form-error" role="alert">{error}</p>
      )}

      {plan && (
        <section className="meal-plan-result" aria-live="polite">
          <div className="total-card">
            <h3>Plan pour la journée</h3>
            <p className="total-calories">
              {Math.round(plan.total_calories)} <span>kcal</span>
            </p>
            <p className="muted">
              {plan.total_protein?.toFixed(1) || 0} g de protéines au total · cible {plan.calorie_target} kcal
            </p>
          </div>

          {plan.meals.map((meal, i) => (
            <article key={i} className="prediction-card">
              <header className="prediction-header">
                <h4 className="prediction-label">
                  {meal.meal_type === 'Breakfast' && '🥐 Petit-déjeuner'}
                  {meal.meal_type === 'Lunch' && '🍽️ Déjeuner'}
                  {meal.meal_type === 'Dinner' && '🌙 Dîner'}
                  {meal.meal_type === 'Snack' && '🍎 Collation'}
                </h4>
                <span className="prediction-score">
                  {Math.round(meal.total_calories)} kcal
                </span>
              </header>
              <ul className="meal-foods-list">
                {meal.foods.map((food, j) => (
                  <li key={j}>
                    <strong>{food.food_item}</strong>
                    {food.category && <span className="muted"> · {food.category}</span>}
                    <span className="muted">
                      {' '}
                      — {Math.round(food.avg_calories || 0)} kcal,
                      {' '}{food.avg_protein || 0} g P
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}

export default MealPlan;
