import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import '../styles/Patients.css';

function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await apiService.getPatients();
        setPatients(response.data.results || response.data);
        setLoading(false);
      } catch (err) {
        setError(err?.code === 'ERR_NETWORK'
          ? 'Backend indisponible. Lancez Django sur http://localhost:8000.'
          : 'Erreur au chargement des patients'
        );
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) {
      return patients;
    }

    return patients.filter((p) =>
      p.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.age.toString().includes(searchTerm) ||
      p.gender.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, patients]);

  if (loading) return <div className="loading">Chargement...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page">
      <h2>Patients</h2>
      
      <div className="patients-container">
        <div className="patients-list">
          <h3>Liste des patients ({filteredPatients.length})</h3>
          
          <div className="search-box">
            <input
              type="text"
              placeholder="Chercher par ID, âge..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>

          <div className="patient-items">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <div
                  key={patient.patient_id}
                  className={`patient-item ${selectedPatient?.patient_id === patient.patient_id ? 'active' : ''}`}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="patient-avatar">{patient.patient_id[0]}</div>
                  <div className="patient-info">
                    <h4>{patient.patient_id}</h4>
                    <p>{patient.age} ans • {patient.gender}</p>
                  </div>
                </div>
              ))
            ) : (
              <p style={{textAlign: 'center', color: '#a0aec0', padding: '1rem'}}>Aucun patient trouvé</p>
            )}
          </div>
        </div>

        <div className="patient-details">
          {selectedPatient ? (
            <>
              <h3>Détails du patient</h3>
              <div className="details-card">
                <div className="detail-row">
                  <span>ID Patient</span>
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
                  <span>Hauteur</span>
                  <strong>{selectedPatient.height_cm} cm</strong>
                </div>
                <div className="detail-row">
                  <span>IMC calculé</span>
                  <strong>{parseFloat(selectedPatient.bmi_calculated).toFixed(2)}</strong>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Sélectionnez un patient pour voir les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Patients;