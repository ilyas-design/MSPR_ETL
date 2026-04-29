import { useState } from 'react';
import { downloadTextFile, toCsv } from '../utils/export';

function ExportButtons({ filenamePrefix, rows, fetchAllRows }) {
  const safe = Array.isArray(rows) ? rows : [];
  const [busy, setBusy] = useState(false);

  const exportJson = async (data) => {
    downloadTextFile(
      `${filenamePrefix}.json`,
      JSON.stringify(data, null, 2),
      'application/json;charset=utf-8'
    );
  };

  const exportCsv = async (data) => {
    downloadTextFile(
      `${filenamePrefix}.csv`,
      toCsv(data),
      'text/csv;charset=utf-8'
    );
  };

  const onExportJson = async () => {
    if (fetchAllRows) {
      setBusy(true);
      try {
        await exportJson(await fetchAllRows());
      } finally {
        setBusy(false);
      }
    } else if (safe.length > 0) {
      await exportJson(safe);
    }
  };

  const onExportCsv = async () => {
    if (fetchAllRows) {
      setBusy(true);
      try {
        await exportCsv(await fetchAllRows());
      } finally {
        setBusy(false);
      }
    } else if (safe.length > 0) {
      await exportCsv(safe);
    }
  };

  const canExportPreview = fetchAllRows || safe.length > 0;

  return (
    <div role="group" aria-label={`Export ${filenamePrefix}`}>
      {fetchAllRows ? (
        <p className="export-hint">
          Charge toutes les pages depuis l&apos;API (peut prendre plusieurs secondes).
        </p>
      ) : null}
      <div className="export-actions">
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={onExportCsv}
          disabled={!canExportPreview || busy}
        >
          {busy ? 'Chargement…' : 'Export CSV'}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={onExportJson}
          disabled={!canExportPreview || busy}
        >
          {busy ? 'Chargement…' : 'Export JSON'}
        </button>
      </div>
    </div>
  );
}

export default ExportButtons;
