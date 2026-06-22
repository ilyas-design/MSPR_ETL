import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  getMyProfile,
  getRecommendationsToday,
  getWorkoutsToday,
  getWorkoutsSummary,
} from '../services/api';
import { AccessibleChart, ChartDataTable } from '../utils/chartA11y';
import { arrayToCommaList, buildChartSummary } from '../utils/chartA11yHelpers';
import { activityChartOptions, CHART_PALETTE } from '../components/ChartOptions';
import EngagementCards from '../components/EngagementCards';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Traductions BDD → libellés FR
const GOAL_LABELS = {
  weight_loss: 'Perdre du poids',
  muscle_gain: 'Prendre du muscle',
  muscle_mass: 'Prise de masse',
  strength: 'Renforcement musculaire',
  endurance: 'Améliorer mon endurance',
  general_health: 'Maintenir ma forme',
  maintenance: 'Maintien de la forme',
};

const LEVEL_LABELS = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

const DIET_LABELS = {
  none: 'Aucune',
  vegetarian: 'Végétarien',
  vegan: 'Végan',
  gluten_free: 'Sans gluten',
  lactose_free: 'Sans lactose',
};

const GENDER_LABELS = {
  M: 'Homme',
  F: 'Femme',
  O: 'Autre',
};

function bmiCategory(bmi) {
  if (bmi == null) return null;
  if (bmi < 18.5) return { label: 'Sous-poids', color: '#0891b2' };
  if (bmi < 25) return { label: 'Normal', color: '#059669' };
  if (bmi < 30) return { label: 'Surpoids', color: '#d97706' };
  return { label: 'Obésité', color: '#dc2626' };
}

