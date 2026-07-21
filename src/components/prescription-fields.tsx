"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { RX_FREQUENCIES, RX_INSTRUCTIONS } from "@/lib/constants";
import type { PrescriptionItem } from "@/lib/validators/prescription";

// Shared building blocks for the structured prescription UI — used by both
// CreatePrescriptionModal and the Walk-in page so the medicine typeahead and
// row layout stay identical.

export const inputClass =
  "w-full rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100";

const miniInput =
  "w-full rounded-lg border border-slate-200/70 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-100";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export type MedRow = {
  key: string;
  name: string;
  composition?: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
  instructions: string;
};

let rowSeq = 0;
const nextKey = () => `m${rowSeq++}`;

export const emptyRow = (): MedRow => ({
  key: nextKey(),
  name: "",
  dosage: "",
  frequency: "",
  timing: "",
  duration: "",
  instructions: "",
});

// Seed builder rows from structured items (Repeat Rx / editing an existing
// visit). Always returns at least one (empty) row.
export const medRowsFrom = (meds?: PrescriptionItem[]): MedRow[] => {
  if (!meds || meds.length === 0) return [emptyRow()];
  return meds.map(m => ({
    key: nextKey(),
    name: m.name ?? "",
    dosage: m.dosage ?? "",
    frequency: m.frequency ?? "",
    timing: m.timing ?? "",
    duration: m.duration ?? "",
    instructions: m.instructions ?? "",
  }));
};

// Collapse builder rows to the API payload — drops blank-name rows and empty
// optional fields.
export const medRowsToItems = (rows: MedRow[]): PrescriptionItem[] =>
  rows
    .filter(r => r.name.trim())
    .map(r => ({
      name: r.name.trim(),
      dosage: r.dosage.trim() || undefined,
      frequency: r.frequency.trim() || undefined,
      timing: r.timing.trim() || undefined,
      duration: r.duration.trim() || undefined,
      instructions: r.instructions.trim() || undefined,
    }));

// A repeatable medicine list with add/remove controls.
export function MedicineBuilder({
  rows,
  onChange,
}: {
  rows: MedRow[];
  onChange: (rows: MedRow[]) => void;
}) {
  const patchRow = (key: string, patch: Partial<MedRow>) =>
    onChange(rows.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => onChange([...rows, emptyRow()]);
  const removeRow = (key: string) =>
    onChange(rows.length === 1 ? rows : rows.filter(r => r.key !== key));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Prescribed medicines
        </span>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Plus size={12} /> Add medicine
        </button>
      </div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <MedicineRow
            key={row.key}
            row={row}
            index={i}
            canRemove={rows.length > 1}
            onChange={patch => patchRow(row.key, patch)}
            onRemove={() => removeRow(row.key)}
          />
        ))}
      </div>
    </div>
  );
}

function MedicineRow({
  row,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  row: MedRow;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<MedRow>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
      <div className="flex items-start gap-2">
        <span className="mt-2 text-xs font-semibold text-slate-400">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <MedicineSearchInput
            value={row.name}
            composition={row.composition}
            onNameChange={name => onChange({ name, composition: undefined })}
            onPick={hit =>
              onChange({ name: hit.name, composition: hit.composition })
            }
          />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <input
              value={row.dosage}
              onChange={e => onChange({ dosage: e.target.value })}
              placeholder="1 tab"
              className={miniInput}
              aria-label="Dosage"
            />
            <select
              value={row.frequency}
              onChange={e => onChange({ frequency: e.target.value })}
              className={miniInput}
              aria-label="Frequency"
            >
              <option value="">Frequency</option>
              {RX_FREQUENCIES.map(f => (
                <option key={f.code} value={f.code}>
                  {f.label}
                </option>
              ))}
            </select>
            <input
              value={row.timing}
              onChange={e => onChange({ timing: e.target.value })}
              placeholder="Morning, Night"
              className={miniInput}
              aria-label="Timing"
            />
            <input
              value={row.duration}
              onChange={e => onChange({ duration: e.target.value })}
              placeholder="5 Days"
              className={miniInput}
              aria-label="Duration"
            />
            <input
              value={row.instructions}
              onChange={e => onChange({ instructions: e.target.value })}
              placeholder="After Food"
              list="rx-instructions"
              className={miniInput}
              aria-label="Instructions"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="mt-1 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Remove medicine"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <datalist id="rx-instructions">
        {RX_INSTRUCTIONS.map(t => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
}

type MedicineHit = {
  id: string;
  name: string;
  composition: string;
  manufacturer: string;
  pack: string;
};

function MedicineSearchInput({
  value,
  composition,
  onNameChange,
  onPick,
}: {
  value: string;
  composition?: string;
  onNameChange: (v: string) => void;
  onPick: (hit: MedicineHit) => void;
}) {
  const [hits, setHits] = useState<MedicineHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  // Skip the fetch that would fire immediately after the user picks an item.
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const q = value.trim();
    // All setState happens inside the (async) timeout so the effect body
    // itself never sets state synchronously.
    const t = setTimeout(() => {
      if (q.length < 2) {
        setHits([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      fetch(`/api/medicines/search?q=${encodeURIComponent(q)}`, {
        headers: authHeaders(),
      })
        .then(r => r.json())
        .then((d: { medicines?: MedicineHit[] }) => {
          setHits(d.medicines ?? []);
          setOpen(true);
        })
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (hit: MedicineHit) => {
    skipNext.current = true;
    onPick(hit);
    setOpen(false);
    setHits([]);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={value}
          onChange={e => onNameChange(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder="Search medicine name…"
          className={`${inputClass} pl-9`}
          aria-label="Medicine name"
          autoComplete="off"
        />
      </div>
      {composition && (
        <p className="mt-1 pl-1 text-[11px] text-slate-500">{composition}</p>
      )}
      {open && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {loading && hits.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-400">Searching…</li>
          )}
          {!loading && hits.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-400">No matches.</li>
          )}
          {hits.map(hit => (
            <li key={hit.id}>
              <button
                type="button"
                onClick={() => pick(hit)}
                className="block w-full px-3 py-2 text-left transition-colors hover:bg-slate-50"
              >
                <span className="block text-sm font-medium text-slate-900">
                  {hit.name}
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {[hit.composition, hit.pack].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
