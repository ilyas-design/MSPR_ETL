import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminTable from '../components/AdminTable';
import ExportButtons from '../components/ExportButtons';
import { apiService } from '../services/api';

function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [patients, setPatients] = useState([]);
  const [health, setHealth] = useState([]);
  const [nutrition, setNutrition] = useState([]);
  const [activities, setActivities] = useState([]);
  const [gym, setGym] = useState([]);

  const [dataQuality, setDataQuality] = useState(null);
  const [activeTab, setActiveTab] = useState('quality');

  const isAuthed = apiService.isAuthenticated();

  useEffect(() => {
    if (!isAuthed) {
      navigate('/login', { state: { next: '/admin' } });
      return;
    }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const unwrap = (resp) => resp?.data?.results || resp?.data || [];

  const fetchAll = async () => {
    setError(null);
    setLoading(true);
    try {
      const [p, h, n, a, g, dq] = await Promise.all([
        apiService.getPatients(),
        apiService.getHealthData(),
        apiService.getNutrition(),
        apiService.getActivities(),
        apiService.getGymSessions(),
        apiService.getDataQualityKPIs(),
      ]);
      setPatients(unwrap(p));
      setHealth(unwrap(h));
      setNutrition(unwrap(n));
      setActivities(unwrap(a));
      setGym(unwrap(g));
      setDataQuality(dq.data);
    } catch {
      setError(
        "Erreur lors du chargement. Vérifiez le backend (port 8000) et l'authentification JWT."
      );
    } finally {
      setLoading(false);
    }
  };

  const tabs = useMemo(
    () => [
      { id: 'quality', label: 'Qualité des données' },
      { id: 'patients', label: 'Patients' },
      { id: 'health', label: 'Santé' },
      { id: 'nutrition', label: 'Nutrition' },
      { id: 'activities', label: 'Activité physique' },
      { id: 'gym', label: 'Séances gym' },
    ],
    []
  );

  const qualityCards = useMemo(() => {
    const dq = dataQuality || {};
    return [
      {
        label: 'Score qualité (global)',
        value: dq.overall_data_quality ?? dq.quality_score ?? 0,
        suffix: '%',
      },
      {
        label: 'Complétude santé',
        value: dq.completeness_sante ?? 0,
        suffix: '%',
      },
      {
        label: 'Complétude nutrition',
        value: dq.completeness_nutrition ?? 0,
        suffix: '%',
      },
      {
        label: 'Complétude activité',
        value: dq.completeness_activity ?? 0,
        suffix: '%',
      },
    ];
  }, [dataQuality]);

  if (loading) return <div className="loading">Chargement</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page">
      <header className="page-header admin-head">
        <div>
          <div className="page-title-row">
            <span className="page-eyebrow">Administration</span>
          </div>
          <h2 className="admin-title">Console d'administration</h2>
          <p className="admin-subtitle">
            Surveillez la qualité, corrigez les anomalies et exportez les
            données nettoyées.
          </p>
        </div>
        <div className="admin-head-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={fetchAll}
            disabled={loading}
          >
            Rafraîchir
          </button>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="Admin">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'quality' ? (
        <>
          <div className="kpi-grid">
            {qualityCards.map((c) => (
              <div className="kpi-card" key={c.label}>
                <h3>{c.label}</h3>
                <div className="kpi-value">
                  {c.value}
                  {c.suffix || ''}
                </div>
                <p>Données issues des KPI backend (data-quality).</p>
              </div>
            ))}
          </div>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h3 className="panel-title">Export global</h3>
                <p className="panel-hint">
                  Exportez les données affichées (API) en CSV ou JSON.
                </p>
              </div>
            </div>
            <div className="export-grid">
              <div className="export-card">
                <div className="export-title">👥 Patients</div>
                <ExportButtons
                  filenamePrefix="patients_cleaned"
                  rows={patients}
                />
              </div>
              <div className="export-card">
                <div className="export-title">❤️ Santé</div>
                <ExportButtons filenamePrefix="sante_cleaned" rows={health} />
              </div>
              <div className="export-card">
                <div className="export-title">🍎 Nutrition</div>
                <ExportButtons
                  filenamePrefix="nutrition_cleaned"
                  rows={nutrition}
                />
              </div>
              <div className="export-card">
                <div className="export-title">🏃 Activité</div>
                <ExportButtons
                  filenamePrefix="activite_physique_cleaned"
                  rows={activities}
                />
              </div>
              <div className="export-card">
                <div className="export-title">🏋️ Gym</div>
                <ExportButtons
                  filenamePrefix="gym_sessions_cleaned"
                  rows={gym}
                />
              </div>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === 'patients' ? (
        <AdminTable
          title="Patients"
          rows={patients}
          rowIdKey="patient_id"
          editableKeys={['age', 'gender', 'weight_kg', 'height_cm']}
          onSaveRow={async (id, payload) => {
            await apiService.updatePatient(id, payload);
            await fetchAll();
          }}
          hint="Correction manuelle : modifiez les champs puis enregistrez (JWT requis)."
        />
      ) : null}

      {activeTab === 'health' ? (
        <AdminTable
          title="Santé"
          rows={health}
          rowIdKey="patient"
          editableKeys={[
            'cholesterol',
            'blood_pressure',
            'disease_type',
            'glucose',
            'severity',
          ]}
          onSaveRow={async (id, payload) => {
            await apiService.updateHealth(id, payload);
            await fetchAll();
          }}
          hint="Astuce : si l'API renvoie 401/403, reconnectez-vous."
        />
      ) : null}

      {activeTab === 'nutrition' ? (
        <AdminTable
          title="Nutrition"
          rows={nutrition}
          rowIdKey="patient"
          editableKeys={[
            'daily_caloric_intake',
            'dietary_restrictions',
            'allergies',
            'preferred_cuisine',
            'diet_recommendation',
            'adherence_to_diet_plan',
          ]}
          onSaveRow={async (id, payload) => {
            await apiService.updateNutrition(id, payload);
            await fetchAll();
          }}
          hint="Ces corrections sont persistées en base (tables ETL)."
        />
      ) : null}

      {activeTab === 'activities' ? (
        <AdminTable
          title="Activité physique"
          rows={activities}
          rowIdKey="patient"
          editableKeys={['physical_activity_level', 'weekly_exercice_hours']}
          onSaveRow={async (id, payload) => {
            await apiService.updateActivity(id, payload);
            await fetchAll();
          }}
          hint="Modifiez seulement si vous avez identifié une anomalie."
        />
      ) : null}

      {activeTab === 'gym' ? (
        <AdminTable
          title="Séances gym"
          rows={gym}
          rowIdKey="id"
          editableKeys={[
            'gym_session_duration_hours',
            'gym_calories_burned',
            'gym_workout_type',
            'gym_max_bpm',
            'gym_avg_bpm',
            'gym_resting_bpm',
            'gym_fat_percentage',
            'gym_water_intake_liters',
            'gym_workout_frequency_days_week',
            'gym_experience_level',
            'calories_per_hour',
          ]}
          onSaveRow={async (id, payload) => {
            await apiService.updateGymSession(id, payload);
            await fetchAll();
          }}
          hint="Export disponible dans l'onglet Qualité des données."
        />
      ) : null}
    </div>
  );
}

export default Admin;
