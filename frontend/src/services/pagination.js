/**
 * Récupère toutes les pages d'une liste DRF jusqu'à exhaustion.
 * Utilise ``page_size`` = max backend (ConfigurablePageNumberPagination.max_page_size).
 */
export async function fetchAllPaged(getPageFn) {
  const all = [];
  let page = 1;
  const pageSize = 200;
  /* eslint-disable no-await-in-loop */
  for (;;) {
    const resp = await getPageFn({ page, page_size: pageSize });
    const data = resp?.data ?? resp;
    const chunk = Array.isArray(data.results)
      ? data.results
      : Array.isArray(data)
        ? data
        : [];
    all.push(...chunk);
    const total = typeof data.count === 'number' ? data.count : null;

    if (chunk.length === 0) break;
    if (total != null && all.length >= total) break;
    if (chunk.length < pageSize) break;
    page += 1;
  }
  /* eslint-enable no-await-in-loop */
  return all;
}
