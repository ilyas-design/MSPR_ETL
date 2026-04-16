import { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { apiService } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function Activity() {
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

  const exerciseData = {
    labels: ['Heures d\'exercice par semaine', 'Heures restantes'],
    datasets: [{
      label: 'Heures',
      data: [
        kpis?.activite_physique?.avg_exercise_hours || 0,
        Math.max(0, 7 - (kpis?.activite_physique?.avg_exercise_hours || 0))
      ],
      backgroundColor: ['#48bb78', '#e2e8f0'],
      borderColor: ['#48bb78', '#cbd5e0'],
      borderWidth: 2,
    }],
  };

  const activityLevelData = {
    labels: kpis?.activite_physique?.activity_levels?.map(a => a.physical_activity_level) || [],
    datasets: [{
      label: 'Nombre de patients',
      data: kpis?.activite_physique?.activity_levels?.map(a => a.count) || [],
      backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe'],
    }],
  };

  const workoutTypeData = {
    labels: kpis?.gym?.workout_types?.map(w => w.gym_workout_type) || [],
    datasets: [{
      label: 'Nombre de sessions',
      data: kpis?.gym?.workout_types?.map(w => w.count) || [],
      backgroundColor: ['#ff6b6b', '#ffa500', '#4ecdc4', '#95e1d3'],
    }],
  };

  return (
    <div className="page">
      <h2>Activité Physique & Gym</h2>
      
      <div className="charts-grid">
        <div className="chart-container">
          <h3>Heures d'exercice par semaine</h3>
          <Pie data={exerciseData} />
        </div>
        <div className="chart-container">
          <h3>Niveaux d'activité physique</h3>
          <Pie data={activityLevelData} />
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Types d'exercices à la gym</h3>
          <Bar data={workoutTypeData} />
        </div>
      </div>

      <div className="stats-grid-large">
        <div className="stat-box">
          <div className="stat-icon">⏱️</div>
          <h4>Heures d'exercice moyennes</h4>
          <p className="big-number">{kpis?.activite_physique?.avg_exercise_hours?.toFixed(1) || 0}</p>
          <span className="unit">heures/semaine</span>
        </div>
        
        <div className="stat-box">
          <div className="stat-icon">🔥</div>
          <h4>Calories brûlées (gym)</h4>
          <p className="big-number">{kpis?.gym?.avg_calories_burned?.toFixed(0) || 0}</p>
          <span className="unit">kcal/session</span>
        </div>

        <div className="stat-box">
          <div className="stat-icon">🎯</div>
          <h4>Total patients actifs</h4>
          <p className="big-number">{kpis?.total_patients || 0}</p>
          <span className="unit">patients</span>
        </div>
      </div>
    </div>
  );
}

export default Activity;