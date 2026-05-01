/**
 * Tiny CSV utilities — handles quoted fields with embedded commas and double
 * quotes (escaped as ""). No external deps.
 */

const escapeField = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const serializeCsv = (
  headers: string[],
  rows: Record<string, unknown>[],
): string => {
  const lines = [headers.map(escapeField).join(",")];
  for (const row of rows) {
    lines.push(headers.map(h => escapeField(row[h])).join(","));
  }
  return lines.join("\r\n");
};

/**
 * State-machine parser. Returns array of row objects keyed by the header row.
 * Throws on malformed input (unterminated quote).
 */
export const parseCsv = (
  text: string,
): { headers: string[]; rows: Record<string, string>[] } => {
  const cells: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      // ignore — \n handles end-of-line
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      cells.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }

  if (inQuotes) {
    throw new Error("Malformed CSV: unterminated quoted field");
  }

  // flush trailing field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    cells.push(row);
  }

  // skip empty trailing rows
  const filtered = cells.filter(r => r.some(c => c !== ""));
  if (filtered.length === 0) return { headers: [], rows: [] };

  const headers = filtered[0].map(h => h.trim());
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < filtered.length; r++) {
    const obj: Record<string, string> = {};
    for (let h = 0; h < headers.length; h++) {
      obj[headers[h]] = (filtered[r][h] ?? "").trim();
    }
    rows.push(obj);
  }

  return { headers, rows };
};
