/**
 * Helpers purs (sans JSX) pour l'accessibilité des graphiques.
 * Les composants React associés vivent dans `chartA11y.jsx`.
 */

/**
 * Construit un résumé textuel court pour une <figcaption> de graphique.
 * Ex. "Engagement des patients. Patients actifs : 812 ; Total : 1000."
 */
export function buildChartSummary(title, labels, values) {
  const parts = labels.map((label, idx) => {
    const v = values[idx];
    const formatted =
      typeof v === 'number'
        ? v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
        : String(v ?? '—');
    return `${label} : ${formatted}`;
  });
  return `${title}. ${parts.join(' ; ')}.`;
}
