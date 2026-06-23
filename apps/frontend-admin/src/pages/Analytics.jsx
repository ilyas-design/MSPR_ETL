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
import { chartOptions } from '../components/ChartOptions';
import { usePageTitle } from '../utils/usePageTitle';
import { AccessibleChart, ChartDataTable } from '../utils/chartA11y';
import { buildChartSummary } from '../utils/chartA11yHelpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Analytics() {
  usePageTitle('Analytics');
  const [engagement, setEngagement] = useState(null);
  const [conversion, setConversion] = useState(null);
  const [satisfaction, setSatisfaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [eng, conv, sat] = await Promise.all([
          apiService.getEngagementKPIs(),
          apiService.getConversionKPIs(),
          apiService.getSatisfactionKPIs(),
        ]);
        setEngagement(eng.data);
        setConversion(conv.data);
        setSatisfaction(sat.data);
        setLoading(false);
      } catch (err) {
        setError(
          err?.code === 'ERR_NETWORK'
            ? 'Backend indisponible. Lancez Django sur http://localhost:8000.'
            : 'Erreur au chargement'
        );
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  if (loading) return <div className="loading">Chargement</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-title-row">
            <span className="page-eyebrow">Analytics</span>
          </div>
          <h1>Analytics &amp; engagement</h1>
          <p className="page-subtitle">
            Indicateurs clés : participation, adhérence aux plans et
            satisfaction globale des patients.
          </p>
        </div>
      </header>

      <section className="section" aria-labelledby="ana-engagement">
        <h2 id="ana-engagement" className="section-title">Engagement</h2>
        <div className="stats-grid-large">
          <div className="stat-box">
            <span className="stat-icon" aria-hidden="true">👥</span>
            <h3>Taux d'engagement</h3>
            <p className="big-number">
              {engagement?.engagement_rate?.toFixed(1) || 0}%
            </p>
            <span className="unit">patients actifs</span>
          </div>

          <div className="stat-box">
            <span className="stat-icon" aria-hidden="true">💪</span>
            <h3>Patients actifs</h3>
            <p className="big-number">{engagement?.active_patients || 0}</p>
            <span className="unit">
              sur {engagement?.total_patients || 0}
            </span>
          </div>

          <div className="stat-box">
            <span className="stat-icon" aria-hidden="true">🏋️</span>
            <h3>Sessions moyennes</h3>
            <p className="big-number">
              {engagement?.avg_sessions_per_patient?.toFixed(1) || 0}
            </p>
            <span className="unit">par patient</span>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="ana-comparaisons">
        <h2 id="ana-comparaisons" className="section-title">Comparaisons</h2>
        <div className="charts-grid">
          <div className="chart-container">
            <h3>Engagement des patients</h3>
            <AccessibleChart
              title="Graphique en barres comparant les patients actifs au nombre total"
              summary={buildChartSummary(
                'Engagement des patients',
                ['Patients actifs', 'Total'],
                [engagement?.active_patients, engagement?.total_patients]
              )}
              dataTable={
                <ChartDataTable
                  caption="Données du graphique : engagement des patients"
                  headers={['Catégorie', 'Nombre de patients']}
                  rows={[
                    ['Patients actifs', engagement?.active_patients ?? 0],
                    ['Total', engagement?.total_patients ?? 0],
                  ]}
                />
              }
            >
              <div className="chart-wrap">
                <Bar
                  data={{
                    labels: ['Patients actifs', 'Total'],
                    datasets: [
                      {
                        label: 'Nombre',
                        data: [
                          engagement?.active_patients,
                          engagement?.total_patients,
                        ],
                        backgroundColor: ['#6366f1', '#cbd5e1'],
                        borderRadius: 8,
                        borderSkipped: false,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              </div>
            </AccessibleChart>
          </div>

          <div className="chart-container">
            <h3>Adhérence (conversion)</h3>
            <AccessibleChart
              title="Graphique en barres des taux d'adhérence nutrition et activité"
              summary={buildChartSummary(
                'Adhérence',
                ['Adhérence nutrition (%)', 'Adhérence activité (%)'],
                [
                  conversion?.nutrition_conversion_rate || 0,
                  conversion?.activity_conversion_rate || 0,
                ]
              )}
              dataTable={
                <ChartDataTable
                  caption="Données du graphique : taux d'adhérence"
                  headers={['Domaine', "Taux d'adhérence (%)"]}
                  rows={[
                    ['Nutrition', conversion?.nutrition_conversion_rate ?? 0],
                    ['Activité', conversion?.activity_conversion_rate ?? 0],
                  ]}
                />
              }
            >
              <div className="chart-wrap">
                <Bar
                  data={{
                    labels: ['Adhérence nutrition', 'Adhérence activité'],
                    datasets: [
                      {
                        label: 'Taux (%)',
                        data: [
                          conversion?.nutrition_conversion_rate || 0,
                          conversion?.activity_conversion_rate || 0,
                        ],
                        backgroundColor: ['#10b981', '#0ea5e9'],
                        borderRadius: 8,
                        borderSkipped: false,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              </div>
            </AccessibleChart>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="ana-perf">
        <h2 id="ana-perf" className="section-title">Performance globale</h2>
        <div className="stats-grid-large">
          <div className="stat-box">
            <span className="stat-icon" aria-hidden="true">📊</span>
            <h3>Total sessions</h3>
            <p className="big-number">{engagement?.total_sessions || 0}</p>
            <span className="unit">séances enregistrées</span>
          </div>

          <div className="stat-box">
            <span className="stat-icon" aria-hidden="true">✅</span>
            <h3>Adhérence nutrition</h3>
            <p className="big-number">
              {conversion?.nutrition_conversion_rate?.toFixed(1) || 0}%
            </p>
            <span className="unit">plans respectés</span>
          </div>

          <div className="stat-box">
            <span className="stat-icon" aria-hidden="true">💯</span>
            <h3>Satisfaction</h3>
            <p className="big-number">
              {satisfaction?.overall_satisfaction_score?.toFixed(1) || 0}%
            </p>
            <span className="unit">score global</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Analytics;
