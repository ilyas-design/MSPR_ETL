import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { getRecommendationsToday, getCoachAdvice } from '../services/api';
import { AccessibleChart, ChartDataTable } from '../utils/chartA11y';
import { buildChartSummary } from '../utils/chartA11yHelpers';
import { activityChartOptions, CHART_PALETTE } from '../components/ChartOptions';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

  // Conseils IA générés par gpt-oss
  const [aiAdvice, setAiAdvice] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

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

  const handleAskAI = async () => {
    setAiError('');
    setAiAdvice(null);
    setAiLoading(true);
    try {
      const result = await getCoachAdvice();
      setAiAdvice(result);
    } catch (err) {
      if (err.response?.status === 502) {
        setAiError("Le service IA est indisponible. Vérifie que nutrition-api tourne et que ta clé OpenRouter est configurée.");
      } else if (err.response?.status === 429) {
        setAiError("Trop de requêtes — attends 1 min avant de réessayer.");
      } else {
        setAiError('Erreur lors de la génération des conseils IA.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const macroChart = useMemo(() => {
    if (!data?.imbalances?.length) {
      return { labels: [], datasets: [] };
    }
    const macroNutrients = ['protein', 'carbohydrates', 'fat'];
    const rows = data.imbalances.filter((imb) => macroNutrients.includes(imb.nutrient));
    return {
      labels: rows.map((imb) => NUTRIENT_LABELS[imb.nutrient]?.label || imb.nutrient),
      datasets: [
        {
          label: 'Consommé',
          data: rows.map((imb) => imb.eaten),
          backgroundColor: CHART_PALETTE[0],
        },
        {
          label: 'Cible',
          data: rows.map((imb) => imb.target),
          backgroundColor: CHART_PALETTE[1],
        },
      ],
    };
  }, [data]);

  const macroSummary = buildChartSummary(
    'Macros du jour — consommé vs cible',
    macroChart.labels,
    macroChart.datasets.flatMap((ds) => ds.data),
  );

  if (loading) return <p role="status">Analyse de tes apports en cours…</p>;

  if (error) {
    return (
      <section className="coach-page" aria-labelledby="coach-title">
        <h1 id="coach-title">Mon coach nutritionnel</h1>
        <p className="form-error" role="alert">{error}</p>
        <Link to="/onboarding">→ Compléter mon profil</Link>
      </section>
    );
  }

  return (
    <section className="coach-page" aria-labelledby="coach-title">
      <header>
        <h1 id="coach-title">Mon coach nutritionnel</h1>
        <p className="muted">
          Objectif : <strong>{data.profile.goal_label}</strong>
        </p>
      </header>

      {macroChart.labels.length > 0 && (
        <AccessibleChart
          title="Graphique des macronutriments du jour"
          summary={macroSummary}
          dataTable={
            <ChartDataTable
              caption="Macronutriments — consommé vs cible"
              headers={['Nutriment', 'Consommé', 'Cible']}
              rows={macroChart.labels.map((label, i) => [
                label,
                macroChart.datasets[0]?.data[i] ?? 0,
                macroChart.datasets[1]?.data[i] ?? 0,
              ])}
            />
          }
        >
          <div className="chart-container">
            <Bar data={macroChart} options={activityChartOptions} />
          </div>
        </AccessibleChart>
      )}

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

      {/* Conseils IA via OpenRouter / gpt-oss */}
      <section aria-labelledby="ai-heading" className="ai-section">
        <h3 id="ai-heading">Conseils détaillés par l'IA</h3>
        <p className="muted">
          Demande à notre coach IA (basé sur le modèle open-source gpt-oss-120b)
          des conseils personnalisés adaptés à tes apports du jour.
        </p>

        {!aiAdvice && !aiLoading && (
          <button type="button" onClick={handleAskAI}>
            ✨ Demander des conseils détaillés à l'IA
          </button>
        )}

        {aiLoading && (
          <p role="status" className="loading-message">
            L'IA réfléchit à tes conseils personnalisés…
          </p>
        )}

        {aiError && (
          <p className="form-error" role="alert">{aiError}</p>
        )}

        {aiAdvice && (
          <article className="ai-advice-card" aria-live="polite">
            <header>
              <h4>🤖 Le coach te dit :</h4>
              <small className="muted">Généré par {aiAdvice.model}</small>
            </header>
            <div className="ai-advice-text">
              {aiAdvice.advice.split('\n\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAskAI}
              className="button-secondary"
            >
              🔄 Regénérer
            </button>
          </article>
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
