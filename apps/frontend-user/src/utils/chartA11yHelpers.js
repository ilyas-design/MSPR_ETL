/**
 * Helpers purs (sans JSX) pour l'accessibilité des graphiques.
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

export function commaListToArray(text) {
  if (Array.isArray(text)) return text;
  if (!text) return [];
  return String(text)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function arrayToCommaList(items) {
  if (!items) return '';
  if (Array.isArray(items)) return items.join(', ');
  return String(items);
}
