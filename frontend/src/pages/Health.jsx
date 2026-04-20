import { useEffect, useState } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { apiService } from '../services/api';
import {
  chartOptions,
  pieChartOptions,
  CHART_PALETTE,
} from '../components/ChartOptions';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function Health() {
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

  const diseasesData = {
    labels: kpis?.sante?.diseases?.map((d) => d.disease_type) || [],
    datasets: [
      {
        label: 'Nombre de maladies',
        data: kpis?.sante?.diseases?.map((d) => d.count) || [],
        backgroundColor: CHART_PALETTE,
        borderColor: 'white',
        borderWidth: 2,
      },
    ],
  };

  const severityData = {
    labels: kpis?.sante?.severity_distribution?.map((s) => s.severity) || [],
    datasets: [
      {
        label: 'Distribution de sévérité',
        data: kpis?.sante?.severity_distribution?.map((s) => s.count) || [],
        backgroundColor: ['#ef4444', '#f59e0b', '#14b8a6', '#10b981'],
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
            <span className="page-eyebrow">Santé</span>
          </div>
          <h2>Données de santé</h2>
          <p className="page-subtitle">
            Répartition des pathologies observées et niveau de sévérité au sein
            de la population suivie.
          </p>
        </div>
      </header>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Types de maladies</h3>
          <div className="chart-wrap">
            <Pie data={diseasesData} options={pieChartOptions} />
          </div>
        </div>
        <div className="chart-container">
          <h3>Sévérité des maladies</h3>
          <div className="chart-wrap">
            <Bar data={severityData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="stats-grid-large">
        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">❤️</span>
          <h4>Cholestérol moyen</h4>
          <p className="big-number">
            {kpis?.sante?.avg_cholesterol?.toFixed(0) || 0}
          </p>
          <span className="unit">mg/dL</span>
        </div>
      </div>
    </div>
  );
}

export default Health;
