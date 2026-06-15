"use client";

import { use, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
} from "lucide-react";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";
import BookingEmbed from "@/components/BookingEmbed";
import SlotBookingPane from "@/components/SlotBookingPane";
import AttachmentsSection from "@/components/AttachmentsSection";
import VitalsTrendChart, {
  type VitalsPoint,
} from "@/components/charts/VitalsTrendChart";
import EditAppointmentModal from "@/components/EditAppointmentModal";
import EditPatientModal from "@/components/EditPatientModal";
import { formatRupees } from "@/lib/currency";
import { type LeadStatus } from "@/lib/constants";

type DetailTab =
  | "overview"
  | "appointments"
  | "medical-history"
  | "payments";

type Lead = {
  id: string;
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
  id: string;
  name?: string;
  phone?: string;
  date?: string;
  status?: string;
  source?: string;
  notes?: string;
  diagnosis?: string;
  medicines?: string[];
  completedAt?: string;
  weightKg?: number | null;
  sugarMgDl?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
};

type Feedback = {
  id: string;
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

  // Modal-driven edit/mark-visited. Mirrors the /appointments page so
  // both surfaces share the same flow.
  const [editTarget, setEditTarget] = useState<{
    appointment: Appointment;
    mode: "edit" | "visit";
  } | null>(null);
  const [busyApptId, setBusyApptId] = useState<string | null>(null);

  // Per-card expand/collapse on the Appointments + Medical history tabs.
  // Editing now lives in EditAppointmentModal; this just toggles the
  // read-only detail block.
  const [expandedApptId, setExpandedApptId] = useState<string | null>(null);
  const toggleExpanded = (apptId: string) =>
    setExpandedApptId(prev => (prev === apptId ? null : apptId));

  // notes draft
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Cal.com scheduling
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  // Profile edit (name/email/age/gender/area — phone is locked).
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Detail tabs (Overview / Appointments / Medical History / Payments).
  // Seed from ?tab=… so other pages (and the onboarding tour) can deep-
  // link straight into a specific tab.
  const searchParams = useSearchParams();
  const tabFromUrl: DetailTab | null = (() => {
    const t = searchParams.get("tab");
    return t === "overview" ||
      t === "appointments" ||
      t === "medical-history" ||
      t === "payments"
      ? (t as DetailTab)
      : null;
  })();
  const [tab, setTab] = useState<DetailTab>(tabFromUrl ?? "overview");
  // Re-sync when the URL flips to a different tab after mount (the
  // tour pushes `?tab=medical-history` while already on the detail
  // page). store-and-compare during render keeps eslint's
  // set-state-in-effect rule happy.
  const [lastTabFromUrl, setLastTabFromUrl] = useState(tabFromUrl);
  if (tabFromUrl !== lastTabFromUrl) {
    setLastTabFromUrl(tabFromUrl);
    if (tabFromUrl) setTab(tabFromUrl);
  }

  // ?expand=<apptId> seeds (and re-syncs) the open card on the
  // Medical-history tab. The onboarding tour pushes
  // `?tab=medical-history&expand=<demoApptId>` for its visit-timeline
  // step so the demo visit's vitals / diagnosis / medicines are
  // already visible when the spotlight lands.
  const expandFromUrl = searchParams.get("expand");
  const [lastExpandFromUrl, setLastExpandFromUrl] = useState(expandFromUrl);
  if (expandFromUrl !== lastExpandFromUrl) {
    setLastExpandFromUrl(expandFromUrl);
    if (expandFromUrl) setExpandedApptId(expandFromUrl);
  }

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
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {data.error}
      </p>
    );
  }

  if (data.kind === "direct") {
    return <DirectAppointmentView appointment={data.appointment} router={router} />;
  }

  const { lead, appointments, feedbacks } = data;
  const status = (lead.status ?? "qualified") as LeadStatus;
  const dirtyNotes = notesDraft !== (lead.notes ?? "");
  const lastVisit = appointments.find(a => a.status === "completed")?.date;
  const inactive = isInactive(lastVisit);

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

  const startEdit = (a: Appointment) =>
    setEditTarget({ appointment: a, mode: "edit" });

  const startMarkVisited = (a: Appointment) =>
    setEditTarget({ appointment: a, mode: "visit" });

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

  const apptCardProps = (a: Appointment) => ({
    appointment: a,
    isExpanded: expandedApptId === a.id,
    onToggleExpanded: () => toggleExpanded(a.id),
    busy: busyApptId === a.id,
    onMarkVisited: () => startMarkVisited(a),
    onNoShow: () => markNoShow(a.id),
    onEdit: () => startEdit(a),
    onDelete: () => removeAppt(a.id),
  });

  const TAB_DEFS: Array<{ key: DetailTab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "appointments", label: "Appointments" },
    { key: "medical-history", label: "Medical History" },
    { key: "payments", label: "Payments" },
  ];

  return (
    <div className="space-y-3">
      <Link
        href="/patients"
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
      >
        <ArrowLeft size={14} />
        Back to patients
      </Link>

      {/* HEADER: identity + primary CTA */}
      <div
        data-tour="patient-header"
        className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${avatarBg}`}
          >
            {initials || "?"}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold text-slate-900">
                {lead.name}
              </h1>
              <span
                className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700"
              >
                {status === "visited" ? "Visited" : status.replace(/_/g, " ")}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  inactive
                    ? "bg-slate-100 text-slate-500"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {inactive ? "Inactive" : "Active"}
              </span>
            </div>
            <p className="text-sm text-slate-600">{meta || "—"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditProfileOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label="Edit patient profile"
            title="Edit patient profile"
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams({
                tab: "payment",
                leadId: lead.id,
                name: lead.name,
                phone: lead.phone,
              });
              router.push(`/finances?${params.toString()}`);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
          >
            <CreditCard size={14} />
            Record payment
          </button>
          <button
            type="button"
            onClick={() => setBookingOpen(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            + Schedule appointment
          </button>
        </div>
      </div>

      {/* TAB NAV */}
      <div
        data-tour="patient-tabs"
        className="rounded-lg border border-slate-200 bg-white"
      >
        <div className="flex border-b border-slate-200">
          {TAB_DEFS.map(({ key, label }) => {
            const isActive = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "overview" && (
        <div className="grid gap-3 lg:grid-cols-3">
          {/* LEFT COLUMN — Contact + Notes */}
          <div className="space-y-3 lg:col-span-1">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-base font-semibold text-slate-900">Contact</p>
              <dl className="mt-3 space-y-2 text-sm">
                <ContactRow
                  icon={<Phone size={14} />}
                  value={lead.phone}
                  href={`tel:${lead.phone}`}
                />
                {lead.email && (
                  <ContactRow
                    icon={<Mail size={14} />}
                    value={lead.email}
                    href={`mailto:${lead.email}`}
                  />
                )}
                {lead.area && (
                  <ContactRow icon={<MapPin size={14} />} value={lead.area} />
                )}
                {lead.source && (
                  <ContactRow
                    icon={<Globe size={14} />}
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

            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-slate-900">
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
          </div>

          {/* RIGHT COLUMN — Medical history timeline */}
          <div className="lg:col-span-2">
            <MedicalHistory
              appointments={past.filter(a => a.status === "completed")}
              apptCardProps={apptCardProps}
            />
          </div>
        </div>
      )}

      {tab === "appointments" && (
        <div className="space-y-3">
          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                No upcoming appointments.
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map(a => (
                  <AppointmentCard key={a.id} {...apptCardProps(a)} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Past ({past.length})
            </h2>
            {past.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                No past appointments yet.
              </div>
            ) : (
              <div className="space-y-3">
                {past.map(a => (
                  <AppointmentCard key={a.id} {...apptCardProps(a)} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "medical-history" && (
        <div className="space-y-3">
          <MedicalHistory
            appointments={past.filter(a => a.status === "completed")}
            apptCardProps={apptCardProps}
          />

          {feedbacks.length > 0 && (
            <section>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Feedback ({feedbacks.length})
              </h2>
              <div className="rounded-lg border border-slate-200 bg-white">
                <ul className="divide-y divide-slate-200">
                  {feedbacks.map(f => (
                    <li key={f.id} className="px-4 py-2">
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
      )}

      {tab === "payments" && (
        <PaymentsHistory lead={lead} />
      )}

      {editTarget && (
        <EditAppointmentModal
          appointment={editTarget.appointment}
          mode={editTarget.mode}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            load();
          }}
        />
      )}

      <EditPatientModal
        open={editProfileOpen}
        patient={{
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          age: lead.age,
          gender: lead.gender,
          area: lead.area,
        }}
        onClose={() => setEditProfileOpen(false)}
        onSaved={() => {
          setEditProfileOpen(false);
          load();
        }}
      />


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
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-2.5">
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
            <div className="flex-1 overflow-auto px-4 py-3">
              <SlotBookingPane
                leadId={lead.id}
                name={lead.name}
                phone={lead.phone}
                email={lead.email}
                onBooked={() => {
                  load();
                  setTimeout(() => load(), 1500);
                  setBookingOpen(false);
                }}
                fallback={
                  !bookingUrl ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      No Cal.com booking URL is configured for this client. Ask
                      your admin to set it on the{" "}
                      <Link href="/settings" className="font-semibold underline">
                        Settings
                      </Link>{" "}
                      page, or enable self-hosted booking there.
                    </div>
                  ) : (
                    <BookingEmbed
                      url={bookingUrl}
                      name={lead.name}
                      email={lead.email}
                      phone={lead.phone}
                      onScheduled={() => {
                        load();
                        setTimeout(() => load(), 1500);
                        setBookingOpen(false);
                      }}
                    />
                  )
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type LeadSearchHit = {
  id: string;
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
  icon: React.ReactNode;
  value: string;
  href?: string;
  muted?: boolean;
}) {
  const text = (
    <span className={muted ? "text-slate-500" : "text-slate-700"}>{value}</span>
  );
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-5 w-5 items-center justify-center text-slate-400">
        {icon}
      </span>
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

function AppointmentCard({
  appointment,
  isExpanded,
  onToggleExpanded,
  busy,
  onMarkVisited,
  onNoShow,
  onEdit,
  onDelete,
}: {
  appointment: Appointment;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  busy: boolean;
  onMarkVisited: () => void;
  onNoShow: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const a = appointment;
  const stripe = APPT_STRIPE[a.status ?? "scheduled"] ?? "border-l-slate-300";
  const isScheduled = a.status === "scheduled" || !a.status;
  const hasDetails =
    !!a.diagnosis ||
    (!!a.medicines && a.medicines.length > 0) ||
    !!a.notes ||
    a.weightKg != null ||
    a.sugarMgDl != null ||
    a.bpSystolic != null ||
    a.bpDiastolic != null;
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
      className={`rounded-lg border border-slate-200 border-l-4 bg-white px-4 py-2.5 ${stripe}`}
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
      </div>

      {isExpanded && (
        <div className="mt-3 pl-7">
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
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Notes
                  </p>
                  <p className="text-slate-600 whitespace-pre-line">
                    {a.notes}
                  </p>
                </div>
              )}
              <VitalsBadges appointment={a} />
            </div>
          ) : (
            <p className="text-xs italic text-slate-400">
              No diagnosis, medicines, or notes recorded yet.
            </p>
          )}
          <AttachmentsSection appointmentId={a.id} canEdit={false} />
        </div>
      )}
    </article>
  );
}

type PaymentRow = {
  id: string;
  amount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: "cash" | "upi" | "card" | "mixed" | "pending";
  notes: string;
  createdAt: string;
  items: Array<{ title: string; amount: number }>;
  collectedBy?: { name?: string | null; email?: string | null } | null;
};

function PaymentsHistory({ lead }: { lead: Lead }) {
  const { data, isLoading } = useSWR<{ payments: PaymentRow[] }>(
    `/api/payments?leadId=${encodeURIComponent(lead.id)}`,
  );
  const payments = useMemo(() => data?.payments ?? [], [data]);

  const totals = useMemo(() => {
    let collected = 0;
    let pending = 0;
    for (const p of payments) {
      if (p.paymentMethod === "pending") pending += p.finalAmount;
      else collected += p.finalAmount;
    }
    return { collected, pending };
  }, [payments]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Payment history ({payments.length})
        </h2>
        <Link
          href={`/finances?tab=payment&leadId=${encodeURIComponent(lead.id)}&name=${encodeURIComponent(lead.name)}&phone=${encodeURIComponent(lead.phone)}`}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          + Record payment
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <SummaryTile
          label="Collected"
          value={formatRupees(totals.collected)}
          hint={`${payments.filter(p => p.paymentMethod !== "pending").length} payments`}
          tone="emerald"
        />
        <SummaryTile
          label="Pending"
          value={formatRupees(totals.pending)}
          hint={`${payments.filter(p => p.paymentMethod === "pending").length} entries`}
          tone="amber"
        />
        <SummaryTile
          label="Total entries"
          value={String(payments.length)}
          tone="slate"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <p className="px-4 py-3 text-sm text-slate-500">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500">
            No payments recorded for this patient yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Items</th>
                  <th className="px-4 py-2 text-left">Method</th>
                  <th className="px-4 py-2 text-left">Collected by</th>
                  <th className="px-4 py-2 text-right">Final</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-t border-slate-200">
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {new Date(p.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      <span>{p.items.map(i => i.title).join(" + ")}</span>
                      {p.discount > 0 && (
                        <span className="ml-1 text-[11px] text-slate-500">
                          (−{formatRupees(p.discount)})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-600">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {p.collectedBy?.name ?? p.collectedBy?.email ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                      {formatRupees(p.finalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "emerald" | "amber" | "slate";
}) {
  const toneClass: Record<typeof tone, string> = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    slate: "text-slate-900",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 text-xl font-bold leading-tight ${toneClass[tone]}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function MedicalHistory({
  appointments,
  apptCardProps,
}: {
  appointments: Appointment[];
  apptCardProps: (a: Appointment) => React.ComponentProps<typeof AppointmentCard>;
}) {
  // Sort oldest → newest for the trend chart's X axis (so the line goes
  // left-to-right in time). The timeline below reverses to most-recent
  // first, which matches how a clinician reads a chart.
  const chronological = useMemo(
    () =>
      [...appointments]
        .filter(a => a.date)
        .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime()),
    [appointments],
  );

  const weightPoints: VitalsPoint[] = chronological.map(a => ({
    date: a.date!,
    value: a.weightKg ?? null,
  }));
  const sugarPoints: VitalsPoint[] = chronological.map(a => ({
    date: a.date!,
    value: a.sugarMgDl ?? null,
  }));
  const bpPoints: VitalsPoint[] = chronological.map(a => ({
    date: a.date!,
    systolic: a.bpSystolic ?? null,
    diastolic: a.bpDiastolic ?? null,
  }));

  // Reverse for the timeline so the latest visit is on top — same order
  // the API returns past[] in, but explicit so future API changes don't
  // surprise the layout.
  const timeline = useMemo(
    () =>
      [...appointments]
        .filter(a => a.date)
        .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime()),
    [appointments],
  );

  if (appointments.length === 0) {
    return (
      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Medical history
        </h2>
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
          No past visits yet. After the first appointment is completed, its
          diagnosis and medicines will appear here.
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <section data-tour="vitals-trend">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Vitals trend
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <VitalsTrendChart
            title="Weight"
            unit="kg"
            color="#0ea5e9"
            data={weightPoints}
          />
          <VitalsTrendChart
            title="Sugar"
            unit="mg/dL"
            color="#f59e0b"
            data={sugarPoints}
          />
          <VitalsTrendChart
            title="Blood pressure"
            unit="mmHg"
            color="#f43f5e"
            mode="bp"
            data={bpPoints}
          />
        </div>
      </section>

      <section data-tour="visit-timeline">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Visits ({timeline.length})
        </h2>
        <ol className="relative ml-3 space-y-4 border-l-2 border-slate-200 pl-5">
          {timeline.map(a => {
            const dt = new Date(a.date!);
            return (
              <li key={a.id} className="relative">
                {/* Dot marker on the timeline */}
                <span
                  className="absolute -left-[27px] top-1.5 inline-flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-indigo-500 shadow"
                  aria-hidden
                />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {dt.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <div className="mt-2">
                  <AppointmentCard {...apptCardProps(a)} />
                </div>
              </li>
            );
          })}
        </ol>
      </section>
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
      const res = await fetch(`/api/appointments/${a.id}`, {
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
    <div className="space-y-3">
      <Link href="/patients" className="text-sm text-indigo-600 hover:underline">
        ← Back to patients
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <h1 className="text-base font-bold text-slate-900">
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

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-2.5">
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
        <div className="px-4 py-3">
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
                  key={r.id}
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
                    onClick={() => link(r.id)}
                    disabled={linking === r.id}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {linking === r.id ? "Linking…" : "Link"}
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
