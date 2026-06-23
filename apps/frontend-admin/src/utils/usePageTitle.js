import { useEffect } from 'react';

/**
 * Hook d'accessibilité RGAA (critère 9.1 – Titre de page).
 * Définit dynamiquement `document.title` selon la page courante.
 * Format : "<Section> — MSPR Dashboard".
 */
export function usePageTitle(title) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} — MSPR Dashboard`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export default usePageTitle;
