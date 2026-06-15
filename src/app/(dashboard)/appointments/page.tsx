"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { CalendarDays, History, CalendarRange, Eye, Pencil } from "lucide-react";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";
import AddAppointmentModal from "@/components/AddAppointmentModal";
import EditAppointmentModal from "@/components/EditAppointmentModal";

type Appointment = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  date: string;
  source?: string;
  status?: string;
  notes?: string;
  diagnosis?: string;
  medicines?: string[];
  weightKg?: number | null;
  sugarMgDl?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
};

type Tab = "upcoming" | "history" | "calendar";

const TAB_DEFS: Array<{ key: Tab; label: string; icon: typeof CalendarDays }> = [
  { key: "upcoming", label: "Upcoming", icon: CalendarDays },
  { key: "history", label: "History", icon: History },
  { key: "calendar", label: "Calendar", icon: CalendarRange },
];

// Stable avatar tints keyed off the first letter of the patient name —
// gives each row a hint of identity without storing a real avatar.
const AVATAR_TONES = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
];
const avatarTone = (name?: string) => {
  const c = (name?.trim()?.charCodeAt(0) ?? 0) % AVATAR_TONES.length;
  return AVATAR_TONES[c];
};
const initial = (name?: string) =>
  (name?.trim()?.charAt(0) ?? "?").toUpperCase();

// Calendar week grid spans 7 days × 16 hours. The hour range covers a
// typical clinic day (7am–10pm); appointments outside this range still
// load but are visually clamped to the edges of the grid.
const WEEK_GRID_FIRST_HOUR = 7;
const WEEK_GRID_LAST_HOUR = 22;
const WEEK_GRID_HOURS = WEEK_GRID_LAST_HOUR - WEEK_GRID_FIRST_HOUR + 1;
const HOUR_PX = 56;

const startOfWeek = (d: Date): Date => {
  // Monday-first week (most of the world outside the US).
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun..6=Sat
  const offset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offset);
  return x;
};

