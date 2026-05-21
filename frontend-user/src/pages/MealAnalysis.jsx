import { useState } from 'react';
import { analyzeMealPhoto } from '../services/api';

function MealAnalysis() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      setError('Choisis un fichier image (JPG, PNG…).');
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setPredictions(null);
    setError('');
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Sélectionne d\'abord une photo.');
      return;
    }
    setError('');
    setLoading(true);
    setPredictions(null);

    try {
      const results = await analyzeMealPhoto(file);
      setPredictions(results);
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('L\'analyse a pris trop de temps. Réessaie.');
      } else if (err.response?.status === 422) {
        setError('Le fichier n\'est pas une image valide.');
      } else {
        setError('Erreur lors de l\'analyse. Le service IA est-il lancé ?');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setPredictions(null);
    setError('');
  };

  return (
    <section className="meal-analysis-page">
      <h2>Analyser un repas</h2>
      <p>Prends ou choisis une photo de ton assiette pour identifier les aliments et estimer les macros.</p>

      {!preview && (
        <div className="upload-zone">
          <label htmlFor="meal-photo" className="upload-label">
            <span className="upload-icon" aria-hidden="true">📷</span>
            <span>Cliquer pour choisir une photo</span>
            <small>JPG, PNG · max 10 Mo</small>
          </label>
          <input
            id="meal-photo"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="upload-input"
          />
        </div>
      )}

      {preview && (
        <div className="preview-section">
          <img src={preview} alt="Aperçu du repas sélectionné" className="meal-preview" />
          <div className="preview-actions">
            <button type="button" onClick={handleAnalyze} disabled={loading}>
              {loading ? 'Analyse en cours…' : '🔍 Analyser ce repas'}
            </button>
            <button type="button" onClick={handleReset} disabled={loading} className="button-secondary">
              Changer de photo
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <p role="status" className="loading-message">
          L'IA analyse ton repas, ça prend quelques secondes…
        </p>
      )}

      {predictions && predictions.length > 0 && (
        <section aria-live="polite" className="results-section">
          <h3>Résultats — Top 5 prédictions</h3>
          <ol className="predictions-list">
            {predictions.map((pred, index) => (
              <li key={index} className="prediction-card">
                <div className="prediction-header">
                  <span className="prediction-label">
                    {pred.matched_food || pred.label.replace(/_/g, ' ')}
                  </span>
                  <span className="prediction-score">
                    {Math.round(pred.score * 100)}%
                  </span>
                </div>
                {pred.macros ? (
                  <dl className="macros-grid">
                    <div>
                      <dt>Calories</dt>
                      <dd>{pred.macros.avg_calories} kcal</dd>
                    </div>
                    <div>
                      <dt>Protéines</dt>
                      <dd>{pred.macros.avg_protein} g</dd>
                    </div>
                    <div>
                      <dt>Glucides</dt>
                      <dd>{pred.macros.avg_carbohydrates} g</dd>
                    </div>
                    <div>
                      <dt>Lipides</dt>
                      <dd>{pred.macros.avg_fat} g</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="no-macros">Macros non disponibles pour cet aliment.</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  );
}

export default MealAnalysis;


