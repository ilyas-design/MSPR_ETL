import { useEffect, useMemo, useState } from 'react';
import PaginationBar from '../components/PaginationBar';
import { apiService } from '../services/api';
import { usePageTitle } from '../utils/usePageTitle';

const PAGE_SIZE = 50;

function getInitial(id) {
  if (!id) return '?';
  const trimmed = String(id).trim();
  return trimmed[0]?.toUpperCase() || '?';
}

function Patients() {
  usePageTitle('Annuaire des patients');
  const [patients, setPatients] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    setSelectedPatient(null);
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    async function fetchPatients() {
      setLoading(true);
      setError(null);
      try {
        const params = {
          page,
          page_size: PAGE_SIZE,
        };
        if (debouncedSearch) {
          params.search = debouncedSearch;
        }
        const response = await apiService.getPatients(params);
        if (cancelled) return;
        const data = response.data;
        const list = Array.isArray(data.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];
        setPatients(list);
        setTotalCount(
          typeof data.count === 'number' ? data.count : list.length,
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.code === 'ERR_NETWORK'
              ? 'Backend indisponible. Lancez Django sur http://localhost:8000.'
              : 'Erreur au chargement des patients'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPatients();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch]);

  const rangeCaption = useMemo(() => {
    if (loading || totalCount == null) return 'Chargement…';
    const tc = totalCount;
    const fromIdx = tc === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const toIdx =
      tc === 0 ? 0 : Math.min(page * PAGE_SIZE, tc);
    return `${tc.toLocaleString('fr-FR')} patient(s)` + (tc === 0
      ? ''
      : ` (${fromIdx}–${toIdx} sur cette page)`);
  }, [loading, totalCount, page]);

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-title-row">
            <span className="page-eyebrow">Patients</span>
          </div>
          <h1>Annuaire des patients</h1>
          <p className="page-subtitle">
            Parcourez la liste complète, recherchez un patient et consultez
            rapidement ses indicateurs morphologiques. La recherche et la
            pagination passent par l&apos;API (données volumineuses).
          </p>
        </div>
      </header>

      <div className="patients-container">
        <aside className="patients-list" aria-labelledby="patients-list-title">
          <h2 id="patients-list-title">Liste des patients</h2>
          <p className="page-subtitle" style={{ marginTop: '-0.25rem', marginBottom: '0.75rem' }}>
            {rangeCaption}
          </p>

          <div className="search-box">
            <input
              type="search"
              placeholder="Rechercher par ID, âge, genre…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              aria-label="Rechercher un patient"
            />
            <span className="search-icon" aria-hidden="true">
              🔍
            </span>
          </div>

          {!loading && typeof totalCount === 'number' ? (
            <PaginationBar
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={totalCount}
              disabled={loading}
              onPageChange={(p) => setPage(p)}
              labelledById="patients-list-title"
            />
          ) : null}

          <div className="patient-items" aria-busy={loading}>
            {loading ? (
              <p className="loading" style={{ padding: '1rem' }}>
                Chargement des patients…
              </p>
            ) : patients.length > 0 ? (
              patients.map((patient) => {
                const active =
                  selectedPatient?.patient_id === patient.patient_id;
                return (
                  <button
                    type="button"
                    key={patient.patient_id}
                    className={`patient-item ${active ? 'active' : ''}`}
                    onClick={() => setSelectedPatient(patient)}
                    aria-pressed={active}
                  >
                    <span className="patient-avatar">
                      {getInitial(patient.patient_id)}
                    </span>
                    <span className="patient-info">
                      <span className="patient-id">{patient.patient_id}</span>
                      <span className="patient-meta">
                        {patient.age} ans &bull; {patient.gender}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p
                style={{
                  textAlign: 'center',
                  color: 'var(--muted)',
                  padding: '1rem',
                }}
              >
                Aucun patient trouvé
              </p>
            )}
          </div>
        </aside>

        <section className="patient-details" aria-labelledby="patient-details-title">
          {selectedPatient ? (
            <>
              <h2 id="patient-details-title">Détails du patient</h2>
              <div className="details-card">
                <div className="detail-row">
                  <span>ID patient</span>
                  <strong>{selectedPatient.patient_id}</strong>
                </div>
                <div className="detail-row">
                  <span>Âge</span>
                  <strong>{selectedPatient.age} ans</strong>
                </div>
                <div className="detail-row">
                  <span>Genre</span>
                  <strong>{selectedPatient.gender}</strong>
                </div>
                <div className="detail-row">
                  <span>Poids</span>
                  <strong>{selectedPatient.weight_kg} kg</strong>
                </div>
                <div className="detail-row">
                  <span>Taille</span>
                  <strong>{selectedPatient.height_cm} cm</strong>
                </div>
                <div className="detail-row">
                  <span>IMC calculé</span>
                  <strong>
                    {parseFloat(selectedPatient.bmi_calculated).toFixed(2)}
                  </strong>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Sélectionnez un patient pour afficher ses détails.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Patients;
