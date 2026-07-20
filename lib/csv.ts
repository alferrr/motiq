// Minimal CSV serializer for the company data export — quotes any field
// containing a comma, quote, or newline, doubling internal quotes per the
// standard CSV escaping rule. Column order is the insertion order of the
// first row's keys.
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((col) => escapeCsvField(row[col])).join(","));
  }
  return lines.join("\r\n");
}
