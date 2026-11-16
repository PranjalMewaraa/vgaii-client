import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";

// Server-only search over the bundled Indian medicines dataset
// (public/A_Z_medicines_dataset_of_India.csv, ~254k rows / 32 MB). Powers the
// medicine-name typeahead in the Create Prescription modal.
//
// The whole dataset is parsed ONCE into a compact in-memory index on first
// query and cached for the process lifetime (the app runs `next start`, so
// module state persists across requests). Trade-off: ~1–2s first-hit parse and
// ~100 MB resident, in exchange for instant per-keystroke search afterwards.

export type MedicineHit = {
  id: string;
  name: string;
  composition: string;
  manufacturer: string;
  pack: string;
  type: string;
  price: string;
};

type Row = MedicineHit & { search: string; discontinued: boolean };

const CSV_PATH = path.join(
  process.cwd(),
  "public",
  "A_Z_medicines_dataset_of_India.csv",
);

// Columns:
// id,name,price(₹),Is_discontinued,manufacturer_name,type,pack_size_label,
// short_composition1,short_composition2
const COL = {
  id: 0,
  name: 1,
  price: 2,
  discontinued: 3,
  manufacturer: 4,
  type: 5,
  pack: 6,
  comp1: 7,
  comp2: 8,
} as const;

let cache: Row[] | null = null;
let loading: Promise<Row[]> | null = null;

// Minimal quote-aware CSV field splitter. Handles the standard rules
// (double-quoted fields, escaped "" quotes, commas inside quotes). The dataset
// is mostly unquoted, but names/manufacturers occasionally contain commas.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  out.push(field);
  return out;
}

async function parseCsv(): Promise<Row[]> {
  const rows: Row[] = [];
  const stream = createReadStream(CSV_PATH, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    const name = (cols[COL.name] ?? "").trim();
    if (!name) continue;
    const comp1 = (cols[COL.comp1] ?? "").trim();
    const comp2 = (cols[COL.comp2] ?? "").trim();
    const composition = [comp1, comp2].filter(Boolean).join(" + ");
    rows.push({
      id: (cols[COL.id] ?? "").trim(),
      name,
      composition,
      manufacturer: (cols[COL.manufacturer] ?? "").trim(),
      pack: (cols[COL.pack] ?? "").trim(),
      type: (cols[COL.type] ?? "").trim(),
      price: (cols[COL.price] ?? "").trim(),
      search: name.toLowerCase(),
      discontinued: (cols[COL.discontinued] ?? "").trim().toUpperCase() === "TRUE",
    });
  }
  return rows;
}

async function getIndex(): Promise<Row[]> {
  if (cache) return cache;
  if (!loading) {
    loading = parseCsv().then(rows => {
      cache = rows;
      return rows;
    });
  }
  return loading;
}

// Case-insensitive name search. Prefix matches rank ahead of substring
// matches; discontinued products are dropped. Returns at most `limit` hits.
export async function searchMedicines(
  query: string,
  limit = 20,
): Promise<MedicineHit[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const index = await getIndex();

  const prefix: Row[] = [];
  const contains: Row[] = [];
  for (const row of index) {
    if (row.discontinued) continue;
    const pos = row.search.indexOf(q);
    if (pos === 0) prefix.push(row);
    else if (pos > 0 && contains.length < limit) contains.push(row);
    // Enough prefix hits to fill the result on their own — stop scanning.
    if (prefix.length >= limit) break;
  }

  const ranked = [...prefix, ...contains].slice(0, limit);
  return ranked.map(({ id, name, composition, manufacturer, pack, type, price }) => ({
    id,
    name,
    composition,
    manufacturer,
    pack,
    type,
    price,
  }));
}
