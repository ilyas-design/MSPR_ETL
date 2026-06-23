import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminTable from '../components/AdminTable';
import ExportButtons from '../components/ExportButtons';
import PaginationBar from '../components/PaginationBar';
import PendingChangesTable from '../components/PendingChangesTable';
import { apiService } from '../services/api';
import { usePageTitle } from '../utils/usePageTitle';

const DATA_TABS = [
  'patients',
  'health',
  'nutrition',
  'activities',
  'gym',
];
const PAGE_SIZE_ADMIN = 50;

const emptyPageState = () =>
  DATA_TABS.reduce(
    (acc, k) => {
      acc[k] = 1;
      return acc;
    },
    /** @type Record<string, number> */ ({}),
  );

function Admin() {
  usePageTitle('Administration');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [patients, setPatients] = useState([]);
  const [health, setHealth] = useState([]);
  const [nutrition, setNutrition] = useState([]);
  const [activities, setActivities] = useState([]);
  const [gym, setGym] = useState([]);

  const [countByTab, setCountByTab] = useState(
    /** @type Record<string, number> */ ({}),
  );
  const [pageByTab, setPageByTab] = useState(() => emptyPageState());

  const [me, setMe] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [flash, setFlash] = useState(null);

  const [dataQuality, setDataQuality] = useState(null);
  const [activeTab, setActiveTab] = useState('quality');

  const isAuthed = apiService.isAuthenticated();
  const isSupervisor = !!me?.is_supervisor;

  const unwrap = (resp) => resp?.data?.results || resp?.data || [];

  const fetchPending = useCallback(async () => {
    try {
      const resp = await apiService.getPendingChanges();
      setPendingChanges(unwrap(resp));
    } catch {
      // silencieux : l'onglet gère son propre état vide
    }
  }, []);

  const fetchMeta = useCallback(async () => {
    const [dq, meResp] = await Promise.all([
      apiService.getDataQualityKPIs(),
      apiService.getMe().catch(() => null),
    ]);
    setDataQuality(dq.data);
    setMe(meResp?.data || null);
    await fetchPending();
  }, [fetchPending]);

  const loadDataTab = useCallback(async (tab, pageNum) => {
    const params = { page: pageNum, page_size: PAGE_SIZE_ADMIN };
    switch (tab) {
      case 'patients':
        return apiService.getPatients(params);
      case 'health':
        return apiService.getHealthData(params);
      case 'nutrition':
        return apiService.getNutrition(params);
      case 'activities':
        return apiService.getActivities(params);
      case 'gym':
        return apiService.getGymSessions(params);
      default:
        return null;
    }
  }, []);

  const applyRows = useCallback((tab, rows) => {
    const setters = {
      patients: setPatients,
      health: setHealth,
      nutrition: setNutrition,
      activities: setActivities,
      gym: setGym,
    };
    const fn = setters[tab];
    if (fn) fn(rows);
  }, []);

  const currentListPage = DATA_TABS.includes(activeTab)
    ? pageByTab[activeTab] ?? 1
    : 1;

  useEffect(() => {
    if (!DATA_TABS.includes(activeTab)) return undefined;
    let cancelled = false;

    async function run() {
      setTabLoading(true);
      setError(null);
      try {
        const page = currentListPage;
        const resp = await loadDataTab(activeTab, page);
        if (cancelled || !resp) return;
        const data = resp.data;
        const rows = Array.isArray(data.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];
        const count =
          typeof data.count === 'number' ? data.count : rows.length;
        setCountByTab((prev) => ({ ...prev, [activeTab]: count }));
        applyRows(activeTab, rows);
      } catch {
        if (!cancelled) {
          setError(
            'Erreur lors du chargement. Vérifiez le backend (port 8000) et l’authentification JWT.',
          );
        }
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    }
    run();

    return () => {
      cancelled = true;
    };
  }, [activeTab, currentListPage, applyRows, loadDataTab]);

  const refreshCurrentTab = useCallback(async () => {
    if (!DATA_TABS.includes(activeTab)) return;
    const page = pageByTab[activeTab] ?? 1;
    setTabLoading(true);
    setError(null);
    try {
      const resp = await loadDataTab(activeTab, page);
      if (!resp) return;
      const data = resp.data;
      const rows = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data)
          ? data
          : [];
      const count =
        typeof data.count === 'number' ? data.count : rows.length;
      setCountByTab((prev) => ({ ...prev, [activeTab]: count }));
      applyRows(activeTab, rows);
    } catch {
      setError(
        'Erreur lors du chargement. Vérifiez le backend (port 8000) et l’authentification JWT.',
      );
    } finally {
      setTabLoading(false);
    }
  }, [activeTab, applyRows, loadDataTab, pageByTab]);

  useEffect(() => {
    if (!isAuthed) {
      navigate('/login', { state: { next: '/admin' } });
      return undefined;
    }
    let cancelled = false;
    async function boot() {
      setLoading(true);
      setError(null);
      try {
        await fetchMeta();
      } catch {
        if (!cancelled) {
          setError(
            "Erreur lors du chargement. Vérifiez le backend (port 8000) et l'authentification JWT.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [isAuthed, navigate, fetchMeta]);

  useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  const showFlash = (level, message) => setFlash({ level, message });

  const refreshAll = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      await fetchMeta();
      if (DATA_TABS.includes(activeTab)) await refreshCurrentTab();
    } catch {
      setError(
        "Erreur lors du chargement. Vérifiez le backend (port 8000) et l'authentification JWT.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, fetchMeta, refreshCurrentTab]);

  /**
   * Wrapper d'édition qui gère le retour 202 (modification en attente)
   * et affiche le message adapté selon le rôle de l'utilisateur.
   */
  const wrapSave = (apiCall, successMsg) => async (id, payload) => {
    const resp = await apiCall(id, payload);
    if (resp?.status === 202) {
      showFlash(
        'info',
        'Modification enregistrée et soumise à validation. Un superviseur doit l\u2019approuver.',
      );
      await fetchPending();
      setActiveTab('approvals');
    } else {
      showFlash('success', successMsg || 'Modification appliquée.');
      await refreshCurrentTab();
      await fetchMeta();
    }
  };

  const setPageForTab = (tab, p) => {
    setPageByTab((prev) => ({ ...prev, [tab]: p }));
  };

  const tabs = useMemo(() => {
    const base = [
      { id: 'quality', label: 'Qualité des données' },
      { id: 'patients', label: 'Patients' },
      { id: 'health', label: 'Santé' },
      { id: 'nutrition', label: 'Nutrition' },
      { id: 'activities', label: 'Activité physique' },
      { id: 'gym', label: 'Séances gym' },
    ];
    const pendingCount = pendingChanges.filter((pc) => pc.status === 'pending')
      .length;
    const label = pendingCount
      ? `Demandes d'approbation (${pendingCount})`
      : 'Demandes d\u2019approbation';
    base.push({ id: 'approvals', label });
    return base;
  }, [pendingChanges]);

  const qualityCards = useMemo(() => {
    const dq = dataQuality || {};
    return [
      {
        label: 'Score qualité (global)',
        value: dq.overall_data_quality ?? dq.quality_score ?? 0,
        suffix: '%',
      },
      { label: 'Complétude santé', value: dq.completeness_sante ?? 0, suffix: '%' },
      { label: 'Complétude nutrition', value: dq.completeness_nutrition ?? 0, suffix: '%' },
      { label: 'Complétude activité', value: dq.completeness_activity ?? 0, suffix: '%' },
    ];
  }, [dataQuality]);

  const busyRefreshing = refreshing || tabLoading;

  if (loading) {
    return <div className="loading">Chargement</div>;
  }

  return (
    <div className="page">
      <header className="page-header admin-head">
        <div>
          <div className="page-title-row">
            <span className="page-eyebrow">Administration</span>
            {me ? (
              <span
                className={`role-badge ${isSupervisor ? 'role-badge--super' : 'role-badge--admin'}`}
                aria-label={
                  isSupervisor
                    ? `Utilisateur connecté ${me.username}, rôle superviseur`
                    : `Utilisateur connecté ${me.username}, rôle administrateur standard`
                }
              >
                {me.username} · {isSupervisor ? 'Superviseur' : 'Admin'}
              </span>
            ) : null}
          </div>
          <h1 className="admin-title">Console d&apos;administration</h1>
          <p className="admin-subtitle">
            Surveillez la qualité, corrigez les anomalies et exportez les
            données nettoyées (exports : chargement paginé de toutes les lignes via l’API).
            {!isSupervisor
              ? ' Vos modifications sont soumises au workflow de validation.'
              : ''}
          </p>
        </div>
        <div className="admin-head-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={refreshAll}
            disabled={busyRefreshing}
          >
            Rafraîchir
          </button>
        </div>
      </header>

      {flash ? (
        <div
          role="status"
          aria-live="polite"
          className={`flash flash-${flash.level}`}
        >
          {flash.message}
        </div>
      ) : null}

      {error ? (
        <div className="error" role="alert">
          {error}
        </div>
      ) : null}

      <nav className="tabs" aria-label="Sections d'administration">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={activeTab === t.id}
            aria-current={activeTab === t.id ? 'page' : undefined}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {activeTab === 'quality' ? (
        <section aria-label="Qualité des données">
          <div className="kpi-grid">
            {qualityCards.map((c) => (
              <div className="kpi-card" key={c.label}>
                <h2>{c.label}</h2>
                <div className="kpi-value">
                  {c.value}
                  {c.suffix || ''}
                </div>
                <p>Données issues des KPI backend (data-quality).</p>
              </div>
            ))}
          </div>

          <section className="panel" aria-labelledby="export-title">
            <div className="panel-head">
              <div>
                <h2 id="export-title" className="panel-title">Export global</h2>
                <p className="panel-hint">
                  CSV / JSON consolidés ; chaque fichier charge toutes les pages via l’API (volumes importants acceptés).
                </p>
              </div>
            </div>
            <div className="export-grid">
              <div className="export-card">
                <div className="export-title">Patients</div>
                <ExportButtons
                  filenamePrefix="patients_cleaned"
                  rows={[]}
                  fetchAllRows={apiService.getAllPatientsPaged}
                />
              </div>
              <div className="export-card">
                <div className="export-title">Santé</div>
                <ExportButtons
                  filenamePrefix="sante_cleaned"
                  rows={[]}
                  fetchAllRows={apiService.getAllHealthPaged}
                />
              </div>
              <div className="export-card">
                <div className="export-title">Nutrition</div>
                <ExportButtons
                  filenamePrefix="nutrition_cleaned"
                  rows={[]}
                  fetchAllRows={apiService.getAllNutritionPaged}
                />
              </div>
              <div className="export-card">
                <div className="export-title">Activité</div>
                <ExportButtons
                  filenamePrefix="activite_physique_cleaned"
                  rows={[]}
                  fetchAllRows={apiService.getAllActivitiesPaged}
                />
              </div>
              <div className="export-card">
                <div className="export-title">Séances gym</div>
                <ExportButtons
                  filenamePrefix="gym_sessions_cleaned"
                  rows={[]}
                  fetchAllRows={apiService.getAllGymSessionsPaged}
                />
              </div>
            </div>
          </section>
        </section>
      ) : null}

      {activeTab === 'patients' ? (
        <>
          <PaginationBar
            page={pageByTab.patients ?? 1}
            pageSize={PAGE_SIZE_ADMIN}
            totalCount={countByTab.patients ?? 0}
            onPageChange={(p) => setPageForTab('patients', p)}
            disabled={tabLoading}
            labelledById="panel-title-Patients"
          />
          <AdminTable
            title="Patients"
            rows={patients}
            rowIdKey="patient_id"
            editableKeys={['age', 'gender', 'weight_kg', 'height_cm']}
            onSaveRow={wrapSave(apiService.updatePatient)}
            hint={
              isSupervisor
                ? 'Vos modifications sont appliquées directement.'
                : 'Vos modifications sont soumises à la validation d\u2019un superviseur.'
            }
            totalCount={countByTab.patients}
            loading={tabLoading}
          />
        </>
      ) : null}

      {activeTab === 'health' ? (
        <>
          <PaginationBar
            page={pageByTab.health ?? 1}
            pageSize={PAGE_SIZE_ADMIN}
            totalCount={countByTab.health ?? 0}
            onPageChange={(p) => setPageForTab('health', p)}
            disabled={tabLoading}
            labelledById="panel-title-Santé"
          />
          <AdminTable
            title="Santé"
            rows={health}
            rowIdKey="patient"
            editableKeys={['cholesterol', 'blood_pressure', 'disease_type', 'glucose', 'severity']}
            onSaveRow={wrapSave(apiService.updateHealth)}
            hint="Astuce : si l'API renvoie 401/403, reconnectez-vous."
            totalCount={countByTab.health}
            loading={tabLoading}
          />
        </>
      ) : null}

      {activeTab === 'nutrition' ? (
        <>
          <PaginationBar
            page={pageByTab.nutrition ?? 1}
            pageSize={PAGE_SIZE_ADMIN}
            totalCount={countByTab.nutrition ?? 0}
            onPageChange={(p) => setPageForTab('nutrition', p)}
            disabled={tabLoading}
            labelledById="panel-title-Nutrition"
          />
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
            onSaveRow={wrapSave(apiService.updateNutrition)}
            hint="Ces corrections sont persistées en base (tables ETL)."
            totalCount={countByTab.nutrition}
            loading={tabLoading}
          />
        </>
      ) : null}

      {activeTab === 'activities' ? (
        <>
          <PaginationBar
            page={pageByTab.activities ?? 1}
            pageSize={PAGE_SIZE_ADMIN}
            totalCount={countByTab.activities ?? 0}
            onPageChange={(p) => setPageForTab('activities', p)}
            disabled={tabLoading}
            labelledById="panel-title-Activité physique"
          />
          <AdminTable
            title="Activité physique"
            rows={activities}
            rowIdKey="patient"
            editableKeys={['physical_activity_level', 'weekly_exercice_hours']}
            onSaveRow={wrapSave(apiService.updateActivity)}
            hint="Modifiez seulement si vous avez identifié une anomalie."
            totalCount={countByTab.activities}
            loading={tabLoading}
          />
        </>
      ) : null}

      {activeTab === 'gym' ? (
        <>
          <PaginationBar
            page={pageByTab.gym ?? 1}
            pageSize={PAGE_SIZE_ADMIN}
            totalCount={countByTab.gym ?? 0}
            onPageChange={(p) => setPageForTab('gym', p)}
            disabled={tabLoading}
            labelledById="panel-title-Séances gym"
          />
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
            onSaveRow={wrapSave(apiService.updateGymSession)}
            hint="Export disponible dans l'onglet Qualité des données."
            totalCount={countByTab.gym}
            loading={tabLoading}
          />
        </>
      ) : null}

      {activeTab === 'approvals' ? (
        <PendingChangesTable
          rows={pendingChanges}
          isSupervisor={isSupervisor}
          onApprove={async (id, comment) => {
            await apiService.approvePendingChange(id, comment);
            showFlash('success', 'Modification approuvée et appliquée.');
          }}
          onReject={async (id, comment) => {
            await apiService.rejectPendingChange(id, comment);
            showFlash('success', 'Modification rejetée.');
          }}
          onRefresh={fetchPending}
        />
      ) : null}
    </div>
  );
}

export default Admin;
