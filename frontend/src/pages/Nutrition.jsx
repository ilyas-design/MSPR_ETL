import { useEffect, useState } from 'react';
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
import { apiService } from '../services/api';
import { horizontalChartOptions } from '../components/ChartOptions';
import { usePageTitle } from '../utils/usePageTitle';
import { AccessibleChart, ChartDataTable } from '../utils/chartA11y';
import { buildChartSummary } from '../utils/chartA11yHelpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Nutrition() {
  usePageTitle('Nutrition');
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiService.getKPIs();
        setKpis(response.data);
        setLoading(false);
      } catch {
        setError('Erreur au chargement');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Chargement</div>;
  if (error) return <div className="error">{error}</div>;

  const avg = kpis?.nutrition?.avg_calories || 0;
  const target = 2500;
  const diff = avg - target;

  const comparisonData = {
    labels: ['Apport calorique moyen', 'Objectif quotidien'],
    datasets: [
      {
        label: 'Calories (kcal)',
        data: [avg, target],
        backgroundColor: ['#6366f1', '#8b5cf6'],
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-title-row">
            <span className="page-eyebrow">Nutrition</span>
          </div>
          <h1>Nutrition &amp; alimentation</h1>
          <p className="page-subtitle">
            Comparez les apports caloriques moyens des patients à l'objectif
            quotidien recommandé.
          </p>
        </div>
      </header>

      <section className="charts-grid" aria-label="Graphiques nutrition">
        <div className="chart-container">
          <h2>Comparaison des apports caloriques</h2>
          <AccessibleChart
            title="Graphique en barres comparant l'apport calorique moyen à l'objectif"
            summary={buildChartSummary(
              'Apports caloriques',
              comparisonData.labels,
              comparisonData.datasets[0].data
            )}
            dataTable={
              <ChartDataTable
                caption="Données du graphique : apports caloriques"
                headers={['Catégorie', 'Calories (kcal)']}
                rows={comparisonData.labels.map((l, i) => [
                  l,
                  comparisonData.datasets[0].data[i] ?? 0,
                ])}
              />
            }
          >
            <div className="chart-wrap">
              <Bar data={comparisonData} options={horizontalChartOptions} />
            </div>
          </AccessibleChart>
        </div>
      </section>

      <section className="stats-grid-large" aria-label="Indicateurs nutrition">
        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">📊</span>
          <h2>Apport calorique moyen</h2>
          <p className="big-number">{avg?.toFixed(0) || 0}</p>
          <span className="unit">kcal/jour</span>
        </div>

        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">🎯</span>
          <h2>Objectif quotidien</h2>
          <p className="big-number">{target}</p>
          <span className="unit">kcal/jour</span>
        </div>

        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">⚖️</span>
          <h2>Différence</h2>
          <p
            className="big-number"
            style={{ color: diff > 0 ? '#b91c1c' : '#047857' }}
          >
            {diff?.toFixed(0) || 0}
          </p>
          <span className="unit">kcal</span>
        </div>
      </section>
    </div>
  );
}

export default Nutrition;
