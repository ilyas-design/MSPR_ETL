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
import { usePageTitle } from '../utils/usePageTitle';
import { AccessibleChart, ChartDataTable } from '../utils/chartA11y';
import { buildChartSummary } from '../utils/chartA11yHelpers';

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
  usePageTitle('Activité physique');
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
          <h1>Activité physique &amp; gym</h1>
          <p className="page-subtitle">
            Vue sur les heures hebdomadaires d'exercice, les niveaux d'activité
            et les séances de gym des patients.
          </p>
        </div>
      </header>

      <section className="charts-grid" aria-label="Répartitions de l'activité physique">
        <div className="chart-container">
          <h2>Heures d'exercice par semaine</h2>
          <AccessibleChart
            title="Répartition circulaire des heures d'exercice hebdomadaires"
            summary={buildChartSummary(
              'Heures d\'exercice',
              exerciseData.labels,
              exerciseData.datasets[0].data
            )}
            dataTable={
              <ChartDataTable
                caption="Données du graphique : heures d'exercice"
                headers={['Catégorie', 'Heures']}
                rows={exerciseData.labels.map((l, i) => [
                  l,
                  exerciseData.datasets[0].data[i] ?? 0,
                ])}
              />
            }
          >
            <div className="chart-wrap">
              <Pie data={exerciseData} options={pieChartOptions} />
            </div>
          </AccessibleChart>
        </div>
        <div className="chart-container">
          <h2>Niveaux d'activité physique</h2>
          <AccessibleChart
            title="Répartition circulaire des niveaux d'activité physique"
            summary={buildChartSummary(
              "Niveaux d'activité physique",
              activityLevelData.labels,
              activityLevelData.datasets[0].data
            )}
            dataTable={
              <ChartDataTable
                caption="Données du graphique : niveaux d'activité physique"
                headers={['Niveau', 'Nombre de patients']}
                rows={activityLevelData.labels.map((l, i) => [
                  l,
                  activityLevelData.datasets[0].data[i] ?? 0,
                ])}
              />
            }
          >
            <div className="chart-wrap">
              <Pie data={activityLevelData} options={pieChartOptions} />
            </div>
          </AccessibleChart>
        </div>
      </section>

      <section className="charts-grid" aria-label="Gym">
        <div className="chart-container">
          <h2>Types d'exercices à la gym</h2>
          <AccessibleChart
            title="Graphique en barres des types d'exercices à la gym"
            summary={buildChartSummary(
              "Types d'exercices",
              workoutTypeData.labels,
              workoutTypeData.datasets[0].data
            )}
            dataTable={
              <ChartDataTable
                caption="Données du graphique : types d'exercices à la gym"
                headers={["Type d'exercice", 'Nombre de sessions']}
                rows={workoutTypeData.labels.map((l, i) => [
                  l,
                  workoutTypeData.datasets[0].data[i] ?? 0,
                ])}
              />
            }
          >
            <div className="chart-wrap">
              <Bar data={workoutTypeData} options={chartOptions} />
            </div>
          </AccessibleChart>
        </div>
      </section>

      <section className="stats-grid-large" aria-label="Indicateurs activité">
        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">⏱️</span>
          <h2>Heures d'exercice moyennes</h2>
          <p className="big-number">{avgHours?.toFixed(1) || 0}</p>
          <span className="unit">heures/semaine</span>
        </div>

        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">🔥</span>
          <h2>Calories brûlées (gym)</h2>
          <p className="big-number">
            {kpis?.gym?.avg_calories_burned?.toFixed(0) || 0}
          </p>
          <span className="unit">kcal/session</span>
        </div>

        <div className="stat-box">
          <span className="stat-icon" aria-hidden="true">🎯</span>
          <h2>Total patients</h2>
          <p className="big-number">{kpis?.total_patients || 0}</p>
          <span className="unit">patients</span>
        </div>
      </section>
    </div>
  );
}

export default Activity;
