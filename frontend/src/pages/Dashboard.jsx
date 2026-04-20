import { useEffect, useState } from "react";

import { apiService } from "../services/api";
import StatCard from "../components/StatCard";

function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpi, eng] = await Promise.all([
          apiService.getKPIs(),
          apiService.getEngagementKPIs(),
        ]);
        setKpis(kpi.data);
        setEngagement(eng.data);
        setLoading(false);
      } catch (err) {
        const hint =
          err?.code === "ERR_NETWORK"
            ? "Backend indisponible. Lancez Django sur http://localhost:8000 puis rafraîchissez."
            : "Erreur lors du chargement des données.";
        setError(hint);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Chargement des KPIs</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard">
      <header className="page-header">
        <div>
          <div className="page-title-row">
            <span className="page-eyebrow">Vue d'ensemble</span>
          </div>
          <h2>Tableau de bord</h2>
          <p className="page-subtitle">
            Suivez en un coup d'œil les indicateurs clés sur la santé, la
            nutrition et l'activité physique de vos patients.
          </p>
        </div>
      </header>

      <section className="section">
        <h3 className="section-title">Panorama patients</h3>
        <div className="kpi-grid">
          <StatCard
            icon="👥"
            title="Total patients"
            value={kpis?.total_patients || 0}
          />
          <StatCard
            icon="🎂"
            title="Âge moyen"
            value={kpis?.avg_age?.toFixed(1) || 0}
            unit="ans"
          />
          <StatCard
            icon="⚖️"
            title="BMI moyen"
            value={kpis?.avg_bmi?.toFixed(2) || 0}
          />
          <StatCard
            icon="❤️"
            title="Cholestérol moyen"
            value={kpis?.sante?.avg_cholesterol?.toFixed(0) || 0}
            unit="mg/dL"
          />
        </div>
      </section>

      <section className="section">
        <h3 className="section-title">Engagement</h3>
        <div className="kpi-grid">
          <StatCard
            icon="💪"
            title="Patients actifs"
            value={engagement?.active_patients || 0}
            color="#10b981"
          />
          <StatCard
            icon="🎯"
            title="Taux d'engagement"
            value={engagement?.engagement_rate?.toFixed(1) || 0}
            unit="%"
            color="#10b981"
          />
          <StatCard
            icon="🏋️"
            title="Sessions moyennes"
            value={engagement?.avg_sessions_per_patient?.toFixed(1) || 0}
            unit="par patient"
            color="#10b981"
          />
          <StatCard
            icon="📊"
            title="Total sessions"
            value={engagement?.total_sessions || 0}
            color="#10b981"
          />
        </div>
      </section>

      <section className="section">
        <h3 className="section-title">Nutrition &amp; activité</h3>
        <div className="kpi-grid">
          <StatCard
            icon="🍎"
            title="Calories moyennes"
            value={kpis?.nutrition?.avg_calories?.toFixed(0) || 0}
            unit="kcal/jour"
            color="#0ea5e9"
          />
          <StatCard
            icon="⏱️"
            title="Exercice moyen"
            value={kpis?.activite_physique?.avg_exercise_hours?.toFixed(1) || 0}
            unit="heures/semaine"
            color="#0ea5e9"
          />
          <StatCard
            icon="🔥"
            title="Calories brûlées"
            value={kpis?.gym?.avg_calories_burned?.toFixed(0) || 0}
            unit="kcal/session"
            color="#0ea5e9"
          />
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
