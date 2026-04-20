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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Nutrition() {
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
          <h2>Nutrition &amp; alimentation</h2>
          <p className="page-subtitle">
            Comparez les apports caloriques moyens des patients à l'objectif
            quotidien recommandé.
          </p>
        </div>
      </header>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Comparaison des apports caloriques</h3>
          <div className="chart-wrap">
            <Bar data={comparisonData} options={horizontalChartOptions} />
          </div>
        </div>
      </div>

      <div className="stats-grid-large">
        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">📊</span>
          <h4>Apport calorique moyen</h4>
          <p className="big-number">{avg?.toFixed(0) || 0}</p>
          <span className="unit">kcal/jour</span>
        </div>

        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">🎯</span>
          <h4>Objectif quotidien</h4>
          <p className="big-number">{target}</p>
          <span className="unit">kcal/jour</span>
        </div>

        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">⚖️</span>
          <h4>Différence</h4>
          <p
            className="big-number"
            style={{ color: diff > 0 ? '#ef4444' : '#10b981' }}
          >
            {diff?.toFixed(0) || 0}
          </p>
          <span className="unit">kcal</span>
        </div>
      </div>
    </div>
  );
}

export default Nutrition;
