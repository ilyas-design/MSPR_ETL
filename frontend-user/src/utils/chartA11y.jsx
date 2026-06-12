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

export function AccessibleChart({ title, summary, dataTable, children }) {
  return (
    <figure className="chart-figure" role="group" aria-label={title}>
      <div aria-hidden="true">{children}</div>
      <figcaption className="visually-hidden">{summary}</figcaption>
      {dataTable}
    </figure>
  );
}
