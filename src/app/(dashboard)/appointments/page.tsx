"use client";

import { useEffect, useMemo, useState } from "react";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";
import AttachmentsSection from "@/components/AttachmentsSection";

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
};

type Tab = "upcoming" | "history";

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
  const [data, setData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Active + Next cards
  const [active, setActive] = useState<Appointment | null>(null);
  const [next, setNext] = useState<Appointment | null>(null);

  // Mark visited / Edit form (shared)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStatus, setEditStatus] = useState("scheduled");
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editMedicines, setEditMedicines] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Per-row expand/collapse (only one open at a time keeps the page scannable)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // tabs + filters
  const [tab, setTab] = useState<Tab>("upcoming");
  const [upcomingPreset, setUpcomingPreset] = useState<UpcomingPreset>("all");
  const [historyPreset, setHistoryPreset] = useState<HistoryPreset>("all");
  const [search, setSearch] = useState("");
  const [specificDate, setSpecificDate] = useState("");

  const range = useMemo(() => {
    if (specificDate) {
      const d = new Date(specificDate);
      return { from: startOfDay(d), to: endOfDay(d) };
    }
    return tab === "upcoming"
      ? rangeForUpcoming(upcomingPreset)
      : rangeForHistory(historyPreset);
  }, [tab, upcomingPreset, historyPreset, specificDate]);

  const fromMs = range.from?.getTime();
  const toMs = range.to?.getTime();

  // Active + Next polling (refresh every 60s)
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      fetch("/api/appointments/now", { headers: authHeaders() })
        .then(res => res.json())
        .then(d => {
          if (cancelled) return;
          setActive(d.active ?? null);
          setNext(d.next ?? null);
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Table data — re-fetches when any filter changes
  useEffect(() => {
    const t = setTimeout(() => {
      const url = new URL("/api/appointments", window.location.origin);
      if (search) url.searchParams.set("search", search);
      if (range.from) url.searchParams.set("from", range.from.toISOString());
      if (range.to) url.searchParams.set("to", range.to.toISOString());
      fetch(url.toString(), { headers: authHeaders() })
        .then(res => res.json())
        .then(d => setData(d.appointments ?? []))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, fromMs, toMs]);

  const refreshNow = () => {
    fetch("/api/appointments/now", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        setActive(d.active ?? null);
        setNext(d.next ?? null);
      })
      .catch(() => {});
  };

  const refreshTable = () => {
    const url = new URL("/api/appointments", window.location.origin);
    if (search) url.searchParams.set("search", search);
    if (range.from) url.searchParams.set("from", range.from.toISOString());
    if (range.to) url.searchParams.set("to", range.to.toISOString());
    fetch(url.toString(), { headers: authHeaders() })
      .then(res => res.json())
      .then(d => setData(d.appointments ?? []));
  };

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

  const startEdit = (a: Appointment, presetCompleted = false) => {
    setEditingId(a.id);
    setExpandedId(a.id);
    setEditDate(a.date ? new Date(a.date).toISOString().slice(0, 16) : "");
    setEditStatus(presetCompleted ? "completed" : a.status ?? "scheduled");
    setEditDiagnosis(a.diagnosis ?? "");
    setEditMedicines((a.medicines ?? []).join("\n"));
    setEditNotes(a.notes ?? "");
  };
  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    await patch(id, {
      date: editDate ? new Date(editDate).toISOString() : undefined,
      status: editStatus,
      diagnosis: editDiagnosis,
      notes: editNotes,
      medicines: editMedicines
        ? editMedicines.split("\n").map(s => s.trim()).filter(Boolean)
        : [],
    });
    setEditingId(null);
  };

  const markNoShow = (id: string) => patch(id, { status: "no_show" });
  const reopen = (id: string) => patch(id, { status: "scheduled" });

  const toggleExpand = (id: string) => {
    if (editingId === id) return; // don't collapse while editing
    setExpandedId(prev => (prev === id ? null : id));
  };

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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
        <p className="text-sm text-slate-500">
          Booked via Cal.com. After each visit, click <strong>Mark
          visited</strong> to record diagnosis and medicines.
        </p>
      </header>

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
              onMarkVisited={() => startEdit(active, true)}
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

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex border-b border-slate-200">
          {(["upcoming", "history"] as Tab[]).map(t => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setExpandedId(null);
                  setEditingId(null);
                }}
                className={`flex-1 px-6 py-3 text-sm font-semibold capitalize transition ${
                  isActive
                    ? "border-b-2 border-indigo-600 text-indigo-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {presets.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider transition ${
                  !specificDate && activePreset === p
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {presetLabels[p]}
              </button>
            ))}
            <label className="ml-auto inline-flex items-center gap-2 text-xs text-slate-500">
              <span>Specific date</span>
              <input
                type="date"
                value={specificDate}
                onChange={e => setSpecificDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block flex-1 min-w-[180px]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Search
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, phone, or email…"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900 capitalize">
            {tab === "upcoming" ? "Upcoming appointments" : "Appointment history"}
          </h2>
          <span className="text-xs text-slate-500">
            {visible.length}{" "}
            {visible.length === 1 ? "appointment" : "appointments"}
          </span>
        </div>

        {loading ? (
          <p className="px-6 py-6 text-sm text-slate-500">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">
            {tab === "upcoming"
              ? "No upcoming appointments in this range."
              : "No past appointments in this range."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {visible.map(a => {
              const isEditing = editingId === a.id;
              const isExpanded = expandedId === a.id || isEditing;
              const isScheduled = !a.status || a.status === "scheduled";
              const hasDetails =
                !!a.diagnosis ||
                (!!a.medicines && a.medicines.length > 0) ||
                !!a.notes;
              return (
                <li key={a.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleExpand(a.id)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      aria-expanded={isExpanded}
                    >
                      <span
                        className={`mt-1 inline-block text-slate-400 transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        aria-hidden
                      >
                        ▶
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {a.name || "Unnamed"}
                          </span>
                          <StatusPill status={a.status ?? "scheduled"} />
                        </span>
                        <span className="block text-sm text-slate-600">
                          {[a.phone, a.email].filter(Boolean).join(" · ") || "—"}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {new Date(a.date).toLocaleString()}
                          {a.source ? ` · ${a.source}` : ""}
                        </span>
                      </span>
                    </button>

                    {!isEditing && (
                      <div className="flex flex-wrap gap-2">
                        {isScheduled && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(a, true)}
                              disabled={busyId === a.id}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              Mark visited
                            </button>
                            <button
                              type="button"
                              onClick={() => markNoShow(a.id)}
                              disabled={busyId === a.id}
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              No show
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(a)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        {a.status === "completed" && (
                          <button
                            type="button"
                            onClick={() => reopen(a.id)}
                            disabled={busyId === a.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            Date &amp; time
                          </span>
                          <input
                            type="datetime-local"
                            value={editDate}
                            onChange={e => setEditDate(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            Status
                          </span>
                          <select
                            value={editStatus}
                            onChange={e => setEditStatus(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Visited</option>
                            <option value="no_show">No show</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Diagnosis
                        </span>
                        <textarea
                          value={editDiagnosis}
                          onChange={e => setEditDiagnosis(e.target.value)}
                          rows={2}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          placeholder="What was diagnosed during this visit"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Medicines (one per line)
                        </span>
                        <textarea
                          value={editMedicines}
                          onChange={e => setEditMedicines(e.target.value)}
                          rows={3}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          placeholder={
                            "Amoxicillin 500mg — 3 times a day for 5 days\nIbuprofen 400mg — as needed"
                          }
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Notes
                        </span>
                        <textarea
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          rows={2}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </label>
                      <AttachmentsSection appointmentId={a.id} canEdit />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(a.id)}
                          disabled={busyId === a.id}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    isExpanded && (
                      <div className="mt-3 pl-6">
                        {hasDetails ? (
                          <div className="space-y-2 text-sm">
                            {a.diagnosis && (
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Diagnosis
                                </p>
                                <p className="text-slate-700 whitespace-pre-line">
                                  {a.diagnosis}
                                </p>
                              </div>
                            )}
                            {a.medicines && a.medicines.length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Medicines
                                </p>
                                <ul className="mt-1 list-disc pl-5 text-slate-700">
                                  {a.medicines.map((m, i) => (
                                    <li key={i}>{m}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {a.notes && (
                              <p className="text-sm text-slate-600">
                                {a.notes}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs italic text-slate-400">
                            No diagnosis, medicines, or notes recorded yet.
                          </p>
                        )}
                        <AttachmentsSection
                          appointmentId={a.id}
                          canEdit={false}
                        />
                      </div>
                    )
                  )}
                </li>
              );
            })}
          </ul>
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
    ? "rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-5"
    : "rounded-xl border border-slate-200 bg-white px-6 py-5";
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
