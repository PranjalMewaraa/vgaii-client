"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";

type PatientRow = {
  kind: "lead" | "direct";
  id: string;
  name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  status?: string;
  outcomeRating?: number;
  lastAppointmentDate?: string | null;
  appointmentsCount: number;
  hasFeedback: boolean;
  source?: string;
};

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// New patients (no appointments yet) are active by default. Only when the
// last appointment is older than a year do we mark them inactive.
const isInactive = (lastDate?: string | null) => {
  if (!lastDate) return false;
  const ts = new Date(lastDate).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts > ONE_YEAR_MS;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function PatientsPage() {
  return (
    <RoleGuard module="patients">
      <PatientsPageInner />
    </RoleGuard>
  );
}

function PatientsPageInner() {
  const router = useRouter();
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [sourceFilter, setSourceFilter] = useState("");

  // create form
  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cAge, setCAge] = useState("");
  const [cGender, setCGender] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cArea, setCArea] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // import
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const load = () => {
    const url = new URL("/api/patients", window.location.origin);
    if (search) url.searchParams.set("search", search);
    fetch(url.toString(), { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setRows(data.patients ?? []))
      .finally(() => setLoading(false));
  };

  // Single effect handles both initial fetch and debounced search refetches.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.source && set.add(r.source));
    return Array.from(set).sort();
  }, [rows]);

  const visible = useMemo(() => {
    return rows.filter(r => {
      if (sourceFilter && r.source !== sourceFilter) return false;
      if (activeFilter === "active" && isInactive(r.lastAppointmentDate)) return false;
      if (activeFilter === "inactive" && !isInactive(r.lastAppointmentDate))
        return false;
      return true;
    });
  }, [rows, sourceFilter, activeFilter]);

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: cName,
          phone: cPhone,
          age: Number(cAge),
          gender: cGender,
          email: cEmail || undefined,
          area: cArea || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(
          typeof data.error === "string" ? data.error : "Failed to add patient",
        );
        return;
      }
      setShowCreate(false);
      setCName("");
      setCPhone("");
      setCAge("");
      setCGender("");
      setCEmail("");
      setCArea("");
      load();
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const exportCsv = async () => {
    const res = await fetch("/api/patients/export", { headers: authHeaders() });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patients-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    setImportMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/patients/import", {
        method: "POST",
        headers: { Authorization: authHeaders().Authorization },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setImportMsg(typeof data.error === "string" ? data.error : "Import failed");
      } else {
        setImportMsg(
          `Imported ${data.created} new, updated ${data.updated}, skipped ${data.skipped} of ${data.total} rows.`,
        );
        load();
      }
    } catch {
      setImportMsg("Network error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-500">
            Qualified leads and walk-ins. Inactive = no completed visit in the
            last 12 months.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) importCsv(file);
                e.target.value = "";
              }}
              disabled={importing}
            />
            {importing ? "Importing…" : "Import CSV"}
          </label>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(o => !o)}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {showCreate ? "Cancel" : "+ New patient"}
          </button>
        </div>
      </header>

      {importMsg && (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {importMsg}
        </p>
      )}

      {showCreate && (
        <form
          onSubmit={submitCreate}
          className="rounded-xl border border-slate-200 bg-white"
        >
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              New patient
            </h2>
            <p className="text-xs text-slate-500">
              Name, phone, age, and gender are required. Patient is created at
              status <code className="rounded bg-slate-100 px-1">qualified</code>.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-3">
            <Field label="Name" value={cName} onChange={setCName} required minLength={2} />
            <Field label="Phone" value={cPhone} onChange={setCPhone} required minLength={10} placeholder="+91…" />
            <Field label="Age" type="number" value={cAge} onChange={setCAge} required />
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Gender
              </span>
              <select
                value={cGender}
                onChange={e => setCGender(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Select…</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>
            <Field label="Email (optional)" type="email" value={cEmail} onChange={setCEmail} />
            <Field label="Area (optional)" value={cArea} onChange={setCArea} />
          </div>
          {createError && (
            <p className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
              {createError}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {creating ? "Saving…" : "Add patient"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block flex-1 min-w-[220px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Search
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name or phone…"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Status
            </p>
            <div className="mt-1 inline-flex rounded-lg border border-slate-200 p-0.5 text-xs">
              {(["all", "active", "inactive"] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  className={`rounded-md px-3 py-1 font-medium uppercase tracking-wider transition ${
                    activeFilter === f
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Source
            </span>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All sources</option>
              {sources.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {(search || sourceFilter || activeFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSourceFilter("");
                setActiveFilter("all");
              }}
              className="text-xs text-indigo-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            All Patients
          </h2>
          <span className="text-xs text-slate-500">
            {visible.length} of {rows.length}
          </span>
        </div>

        {loading ? (
          <p className="px-6 py-6 text-sm text-slate-500">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">
            No patients match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Phone</th>
                  <th className="px-6 py-3 text-left">Age / Gender</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Activity</th>
                  <th className="px-6 py-3 text-right">Last appt</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(p => {
                  const inactive = isInactive(p.lastAppointmentDate);
                  return (
                    <tr
                      key={`${p.kind}-${p.id}`}
                      onClick={() => router.push(`/patients/${p.id}`)}
                      className="cursor-pointer border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {p.name}
                      </td>
                      <td className="px-6 py-4 text-slate-700">{p.phone}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {[
                          typeof p.age === "number" ? `${p.age}y` : null,
                          p.gender,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill
                          status={p.kind === "direct" ? "direct" : p.status}
                        />
                      </td>
                      <td className="px-6 py-4">
                        {inactive ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                            inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-700">
                            active
                          </span>
                        )}
                        {p.hasFeedback && (
                          <span className="ml-1 inline-flex items-center text-[11px] text-emerald-600">
                            ✓ feedback
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-slate-500">
                        {p.lastAppointmentDate
                          ? new Date(p.lastAppointmentDate).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}
