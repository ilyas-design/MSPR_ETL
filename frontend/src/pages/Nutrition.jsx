import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { apiService } from '../services/api';

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

  if (loading) return <div className="loading">Chargement...</div>;
  if (error) return <div className="error">{error}</div>;

  const comparisonData = {
    labels: ['Apport calorique moyen', 'Objectif quotidien'],
    datasets: [{
      label: 'Calories (kcal)',
      data: [kpis?.nutrition?.avg_calories || 0, 2500],
      backgroundColor: ['#667eea', '#764ba2'],
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  return (
    <div className="page">
      <h2>Nutrition & Alimentation</h2>
      
      <div className="charts-grid">
        <div className="chart-container">
          <h3>Comparaison des apports caloriques</h3>
          <Bar data={comparisonData} options={{ indexAxis: 'y' }} />
        </div>
      </div>

      <div className="stats-grid-large">
        <div className="stat-box">
          <div className="stat-icon">📊</div>
          <h4>Apport calorique moyen</h4>
          <p className="big-number">{kpis?.nutrition?.avg_calories?.toFixed(0) || 0}</p>
          <span className="unit">kcal/jour</span>
        </div>
        
        <div className="stat-box">
          <div className="stat-icon">🎯</div>
          <h4>Objectif quotidien</h4>
          <p className="big-number">2500</p>
          <span className="unit">kcal/jour</span>
        </div>

        <div className="stat-box">
          <div className="stat-icon">⚖️</div>
          <h4>Différence</h4>
          <p className="big-number" style={{color: kpis?.nutrition?.avg_calories > 2500 ? '#f56565' : '#48bb78'}}>
            {(kpis?.nutrition?.avg_calories - 2500)?.toFixed(0) || 0}
          </p>
          <span className="unit">kcal</span>
        </div>
      </div>
    </div>
  );
}

export default Nutrition;