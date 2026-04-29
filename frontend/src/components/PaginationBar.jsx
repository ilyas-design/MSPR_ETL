/** Barre pagination DRF ({ count, next, previous, results }) */
function PaginationBar({
  page,
  pageSize,
  totalCount,
  onPageChange,
  disabled,
  labelledById,
}) {
  const tc = typeof totalCount === 'number' ? totalCount : 0;
  const pages = tc > 0 ? Math.ceil(tc / pageSize) : 1;
  const current = Math.min(Math.max(1, page), Math.max(pages, 1));
  const fromIdx = tc === 0 ? 0 : (current - 1) * pageSize + 1;
  const toIdx = tc === 0 ? 0 : Math.min(current * pageSize, tc);

  return (
    <div
      className="pagination-bar"
      role="navigation"
      aria-label="Pagination des résultats"
      {...(labelledById ? { 'aria-labelledby': labelledById } : {})}
    >
      <p className="pagination-meta">
        {tc === 0
          ? 'Aucune ligne.'
          : `Affichage ${fromIdx}-${toIdx} sur ${tc.toLocaleString('fr-FR')}`}{' '}
        ·{' '}
        Page {current}/{Math.max(pages, 1)}
      </p>
      <div className="pagination-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={disabled || current <= 1}
          onClick={() => onPageChange(1)}
        >
          Début
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={disabled || current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          Précédent
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={disabled || current >= pages || tc === 0}
          onClick={() => onPageChange(current + 1)}
        >
          Suivant
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={disabled || current >= pages || tc === 0}
          onClick={() => onPageChange(pages)}
        >
          Fin
        </button>
      </div>
    </div>
  );
}

export default PaginationBar;
