/**
 * Composants React d'accessibilité RGAA pour les graphiques Chart.js.
 *
 * Conformité : critère 1.3 (alternative textuelle pour les images
 * d'information) et 4.1 (contenu complexe).
 *
 * Stratégie : chaque graphique est enveloppé dans une <figure> qui contient
 *   - le <canvas> Chart.js lui-même (marqué aria-hidden, c'est une image
 *     d'information non exploitable par les technologies d'assistance)
 *   - une <figcaption> avec un résumé textuel
 *   - un <table> équivalent (caché visuellement mais lisible par lecteur
 *     d'écran) listant les données exactes.
 *
 * Les helpers purs (`buildChartSummary`) sont dans `chartA11yHelpers.js`.
 */

/**
 * Tableau HTML équivalent au graphique, visuellement masqué mais accessible
 * aux lecteurs d'écran. Indispensable pour RGAA AA sur les data visuelles.
 */
export function ChartDataTable({ caption, headers, rows }) {
  return (
    <table className="visually-hidden">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Wrapper accessible autour d'un graphique Chart.js (Bar, Pie, Line, etc.).
 *
 * Usage :
 *   <AccessibleChart title="Engagement" summary="..." dataTable={...}>
 *     <Bar data={...} options={...} />
 *   </AccessibleChart>
 */
export function AccessibleChart({ title, summary, dataTable, children }) {
  return (
    <figure className="chart-figure" role="group" aria-label={title}>
      <div aria-hidden="true">{children}</div>
      <figcaption className="visually-hidden">{summary}</figcaption>
      {dataTable}
    </figure>
  );
}
