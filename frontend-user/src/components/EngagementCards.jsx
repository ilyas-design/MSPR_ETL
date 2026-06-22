import { useEffect, useState } from 'react';
import { getEngagementStats, addWeightLog } from '../services/api';

/** Anneau de progression circulaire (SVG, accessible). */
function ProgressRing({ percent, children }) {
  const R = 34;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.min(100, percent || 0) / 100);
  return (
    <svg className="ring" viewBox="0 0 80 80" aria-hidden="true">
      <circle className="ring-bg" cx="40" cy="40" r={R} />
      <circle
        className="ring-fill"
        cx="40"
        cy="40"
        r={R}
        strokeDasharray={C}
        strokeDashoffset={offset}
        transform="rotate(-90 40 40)"
      />
      <text className="ring-text" x="40" y="40" textAnchor="middle" dominantBaseline="central">
        {children}
      </text>
    </svg>
  );
}

function EngagementCards() {
  const [stats, setStats] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setStats(await getEngagementStats());
    } catch {
      setStats(null);
    }
  };

  useEffect(() => { load(); }, []);

  if (!stats) return null;

  const { streak, weekly, benchmark, weight } = stats;

  const handleAddWeight = async (e) => {
    e.preventDefault();
    const val = parseFloat(weightInput.replace(',', '.'));
    if (Number.isNaN(val)) return;
    setSaving(true);
    try {
      await addWeightLog(val);
      setWeightInput('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="engagement-section" aria-label="Tes habitudes et ta progression">
      <h2 className="dashboard-section-title">Tes habitudes</h2>
      <div className="engagement-grid">
        {/* STREAK */}
        <article className="engagement-card streak-card">
          <span className="engagement-icon" aria-hidden="true">🔥</span>
          <p className="engagement-big">
            {streak.current}
            <span className="engagement-big-unit">
              jour{streak.current > 1 ? 's' : ''}
            </span>
          </p>
          <p className="engagement-label">d'affilée</p>
          <p className="engagement-sub">
            {streak.active_today
              ? '✓ Actif aujourd\'hui'
              : 'Logge un repas ou une séance pour continuer'}
            {streak.longest > 0 && <> · record {streak.longest} j</>}
          </p>
        </article>

        {/* OBJECTIF HEBDO */}
        <article className="engagement-card weekly-card">
          <ProgressRing percent={weekly.percent}>
            {weekly.sessions_done}/{weekly.goal}
          </ProgressRing>
          <div>
            <p className="engagement-label-strong">Objectif de la semaine</p>
            <p className="engagement-sub">
              {weekly.sessions_done >= weekly.goal
                ? '🎉 Objectif atteint, bravo !'
                : `Encore ${weekly.goal - weekly.sessions_done} séance${
                    weekly.goal - weekly.sessions_done > 1 ? 's' : ''
                  } cette semaine`}
            </p>
          </div>
        </article>

        {/* BENCHMARK DATASET */}
        {benchmark && (
          <article className="engagement-card benchmark-card">
            <span className="engagement-icon" aria-hidden="true">📊</span>
            <p className="engagement-big">
              {benchmark.activity_percentile}
              <span className="engagement-big-unit">%</span>
            </p>
            <p className="engagement-label">
              plus actif que les gens {benchmark.age_scoped ? 'de ton âge' : 'du panel'}
            </p>
            <div
              className="engagement-bar"
              role="progressbar"
              aria-valuenow={benchmark.activity_percentile}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Tu es plus actif que ${benchmark.activity_percentile}% du panel`}
            >
              <span style={{ width: `${benchmark.activity_percentile}%` }} />
            </div>
            <p className="engagement-sub">
              {benchmark.user_weekly_hours} h cette semaine · panel de {benchmark.sample_size} personnes
            </p>
          </article>
        )}

        {/* PROGRESSION POIDS */}
        {weight && (
          <article className="engagement-card weight-card">
            <p className="engagement-label-strong">⚖️ Progression poids</p>
            <p className="weight-numbers">
              <strong>{weight.current ?? '—'}</strong> kg
              <span className="weight-arrow"> → {weight.target} kg</span>
            </p>
            {weight.percent != null && (
              <div
                className="engagement-bar"
                role="progressbar"
                aria-valuenow={weight.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${weight.percent}% du chemin vers ton objectif de poids`}
              >
                <span className="bar-emerald" style={{ width: `${weight.percent}%` }} />
              </div>
            )}
            <p className="engagement-sub">
              {weight.percent != null
                ? `${weight.percent}% du chemin parcouru`
                : 'Ajoute une pesée pour démarrer le suivi'}
            </p>
            <form className="weight-form" onSubmit={handleAddWeight}>
              <label htmlFor="weigh-in" className="visually-hidden">Nouveau poids en kg</label>
              <input
                id="weigh-in"
                type="number"
                step="0.1"
                min="20"
                max="400"
                inputMode="decimal"
                placeholder="Poids du jour (kg)"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
              />
              <button type="submit" disabled={saving || !weightInput}>
                {saving ? '…' : 'Ajouter'}
              </button>
            </form>
          </article>
        )}
      </div>
    </section>
  );
}

export default EngagementCards;
