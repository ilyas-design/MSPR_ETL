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
