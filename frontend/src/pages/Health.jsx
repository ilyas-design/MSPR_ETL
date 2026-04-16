import { useEffect, useState } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { apiService } from '../services/api';
import { chartOptions, pieChartOptions } from '../components/ChartOptions';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

  if (loading) return <div className="loading">Chargement...</div>;
  if (error) return <div className="error">{error}</div>;

  const diseasesData = {
    labels: kpis?.sante?.diseases?.map(d => d.disease_type) || [],
    datasets: [{
      label: 'Nombre de maladies',
      data: kpis?.sante?.diseases?.map(d => d.count) || [],
      backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#ff6b6b', '#ffa500'],
      borderColor: 'white',
      borderWidth: 2,
    }],
  };

  const severityData = {
    labels: kpis?.sante?.severity_distribution?.map(s => s.severity) || [],
    datasets: [{
      label: 'Distribution de sévérité',
      data: kpis?.sante?.severity_distribution?.map(s => s.count) || [],
      backgroundColor: ['#ff6b6b', '#ffa500', '#4ecdc4', '#48bb78'],
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  return (
    <div className="page">
      <h2>Données de Santé</h2>
      <div className="charts-grid">
        <div className="chart-container">
          <h3>Types de maladies</h3>
          <Pie data={diseasesData} options={pieChartOptions} />
        </div>
        <div className="chart-container">
          <h3>Sévérité des maladies</h3>
          <Bar data={severityData} options={chartOptions} />
        </div>
      </div>
      <div className="stats-grid-large">
        <div className="stat-box">
          <div className="stat-icon">❤️</div>
          <h4>Cholestérol moyen</h4>
          <p className="big-number">{kpis?.sante?.avg_cholesterol?.toFixed(0) || 0}</p>
          <span className="unit">mg/dL</span>
        </div>
      </div>
    </div>
  );
}

export default Health;