function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [reco, setReco] = useState(null);
  const [workoutsToday, setWorkoutsToday] = useState(null);
  const [weeklyActivity, setWeeklyActivity] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const profileData = await getMyProfile();
        if (!profileData.onboarded) {
          navigate('/onboarding', { replace: true });
          return;
        }
        setProfile(profileData);

        // Stats du jour : en parallèle, fail-silent
        const [recoData, workoutData, weeklyData] = await Promise.allSettled([
          getRecommendationsToday(),
          getWorkoutsToday(),
          getWorkoutsSummary(7),
        ]);
        if (recoData.status === 'fulfilled') setReco(recoData.value);
        if (workoutData.status === 'fulfilled') setWorkoutsToday(workoutData.value);
        if (weeklyData.status === 'fulfilled') setWeeklyActivity(weeklyData.value);
      } catch {
        setError('Erreur lors du chargement de ton tableau de bord.');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const activityChart = useMemo(() => {
    const labels = weeklyActivity.map((row) => row.day);
    const minutes = weeklyActivity.map((row) => row.duration_min || 0);
    return {
      labels,
      datasets: [
        {
          label: 'Minutes d\'activité',
          data: minutes,
          backgroundColor: CHART_PALETTE[0],
        },
      ],
    };
  }, [weeklyActivity]);

  const activitySummary = buildChartSummary(
    'Activité des 7 derniers jours',
    activityChart.labels,
    activityChart.datasets[0]?.data || [],
  );

  if (loading) {
    return (
      <section className="dashboard-page">
        <p role="status" className="loading-message">Chargement de ton tableau de bord…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard-page">
        <p role="alert" className="form-error">{error}</p>
      </section>
    );
  }

  if (!profile) return null;

  const bmiInfo = bmiCategory(profile.bmi);
  const goalLabel = GOAL_LABELS[profile.goal] || '—';
  const levelLabel = LEVEL_LABELS[profile.experience_level] || '—';

  // Stats du jour
  const kcalEaten = Math.round(reco?.totals_today?.calories || 0);
  const kcalTarget = reco?.targets?.calories || profile.daily_calorie_target || 2000;
  const kcalRemaining = Math.max(0, kcalTarget - kcalEaten);
  const kcalPercent = Math.min(100, Math.round((kcalEaten / kcalTarget) * 100));
  const proteinEaten = Math.round(reco?.totals_today?.protein || 0);
  const proteinTarget = Math.round(reco?.targets?.protein || 0);
  const mealsCount = reco?.totals_today?.meals_count || 0;
  const sessionsCount = workoutsToday?.totals?.sessions_count || 0;
  const workoutMinutes = workoutsToday?.totals?.duration_min || 0;
  const workoutKcalBurned = workoutsToday?.totals?.estimated_calories || 0;

  return (
    <section className="dashboard-page">
      {/* HERO — objectif + identité */}
      <header className="dashboard-hero">
        <div className="dashboard-hero-content">
          <p className="dashboard-eyebrow">Bonjour {profile.first_name || ''}</p>
          <h1 className="dashboard-hero-title">Ton tableau de bord</h1>
          <p className="dashboard-hero-meta">
            <span className="hero-pill">🎯 {goalLabel}</span>
            <span className="hero-pill">⚡ {levelLabel}</span>
            {profile.weight_kg && profile.target_weight_kg && (
              <span className="hero-pill">
                ⚖️ {profile.weight_kg} kg → {profile.target_weight_kg} kg
              </span>
            )}
          </p>
        </div>
      </header>

      {/* STATS DU JOUR — ligne d'indicateurs */}
      <section className="stat-row" aria-label="Statistiques du jour">
        <article className="stat-card">
          <header className="stat-card-header">
            <span className="stat-label">Calories aujourd'hui</span>
            <span className="stat-meta">{kcalPercent}% de la cible</span>
          </header>
          <p className="stat-value">
            {kcalEaten}
            <span className="stat-unit">/ {kcalTarget} kcal</span>
          </p>
          <div
            className="stat-bar"
            role="progressbar"
            aria-valuenow={kcalPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Calories : ${kcalEaten} sur ${kcalTarget} kcal`}
          >
            <div className="stat-bar-fill" style={{ width: `${kcalPercent}%` }} />
          </div>
          <footer className="stat-footer">
            {kcalRemaining > 0
              ? <>Il te reste <strong>{kcalRemaining} kcal</strong> à consommer</>
              : <>Cible atteinte ✓</>}
          </footer>
        </article>

        <article className="stat-card">
          <header className="stat-card-header">
            <span className="stat-label">Protéines</span>
            <span className="stat-meta">cible {proteinTarget} g</span>
          </header>
          <p className="stat-value">
            {proteinEaten}
            <span className="stat-unit">g</span>
          </p>
          <div
            className="stat-bar"
            role="progressbar"
            aria-valuenow={proteinTarget > 0 ? Math.min(100, Math.round((proteinEaten / proteinTarget) * 100)) : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Protéines : ${proteinEaten} g sur ${proteinTarget} g`}
          >
            <div
              className="stat-bar-fill stat-bar-fill-accent"
              style={{ width: `${proteinTarget > 0 ? Math.min(100, (proteinEaten / proteinTarget) * 100) : 0}%` }}
            />
          </div>
          <footer className="stat-footer">
            {mealsCount} repas enregistré{mealsCount > 1 ? 's' : ''}
          </footer>
        </article>

        <article className="stat-card">
          <header className="stat-card-header">
            <span className="stat-label">Activité</span>
            <span className="stat-meta">{sessionsCount} séance{sessionsCount > 1 ? 's' : ''}</span>
          </header>
          <p className="stat-value">
            {workoutMinutes}
            <span className="stat-unit">min</span>
          </p>
          <div
            className="stat-bar"
            role="progressbar"
            aria-valuenow={Math.min(100, Math.round((workoutMinutes / 45) * 100))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Activité : ${workoutMinutes} minutes aujourd'hui`}
          >
            <div
              className="stat-bar-fill stat-bar-fill-orange"
              style={{ width: `${Math.min(100, (workoutMinutes / 45) * 100)}%` }}
            />
          </div>
          <footer className="stat-footer">
            {workoutKcalBurned > 0
              ? <>≈ <strong>{workoutKcalBurned} kcal</strong> brûlées</>
              : <>Pas encore d'entraînement</>}
          </footer>
        </article>
      </section>

      {/* ENGAGEMENT — streak, objectif hebdo, benchmark, poids */}
      <EngagementCards />

      {weeklyActivity.length > 0 && (
        <section className="dashboard-chart-section" aria-labelledby="activity-chart-heading">
          <h2 id="activity-chart-heading" className="dashboard-section-title">
            Activité sur 7 jours
          </h2>
          <div className="chart-container">
            <AccessibleChart
              title="Activité sur 7 jours"
              summary={activitySummary}
              dataTable={(
                <ChartDataTable
                  caption="Minutes d'activité par jour"
                  headers={['Jour', 'Minutes', 'Séances']}
                  rows={weeklyActivity.map((row) => [
                    row.day,
                    row.duration_min || 0,
                    row.count || 0,
                  ])}
                />
              )}
            >
              <Bar data={activityChart} options={activityChartOptions} />
            </AccessibleChart>
          </div>
        </section>
      )}

      {/* ACTIONS RAPIDES — ce que l'user peut faire maintenant */}
      <h2 className="dashboard-section-title">Que veux-tu faire ?</h2>
      <div className="dashboard-cards">
        <Link to="/meal-analysis" className="card-link" aria-label="Analyser un repas — photo vers macros et suggestions IA">
          <article className="dashboard-card action-card">
            <span className="action-icon">📸</span>
            <h3>Analyser un repas</h3>
            <p>Photo de ton assiette → macros + suggestions IA.</p>
            <span className="action-arrow">→</span>
          </article>
        </Link>

        <Link to="/coach" className="card-link" aria-label="Mon coach IA — conseils nutritionnels personnalisés">
          <article className="dashboard-card action-card">
            <span className="action-icon">🧠</span>
            <h3>Mon coach IA</h3>
            <p>Conseils détaillés générés par gpt-oss selon ton profil.</p>
            <span className="action-arrow">→</span>
          </article>
        </Link>

        <Link to="/meal-plan" className="card-link" aria-label="Plan repas IA — menu sur mesure">
          <article className="dashboard-card action-card">
            <span className="action-icon">🍽️</span>
            <h3>Plan repas IA</h3>
            <p>Génère un menu sur mesure pour le reste de la journée.</p>
            <span className="action-arrow">→</span>
          </article>
        </Link>

        <Link to="/workout-plan" className="card-link" aria-label="Mon programme d'entraînement personnalisé">
          <article className="dashboard-card action-card">
            <span className="action-icon">🏋️</span>
            <h3>Mon programme</h3>
            <p>Plan d'entraînement personnalisé selon objectif & matériel.</p>
            <span className="action-arrow">→</span>
          </article>
        </Link>
      </div>

      {/* PROFIL DÉTAILLÉ — mesures + préférences (collapsible) */}
      <h2 className="dashboard-section-title">Mon profil</h2>
      <div className="dashboard-cards two-cols">
        <article className="dashboard-card">
          <h3>📏 Mes mesures</h3>
          <ul className="metric-list">
            <li><span>Âge</span><span>{profile.age ? `${profile.age} ans` : '—'}</span></li>
            <li><span>Genre</span><span>{GENDER_LABELS[profile.gender] || '—'}</span></li>
            <li><span>Taille</span><span>{profile.height_cm ? `${profile.height_cm} cm` : '—'}</span></li>
            <li><span>Poids actuel</span><span>{profile.weight_kg ? `${profile.weight_kg} kg` : '—'}</span></li>
            {profile.target_weight_kg && (
              <li><span>Poids cible</span><span>{profile.target_weight_kg} kg</span></li>
            )}
            {profile.bmi != null && (
              <li>
                <span>IMC</span>
                <span>
                  {profile.bmi}
                  {bmiInfo && (
                    <span
                      className="bmi-badge"
                      style={{ background: `${bmiInfo.color}15`, color: bmiInfo.color }}
                    >
                      {bmiInfo.label}
                    </span>
                  )}
                </span>
              </li>
            )}
          </ul>
        </article>

        <article className="dashboard-card">
          <h3>🥗 Mes préférences</h3>
          <ul className="metric-list">
            <li><span>Restrictions</span><span>{DIET_LABELS[profile.dietary_restrictions] || '—'}</span></li>
            <li><span>Allergies</span><span>{profile.allergies || '—'}</span></li>
            <li><span>Équipement</span><span>{profile.equipment_available || 'Poids du corps'}</span></li>
            <li><span>Limitations</span><span>{arrayToCommaList(profile.injuries) || '—'}</span></li>
            {profile.meal_budget != null && profile.meal_budget !== '' && (
              <li><span>Budget repas</span><span>{profile.meal_budget} €/sem</span></li>
            )}
            <li><span>Cible calorique</span><span>{profile.daily_calorie_target ? `${profile.daily_calorie_target} kcal/j` : '—'}</span></li>
          </ul>
          <Link to="/profile" className="link-button" style={{ marginTop: '0.75rem' }}>
            Modifier mon profil →
          </Link>
        </article>
      </div>
    </section>
  );
}

export default Dashboard;
