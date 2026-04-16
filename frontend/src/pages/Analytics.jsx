import { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { apiService } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

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
        setError(err?.code === 'ERR_NETWORK'
          ? 'Backend indisponible. Lancez Django sur http://localhost:8000.'
          : 'Erreur au chargement'
        );
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  if (loading) return <div className="loading">Chargement...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page">
      <h2>Analytics & Engagement</h2>
      
      <div className="stats-grid-large">
        <div className="stat-box">
          <div className="stat-icon">👥</div>
          <h4>Taux d'engagement</h4>
          <p className="big-number">{engagement?.engagement_rate?.toFixed(1) || 0}%</p>
          <span className="unit">patients actifs</span>
        </div>
        
        <div className="stat-box">
          <div className="stat-icon">💪</div>
          <h4>Patients actifs</h4>
          <p className="big-number">{engagement?.active_patients || 0}</p>
          <span className="unit">sur {engagement?.total_patients || 0}</span>
        </div>

        <div className="stat-box">
          <div className="stat-icon">🏋️</div>
          <h4>Sessions moyennes</h4>
          <p className="big-number">{engagement?.avg_sessions_per_patient?.toFixed(1) || 0}</p>
          <span className="unit">par patient</span>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Engagement des patients</h3>
          <Bar 
            data={{
              labels: ['Patients actifs', 'Total'],
              datasets: [{
                label: 'Nombre',
                data: [engagement?.active_patients, engagement?.total_patients],
                backgroundColor: ['#667eea', '#cbd5e0'],
              }]
            }} 
          />
        </div>

        <div className="chart-container">
          <h3>Adhérence (Conversion)</h3>
          <Bar 
            data={{
              labels: ['Adhérence nutrition', 'Adhérence activité'],
              datasets: [{
                label: 'Taux (%)',
                data: [
                  conversion?.high_adherence_nutrition_rate || 0,
                  conversion?.high_adherence_activity_rate || 0
                ],
                backgroundColor: ['#48bb78', '#4facfe'],
              }]
            }} 
          />
        </div>
      </div>

      <div className="stats-grid-large">
        <div className="stat-box">
          <div className="stat-icon">📊</div>
          <h4>Total sessions</h4>
          <p className="big-number">{engagement?.total_sessions || 0}</p>
          <span className="unit">séances enregistrées</span>
        </div>

        <div className="stat-box">
          <div className="stat-icon">✅</div>
          <h4>Adhérence nutrition</h4>
          <p className="big-number">{conversion?.high_adherence_nutrition_rate?.toFixed(1) || 0}%</p>
          <span className="unit">plans respectés</span>
        </div>

        <div className="stat-box">
          <div className="stat-icon">💯</div>
          <h4>Satisfaction</h4>
          <p className="big-number">{satisfaction?.overall_satisfaction?.toFixed(1) || 0}%</p>
          <span className="unit">satisfaction client</span>
        </div>
      </div>
    </div>
  );
}

export default Analytics;