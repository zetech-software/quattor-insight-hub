/** Quotes CSV fields and keeps user text from being interpreted as formulas. */
export function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '""';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid CSV number');
    return String(value);
  }
  let first = 0;
  while (first < value.length && (value.charCodeAt(first) <= 32 || /\s/.test(value[first]))) first++;
  const text = /^[=+@-]/.test(value.slice(first)) ? "'" + value : value;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function serializeCsv(rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>): string {
  return rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}
