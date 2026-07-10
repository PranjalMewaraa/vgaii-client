"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  CalendarCheck,
  CheckCircle2,
  Eye,
  Filter,
  Pencil,
  Stethoscope,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";
import AddPatientModal from "@/components/AddPatientModal";
import StatCard from "@/components/StatCard";
import Avatar from "@/components/Avatar";

type PatientRow = {
  kind: "lead" | "direct";
  id: string;
  name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  area?: string;
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

  // filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [area, setArea] = useState("");
  const [debouncedArea, setDebouncedArea] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [sourceFilter, setSourceFilter] = useState("");
  const [genderFilter, setGenderFilter] =
    useState<"" | "female" | "male" | "other">("");
  const [feedbackFilter, setFeedbackFilter] =
    useState<"any" | "yes" | "no">("any");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedArea(area);
    }, 250);
    return () => clearTimeout(t);
  }, [search, area]);

  const swrKey = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (debouncedArea) params.set("area", debouncedArea);
    const qs = params.toString();
    return qs ? `/api/patients?${qs}` : "/api/patients";
  }, [debouncedSearch, debouncedArea]);
  const { data, isLoading, mutate } = useSWR<{ patients: PatientRow[] }>(
    swrKey,
    { keepPreviousData: true },
  );
  const rows = useMemo(() => data?.patients ?? [], [data]);
  const load = () => mutate();

  // bulk selection (only "lead" rows are selectable — orphan direct
  // appointments don't have a Lead record so they can't be re-tagged or
  // marked lost via the bulk endpoint).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [showSetSource, setShowSetSource] = useState(false);
  const [newSourceValue, setNewSourceValue] = useState("");

  // create form (modal)
  const searchParams = useSearchParams();
  const [showCreate, setShowCreate] = useState(
    () => searchParams.get("add") === "1",
  );

  // import
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const sources = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.source && set.add(r.source));
    return Array.from(set).sort();
  }, [rows]);

  // Top-of-page metric tiles. Computed over the full result set (not the
  // currently-filtered view) so the numbers stay stable while the user
  // tweaks filters below.
  const stats = useMemo(() => {
    let active = 0;
    let visited = 0;
    let booked = 0;
    let qualified = 0;
    for (const r of rows) {
      if (!isInactive(r.lastAppointmentDate)) active++;
      if (r.status === "visited") visited++;
      else if (r.status === "appointment_booked") booked++;
      else if (r.status === "qualified") qualified++;
    }
    return { total: rows.length, active, visited, booked, qualified };
  }, [rows]);

  // Client-side pagination. The API already caps at 100 rows, so paging
  // here is purely a presentation concern.
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset to page 1 whenever the filter inputs change — otherwise the user
  // can land on an empty page after narrowing the result set. Using React's
  // "store previous value and compare during render" pattern instead of an
  // effect, which lint flags as a cascading-render anti-pattern.
  const filterSig = `${debouncedSearch}|${debouncedArea}|${sourceFilter}|${activeFilter}|${genderFilter}|${feedbackFilter}|${rowsPerPage}`;
  const [prevFilterSig, setPrevFilterSig] = useState(filterSig);
  if (prevFilterSig !== filterSig) {
    setPrevFilterSig(filterSig);
    setPage(1);
  }

  const visible = useMemo(() => {
    return rows.filter(r => {
      if (sourceFilter && r.source !== sourceFilter) return false;
      if (activeFilter === "active" && isInactive(r.lastAppointmentDate)) return false;
      if (activeFilter === "inactive" && !isInactive(r.lastAppointmentDate))
        return false;
      if (genderFilter && (r.gender ?? "").toLowerCase() !== genderFilter)
        return false;
      if (feedbackFilter === "yes" && !r.hasFeedback) return false;
      if (feedbackFilter === "no" && r.hasFeedback) return false;
      return true;
    });
  }, [rows, sourceFilter, activeFilter, genderFilter, feedbackFilter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedVisible = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return visible.slice(start, start + rowsPerPage);
  }, [visible, safePage, rowsPerPage]);
  const firstShown = visible.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const lastShown = Math.min(safePage * rowsPerPage, visible.length);

  const activeFilterCount =
    (activeFilter !== "all" ? 1 : 0) +
    (sourceFilter ? 1 : 0) +
    (genderFilter ? 1 : 0) +
    (feedbackFilter !== "any" ? 1 : 0);

  const clearAllFilters = () => {
    setSearch("");
    setArea("");
    setSourceFilter("");
    setActiveFilter("all");
    setGenderFilter("");
    setFeedbackFilter("any");
  };

  // Only `lead`-kind rows are selectable for bulk operations. Orphan direct
  // appointments aren't Leads — they need to be linked to a patient first.
  const selectableVisibleIds = useMemo(
    () => visible.filter(r => r.kind === "lead").map(r => r.id),
    [visible],
  );

  // Effective selection = stored IDs intersected with currently-visible
  // selectable rows. We don't prune `selectedIds` itself in an effect —
  // computing the intersection on read avoids synchronous setState inside
  // effects (a React 19 anti-pattern).
  const effectiveSelected = useMemo(() => {
    const visibleSet = new Set(selectableVisibleIds);
    const next = new Set<string>();
    for (const id of selectedIds) if (visibleSet.has(id)) next.add(id);
    return next;
  }, [selectedIds, selectableVisibleIds]);

  const allSelected =
    selectableVisibleIds.length > 0 &&
    selectableVisibleIds.every(id => effectiveSelected.has(id));
  const someSelected = effectiveSelected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableVisibleIds));
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulk = async (action: "set_source", value?: string) => {
    const ids = Array.from(effectiveSelected);
    if (ids.length === 0) return;
    setBulkBusy(true);
    setBulkMsg(null);
    try {
      const res = await fetch("/api/patients/bulk", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ids, action, value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkMsg(
          typeof data.error === "string" ? data.error : "Bulk action failed",
        );
      } else {
        setBulkMsg(`Re-tagged: ${data.modified} of ${data.requested}`);
        setSelectedIds(new Set());
        setShowSetSource(false);
        setNewSourceValue("");
        load();
      }
    } catch {
      setBulkMsg("Network error");
    } finally {
      setBulkBusy(false);
    }
  };

  const exportSelected = async () => {
    const ids = Array.from(effectiveSelected);
    if (ids.length === 0) return;
    const url = new URL("/api/patients/export", window.location.origin);
    url.searchParams.set("ids", ids.join(","));
    const res = await fetch(url.toString(), { headers: authHeaders() });
    if (!res.ok) return;
    const blob = await res.blob();
    const dl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dl;
    a.download = `patients-selected-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(dl);
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
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Patients</h1>
          <p className="mt-1 text-sm text-slate-500">
            Qualified leads and walk-ins. Inactive = no completed visit in the
            last 12 months.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900">
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
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            + New patient
          </button>
        </div>
      </header>

      <AddPatientModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          load();
        }}
      />

      {importMsg && (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          {importMsg}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Total Patients"
          value={stats.total}
          icon={Users}
          color="indigo"
          hint="All time"
        />
        <StatCard
          title="Active Patients"
          value={stats.active}
          icon={UserCheck}
          color="green"
          hint="Currently active"
        />
        <StatCard
          title="Visited"
          value={stats.visited}
          icon={CheckCircle2}
          color="sky"
          hint="Completed visit"
        />
        <StatCard
          title="Booked"
          value={stats.booked}
          icon={CalendarCheck}
          color="amber"
          hint="Appointment booked"
        />
        <StatCard
          title="Qualified"
          value={stats.qualified}
          icon={Stethoscope}
          color="indigo"
          hint="Qualified leads"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block flex-1 min-w-[220px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Search
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name or phone…"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block w-full min-w-[160px] sm:w-auto sm:flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Area
            </span>
            <input
              value={area}
              onChange={e => setArea(e.target.value)}
              placeholder="e.g. Andheri…"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium shadow-sm transition-colors ${
              activeFilterCount > 0
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter size={12} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {(search || area || activeFilterCount > 0) && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {activeFilter !== "all" && (
              <FilterChip
                label={`Status: ${activeFilter}`}
                onClear={() => setActiveFilter("all")}
              />
            )}
            {sourceFilter && (
              <FilterChip
                label={`Source: ${sourceFilter}`}
                onClear={() => setSourceFilter("")}
              />
            )}
            {genderFilter && (
              <FilterChip
                label={`Gender: ${genderFilter}`}
                onClear={() => setGenderFilter("")}
              />
            )}
            {feedbackFilter !== "any" && (
              <FilterChip
                label={`Feedback: ${feedbackFilter === "yes" ? "submitted" : "not submitted"}`}
                onClear={() => setFeedbackFilter("any")}
              />
            )}
          </div>
        )}
      </div>

      {showFilters && (
        <PatientsFilterModal
          onClose={() => setShowFilters(false)}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          sources={sources}
          genderFilter={genderFilter}
          setGenderFilter={setGenderFilter}
          feedbackFilter={feedbackFilter}
          setFeedbackFilter={setFeedbackFilter}
          onClearAll={() => {
            setSourceFilter("");
            setActiveFilter("all");
            setGenderFilter("");
            setFeedbackFilter("any");
          }}
        />
      )}

      {someSelected && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-blue-900">
              {effectiveSelected.size} selected
            </p>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-blue-700 hover:underline"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportSelected}
              disabled={bulkBusy}
              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-100 disabled:opacity-60"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => setShowSetSource(o => !o)}
              disabled={bulkBusy}
              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-100 disabled:opacity-60"
            >
              Set source
            </button>
          </div>
        </div>
      )}

      {showSetSource && someSelected && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <label className="block flex-1 min-w-[200px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              New source value
            </span>
            <input
              value={newSourceValue}
              onChange={e => setNewSourceValue(e.target.value)}
              placeholder="e.g. instagram-ad"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="button"
            onClick={() => runBulk("set_source", newSourceValue.trim())}
            disabled={bulkBusy || !newSourceValue.trim()}
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
          >
            Apply to {effectiveSelected.size}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowSetSource(false);
              setNewSourceValue("");
            }}
            className="text-xs text-slate-500 hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {bulkMsg && (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          {bulkMsg}
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            All Patients
          </h2>
          <span className="text-xs text-slate-500">
            {visible.length} of {rows.length}
          </span>
        </div>

        {isLoading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">
            No patients match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto" data-tour="patients-list">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/70">
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all visible"
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Age</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Last appt</th>
                  <th className="px-2 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {pagedVisible.map(p => {
                  const selectable = p.kind === "lead";
                  const checked = selectable && selectedIds.has(p.id);
                  return (
                    <tr
                      key={`${p.kind}-${p.id}`}
                      onClick={() => router.push(`/patients/${p.id}`)}
                      className={`cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50/70 ${
                        checked ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <td
                        className="px-4 py-3"
                        onClick={e => e.stopPropagation()}
                      >
                        {selectable ? (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOne(p.id)}
                            aria-label={`Select ${p.name}`}
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        ) : (
                          <span
                            className="text-[10px] uppercase tracking-wider text-slate-400"
                            title="Direct appointments aren't bulk-editable until linked"
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} size="md" />
                          <span className="font-semibold text-slate-900">
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{p.phone}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {typeof p.age === "number" ? `${p.age}y` : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.source ? (
                          <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-600 ring-1 ring-inset ring-slate-200">
                            {p.source}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill
                          status={p.kind === "direct" ? "direct" : p.status}
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500">
                        {p.lastAppointmentDate
                          ? new Date(p.lastAppointmentDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td
                        className="px-2 py-3 text-right"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => router.push(`/patients/${p.id}`)}
                            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                            aria-label={`View ${p.name}`}
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/patients/${p.id}?edit=1`)}
                            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                            aria-label={`Edit ${p.name}`}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {visible.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3.5 text-xs text-slate-600">
            <label className="inline-flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={e => setRowsPerPage(Number(e.target.value))}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {[10, 25, 50, 100].map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span>
              Showing {firstShown} to {lastShown} of {visible.length} patient
              {visible.length === 1 ? "" : "s"}
            </span>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ‹ Previous
              </button>
              <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md bg-slate-900 px-2 text-xs font-semibold text-white">
                {safePage}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="text-blue-500 transition-colors hover:text-blue-700"
        aria-label={`Remove ${label}`}
      >
        <X size={10} />
      </button>
    </span>
  );
}

function PatientsFilterModal({
  onClose,
  activeFilter,
  setActiveFilter,
  sourceFilter,
  setSourceFilter,
  sources,
  genderFilter,
  setGenderFilter,
  feedbackFilter,
  setFeedbackFilter,
  onClearAll,
}: {
  onClose: () => void;
  activeFilter: "all" | "active" | "inactive";
  setActiveFilter: (v: "all" | "active" | "inactive") => void;
  sourceFilter: string;
  setSourceFilter: (v: string) => void;
  sources: string[];
  genderFilter: "" | "female" | "male" | "other";
  setGenderFilter: (v: "" | "female" | "male" | "other") => void;
  feedbackFilter: "any" | "yes" | "no";
  setFeedbackFilter: (v: "any" | "yes" | "no") => void;
  onClearAll: () => void;
}) {
  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
              <Filter size={14} className="text-blue-600" />
              Filter patients
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Combine any number of filters. Search runs separately above.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <FilterGroup
            title="Status"
            description="Active = had a completed visit in the last 12 months."
          >
            <Pills
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              value={activeFilter}
              onChange={setActiveFilter}
            />
          </FilterGroup>

          <FilterGroup title="Source">
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All sources</option>
              {sources.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup title="Gender">
            <Pills
              options={[
                { value: "", label: "Any" },
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
                { value: "other", label: "Other" },
              ]}
              value={genderFilter}
              onChange={setGenderFilter}
            />
          </FilterGroup>

          <FilterGroup
            title="Post-visit feedback"
            description="Feedback submitted after a visit (rating + review)."
          >
            <Pills
              options={[
                { value: "any", label: "Any" },
                { value: "yes", label: "Submitted" },
                { value: "no", label: "Not submitted" },
              ]}
              value={feedbackFilter}
              onChange={setFeedbackFilter}
            />
          </FilterGroup>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-slate-500 hover:underline"
          >
            Reset filters
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      {description && (
        <p className="text-[11px] text-slate-400">{description}</p>
      )}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            value === o.value
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

