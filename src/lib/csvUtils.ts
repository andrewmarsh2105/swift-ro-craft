/** Wrap a value in double-quotes, escaping inner quotes and normalising whitespace. */
export function csvCell(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ')}"`;
}

/** Map labor-type string to compact code. */
export function typeCode(lt: string): string {
  return lt === 'warranty' ? 'W' : lt === 'internal' ? 'I' : 'CP';
}

/** Join header + rows with CRLF and prepend UTF-8 BOM, then trigger download. */
export function downloadCSVFile(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build a CSV string from header array + row arrays. Uses CRLF. */
export function buildCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(csvCell).join(',');
  const dataLines = rows.map(r => r.join(','));
  return [headerLine, ...dataLines].join('\r\n');
}