const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatHour = (h: number): string => {
  const ampm = h >= 12 ? "pm" : "am";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH} ${ampm}`;
};

const APPT_TONE: Record<string, string> = {
  scheduled: "bg-sky-100 text-sky-800 border-sky-300",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  no_show: "bg-red-100 text-red-800 border-red-300",
  cancelled: "bg-slate-100 text-slate-600 border-slate-300",
};

type UpcomingPreset = "today" | "tomorrow" | "next_week" | "next_month" | "all";
type HistoryPreset = "today" | "yesterday" | "last_week" | "last_month" | "all";

const UPCOMING_LABELS: Record<UpcomingPreset, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  next_week: "Next week",
  next_month: "Next month",
  all: "All upcoming",
};

const HISTORY_LABELS: Record<HistoryPreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_week: "Last week",
  last_month: "Last month",
  all: "All history",
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

// "All upcoming" / "All history" deliberately return no date bounds:
// the tab itself splits by status (scheduled vs everything else), so a
// completed appointment dated in the future still belongs in History,
// and a scheduled appointment dated in the past still belongs in Upcoming
// (e.g. a past slot the team forgot to mark visited). The narrower
// presets layer on top with explicit date ranges when the user opts in.
const rangeForUpcoming = (
  preset: UpcomingPreset,
): { from: Date | null; to: Date | null } => {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: now, to: endOfDay(now) };
    case "tomorrow": {
      const t = new Date(now);
      t.setDate(t.getDate() + 1);
      return { from: startOfDay(t), to: endOfDay(t) };
    }
    case "next_week": {
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      return { from: now, to: endOfDay(end) };
    }
    case "next_month": {
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      return { from: now, to: endOfDay(end) };
    }
    case "all":
    default:
      return { from: null, to: null };
  }
};

const rangeForHistory = (
  preset: HistoryPreset,
): { from: Date | null; to: Date | null } => {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: now };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "last_week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { from: startOfDay(start), to: now };
    }
    case "last_month": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { from: startOfDay(start), to: now };
    }
    case "all":
    default:
      return { from: null, to: null };
  }
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function AppointmentsPage() {
  return (
    <RoleGuard module="appointments">
      <AppointmentsPageInner />
    </RoleGuard>
  );
}

function AppointmentsPageInner() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(
    () => searchParams.get("add") === "1",
  );
  // Re-sync when the URL flips ?add=1 on/off. The on-flip handles
  // tour deep-links and the dashboard Quick Action. The off-flip
  // matters for the tour's Back button: when it pushes from the
  // appt-modal-form step back to appointments-add-btn, the URL drops
  // ?add=1 and we need the modal to actually close — without this,
  // the modal stays open and the tour spotlight is stuck behind it.
  // store-and-compare during render so eslint's
  // react-hooks/set-state-in-effect rule stays happy.
  const wantAddFromUrl = searchParams.get("add") === "1";
  const [lastWantAdd, setLastWantAdd] = useState(wantAddFromUrl);
  if (wantAddFromUrl !== lastWantAdd) {
    setLastWantAdd(wantAddFromUrl);
    setAddOpen(wantAddFromUrl);
  }

  // Modal-driven edit/mark-visited. The page no longer owns the form
  // state — EditAppointmentModal seeds itself from the selected row.
  const [editTarget, setEditTarget] = useState<{
    appointment: Appointment;
    mode: "edit" | "visit";
  } | null>(null);

  // datetime-local seed for the Add modal when opened from a calendar slot.
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);

  // tabs + filters
  const [tab, setTab] = useState<Tab>("upcoming");
  const [upcomingPreset, setUpcomingPreset] = useState<UpcomingPreset>("all");
  const [historyPreset, setHistoryPreset] = useState<HistoryPreset>("all");
  const [search, setSearch] = useState("");
  const [specificDate, setSpecificDate] = useState("");

  // Calendar mode: which week is being viewed.
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));

  const range = useMemo(() => {
    if (tab === "calendar") {
      // Fetch the entire visible week regardless of status — calendar is a
      // visual layout, not a status-based filter.
      return { from: weekStart, to: addDays(weekStart, 7) };
    }
    if (specificDate) {
      const d = new Date(specificDate);
      return { from: startOfDay(d), to: endOfDay(d) };
    }
    return tab === "upcoming"
      ? rangeForUpcoming(upcomingPreset)
      : rangeForHistory(historyPreset);
  }, [tab, upcomingPreset, historyPreset, specificDate, weekStart]);

  // 250ms debounce on search so each keystroke doesn't spawn an SWR key.
  // Date-range presets and tabs change the key immediately — those are
  // discrete user actions where instant feedback is fine.
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Active + Next polling — SWR refreshes every 60s and on tab focus.
  const { data: nowData, mutate: mutateNow } = useSWR<{
    active: Appointment | null;
    next: Appointment | null;
  }>("/api/appointments/now", { refreshInterval: 60_000 });
  const active = nowData?.active ?? null;
  const next = nowData?.next ?? null;

  // Table data. URL is the SWR cache key — going back to a previous
  // filter combination re-uses the cached page instantly.
  const tableKey = useMemo(() => {
    const url = new URL("/api/appointments", "http://x"); // base ignored
    if (debouncedSearch) url.searchParams.set("search", debouncedSearch);
    if (range.from) url.searchParams.set("from", range.from.toISOString());
    if (range.to) url.searchParams.set("to", range.to.toISOString());
    return `/api/appointments${url.search}`;
  }, [debouncedSearch, range.from, range.to]);

  const {
    data: tableData,
    isLoading: loading,
    mutate: mutateTable,
  } = useSWR<{ appointments: Appointment[] }>(tableKey, {
    keepPreviousData: true,
  });
  const data = useMemo(
    () => tableData?.appointments ?? [],
    [tableData],
  );

  const refreshNow = () => mutateNow();
  const refreshTable = () => mutateTable();

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        refreshNow();
        refreshTable();
      }
    } finally {
      setBusyId(null);
    }
  };

  const markNoShow = (id: string) => patch(id, { status: "no_show" });
  const reopen = (id: string) => patch(id, { status: "scheduled" });

  // Group rows by tab. The API returns appointments inside the date range
  // regardless of status, so we partition here. Upcoming = scheduled only
  // (since "Mark visited" / "No show" both flip the status away). History =
  // anything that's no longer scheduled (completed, no_show, cancelled).
  const visible = useMemo(() => {
    if (tab === "upcoming") {
      return data.filter(a => !a.status || a.status === "scheduled");
    }
    return data.filter(a => a.status && a.status !== "scheduled");
  }, [data, tab]);

  // Client-side pagination. The API returns the entire date range; this
  // just controls how many rows we show at once.
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // Reset to page 1 when filters change via React's "store-and-compare"
  // pattern — using an effect for this triggers a cascading-render lint
  // warning.
  const filterSig = `${tab}|${upcomingPreset}|${historyPreset}|${specificDate}|${debouncedSearch}|${rowsPerPage}`;
  const [prevFilterSig, setPrevFilterSig] = useState(filterSig);
  if (prevFilterSig !== filterSig) {
    setPrevFilterSig(filterSig);
    setPage(1);
  }
  const totalPages = Math.max(1, Math.ceil(visible.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedVisible = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return visible.slice(start, start + rowsPerPage);
  }, [visible, safePage, rowsPerPage]);
  const firstShown = visible.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const lastShown = Math.min(safePage * rowsPerPage, visible.length);

  const presets =
    tab === "upcoming"
      ? (Object.keys(UPCOMING_LABELS) as UpcomingPreset[])
      : (Object.keys(HISTORY_LABELS) as HistoryPreset[]);
  const activePreset = tab === "upcoming" ? upcomingPreset : historyPreset;
  const presetLabels =
    tab === "upcoming"
      ? (UPCOMING_LABELS as Record<string, string>)
      : (HISTORY_LABELS as Record<string, string>);

  const setPreset = (p: string) => {
    setSpecificDate("");
    if (tab === "upcoming") setUpcomingPreset(p as UpcomingPreset);
    else setHistoryPreset(p as HistoryPreset);
  };

  const filtersActive =
    !!search ||
    !!specificDate ||
    (tab === "upcoming" ? upcomingPreset !== "all" : historyPreset !== "all");

  const clearFilters = () => {
    setSearch("");
    setSpecificDate("");
    setUpcomingPreset("all");
    setHistoryPreset("all");
  };

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-500">
            Booked via Cal.com. After each visit, click <strong>Mark
            visited</strong> to record diagnosis and medicines.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPrefillDate(undefined);
            setAddOpen(true);
          }}
          data-tour="appointments-add-btn"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + Add appointment
        </button>
      </header>

      <AddAppointmentModal
        open={addOpen}
        prefillDate={prefillDate}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          refreshTable();
          refreshNow();
        }}
      />

      {editTarget && (
        <EditAppointmentModal
          appointment={editTarget.appointment}
          mode={editTarget.mode}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            refreshTable();
            refreshNow();
          }}
        />
      )}

      {(active || next) && (
        <div
          className={`grid gap-4 ${
            active ? "md:grid-cols-2" : "md:grid-cols-1"
          }`}
        >
          {active && (
            <SpotlightCard
              tone="active"
              label="Active appointment"
              appointment={active}
              busy={busyId === active.id}
              onMarkVisited={() =>
                setEditTarget({ appointment: active, mode: "visit" })
              }
              onNoShow={() => markNoShow(active.id)}
            />
          )}
          {next && (
            <SpotlightCard
              tone="next"
              label="Next appointment"
              appointment={next}
            />
          )}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex border-b border-slate-200">
          {TAB_DEFS.map(({ key, label, icon: Icon }) => {
            const isActive = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                }}
                className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>

        {tab !== "calendar" && (
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {presets.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  !specificDate && activePreset === p
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {presetLabels[p]}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="block flex-1 min-w-[200px]">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍  Search by name, phone or email…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-slate-500">
              <span>Specific date</span>
              <input
                type="date"
                value={specificDate}
                onChange={e => setSpecificDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-indigo-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        )}
      </div>

      {tab === "calendar" && (
        <CalendarWeekGrid
          appointments={data}
          weekStart={weekStart}
          onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
          onNextWeek={() => setWeekStart(addDays(weekStart, 7))}
          onToday={() => setWeekStart(startOfWeek(new Date()))}
          onSelectAppointment={a =>
            setEditTarget({ appointment: a, mode: "edit" })
          }
          onSelectSlot={local => {
            setPrefillDate(local);
            setAddOpen(true);
          }}
        />
      )}

      {tab !== "calendar" && (
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <h2 className="text-base font-semibold text-slate-900">
            {tab === "upcoming" ? "Upcoming Appointments" : "Appointment History"}
          </h2>
          <span className="text-xs text-slate-500">
            {visible.length}{" "}
            {visible.length === 1 ? "appointment" : "appointments"}
          </span>
        </div>

        {loading ? (
          <p className="px-4 py-3 text-sm text-slate-500">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500">
            {tab === "upcoming"
              ? "No upcoming appointments in this range."
              : "No past appointments in this range."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2 text-left">Patient</th>
                  <th className="px-4 py-2 text-left">Schedule</th>
                  <th className="px-4 py-2 text-left">Source</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedVisible.map(a => {
                  const isScheduled = !a.status || a.status === "scheduled";
                  const dt = new Date(a.date);
                  return (
                    <tr
                      key={a.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarTone(a.name)}`}
                          >
                            {initial(a.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {a.name || "Unnamed"}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {[a.phone, a.email].filter(Boolean).join(" · ") || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <StatusPill status={a.status ?? "scheduled"} />
                          <span className="text-xs text-slate-500">
                            {dt.toLocaleString(undefined, {
                              month: "numeric",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {", "}
                            {dt.toLocaleString(undefined, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          <VitalsBadges appointment={a} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {a.source || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {isScheduled && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditTarget({ appointment: a, mode: "visit" })
                                }
                                disabled={busyId === a.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                              >
                                ✓ Mark visited
                              </button>
                              <button
                                type="button"
                                onClick={() => markNoShow(a.id)}
                                disabled={busyId === a.id}
                                className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                              >
                                No show
                              </button>
                            </>
                          )}
                          {!isScheduled && a.status === "completed" && (
                            <button
                              type="button"
                              onClick={() => reopen(a.id)}
                              disabled={busyId === a.id}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                            >
                              Reopen
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setEditTarget({ appointment: a, mode: "edit" })
                            }
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                            aria-label={`View ${a.name ?? "appointment"}`}
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditTarget({ appointment: a, mode: "edit" })
                            }
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                            aria-label={`Edit ${a.name ?? "appointment"}`}
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-2.5 text-xs text-slate-600">
            <label className="inline-flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={e => setRowsPerPage(Number(e.target.value))}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {[10, 25, 50, 100].map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span>
              Showing {firstShown} to {lastShown} of {visible.length} appointment
              {visible.length === 1 ? "" : "s"}
            </span>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ‹ Previous
              </button>
              <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-md bg-indigo-600 px-2 text-xs font-semibold text-white">
                {safePage}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function VitalsBadges({ appointment: a }: { appointment: Appointment }) {
  const hasAny =
    a.weightKg != null ||
    a.sugarMgDl != null ||
    a.bpSystolic != null ||
    a.bpDiastolic != null;
  if (!hasAny) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Vitals
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
        {a.weightKg != null && (
          <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
            Weight {a.weightKg} kg
          </span>
        )}
        {a.sugarMgDl != null && (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
            Sugar {a.sugarMgDl} mg/dL
          </span>
        )}
        {(a.bpSystolic != null || a.bpDiastolic != null) && (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700">
            BP {a.bpSystolic ?? "—"}/{a.bpDiastolic ?? "—"}
          </span>
        )}
      </div>
    </div>
  );
}

function SpotlightCard({
  tone,
  label,
  appointment,
  busy,
  onMarkVisited,
  onNoShow,
}: {
  tone: "active" | "next";
  label: string;
  appointment: Appointment;
  busy?: boolean;
  onMarkVisited?: () => void;
  onNoShow?: () => void;
}) {
  const isActive = tone === "active";
  const containerCls = isActive
    ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"
    : "rounded-lg border border-slate-200 bg-white px-4 py-3";
  const labelCls = isActive ? "text-emerald-700" : "text-slate-500";
  const date = new Date(appointment.date);

  return (
    <div className={containerCls}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-wider ${labelCls}`}
          >
            {label}
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {appointment.name || "Unnamed"}
          </p>
          <p className="text-sm text-slate-700">{date.toLocaleString()}</p>
          {(appointment.phone || appointment.email) && (
            <p className="text-xs text-slate-500">
              {[appointment.phone, appointment.email]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        {isActive && onMarkVisited && onNoShow && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onMarkVisited}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Mark visited
            </button>
            <button
              type="button"
              onClick={onNoShow}
              disabled={busy}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              No show
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Calendar week grid
// ─────────────────────────────────────────────────────────────────────

function CalendarWeekGrid({
  appointments,
  weekStart,
  onPrevWeek,
  onNextWeek,
  onToday,
  onSelectAppointment,
  onSelectSlot,
}: {
  appointments: Appointment[];
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onSelectAppointment: (a: Appointment) => void;
  onSelectSlot: (prefillLocal: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from(
    { length: WEEK_GRID_HOURS },
    (_, i) => WEEK_GRID_FIRST_HOUR + i,
  );
  const today = new Date();

  // Format the week range for the header — short and unambiguous, e.g.
  // "5 — 11 May 2026" (or "29 Apr — 5 May 2026" when crossing months).
  const lastDay = days[days.length - 1];
  const sameMonth =
    weekStart.getMonth() === lastDay.getMonth() &&
    weekStart.getFullYear() === lastDay.getFullYear();
  const weekLabel = sameMonth
    ? `${weekStart.getDate()} — ${lastDay.getDate()} ${lastDay.toLocaleString(
        undefined,
        { month: "short", year: "numeric" },
      )}`
    : `${weekStart.toLocaleString(undefined, { day: "numeric", month: "short" })} — ${lastDay.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;

  // Bucket appointments per day index (0=Mon..6=Sun).
  const apptsByDay = new Map<number, Appointment[]>();
  for (const a of appointments) {
    if (!a.date) continue;
    const d = new Date(a.date);
    for (let i = 0; i < 7; i++) {
      if (sameDay(d, days[i])) {
        const list = apptsByDay.get(i) ?? [];
        list.push(a);
        apptsByDay.set(i, list);
        break;
      }
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevWeek}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Next →
          </button>
        </div>
        <p className="text-sm font-semibold text-slate-900">{weekLabel}</p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Header row: hour-label gutter + 7 day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200">
            <div className="border-r border-slate-200" />
            {days.map((d, i) => {
              const isToday = sameDay(d, today);
              return (
                <div
                  key={i}
                  className={`border-r border-slate-200 px-2 py-2 text-center text-xs ${
                    isToday ? "bg-indigo-50" : ""
                  }`}
                >
                  <div className="font-semibold text-slate-700">
                    {d.toLocaleString(undefined, { weekday: "short" })}
                  </div>
                  <div
                    className={`mt-0.5 ${
                      isToday ? "font-bold text-indigo-700" : "text-slate-500"
                    }`}
                  >
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Body: hour gutter + day columns. Day columns are
              position:relative so absolute-positioned appointments can
              stack inside them. */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
            {/* Hour-label column */}
            <div className="border-r border-slate-200">
              {hours.map(h => (
                <div
                  key={h}
                  className="border-b border-slate-100 px-2 text-[10px] uppercase tracking-wider text-slate-400"
                  style={{ height: HOUR_PX, paddingTop: 2 }}
                >
                  {formatHour(h)}
                </div>
              ))}
            </div>

            {days.map((d, dayIdx) => {
              const isToday = sameDay(d, today);
              const dayAppts = apptsByDay.get(dayIdx) ?? [];
              return (
                <div
                  key={dayIdx}
                  onClick={e => {
                    // Click an empty area to pre-seed a new appointment at that
                    // time (rounded to 15 min). Appointment blocks stop
                    // propagation so they open the editor instead.
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const totalMin =
                      WEEK_GRID_FIRST_HOUR * 60 + (y / HOUR_PX) * 60;
                    const rounded = Math.max(
                      0,
                      Math.min(23 * 60 + 45, Math.round(totalMin / 15) * 15),
                    );
                    const hh = Math.floor(rounded / 60);
                    const mm = rounded % 60;
                    const p = (n: number) => String(n).padStart(2, "0");
                    onSelectSlot(
                      `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(hh)}:${p(mm)}`,
                    );
                  }}
                  className={`relative cursor-pointer border-r border-slate-200 ${
                    isToday ? "bg-indigo-50/30" : ""
                  }`}
                  style={{ height: WEEK_GRID_HOURS * HOUR_PX }}
                >
                  {/* Background hour grid lines */}
                  {hours.map(h => (
                    <div
                      key={h}
                      className="border-b border-slate-100"
                      style={{ height: HOUR_PX }}
                    />
                  ))}

                  {/* Appointment blocks */}
                  {dayAppts.map(a => {
                    const dt = new Date(a.date);
                    const minutesFromGridStart =
                      (dt.getHours() - WEEK_GRID_FIRST_HOUR) * 60 +
                      dt.getMinutes();
                    const top = Math.max(
                      0,
                      Math.min(
                        WEEK_GRID_HOURS * HOUR_PX - 24,
                        (minutesFromGridStart * HOUR_PX) / 60,
                      ),
                    );
                    const tone =
                      APPT_TONE[a.status ?? "scheduled"] ??
                      APPT_TONE.scheduled;
                    const timeLabel = dt.toLocaleString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onSelectAppointment(a);
                        }}
                        title={`${timeLabel} · ${a.name ?? "Unnamed"}${
                          a.status ? ` · ${a.status}` : ""
                        }`}
                        className={`absolute left-1 right-1 overflow-hidden rounded border px-1.5 py-1 text-left text-[11px] leading-tight transition hover:shadow ${tone}`}
                        style={{ top, minHeight: 28 }}
                      >
                        <span className="block truncate font-medium">
                          {a.name ?? "Unnamed"}
                        </span>
                        <span className="block truncate text-[10px] opacity-80">
                          {timeLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500">
        <LegendChip className="bg-sky-100 border-sky-300" label="Scheduled" />
        <LegendChip
          className="bg-emerald-100 border-emerald-300"
          label="Visited"
        />
        <LegendChip className="bg-red-100 border-red-300" label="No-show" />
        <LegendChip
          className="bg-slate-100 border-slate-300"
          label="Cancelled"
        />
      </div>
    </div>
  );
}

function LegendChip({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded border ${className}`} />
      <span>{label}</span>
    </span>
  );
}
