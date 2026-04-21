import { useMemo, useState } from 'react';

function tryParseNumber(v) {
  if (v === '' || v === null || v === undefined) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

function AdminTable({
  title,
  rows,
  rowIdKey = 'id',
  editableKeys = [],
  onSaveRow,
  hint,
}) {
  const [editRowId, setEditRowId] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const columns = useMemo(() => {
    if (!rows?.length) return [];
    const keys = Object.keys(rows[0]);
    return keys;
  }, [rows]);

  const startEdit = (row) => {
    const rowId = row?.[rowIdKey];
    setSaveError(null);
    setEditRowId(rowId);
    setDraft({ ...row });
  };

  const cancelEdit = () => {
    setSaveError(null);
    setEditRowId(null);
    setDraft({});
  };

  const saveEdit = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const payload = {};
      for (const k of editableKeys) {
        if (draft[k] !== undefined) payload[k] = tryParseNumber(draft[k]);
      }
      await onSaveRow(editRowId, payload);
      cancelEdit();
    } catch {
      setSaveError("Impossible d'enregistrer. Vérifiez les valeurs et l'authentification.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel" aria-labelledby={`panel-title-${title}`}>
      <div className="panel-head">
        <div>
          <h2 id={`panel-title-${title}`} className="panel-title">{title}</h2>
          {hint ? <p className="panel-hint">{hint}</p> : null}
        </div>
        <div className="panel-actions">
          <span className="chip">{rows?.length || 0} lignes</span>
        </div>
      </div>

      {saveError ? <div className="error" role="alert">{saveError}</div> : null}

      {/* tabindex=0 sur un conteneur scrollable est recommandé par WCAG
          (technique SCR34) pour permettre la navigation clavier dans les
          tableaux larges. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="table-wrap" tabIndex="0" role="region" aria-labelledby={`panel-title-${title}`}>
        <table className="table">
          <caption className="visually-hidden">
            {title} — {rows?.length || 0} lignes. Utilisez le bouton Modifier sur chaque ligne pour éditer les valeurs.
          </caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col">{c}</th>
              ))}
              <th scope="col" className="table-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row) => {
              const rowId = row?.[rowIdKey];
              const isEditing = editRowId === rowId;
              return (
                <tr key={String(rowId)}>
                  {columns.map((c) => {
                    const canEdit = editableKeys.includes(c);
                    const v = isEditing ? draft?.[c] : row?.[c];
                    return (
                      <td key={c}>
                        {isEditing && canEdit ? (
                          <input
                            className="input input-sm"
                            value={v ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, [c]: e.target.value }))}
                            aria-label={`${c} (édition)`}
                          />
                        ) : (
                          <span className="cell">{v === null || v === undefined ? '' : String(v)}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="table-actions">
                    {isEditing ? (
                      <>
                        <button className="btn btn-primary btn-sm" type="button" onClick={saveEdit} disabled={saving}>
                          {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                        <button className="btn btn-secondary btn-sm" type="button" onClick={cancelEdit} disabled={saving}>
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => startEdit(row)}>
                        Modifier
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hint ? <div className="panel-foot">{hint}</div> : null}
    </section>
  );
}

export default AdminTable;

