import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getMyProfile,
  getRecommendationsToday,
  getWorkoutsToday,
} from '../services/api';

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
        const [recoData, workoutData] = await Promise.allSettled([
          getRecommendationsToday(),
          getWorkoutsToday(),
        ]);
        if (recoData.status === 'fulfilled') setReco(recoData.value);
        if (workoutData.status === 'fulfilled') setWorkoutsToday(workoutData.value);
      } catch (err) {
        setError('Erreur lors du chargement de ton tableau de bord.');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

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
          <span className="dashboard-eyebrow">Bonjour {profile.first_name || ''}</span>
          <h2>Ton tableau de bord</h2>
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
          <div className="stat-bar" role="progressbar" aria-valuenow={kcalPercent} aria-valuemin={0} aria-valuemax={100}>
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
          <div className="stat-bar">
            <div
              className="stat-bar-fill stat-bar-fill-accent"
              style={{ width: `${Math.min(100, (proteinEaten / proteinTarget) * 100)}%` }}
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
          <div className="stat-bar">
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

      {/* ACTIONS RAPIDES — ce que l'user peut faire maintenant */}
      <h3 className="dashboard-section-title">Que veux-tu faire ?</h3>
      <div className="dashboard-cards">
        <Link to="/meal-analysis" className="card-link">
          <article className="dashboard-card action-card">
            <span className="action-icon">📸</span>
            <h4>Analyser un repas</h4>
            <p>Photo de ton assiette → macros + suggestions IA.</p>
            <span className="action-arrow">→</span>
          </article>
        </Link>

        <Link to="/coach" className="card-link">
          <article className="dashboard-card action-card">
            <span className="action-icon">🧠</span>
            <h4>Mon coach IA</h4>
            <p>Conseils détaillés générés par gpt-oss selon ton profil.</p>
            <span className="action-arrow">→</span>
          </article>
        </Link>

        <Link to="/meal-plan" className="card-link">
          <article className="dashboard-card action-card">
            <span className="action-icon">🍽️</span>
            <h4>Plan repas IA</h4>
            <p>Génère un menu sur mesure pour le reste de la journée.</p>
            <span className="action-arrow">→</span>
          </article>
        </Link>

        <Link to="/workout-plan" className="card-link">
          <article className="dashboard-card action-card">
            <span className="action-icon">🏋️</span>
            <h4>Mon programme</h4>
            <p>Plan d'entraînement personnalisé selon objectif & matériel.</p>
            <span className="action-arrow">→</span>
          </article>
        </Link>
      </div>

      {/* PROFIL DÉTAILLÉ — mesures + préférences (collapsible) */}
      <h3 className="dashboard-section-title">Mon profil</h3>
      <div className="dashboard-cards two-cols">
        <article className="dashboard-card">
          <h4>📏 Mes mesures</h4>
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
          <h4>🥗 Mes préférences</h4>
          <ul className="metric-list">
            <li><span>Restrictions</span><span>{DIET_LABELS[profile.dietary_restrictions] || '—'}</span></li>
            <li><span>Allergies</span><span>{profile.allergies || '—'}</span></li>
            <li><span>Équipement</span><span>{profile.equipment_available || 'Poids du corps'}</span></li>
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
