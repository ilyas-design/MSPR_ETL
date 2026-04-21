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
import { usePageTitle } from '../utils/usePageTitle';
import { AccessibleChart, ChartDataTable } from '../utils/chartA11y';
import { buildChartSummary } from '../utils/chartA11yHelpers';

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
  usePageTitle('Santé');
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
          <h1>Données de santé</h1>
          <p className="page-subtitle">
            Répartition des pathologies observées et niveau de sévérité au sein
            de la population suivie.
          </p>
        </div>
      </header>

      <section className="charts-grid" aria-label="Graphiques de santé">
        <div className="chart-container">
          <h2>Types de maladies</h2>
          <AccessibleChart
            title="Répartition circulaire des types de maladies observées"
            summary={buildChartSummary(
              'Types de maladies',
              diseasesData.labels,
              diseasesData.datasets[0].data
            )}
            dataTable={
              <ChartDataTable
                caption="Données du graphique : types de maladies"
                headers={['Type de maladie', 'Nombre de patients']}
                rows={diseasesData.labels.map((l, i) => [
                  l,
                  diseasesData.datasets[0].data[i] ?? 0,
                ])}
              />
            }
          >
            <div className="chart-wrap">
              <Pie data={diseasesData} options={pieChartOptions} />
            </div>
          </AccessibleChart>
        </div>
        <div className="chart-container">
          <h2>Sévérité des maladies</h2>
          <AccessibleChart
            title="Graphique en barres de la sévérité des maladies"
            summary={buildChartSummary(
              'Sévérité des maladies',
              severityData.labels,
              severityData.datasets[0].data
            )}
            dataTable={
              <ChartDataTable
                caption="Données du graphique : sévérité des maladies"
                headers={['Niveau de sévérité', 'Nombre de cas']}
                rows={severityData.labels.map((l, i) => [
                  l,
                  severityData.datasets[0].data[i] ?? 0,
                ])}
              />
            }
          >
            <div className="chart-wrap">
              <Bar data={severityData} options={chartOptions} />
            </div>
          </AccessibleChart>
        </div>
      </section>

      <section className="stats-grid-large" aria-label="Indicateurs clés de santé">
        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">❤️</span>
          <h2>Cholestérol moyen</h2>
          <p className="big-number">
            {kpis?.sante?.avg_cholesterol?.toFixed(0) || 0}
          </p>
          <span className="unit">mg/dL</span>
        </div>
      </section>
    </div>
  );
}

export default Health;
