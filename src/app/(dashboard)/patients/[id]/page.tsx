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
    const a = data.appointment;
    return (
      <div className="space-y-6">
        <Link
          href="/patients"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to patients
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
          <div className="mb-3 flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              {a.name || "Unnamed"}
            </h1>
            <StatusPill status="direct" />
          </div>
          <p className="text-sm text-slate-600">{a.phone}</p>
          <p className="mt-4 text-sm text-slate-500">
            Booked direct via {a.source || "external"} — no matching lead.
          </p>
          {a.date && (
            <p className="mt-2 font-medium text-slate-800">
              {new Date(a.date).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
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

  return (
    <div className="space-y-6">
      <Link
        href="/patients"
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to patients
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{lead.name}</h1>
              <StatusPill status={status} />
              {inactive && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  inactive
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600">{lead.phone}</p>
            <p className="text-xs text-slate-500">
              {[
                typeof lead.age === "number" ? `${lead.age}y` : null,
                lead.gender,
                lead.area,
                lead.source,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
            {lead.email && (
              <p className="text-xs text-slate-500">{lead.email}</p>
            )}
          </div>
          <div className="text-right text-xs text-slate-500">
            {lead.createdAt && (
              <p>Captured {new Date(lead.createdAt).toLocaleDateString()}</p>
            )}
            {lastVisit && (
              <p>Last visit {new Date(lastVisit).toLocaleDateString()}</p>
            )}
            {typeof lead.outcomeRating === "number" && (
              <p className="text-amber-600">⭐ {lead.outcomeRating}/5</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Status
        </p>
        {allowed.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            This patient is{" "}
            <span className="font-semibold text-slate-900">{status}</span> —
            terminal state.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
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
                      ? "rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      : "rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  }
                >
                  Mark {next.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>
        )}
        {transitionError && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {transitionError}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Internal notes
        </p>
        <textarea
          value={notesDraft}
          onChange={e => setNotesDraft(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="Patient-level notes (allergies, preferences, follow-ups)…"
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

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Medical history
            </h2>
            <p className="text-xs text-slate-500">
              Appointments are booked through Cal.com. After each visit, mark
              it visited and record diagnosis and medicines.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBookingOpen(true)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Schedule appointment
          </button>
        </div>

        {appointments.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">
            No appointments yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {appointments.map(a => {
              const isEditing = editingId === a._id;
              return (
                <li key={a._id} className="px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {a.date
                            ? new Date(a.date).toLocaleString()
                            : "No date"}
                        </p>
                        <StatusPill status={a.status} />
                        {a.source && (
                          <span className="text-[10px] uppercase tracking-wider text-slate-400">
                            via {a.source}
                          </span>
                        )}
                      </div>
                    </div>
                    {!isEditing && (
                      <div className="flex flex-wrap gap-2">
                        {a.status === "scheduled" && (
                          <>
                            <button
                              type="button"
                              onClick={() => startMarkVisited(a)}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Mark visited
                            </button>
                            <button
                              type="button"
                              onClick={() => markNoShow(a._id)}
                              disabled={busyApptId === a._id}
                              className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              No show
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(a)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAppt(a._id)}
                          disabled={busyApptId === a._id}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {busyApptId === a._id ? "…" : "Delete"}
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
                            <option value="completed">Completed</option>
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
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(a._id)}
                          disabled={savingId === a._id}
                          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {savingId === a._id ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2 text-sm">
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
                          <p className="text-slate-600 whitespace-pre-line">
                            {a.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Feedback</h2>
        </div>
        {feedbacks.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">No feedback yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {feedbacks.map(f => (
              <li key={f._id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {typeof f.rating === "number" ? `⭐ ${f.rating}/5` : "—"}
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
                  <p className="mt-1 text-sm text-slate-700">{f.reviewText}</p>
                )}
              </li>
            ))}
          </ul>
        )}
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
