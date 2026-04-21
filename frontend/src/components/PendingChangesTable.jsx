import { useState } from 'react';

/**
 * Liste des demandes de modification en attente.
 *
 * - Les utilisateurs standards voient leurs propres demandes (statut courant).
 * - Les superviseurs voient toutes les demandes et disposent des boutons
 *   « Approuver » / « Rejeter » avec un champ de commentaire.
 */
function StatusBadge({ value }) {
  const cls =
    value === 'approved'
      ? 'status-badge status-approved'
      : value === 'rejected'
        ? 'status-badge status-rejected'
        : 'status-badge status-pending';
  const label =
    value === 'approved'
      ? 'Approuvée'
      : value === 'rejected'
        ? 'Rejetée'
        : 'En attente';
  return <span className={cls}>{label}</span>;
}

function ChangesCell({ operation, changes }) {
  if (operation === 'delete') {
    return <em>Suppression demandée</em>;
  }
  const entries = Object.entries(changes || {});
  if (!entries.length) return <span className="muted">—</span>;
  return (
    <ul className="changes-list">
      {entries.map(([k, v]) => (
        <li key={k}>
          <code>{k}</code> → <strong>{String(v)}</strong>
        </li>
      ))}
    </ul>
  );
}

function PendingChangesTable({ rows, isSupervisor, onApprove, onReject, onRefresh }) {
  const [commentById, setCommentById] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const setComment = (id, value) =>
    setCommentById((m) => ({ ...m, [id]: value }));

  const doAction = async (id, action) => {
    setError(null);
    setBusyId(id);
    try {
      const comment = commentById[id] || '';
      if (action === 'approve') await onApprove(id, comment);
      else await onReject(id, comment);
      setComment(id, '');
      if (onRefresh) await onRefresh();
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          "Erreur lors de l'action. Réessayez ou contactez un administrateur."
      );
    } finally {
      setBusyId(null);
    }
  };

  const sorted = [...(rows || [])].sort((a, b) => {
    const order = { pending: 0, approved: 1, rejected: 2 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  return (
    <section className="panel" aria-labelledby="pending-title">
      <div className="panel-head">
        <div>
          <h2 id="pending-title" className="panel-title">
            Demandes d&apos;approbation
          </h2>
          <p className="panel-hint">
            {isSupervisor
              ? 'Validez ou rejetez les modifications soumises par les administrateurs.'
              : 'Vos demandes de modification et leur statut.'}
          </p>
        </div>
        <div className="panel-actions">
          <span className="chip">{sorted.length} demande(s)</span>
        </div>
      </div>

      {error ? <div className="error" role="alert">{error}</div> : null}

      {sorted.length === 0 ? (
        <p className="muted" style={{ padding: '1rem 0' }}>
          Aucune demande à afficher.
        </p>
      ) : (
        <div
          className="table-wrap"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex="0"
          role="region"
          aria-labelledby="pending-title"
        >
          <table className="table">
            <caption className="visually-hidden">
              Liste des demandes de modification soumises par les
              administrateurs : table, enregistrement, opération, changements,
              statut et actions éventuelles.
            </caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Table</th>
                <th scope="col">Enregistrement</th>
                <th scope="col">Opération</th>
                <th scope="col">Changements</th>
                <th scope="col">Demandé par</th>
                <th scope="col">Statut</th>
                <th scope="col">Commentaire</th>
                {isSupervisor ? (
                  <th scope="col" className="table-actions-col">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const pending = r.status === 'pending';
                return (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>{r.table_name}</td>
                    <td>{r.record_id}</td>
                    <td>{r.operation}</td>
                    <td>
                      <ChangesCell operation={r.operation} changes={r.changes} />
                    </td>
                    <td>{r.requested_by_username || '—'}</td>
                    <td>
                      <StatusBadge value={r.status} />
                    </td>
                    <td>
                      {isSupervisor && pending ? (
                        <label
                          className="visually-hidden"
                          htmlFor={`comment-${r.id}`}
                        >
                          Commentaire pour la demande {r.id}
                        </label>
                      ) : null}
                      {isSupervisor && pending ? (
                        <input
                          id={`comment-${r.id}`}
                          className="input input-sm"
                          value={commentById[r.id] || ''}
                          onChange={(e) => setComment(r.id, e.target.value)}
                          placeholder="(optionnel)"
                        />
                      ) : (
                        <span className="cell">
                          {r.review_comment || (pending ? '—' : '')}
                        </span>
                      )}
                    </td>
                    {isSupervisor ? (
                      <td className="table-actions">
                        {pending ? (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => doAction(r.id, 'approve')}
                            >
                              {busyId === r.id ? '…' : 'Approuver'}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => doAction(r.id, 'reject')}
                            >
                              Rejeter
                            </button>
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default PendingChangesTable;
