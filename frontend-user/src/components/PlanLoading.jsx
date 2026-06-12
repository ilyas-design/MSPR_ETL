import { useEffect, useState } from 'react';

/**
 * Écran d'attente pendant la génération IA (modèle gratuit ~30-45s).
 * Objectif : rendre l'attente supportable sans accélérer le backend —
 * progression honnête (plafonnée à 95 %), messages d'étape qui défilent,
 * squelette du résultat à venir.
 */
const VARIANTS = {
  workout: {
    icon: '🏋️',
    title: 'Construction de ton programme',
    steps: [
      'Analyse de ton objectif et de ton niveau…',
      'Sélection des exercices adaptés à ton matériel…',
      'Calcul des séries, répétitions et temps de repos…',
      'Répartition des séances sur la semaine…',
      'Derniers réglages et conseils de progression…',
    ],
  },
  meal: {
    icon: '🥗',
    title: 'Préparation de ton plan repas',
    steps: [
      'Analyse de ton objectif calorique…',
      'Sélection de plats équilibrés et savoureux…',
      'Calcul des grammages et des macros…',
      'Vérification des allergies et restrictions…',
      'Mise en forme du plan de la journée…',
    ],
  },
};

function PlanLoading({ variant = 'workout' }) {
  const cfg = VARIANTS[variant] ?? VARIANTS.workout;
  const [progress, setProgress] = useState(6);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Progression qui ralentit en approchant de 95 % (jamais 100 % avant la fin).
    const tick = setInterval(() => {
      setProgress((p) => (p >= 95 ? 95 : p + Math.max(0.4, (95 - p) * 0.04)));
    }, 250);
    // Rotation des messages d'étape toutes les ~5 s.
    const rotate = setInterval(() => {
      setStepIndex((i) => (i + 1) % cfg.steps.length);
    }, 5000);
    return () => {
      clearInterval(tick);
      clearInterval(rotate);
    };
  }, [cfg.steps.length]);

  return (
    <section className="plan-loading" aria-live="polite" aria-busy="true">
      <div className="plan-loading-head">
        <span className="plan-loading-icon" aria-hidden="true">{cfg.icon}</span>
        <div>
          <h3>{cfg.title}</h3>
          <p className="plan-loading-step">{cfg.steps[stepIndex]}</p>
        </div>
      </div>

      <div
        className="plan-loading-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label="Génération en cours"
      >
        <span className="plan-loading-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="plan-loading-hint muted">
        L'IA gratuite réfléchit — comptez environ <strong>30 à 45 secondes</strong>. Merci de patienter.
      </p>

      <div className="plan-loading-skeleton" aria-hidden="true">
        <div className="skeleton-card">
          <span className="skeleton-line skeleton-line--title" />
          <span className="skeleton-line" />
          <span className="skeleton-line skeleton-line--short" />
        </div>
        <div className="skeleton-card">
          <span className="skeleton-line skeleton-line--title" />
          <span className="skeleton-line" />
          <span className="skeleton-line skeleton-line--short" />
        </div>
      </div>
    </section>
  );
}

export default PlanLoading;
