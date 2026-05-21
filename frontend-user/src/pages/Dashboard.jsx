import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyProfile } from '../services/api';

// Traductions des valeurs BDD en libellés lisibles
const GOAL_LABELS = {
  weight_loss: 'Perdre du poids',
  muscle_gain: 'Prendre du muscle',
  endurance: 'Améliorer ton endurance',
  general_health: 'Maintenir ta forme',
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

// Catégorie du BMI selon l'OMS
function bmiCategory(bmi) {
  if (bmi === null || bmi === undefined) return null;
  if (bmi < 18.5) return { label: 'Sous-poids', color: '#0891b2' };
  if (bmi < 25) return { label: 'Normal', color: '#059669' };
  if (bmi < 30) return { label: 'Surpoids', color: '#d97706' };
  return { label: 'Obésité', color: '#dc2626' };
}

function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getMyProfile();
        if (!data.onboarded) {
          navigate('/onboarding', { replace: true });
          return;
        }
        setProfile(data);
      } catch (err) {
        setError('Erreur lors du chargement de ton profil.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  if (loading) {
    return (
      <section className="dashboard-page">
        <p role="status">Chargement de ton tableau de bord…</p>
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

  return (
    <section className="dashboard-page">
      <header className="dashboard-hero">
        <h2>Ton tableau de bord</h2>
        <p>
          Objectif&nbsp;: <strong>{GOAL_LABELS[profile.goal] || '—'}</strong>{' '}
          · Niveau&nbsp;: <strong>{LEVEL_LABELS[profile.experience_level] || '—'}</strong>
        </p>
      </header>

      <div className="dashboard-cards">
        {/* Carte mesures biométriques */}
        <article className="dashboard-card">
          <h3>📏 Mes mesures</h3>
          <dl className="metric-list">
            <div>
              <dt>Âge</dt>
              <dd>{profile.age ? `${profile.age} ans` : '—'}</dd>
            </div>
            <div>
              <dt>Genre</dt>
              <dd>{GENDER_LABELS[profile.gender] || '—'}</dd>
            </div>
            <div>
              <dt>Taille</dt>
              <dd>{profile.height_cm ? `${profile.height_cm} cm` : '—'}</dd>
            </div>
            <div>
              <dt>Poids</dt>
              <dd>{profile.weight_kg ? `${profile.weight_kg} kg` : '—'}</dd>
            </div>
            {profile.target_weight_kg && (
              <div>
                <dt>Poids cible</dt>
                <dd>{profile.target_weight_kg} kg</dd>
              </div>
            )}
            {profile.bmi !== null && (
              <div>
                <dt>IMC</dt>
                <dd>
                  {profile.bmi}
                  {bmiInfo && (
                    <span
                      className="bmi-badge"
                      style={{ backgroundColor: bmiInfo.color }}
                    >
                      {bmiInfo.label}
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </article>

        {/* Carte préférences */}
        <article className="dashboard-card">
          <h3>🥗 Mes préférences</h3>
          <dl className="metric-list">
            <div>
              <dt>Restrictions</dt>
              <dd>{DIET_LABELS[profile.dietary_restrictions] || '—'}</dd>
            </div>
            <div>
              <dt>Allergies</dt>
              <dd>{profile.allergies || '—'}</dd>
            </div>
            <div>
              <dt>Équipement</dt>
              <dd>{profile.equipment_available || 'Poids du corps'}</dd>
            </div>
          </dl>
          <Link to="/profile" className="card-link">Modifier mes préférences →</Link>
        </article>

        {/* Carte fonctionnalités à venir */}
        <article className="dashboard-card">
          <h3>📸 Analyser un repas</h3>
          <p>Prends une photo de ton assiette pour connaître les macros et obtenir des suggestions personnalisées.</p>
          <Link to="/meal-analysis" className="card-link">Analyser un repas →</Link>
        </article>

        <article className="dashboard-card">
          <h3>🏋️ Trouver une séance</h3>
          <p>Reçois des recommandations d'exercices adaptées à ton objectif et ton équipement.</p>
          <span className="card-badge">Bientôt disponible</span>
        </article>
      </div>
    </section>
  );
}

export default Dashboard;
