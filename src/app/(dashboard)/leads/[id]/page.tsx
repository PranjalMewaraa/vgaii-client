"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusPill from "@/components/StatusPill";
import CalendlyEmbed from "@/components/CalendlyEmbed";
import RoleGuard from "@/components/RoleGuard";
import {
  LEAD_TRANSITIONS,
  type LeadStatus,
} from "@/lib/constants";

type Lead = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
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
  date?: string;
  status?: string;
  source?: string;
  notes?: string;
};

type Feedback = {
  _id: string;
  rating?: number;
  reviewText?: string;
  status?: string;
  submittedAt?: string;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Mark contacted",
  contacted: "—",
  qualified: "—",
  appointment_booked: "—",
  visited: "—",
  lost: "—",
};

const TRANSITION_LABELS: Record<LeadStatus, string> = {
  new: "Mark new",
  contacted: "Mark contacted",
  qualified: "Mark qualified",
  appointment_booked: "Mark appointment booked",
  visited: "Mark visited",
  lost: "Mark lost",
};

const isTerminal = (s: LeadStatus | undefined) =>
  s === "visited" || s === "lost";

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <RoleGuard module="leads">
      <LeadDetailPageInner params={params} />
    </RoleGuard>
  );
}

function LeadDetailPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [lead, setLead] = useState<Lead | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // notes editor
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Calendly embed visibility
  const [bookingOpen, setBookingOpen] = useState(false);

  // generic action busy + transition error
  const [busy, setBusy] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const applyLead = (data: {
    lead?: Lead;
    appointments?: Appointment[];
    feedbacks?: Feedback[];
    calendlySchedulingUrl?: string | null;
  }) => {
    if (!data.lead) return;
    setLead(data.lead);
    setNotesDraft(data.lead.notes ?? "");
    setAppointments(data.appointments ?? []);
    setFeedbacks(data.feedbacks ?? []);
    setCalendlyUrl(data.calendlySchedulingUrl ?? null);
  };

  const refreshLead = () =>
    fetch(`/api/leads/${id}`, { headers: authHeaders() })
      .then(res => res.json())
      .then(applyLead);

  useEffect(() => {
    fetch(`/api/leads/${id}`, { headers: authHeaders() })
      .then(res => res.json())
      .then(applyLead)
      .finally(() => setLoading(false));
  }, [id]);

  const setStatus = async (status: LeadStatus) => {
    setBusy(true);
    setTransitionError(null);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTransitionError(
          typeof data.error === "string" ? data.error : "Status change failed",
        );
        return;
      }
      setLead(data.lead);
      // close embed if status moved to a terminal or non-qualified state
      setBookingOpen(false);
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
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
      }
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!lead) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Lead not found.
      </p>
    );
  }

  const status = (lead.status ?? "new") as LeadStatus;
  const allowed = LEAD_TRANSITIONS[status];
  const dirtyNotes = notesDraft !== (lead.notes ?? "");
  const showCalendlyAction = status === "qualified";

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/leads")}
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to leads
      </button>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{lead.name}</h1>
                <StatusPill status={status} />
              </div>
              <p className="text-sm text-slate-600">{lead.phone}</p>
              <p className="text-xs text-slate-500">
                {[lead.area, lead.source].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              {lead.createdAt && (
                <p>Captured {new Date(lead.createdAt).toLocaleDateString()}</p>
              )}
              {typeof lead.outcomeRating === "number" && (
                <p className="text-amber-600">⭐ {lead.outcomeRating}/5</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Next step
          </p>

          {isTerminal(status) ? (
            <p className="mt-3 text-sm text-slate-600">
              This lead is{" "}
              <span className="font-semibold text-slate-900">{status}</span> —
              no further actions.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {showCalendlyAction && (
                <button
                  type="button"
                  onClick={() => setBookingOpen(o => !o)}
                  disabled={busy}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {bookingOpen ? "Hide booking" : "Book appointment"}
                </button>
              )}

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
                    {TRANSITION_LABELS[next] ?? STATUS_LABELS[next]}
                  </button>
                );
              })}
            </div>
          )}

          {lead.statusUpdatedAt && (
            <p className="mt-3 text-xs text-slate-500">
              Updated {new Date(lead.statusUpdatedAt).toLocaleString()}
            </p>
          )}
          {transitionError && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {transitionError}
            </p>
          )}
        </div>
      </div>

      {showCalendlyAction && bookingOpen && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Book via Calendly
            </p>
            {calendlyUrl && (
              <p className="text-xs text-slate-500">
                Status will move to{" "}
                <span className="font-medium text-slate-700">
                  appointment booked
                </span>{" "}
                automatically once a slot is selected.
              </p>
            )}
          </div>

          {!calendlyUrl ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No Calendly scheduling URL is configured for this client. Ask your
              admin to set it on the{" "}
              <Link href="/settings" className="font-semibold underline">
                Settings
              </Link>{" "}
              page.
            </div>
          ) : (
            <CalendlyEmbed
              url={calendlyUrl}
              name={lead.name}
              email={lead.email}
              phone={lead.phone}
              onScheduled={() => refreshLead()}
            />
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Internal notes
        </p>
        <textarea
          value={notesDraft}
          onChange={e => setNotesDraft(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="Track call attempts, customer preferences, follow-ups…"
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
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Appointments
          </h2>
        </div>

        {appointments.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">
            No appointments linked yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {appointments.map(a => (
              <li
                key={a._id}
                className="flex flex-wrap items-center justify-between gap-2 px-6 py-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      {a.date ? new Date(a.date).toLocaleString() : "No date"}
                    </p>
                    <StatusPill status={a.status} />
                  </div>
                  {a.notes && (
                    <p className="mt-1 text-xs text-slate-500">{a.notes}</p>
                  )}
                </div>
                <Link
                  href="/appointments"
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Manage in Appointments →
                </Link>
              </li>
            ))}
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
    </div>
  );
}
