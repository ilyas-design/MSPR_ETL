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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Analytics() {
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
          <h2>Analytics &amp; engagement</h2>
          <p className="page-subtitle">
            Indicateurs clés : participation, adhérence aux plans et
            satisfaction globale des patients.
          </p>
        </div>
      </header>

      <section className="section">
        <h3 className="section-title">Engagement</h3>
        <div className="stats-grid-large">
          <div className="stat-box">
            <span className="stat-icon" aria-hidden="true">👥</span>
            <h4>Taux d'engagement</h4>
            <p className="big-number">
              {engagement?.engagement_rate?.toFixed(1) || 0}%
            </p>
            <span className="unit">patients actifs</span>
          </div>

          <div className="stat-box">
            <span className="stat-icon" aria-hidden="true">💪</span>
            <h4>Patients actifs</h4>
            <p className="big-number">{engagement?.active_patients || 0}</p>
            <span className="unit">
              sur {engagement?.total_patients || 0}
            </span>
          </div>

          <div className="stat-box">
            <span className="stat-icon" aria-hidden="true">🏋️</span>
            <h4>Sessions moyennes</h4>
            <p className="big-number">
              {engagement?.avg_sessions_per_patient?.toFixed(1) || 0}
            </p>
            <span className="unit">par patient</span>
          </div>
        </div>
      </section>

      <section className="section">
        <h3 className="section-title">Comparaisons</h3>
        <div className="charts-grid">
          <div className="chart-container">
            <h3>Engagement des patients</h3>
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
          </div>

          <div className="chart-container">
            <h3>Adhérence (conversion)</h3>
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
          </div>
        </div>
      </section>

      <section className="section">
        <h3 className="section-title">Performance globale</h3>
        <div className="stats-grid-large">
          <div className="stat-box">
            <span className="stat-icon" aria-hidden="true">📊</span>
            <h4>Total sessions</h4>
            <p className="big-number">{engagement?.total_sessions || 0}</p>
            <span className="unit">séances enregistrées</span>
          </div>

          <div className="stat-box">
            <span className="stat-icon" aria-hidden="true">✅</span>
            <h4>Adhérence nutrition</h4>
            <p className="big-number">
              {conversion?.nutrition_conversion_rate?.toFixed(1) || 0}%
            </p>
            <span className="unit">plans respectés</span>
          </div>

          <div className="stat-box">
            <span className="stat-icon" aria-hidden="true">💯</span>
            <h4>Satisfaction</h4>
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
