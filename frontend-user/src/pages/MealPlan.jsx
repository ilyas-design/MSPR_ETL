import { useEffect, useState } from 'react';
import {
  generateMealPlanAI,
  getMyProfile,
  getRecommendationsToday,
  saveMeal,
  saveMealPlan,
} from '../services/api';

const GOAL_OPTIONS = [
  { value: 'weight_loss', label: 'Perdre du poids' },
  { value: 'muscle_gain', label: 'Prendre du muscle' },
  { value: 'endurance', label: 'Améliorer mon endurance' },
  { value: 'maintenance', label: 'Maintenir ma forme' },
];

const MEAL_ICONS = {
  'Petit-déjeuner': '🥐',
  'Déjeuner': '🍽️',
  'Dîner': '🌙',
  'Collation': '🍎',
};

function MealPlan() {
  const [goal, setGoal] = useState('maintenance');
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [allergies, setAllergies] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [mealsPerDay, setMealsPerDay] = useState(3);

  const [todayStats, setTodayStats] = useState(null);
  const [useRemainingMode, setUseRemainingMode] = useState(true);

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // État de sauvegarde : Set d'index des repas déjà enregistrés + état de chargement
  const [savedMeals, setSavedMeals] = useState(new Set());
  const [savingMealIdx, setSavingMealIdx] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Sauvegarde du plan entier dans MongoDB
  const [planSaving, setPlanSaving] = useState(false);
  const [planSavedId, setPlanSavedId] = useState(null);

  // Pré-remplissage profil + apports du jour
  useEffect(() => {
    (async () => {
      try {
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

          if (remaining > 0) {
            setCalorieTarget(remaining);
            setMealsPerDay(Math.max(1, 3 - mealsAlreadyEaten));
          } else {
            setCalorieTarget(target);
          }
        } else {
          setCalorieTarget(profile.daily_calorie_target || 2000);
        }
      } catch (err) {
        // silent fallback
      }
    })();
  }, []);

  const handleToggleMode = () => {
    if (!todayStats) return;
    if (useRemainingMode) {
      setCalorieTarget(todayStats.target);
      setMealsPerDay(3);
    } else {
      setCalorieTarget(todayStats.remaining);
      setMealsPerDay(Math.max(1, 3 - todayStats.mealsAlreadyEaten));
    }
    setUseRemainingMode(!useRemainingMode);
  };

  // Convertit un repas du plan en payload MealEntry
  const mealToPayload = (meal) => {
    const mealTypeMap = {
      'Petit-déjeuner': 'breakfast',
      'Déjeuner': 'lunch',
      'Dîner': 'dinner',
      'Collation': 'snack',
    };
    return {
      meal_type: mealTypeMap[meal.meal_type] || undefined,
      detected_foods: meal.ingredients.map((ing) => ({
        label: ing.item,
        pretty_label: ing.item,
        matched_name: `${ing.quantity} ${ing.item}`,
        source: 'ai_meal_plan',
        macros: null,
      })),
      total_calories: meal.estimated_calories,
      total_protein: meal.estimated_protein,
      total_carbohydrates: meal.estimated_carbs || 0,
      total_fat: meal.estimated_fat || 0,
    };
  };

  const handleSaveMeal = async (meal, index) => {
    setSavingMealIdx(index);
    setError('');
    try {
      await saveMeal(mealToPayload(meal));
      setSavedMeals((prev) => new Set([...prev, index]));
    } catch (err) {
      setError("Impossible d'enregistrer ce repas. Réessaie.");
    } finally {
      setSavingMealIdx(null);
    }
  };

  const handleSaveAll = async () => {
    if (!plan?.meals) return;
    setSavingAll(true);
    setError('');
    setSaveSuccess('');
    let savedCount = 0;
    try {
      for (let i = 0; i < plan.meals.length; i++) {
        if (savedMeals.has(i)) continue;
        await saveMeal(mealToPayload(plan.meals[i]));
        savedCount++;
        setSavedMeals((prev) => new Set([...prev, i]));
      }
      setSaveSuccess(
        `✅ ${savedCount} repas enregistré${savedCount > 1 ? 's' : ''} dans ton historique !`,
      );
    } catch (err) {
      setError("Erreur lors de la sauvegarde de certains repas.");
    } finally {
      setSavingAll(false);
    }
  };

  const handleSavePlan = async () => {
    if (!plan) return;
    setPlanSaving(true);
    setError('');
    try {
      const saved = await saveMealPlan(plan, {
        title: `Plan ${goal} — ${calorieTarget} kcal`,
        goal,
        calorie_target: Number(calorieTarget),
      });
      setPlanSavedId(saved.id);
      setSaveSuccess('✅ Plan sauvegardé dans tes plans IA !');
    } catch (err) {
      if (err.response?.status === 503) {
        setError("MongoDB n'est pas accessible. Vérifie que le container 'mongo' tourne.");
      } else {
        setError("Erreur lors de la sauvegarde du plan.");
      }
    } finally {
      setPlanSaving(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setSaveSuccess('');
    setSavedMeals(new Set());
    setPlanSavedId(null);
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
        already_eaten_kcal:
          useRemainingMode && todayStats ? todayStats.eaten : 0,
      };
      const result = await generateMealPlanAI(params);
      setPlan(result);
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError("L'IA prend trop de temps. Réessaie dans un instant.");
      } else if (err.response?.status === 502) {
        setError("Service IA indisponible. Vérifie ta clé OpenRouter ou que nutrition-api tourne.");
      } else if (err.response?.status === 429) {
        setError("Trop de requêtes — attends 1 min.");
      } else {
        setError("Erreur lors de la génération du plan. Réessaie.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="meal-plan-page">
      <header>
        <h2>Plan de repas généré par l'IA</h2>
        <p className="muted">
          Notre coach IA (gpt-oss-120b) compose un menu adapté à ton objectif,
          ton budget calorique et tes contraintes alimentaires.
        </p>
      </header>

      {/* Récap apports du jour */}
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
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <label htmlFor="calories">Calories cibles</label>
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

          <label htmlFor="meals">Nombre de repas</label>
          <select
            id="meals"
            value={mealsPerDay}
            onChange={(e) => setMealsPerDay(e.target.value)}
          >
            <option value="1">1 repas</option>
            <option value="2">2 repas</option>
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
          {loading ? "🤖 L'IA cuisine ton plan…" : '✨ Générer mon plan avec l\'IA'}
        </button>
      </form>

      {error && (
        <p className="form-error" role="alert">{error}</p>
      )}

      {plan && (
        <section className="meal-plan-result" aria-live="polite">
          <div className="total-card">
            <h3>Plan généré</h3>
            <p className="total-calories">
              {plan.total_calories} <span>kcal</span>
            </p>
            <p className="muted">
              {plan.total_protein?.toFixed(0) || 0} g de protéines au total
              {' · '}
              {plan.meals.length} repas
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
            {saveSuccess && (
              <p className="form-success" role="status">{saveSuccess}</p>
            )}
          </div>

          {plan.advice && (
            <article className="ai-advice-card">
              <header>
                <h4>💡 Le conseil du coach</h4>
                <small className="muted">Généré par {plan.model}</small>
              </header>
              <p>{plan.advice}</p>
            </article>
          )}

          {plan.meals.map((meal, i) => (
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
                  {meal.estimated_carbs !== undefined && (
                    <span><strong>{meal.estimated_carbs}</strong> g G</span>
                  )}
                  {meal.estimated_fat !== undefined && (
                    <span><strong>{meal.estimated_fat}</strong> g L</span>
                  )}
                </div>
              </header>

              {meal.description && (
                <p className="meal-description">{meal.description}</p>
              )}

              <details open>
                <summary>Ingrédients ({meal.ingredients.length})</summary>
                <ul className="meal-ingredients">
                  {meal.ingredients.map((ing, j) => (
                    <li key={j}>
                      <span className="ingredient-quantity">{ing.quantity}</span>
                      <span className="ingredient-name">{ing.item}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          ))}

          <div className="preview-actions">
            <button type="button" onClick={(e) => handleGenerate(e)}>
              🔄 Regénérer un nouveau plan
            </button>
          </div>
        </section>
      )}
    </section>
  );
}

export default MealPlan;
