"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";
import BookingEmbed from "@/components/BookingEmbed";
import {
  LEAD_TRANSITIONS,
  type LeadStatus,
} from "@/lib/constants";

type Lead = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  area?: string;
  source?: string;
  status?: LeadStatus;
  outcomeRating?: number;
  notes?: string;
  createdAt?: string;
  statusUpdatedAt?: string;
};

type Appointment = {
  _id: string;
  name?: string;
  phone?: string;
  date?: string;
  status?: string;
  source?: string;
  notes?: string;
  diagnosis?: string;
  medicines?: string[];
  completedAt?: string;
};

type Feedback = {
  _id: string;
  rating?: number;
  reviewText?: string;
  status?: string;
  submittedAt?: string;
  createdAt?: string;
};

type DetailResponse =
  | {
      kind: "lead";
      lead: Lead;
      appointments: Appointment[];
      feedbacks: Feedback[];
      bookingUrl?: string | null;
    }
  | { kind: "direct"; appointment: Appointment }
  | { error: string };

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

// New patients (no appointments yet) are active by default. Only when their
// last appointment is older than a year do we mark them inactive.
const isInactive = (lastDate?: string | null) => {
  if (!lastDate) return false;
  const ts = new Date(lastDate).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts > ONE_YEAR_MS;
};

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <RoleGuard module="patients">
      <PatientDetailPageInner params={params} />
    </RoleGuard>
  );
}

function PatientDetailPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [data, setData] = useState<DetailResponse | null>(null);

  // editing per-appointment (Mark visited OR retrospective edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStatus, setEditStatus] = useState<string>("scheduled");
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editMedicines, setEditMedicines] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [busyApptId, setBusyApptId] = useState<string | null>(null);

  // Per-row collapse for medical-history / upcoming cards. Only one expanded
  // at a time keeps the list scannable.
  const [expandedApptId, setExpandedApptId] = useState<string | null>(null);
  const toggleExpanded = (apptId: string) => {
    if (editingId === apptId) return; // never collapse while editing
    setExpandedApptId(prev => (prev === apptId ? null : apptId));
  };

  // status transition + notes
  const [busy, setBusy] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Cal.com scheduling
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  const load = () =>
    fetch(`/api/patients/${id}`, { headers: authHeaders() })
      .then(res => res.json())
      .then((d: DetailResponse) => {
        setData(d);
        if ("kind" in d && d.kind === "lead") {
          setNotesDraft(d.lead.notes ?? "");
          setBookingUrl(d.bookingUrl ?? null);
        }
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;
  if ("error" in data) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {data.error}
      </p>
    );
  }

  if (data.kind === "direct") {
    return <DirectAppointmentView appointment={data.appointment} router={router} />;
  }

  const { lead, appointments, feedbacks } = data;
  const status = (lead.status ?? "qualified") as LeadStatus;
  const allowed = LEAD_TRANSITIONS[status];
  const dirtyNotes = notesDraft !== (lead.notes ?? "");
  const lastVisit = appointments.find(a => a.status === "completed")?.date;
  const inactive = isInactive(lastVisit);

  const setStatus = async (next: LeadStatus) => {
    setBusy(true);
    setTransitionError(null);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: next }),
      });
      const j = await res.json();
      if (!res.ok) {
        setTransitionError(
          typeof j.error === "string" ? j.error : "Status change failed",
        );
        return;
      }
      // If the patient is no longer qualified+, redirect to leads.
      if (next === "lost" || next === "new" || next === "contacted") {
        router.push(`/leads/${id}`);
        return;
      }
      load();
    } finally {
      setBusy(false);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ notes: notesDraft }),
      });
      if (res.ok) load();
    } finally {
      setSavingNotes(false);
    }
  };

  const startEdit = (a: Appointment) => {
    setEditingId(a._id);
    setExpandedApptId(a._id);
    setEditDate(
      a.date ? new Date(a.date).toISOString().slice(0, 16) : "",
    );
    setEditStatus(a.status ?? "scheduled");
    setEditDiagnosis(a.diagnosis ?? "");
    setEditMedicines((a.medicines ?? []).join("\n"));
    setEditNotes(a.notes ?? "");
  };

  // Mark a scheduled appointment as visited — same form as edit but pre-set
  // status to completed and skip the status dropdown.
  const startMarkVisited = (a: Appointment) => {
    setEditingId(a._id);
    setExpandedApptId(a._id);
    setEditDate(a.date ? new Date(a.date).toISOString().slice(0, 16) : "");
    setEditStatus("completed");
    setEditDiagnosis(a.diagnosis ?? "");
    setEditMedicines((a.medicines ?? []).join("\n"));
    setEditNotes(a.notes ?? "");
  };

  const markNoShow = async (apptId: string) => {
    setBusyApptId(apptId);
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: "no_show" }),
      });
      if (res.ok) load();
    } finally {
      setBusyApptId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (apptId: string) => {
    setSavingId(apptId);
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          date: editDate ? new Date(editDate).toISOString() : undefined,
          status: editStatus,
          diagnosis: editDiagnosis,
          notes: editNotes,
          medicines: editMedicines
            ? editMedicines
                .split("\n")
                .map(s => s.trim())
                .filter(Boolean)
            : [],
        }),
      });
      if (res.ok) {
        cancelEdit();
        load();
      }
    } finally {
      setSavingId(null);
    }
  };

  const removeAppt = async (apptId: string) => {
    if (!confirm("Delete this appointment? This cannot be undone.")) return;
    setBusyApptId(apptId);
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) load();
    } finally {
      setBusyApptId(null);
    }
  };

  const upcoming = [...appointments]
    .filter(a => a.status === "scheduled")
    .reverse();
  const past = appointments.filter(a => a.status !== "scheduled");
  const completedCount = appointments.filter(
    a => a.status === "completed",
  ).length;

  const initials = lead.name
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const colorIdx =
    [...lead.name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const avatarBg = AVATAR_COLORS[colorIdx];

  const meta = [
    typeof lead.age === "number" ? `${lead.age}y` : null,
    lead.gender,
    lead.area,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <Link
        href="/patients"
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to patients
      </Link>

      {/* HEADER: identity + primary CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-6 py-5">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${avatarBg}`}
          >
            {initials || "?"}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold text-slate-900">
                {lead.name}
              </h1>
              <StatusPill status={status} />
              {inactive ? (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  inactive
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-700">
                  active
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600">{meta || "—"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setBookingOpen(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          + Schedule appointment
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN — patient context */}
        <aside className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Contact
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <ContactRow
                icon="📞"
                value={lead.phone}
                href={`tel:${lead.phone}`}
              />
              {lead.email && (
                <ContactRow
                  icon="✉"
                  value={lead.email}
                  href={`mailto:${lead.email}`}
                />
              )}
              {lead.area && <ContactRow icon="📍" value={lead.area} />}
              {lead.source && (
                <ContactRow
                  icon="📥"
                  value={lead.source}
                  muted
                />
              )}
            </dl>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
              <Stat label="Visits" value={completedCount} />
              <Stat
                label="Last visit"
                value={
                  lastVisit
                    ? new Date(lastVisit).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    : "—"
                }
              />
              <Stat
                label="Outcome"
                value={
                  typeof lead.outcomeRating === "number"
                    ? `⭐ ${lead.outcomeRating}/5`
                    : "—"
                }
              />
            </div>
            {lead.createdAt && (
              <p className="mt-3 text-[11px] text-slate-400">
                Captured {new Date(lead.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Patient notes
              </p>
              {dirtyNotes && (
                <span className="text-[11px] text-amber-600">unsaved</span>
              )}
            </div>
            <textarea
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              rows={6}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Allergies, chronic conditions, preferences, follow-up reminders…"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={saveNotes}
                disabled={!dirtyNotes || savingNotes}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingNotes ? "Saving…" : "Save notes"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Funnel status
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Currently <StatusPill status={status} />
            </p>
            {allowed.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Terminal state — no further status changes.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {allowed.map(next => {
                  const danger = next === "lost";
                  return (
                    <button
                      key={next}
                      type="button"
                      onClick={() => setStatus(next)}
                      disabled={busy}
                      className={
                        danger
                          ? "rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                          : "rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-60"
                      }
                    >
                      {next.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            )}
            {transitionError && (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {transitionError}
              </p>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN — clinical work */}
        <div className="space-y-4 lg:col-span-2">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Upcoming ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map(a => (
                  <AppointmentCard
                    key={a._id}
                    appointment={a}
                    isEditing={editingId === a._id}
                    isExpanded={expandedApptId === a._id || editingId === a._id}
                    onToggleExpanded={() => toggleExpanded(a._id)}
                    saving={savingId === a._id}
                    busy={busyApptId === a._id}
                    editState={{
                      editDate,
                      editStatus,
                      editDiagnosis,
                      editMedicines,
                      editNotes,
                      setEditDate,
                      setEditStatus,
                      setEditDiagnosis,
                      setEditMedicines,
                      setEditNotes,
                    }}
                    onMarkVisited={() => startMarkVisited(a)}
                    onNoShow={() => markNoShow(a._id)}
                    onEdit={() => startEdit(a)}
                    onCancelEdit={cancelEdit}
                    onSaveEdit={() => saveEdit(a._id)}
                    onDelete={() => removeAppt(a._id)}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Medical history ({past.length})
              </h2>
            </div>
            {past.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
                No past visits yet. After the first appointment is completed,
                its diagnosis and medicines will appear here.
              </div>
            ) : (
              <div className="space-y-3">
                {past.map(a => (
                  <AppointmentCard
                    key={a._id}
                    appointment={a}
                    isEditing={editingId === a._id}
                    isExpanded={expandedApptId === a._id || editingId === a._id}
                    onToggleExpanded={() => toggleExpanded(a._id)}
                    saving={savingId === a._id}
                    busy={busyApptId === a._id}
                    editState={{
                      editDate,
                      editStatus,
                      editDiagnosis,
                      editMedicines,
                      editNotes,
                      setEditDate,
                      setEditStatus,
                      setEditDiagnosis,
                      setEditMedicines,
                      setEditNotes,
                    }}
                    onMarkVisited={() => startMarkVisited(a)}
                    onNoShow={() => markNoShow(a._id)}
                    onEdit={() => startEdit(a)}
                    onCancelEdit={cancelEdit}
                    onSaveEdit={() => saveEdit(a._id)}
                    onDelete={() => removeAppt(a._id)}
                  />
                ))}
              </div>
            )}
          </section>

          {feedbacks.length > 0 && (
            <section>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Feedback ({feedbacks.length})
              </h2>
              <div className="rounded-xl border border-slate-200 bg-white">
                <ul className="divide-y divide-slate-200">
                  {feedbacks.map(f => (
                    <li key={f._id} className="px-5 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {typeof f.rating === "number"
                              ? `⭐ ${f.rating}/5`
                              : "—"}
                          </p>
                          <StatusPill status={f.status} />
                        </div>
                        <span className="text-xs text-slate-500">
                          {f.submittedAt
                            ? new Date(f.submittedAt).toLocaleString()
                            : ""}
                        </span>
                      </div>
                      {f.reviewText && (
                        <p className="mt-1 text-sm text-slate-700">
                          {f.reviewText}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>

      {bookingOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => {
            setBookingOpen(false);
            // Defensive refetch: if postMessage was missed, closing still
            // gives us a chance to pick up the new appointment.
            load();
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-base font-semibold text-slate-900">
                  Schedule appointment
                </p>
                <p className="text-xs text-slate-500">
                  Pick a slot for{" "}
                  <span className="font-medium text-slate-700">
                    {lead.name}
                  </span>
                  . The new appointment will appear once Cal.com confirms.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBookingOpen(false);
                  load();
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-500 hover:bg-slate-50"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto px-6 py-5">
              {!bookingUrl ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No Cal.com booking URL is configured for this client.
                  Ask your admin to set it on the{" "}
                  <Link
                    href="/settings"
                    className="font-semibold underline"
                  >
                    Settings
                  </Link>{" "}
                  page.
                </div>
              ) : (
                <BookingEmbed
                  url={bookingUrl}
                  name={lead.name}
                  email={lead.email}
                  phone={lead.phone}
                  onScheduled={() => {
                    // Cal.com's webhook usually arrives within a second of
                    // the bookingSuccessful event, but not always. Refetch
                    // now AND once more after a short delay so we don't
                    // miss the appointment write.
                    load();
                    setTimeout(() => load(), 1500);
                    setBookingOpen(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type LeadSearchHit = {
  _id: string;
  name?: string;
  phone?: string;
  status?: string;
};

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-teal-500",
];

const APPT_STRIPE: Record<string, string> = {
  scheduled: "border-l-sky-400",
  completed: "border-l-emerald-500",
  no_show: "border-l-red-400",
  cancelled: "border-l-slate-300",
};

function ContactRow({
  icon,
  value,
  href,
  muted,
}: {
  icon: string;
  value: string;
  href?: string;
  muted?: boolean;
}) {
  const text = (
    <span className={muted ? "text-slate-500" : "text-slate-700"}>{value}</span>
  );
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 text-base leading-none text-slate-400">{icon}</span>
      {href ? (
        <a href={href} className="truncate hover:underline">
          {text}
        </a>
      ) : (
        <span className="truncate">{text}</span>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

type AppointmentCardEditState = {
  editDate: string;
  editStatus: string;
  editDiagnosis: string;
  editMedicines: string;
  editNotes: string;
  setEditDate: (v: string) => void;
  setEditStatus: (v: string) => void;
  setEditDiagnosis: (v: string) => void;
  setEditMedicines: (v: string) => void;
  setEditNotes: (v: string) => void;
};

function AppointmentCard({
  appointment,
  isEditing,
  isExpanded,
  onToggleExpanded,
  saving,
  busy,
  editState,
  onMarkVisited,
  onNoShow,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  appointment: Appointment;
  isEditing: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  saving: boolean;
  busy: boolean;
  editState: AppointmentCardEditState;
  onMarkVisited: () => void;
  onNoShow: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}) {
  const a = appointment;
  const stripe = APPT_STRIPE[a.status ?? "scheduled"] ?? "border-l-slate-300";
  const isScheduled = a.status === "scheduled" || !a.status;
  const hasDetails =
    !!a.diagnosis || (!!a.medicines && a.medicines.length > 0) || !!a.notes;
  const dateStr = a.date
    ? new Date(a.date).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "No date";

  return (
    <article
      className={`rounded-xl border border-slate-200 border-l-4 bg-white px-5 py-4 ${stripe}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          onClick={onToggleExpanded}
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
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900">
              {dateStr}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-2">
              <StatusPill status={a.status ?? "scheduled"} />
              {a.source && (
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  via {a.source}
                </span>
              )}
            </span>
          </span>
        </button>
        {!isEditing && (
          <div className="flex flex-wrap gap-2">
            {isScheduled && (
              <>
                <button
                  type="button"
                  onClick={onMarkVisited}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Mark visited
                </button>
                <button
                  type="button"
                  onClick={onNoShow}
                  disabled={busy}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  No show
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {busy ? "…" : "Delete"}
            </button>
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
                value={editState.editDate}
                onChange={e => editState.setEditDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Status
              </span>
              <select
                value={editState.editStatus}
                onChange={e => editState.setEditStatus(e.target.value)}
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
              value={editState.editDiagnosis}
              onChange={e => editState.setEditDiagnosis(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Medicines (one per line)
            </span>
            <textarea
              value={editState.editMedicines}
              onChange={e => editState.setEditMedicines(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Notes
            </span>
            <textarea
              value={editState.editNotes}
              onChange={e => editState.setEditNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        isExpanded &&
        (hasDetails ? (
          <div className="mt-3 space-y-2 pl-7 text-sm">
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
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Notes
                </p>
                <p className="text-slate-600 whitespace-pre-line">{a.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 pl-7 text-xs italic text-slate-400">
            No diagnosis, medicines, or notes recorded yet.
          </p>
        ))
      )}
    </article>
  );
}

function DirectAppointmentView({
  appointment,
  router,
}: {
  appointment: Appointment;
  router: ReturnType<typeof useRouter>;
}) {
  const a = appointment;
  const [search, setSearch] = useState(a.phone || a.name || "");
  const [results, setResults] = useState<LeadSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounced search across all leads (regardless of status). All setState
  // happens inside the (async) setTimeout callback so the lint rule about
  // synchronous setState in an effect stays happy.
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = search.trim();
      if (!trimmed) {
        setResults([]);
        return;
      }
      setSearching(true);
      const url = new URL("/api/leads", window.location.origin);
      url.searchParams.set("search", trimmed);
      url.searchParams.set("all", "1");
      fetch(url.toString(), { headers: authHeaders() })
        .then(res => res.json())
        .then(d => setResults(d.leads ?? []))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const link = async (leadId: string) => {
    setLinking(leadId);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${a._id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Link failed");
        return;
      }
      // Linked successfully — the lead is now this appointment's home.
      // Send the user to that lead's detail page.
      router.push(`/patients/${leadId}`);
    } catch {
      setError("Network error");
    } finally {
      setLinking(null);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/patients" className="text-sm text-indigo-600 hover:underline">
        ← Back to patients
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <div className="mb-3 flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">
            {a.name || "Unnamed"}
          </h1>
          <StatusPill status="direct" />
        </div>
        <p className="text-sm text-slate-600">{a.phone || "No phone"}</p>
        <p className="mt-4 text-sm text-slate-500">
          Booked via {a.source || "external"} — no patient record matched the
          contact info, so this appointment is currently orphan. Link it below
          to add it to the right patient&apos;s medical history.
        </p>
        {a.date && (
          <p className="mt-2 font-medium text-slate-800">
            {new Date(a.date).toLocaleString()}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Link to existing patient
          </h2>
          <p className="text-xs text-slate-500">
            Search by name or phone. The appointment moves into that
            patient&apos;s medical history, and the lead is bumped to
            <code className="mx-1 rounded bg-slate-100 px-1">
              appointment_booked
            </code>
            if it isn&apos;t already.
          </p>
        </div>
        <div className="px-6 py-5">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name or phone…"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          {error && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {searching && (
            <p className="mt-3 text-xs text-slate-500">Searching…</p>
          )}
          {!searching && results.length === 0 && search.trim() && (
            <p className="mt-3 text-xs text-slate-500">No matches.</p>
          )}
          {results.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
              {results.map(r => (
                <li
                  key={r._id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {r.name || "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.phone}
                      {r.status ? ` · ${r.status.replace(/_/g, " ")}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => link(r._id)}
                    disabled={linking === r._id}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {linking === r._id ? "Linking…" : "Link"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
