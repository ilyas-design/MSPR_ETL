import { useState } from 'react';
import { analyzeMealPhoto, lookupMacros, saveMeal } from '../services/api';

function MealAnalysis() {
  // Étape courante du workflow : 'upload' | 'select' | 'result'
  const [step, setStep] = useState('upload');

  // Fichier + preview
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // Résultats de /analyze (5 prédictions Food-101)
  const [predictions, setPredictions] = useState([]);

  // Labels que l'user a cochés (Set pour éviter doublons)
  const [selectedLabels, setSelectedLabels] = useState(new Set());

  // Résultat de /macros/lookup
  const [lookupResult, setLookupResult] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');


  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      setError('Choisis un fichier image (JPG, PNG…).');
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError('');
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Sélectionne d\'abord une photo.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const results = await analyzeMealPhoto(file);
      setPredictions(results);
      // On pré-coche la 1ère prédiction (la + confiante) pour guider l'user
      setSelectedLabels(new Set(results.length > 0 ? [results[0].label] : []));
      setStep('select');
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

  const toggleLabel = (label) => {
    setSelectedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const handleCalculate = async () => {
    if (selectedLabels.size === 0) {
      setError('Coche au moins un aliment.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const labels = Array.from(selectedLabels);
      const result = await lookupMacros(labels);
      setLookupResult(result);
      setStep('result');
    } catch (err) {
      setError('Erreur lors du calcul des macros. Réessaie.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setPredictions([]);
    setSelectedLabels(new Set());
    setLookupResult(null);
    setError('');
  };

  const handleSaveMeal = async () => {
  if (!lookupResult) return;
  setSaving(true);
  setSavedMessage('');
  try {
    await saveMeal({
      detected_foods: lookupResult.items,
      total_calories: lookupResult.total.calories,
      total_protein: lookupResult.total.protein,
      total_carbohydrates: lookupResult.total.carbohydrates,
      total_fat: lookupResult.total.fat,
    });
    setSavedMessage('✅ Repas enregistré dans ton historique !');
  } catch (err) {
    setError('Impossible d\'enregistrer le repas. Réessaie.');
  } finally {
    setSaving(false);
  }
};


  // ----------------------------------------------------------------
  // Rendu
  // ----------------------------------------------------------------

  return (
    <section className="meal-analysis-page">
      <h2>Analyser un repas</h2>

      {/* Stepper visuel */}
      <ol className="stepper" aria-label="Progression">
        <li className={step === 'upload' ? 'active' : 'done'}>1. Photo</li>
        <li className={step === 'select' ? 'active' : step === 'result' ? 'done' : ''}>
          2. Vérification
        </li>
        <li className={step === 'result' ? 'active' : ''}>3. Résultats</li>
      </ol>

      {error && (
        <p className="form-error" role="alert">{error}</p>
      )}

      {/* ============ ÉTAPE 1 — UPLOAD ============ */}
      {step === 'upload' && (
        <>
          <p>Prends ou choisis une photo de ton assiette.</p>

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
              <img src={preview} alt="Aperçu du repas" className="meal-preview" />
              <div className="preview-actions">
                <button type="button" onClick={handleAnalyze} disabled={loading}>
                  {loading ? 'Analyse en cours…' : '🔍 Analyser ce repas'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="button-secondary"
                >
                  Changer de photo
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ ÉTAPE 2 — SÉLECTION ============ */}
      {step === 'select' && (
        <>
          <p>
            L'IA a identifié ces aliments. <strong>Coche ceux qui sont vraiment dans
            ton assiette</strong>, puis lance le calcul.
          </p>

          {preview && (
            <img src={preview} alt="Aperçu du repas" className="meal-preview small" />
          )}

          <fieldset className="predictions-fieldset">
            <legend>Prédictions de l'IA (Top 5)</legend>
            <ul className="predictions-list">
              {predictions.map((pred) => {
                const isChecked = selectedLabels.has(pred.label);
                const inFoodLog = Boolean(pred.macros);
                return (
                  <li key={pred.label} className="prediction-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleLabel(pred.label)}
                      />
                      <span className="prediction-name">
                        {pred.matched_food || pred.label.replace(/_/g, ' ')}
                      </span>
                      <span className="prediction-score">
                        {Math.round(pred.score * 100)}%
                      </span>
                      {inFoodLog && (
                        <span className="badge badge-success" title="Macros déjà dans la base food_log">
                          ✓ food_log
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <div className="preview-actions">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={loading || selectedLabels.size === 0}
            >
              {loading ? 'Calcul en cours…' : `Calculer mes calories (${selectedLabels.size})`}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="button-secondary"
            >
              Recommencer
            </button>
          </div>
        </>
      )}

      {/* ============ ÉTAPE 3 — RÉSULTATS ============ */}
      {step === 'result' && lookupResult && (
        <>
          <div className="total-card" aria-live="polite">
            <h3>Total estimé pour ce repas</h3>
            <p className="total-calories">
              {lookupResult.total.calories} <span>kcal</span>
            </p>
            <dl className="macros-grid">
              <div>
                <dt>Protéines</dt>
                <dd>{lookupResult.total.protein} g</dd>
              </div>
              <div>
                <dt>Glucides</dt>
                <dd>{lookupResult.total.carbohydrates} g</dd>
              </div>
              <div>
                <dt>Lipides</dt>
                <dd>{lookupResult.total.fat} g</dd>
              </div>
            </dl>
            <p className="muted">
              Calculé sur {lookupResult.total.items_count} aliment
              {lookupResult.total.items_count > 1 ? 's' : ''}.
            </p>
          </div>

          <h4>Détail par aliment</h4>
          <ul className="predictions-list">
            {lookupResult.items.map((item) => (
              <li key={item.label} className="prediction-card">
                <div className="prediction-header">
                  <span className="prediction-label">
                    {item.matched_name || item.pretty_label}
                  </span>
                  {item.source && (
                    <span className={`badge badge-${item.source}`}>
                      {item.source === 'food_log' ? 'food_log' : 'USDA'}
                    </span>
                  )}
                </div>
                {item.macros ? (
                  <dl className="macros-grid">
                    <div>
                      <dt>Calories</dt>
                      <dd>{item.macros.avg_calories} kcal</dd>
                    </div>
                    <div>
                      <dt>Protéines</dt>
                      <dd>{item.macros.avg_protein} g</dd>
                    </div>
                    <div>
                      <dt>Glucides</dt>
                      <dd>{item.macros.avg_carbohydrates} g</dd>
                    </div>
                    <div>
                      <dt>Lipides</dt>
                      <dd>{item.macros.avg_fat} g</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="no-macros">
                    Aucune donnée nutritionnelle trouvée pour cet aliment.
                  </p>
                )}
              </li>
            ))}
          </ul>

          <div className="preview-actions">
            <button
              type="button"
              onClick={handleSaveMeal}
              disabled={saving || Boolean(savedMessage)}
            >
              {saving
                ? 'Enregistrement…'
                : savedMessage
                  ? '✓ Enregistré'
                  : '💾 Enregistrer dans mon historique'}
            </button>
            <button type="button" onClick={handleReset} className="button-secondary">
              📷 Nouvelle analyse
            </button>
          </div>

          {savedMessage && (
            <p className="form-success" role="status">{savedMessage}</p>
          )}


        </>
      )}
    </section>
  );
}

export default MealAnalysis;
