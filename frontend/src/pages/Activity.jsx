import { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
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
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

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

  if (loading) return <div className="loading">Chargement</div>;
  if (error) return <div className="error">{error}</div>;

  const avgHours = kpis?.activite_physique?.avg_exercise_hours || 0;

  const exerciseData = {
    labels: ["Heures d'exercice / semaine", 'Heures restantes'],
    datasets: [
      {
        label: 'Heures',
        data: [avgHours, Math.max(0, 7 - avgHours)],
        backgroundColor: ['#10b981', '#e5e8f0'],
        borderColor: ['#10b981', '#cbd5e1'],
        borderWidth: 2,
      },
    ],
  };

  const activityLevelData = {
    labels:
      kpis?.activite_physique?.activity_levels?.map(
        (a) => a.physical_activity_level
      ) || [],
    datasets: [
      {
        label: 'Nombre de patients',
        data:
          kpis?.activite_physique?.activity_levels?.map((a) => a.count) || [],
        backgroundColor: CHART_PALETTE,
      },
    ],
  };

  const workoutTypeData = {
    labels:
      kpis?.gym?.workout_types?.map((w) => w.gym_workout_type) || [],
    datasets: [
      {
        label: 'Nombre de sessions',
        data: kpis?.gym?.workout_types?.map((w) => w.count) || [],
        backgroundColor: CHART_PALETTE,
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
            <span className="page-eyebrow">Activité</span>
          </div>
          <h2>Activité physique &amp; gym</h2>
          <p className="page-subtitle">
            Vue sur les heures hebdomadaires d'exercice, les niveaux d'activité
            et les séances de gym des patients.
          </p>
        </div>
      </header>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Heures d'exercice par semaine</h3>
          <div className="chart-wrap">
            <Pie data={exerciseData} options={pieChartOptions} />
          </div>
        </div>
        <div className="chart-container">
          <h3>Niveaux d'activité physique</h3>
          <div className="chart-wrap">
            <Pie data={activityLevelData} options={pieChartOptions} />
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Types d'exercices à la gym</h3>
          <div className="chart-wrap">
            <Bar data={workoutTypeData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="stats-grid-large">
        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">⏱️</span>
          <h4>Heures d'exercice moyennes</h4>
          <p className="big-number">{avgHours?.toFixed(1) || 0}</p>
          <span className="unit">heures/semaine</span>
        </div>

        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">🔥</span>
          <h4>Calories brûlées (gym)</h4>
          <p className="big-number">
            {kpis?.gym?.avg_calories_burned?.toFixed(0) || 0}
          </p>
          <span className="unit">kcal/session</span>
        </div>

        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">🎯</span>
          <h4>Total patients</h4>
          <p className="big-number">{kpis?.total_patients || 0}</p>
          <span className="unit">patients</span>
        </div>
      </div>
    </div>
  );
}

export default Activity;
