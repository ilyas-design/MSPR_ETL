import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import { usePageTitle } from '../utils/usePageTitle';

function getInitial(id) {
  if (!id) return '?';
  const trimmed = String(id).trim();
  return trimmed[0]?.toUpperCase() || '?';
}

function Patients() {
  usePageTitle('Annuaire des patients');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await apiService.getPatients();
        const list = response.data.results || response.data || [];
        setPatients(list);
        setLoading(false);
      } catch (err) {
        setError(
          err?.code === 'ERR_NETWORK'
            ? 'Backend indisponible. Lancez Django sur http://localhost:8000.'
            : 'Erreur au chargement des patients'
        );
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    const q = searchTerm.toLowerCase();
    return patients.filter(
      (p) =>
        String(p.patient_id).toLowerCase().includes(q) ||
        String(p.age).includes(q) ||
        String(p.gender).toLowerCase().includes(q)
    );
  }, [searchTerm, patients]);

  if (loading) return <div className="loading">Chargement des patients</div>;
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
            rapidement ses indicateurs morphologiques.
          </p>
        </div>
      </header>

      <div className="patients-container">
        <aside className="patients-list" aria-labelledby="patients-list-title">
          <h2 id="patients-list-title">Liste des patients ({filteredPatients.length})</h2>

          <div className="search-box">
            <input
              type="search"
              placeholder="Rechercher par ID, âge, genre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              aria-label="Rechercher un patient"
            />
            <span className="search-icon" aria-hidden="true">
              🔍
            </span>
          </div>

          <div className="patient-items">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => {
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
