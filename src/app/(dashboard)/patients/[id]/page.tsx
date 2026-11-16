"use client";

import { use, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  Droplet,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Pill,
  RefreshCw,
  Stethoscope,
} from "lucide-react";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";
import SlotBookingPane from "@/components/SlotBookingPane";
import AttachmentsSection from "@/components/AttachmentsSection";
import VitalsTrendChart, {
  type VitalsPoint,
} from "@/components/charts/VitalsTrendChart";
import EditAppointmentModal from "@/components/EditAppointmentModal";
import EditPatientModal from "@/components/EditPatientModal";
import CreatePrescriptionModal, {
  type PrescriptionInitial,
} from "@/components/CreatePrescriptionModal";
import { formatRupees } from "@/lib/currency";
import { type LeadStatus, RX_FREQUENCIES } from "@/lib/constants";
import type { PrescriptionItem } from "@/lib/validators/prescription";

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
  bloodGroup?: string | null;
  allergies?: string | null;
  createdAt?: string;
  statusUpdatedAt?: string;
};

// A medicine row may be a legacy plain string or a structured item.
type MedicineEntry = string | PrescriptionItem;

type Appointment = {
  id: string;
  name?: string;
  phone?: string;
  date?: string;
  status?: string;
  source?: string;
  notes?: string;
  diagnosis?: string;
  encounterType?: string | null;
  diagnosisCode?: string | null;
  diagnosisStatus?: string | null;
  observations?: string | null;
  medicines?: MedicineEntry[];
  completedAt?: string;
  weightKg?: number | null;
  sugarMgDl?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
};

// EMR timeline filters (which sections show + a date-range window).
type EmrFilters = {
  diagnosis: boolean;
  observations: boolean;
  medicines: boolean;
  from: string;
  to: string;
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

  const [bookingOpen, setBookingOpen] = useState(false);

  // Structured prescription modal. `appointmentId` set → the modal completes
  // that existing visit (Mark visited); otherwise it creates a new visit.
  // `initial` pre-fills it (Repeat Rx, or an appointment's existing data).
  const [rx, setRx] = useState<{
    appointmentId?: string;
    mode?: "complete" | "edit";
    initial?: PrescriptionInitial;
  } | null>(null);

  // EMR timeline filters. All sections on and no date window by default.
  const [filters, setFilters] = useState<EmrFilters>({
    diagnosis: true,
    observations: true,
    medicines: true,
    from: "",
    to: "",
  });

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

  const openCreateRx = () => setRx({});

  // Clone a past visit's clinical content into a fresh prescription draft.
  const openRepeatRx = (a: Appointment) =>
    setRx({ initial: initialFromAppointment(a) });

  // Mark visited = complete this scheduled appointment via the structured
  // prescription form, pre-filled with whatever it already holds.
  const startMarkVisited = (a: Appointment) =>
    setRx({ appointmentId: a.id, mode: "complete", initial: initialFromAppointment(a) });

  // Edit a recorded visit in the same structured form (no flattening) —
  // PATCHes the appointment's clinical fields in place.
  const openEditRx = (a: Appointment) =>
    setRx({ appointmentId: a.id, mode: "edit", initial: initialFromAppointment(a) });

  const startEdit = (a: Appointment) =>
    setEditTarget({ appointment: a, mode: "edit" });

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
    <div className="space-y-6">
      <Link
        href="/patients"
        className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline"
      >
        <ArrowLeft size={14} />
        Back to patients
      </Link>

      {/* HEADER: identity + primary CTA */}
      <div
        data-tour="patient-header"
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/70 bg-white p-6"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white ${avatarBg}`}
          >
            {initials || "?"}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">
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
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-sm text-slate-600">{meta || "—"}</p>
              {lead.bloodGroup && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-100">
                  <Droplet size={11} />
                  Blood Group: {lead.bloodGroup}
                </span>
              )}
            </div>
            {lead.allergies && (
              <p className="mt-1 text-sm">
                <span className="font-semibold text-rose-600">Allergies:</span>{" "}
                <span className="text-slate-700">{lead.allergies}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditProfileOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            aria-label="Edit patient profile"
            title="Edit patient profile"
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("medical-history");
              // Let the tab mount, then bring the vitals trend into view.
              setTimeout(() => {
                document
                  .querySelector('[data-tour="vitals-trend"]')
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 50);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Activity size={14} />
            View vitals
          </button>
          <button
            type="button"
            onClick={() => setBookingOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            New appointment
          </button>
          <button
            type="button"
            onClick={openCreateRx}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f3d2b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16301f]"
          >
            <Pill size={14} />
            Create Prescription
          </button>
        </div>
      </div>

      {/* TAB NAV */}
      <div data-tour="patient-tabs">
        <div className="flex gap-6 overflow-x-auto border-b border-slate-200 px-1">
          {TAB_DEFS.map(({ key, label }) => {
            const isActive = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`-mb-px shrink-0 border-b-2 px-1 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-green-600 text-green-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* LEFT COLUMN — Contact + Notes */}
          <div className="space-y-4 lg:col-span-1">
            <div className="rounded-xl border border-slate-200/70 bg-white p-6">
              <p className="text-base font-semibold tracking-tight text-slate-900">Contact</p>
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

            <div className="rounded-xl border border-slate-200/70 bg-white p-6">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold tracking-tight text-slate-900">
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
                className="mt-2 w-full rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                placeholder="Allergies, chronic conditions, preferences, follow-up reminders…"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={saveNotes}
                  disabled={!dirtyNotes || savingNotes}
                  className="rounded-lg bg-[#1f3d2b] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#16301f] disabled:opacity-60"
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
              filters={ALL_VISIBLE}
              onRepeat={openRepeatRx}
              onEdit={openEditRx}
            />
          </div>
        </div>
      )}

      {tab === "appointments" && (
        <div className="space-y-5">
          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center text-sm text-slate-400">
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
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center text-sm text-slate-400">
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
        <div className="space-y-5">
          <EmrFilterBar filters={filters} onChange={setFilters} />
          <MedicalHistory
            appointments={past.filter(a => a.status === "completed")}
            filters={filters}
            onRepeat={openRepeatRx}
            onEdit={openEditRx}
          />

          {feedbacks.length > 0 && (
            <section>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Feedback ({feedbacks.length})
              </h2>
              <div className="rounded-xl border border-slate-200/70 bg-white overflow-hidden">
                <ul className="divide-y divide-slate-100">
                  {feedbacks.map(f => (
                    <li key={f.id} className="px-6 py-4">
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
          bloodGroup: lead.bloodGroup,
          allergies: lead.allergies,
        }}
        onClose={() => setEditProfileOpen(false)}
        onSaved={() => {
          setEditProfileOpen(false);
          load();
        }}
      />

      <CreatePrescriptionModal
        open={rx !== null}
        patient={{ leadId: lead.id, name: lead.name, phone: lead.phone }}
        appointmentId={rx?.appointmentId}
        mode={rx?.appointmentId ? (rx.mode ?? "complete") : "create"}
        initial={rx?.initial}
        onClose={() => setRx(null)}
        onCreated={() => {
          setRx(null);
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
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm font-semibold tracking-tight text-slate-900">
                  Schedule appointment
                </p>
                <p className="text-xs text-slate-500">
                  Pick a slot for{" "}
                  <span className="font-medium text-slate-700">
                    {lead.name}
                  </span>
                  . The new appointment will appear here once booked.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBookingOpen(false);
                  load();
                }}
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto px-5 py-4">
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
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Online booking isn&apos;t enabled for this clinic yet. Ask
                    your admin to enable it on the{" "}
                    <Link href="/settings" className="font-semibold underline">
                      Settings
                    </Link>{" "}
                    page.
                  </div>
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
  "bg-green-500",
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
      className={`rounded-xl border border-slate-200/70 border-l-4 bg-white p-6 ${stripe}`}
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
                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Mark visited
              </button>
              <button
                type="button"
                onClick={onNoShow}
                disabled={busy}
                className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                No show
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
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
                      <li key={i}>{medicineLabel(m)}</li>
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Payment history ({payments.length})
        </h2>
        <Link
          href={`/finances?tab=payment&leadId=${encodeURIComponent(lead.id)}&name=${encodeURIComponent(lead.name)}&phone=${encodeURIComponent(lead.phone)}`}
          className="rounded-lg bg-[#1f3d2b] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#16301f]"
        >
          + Record payment
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
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

      <div className="rounded-xl border border-slate-200/70 bg-white overflow-hidden">
        {isLoading ? (
          <p className="px-6 py-4 text-sm text-slate-500">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="px-6 py-4 text-sm text-slate-500">
            No payments recorded for this patient yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/60">
                <tr className="border-b border-slate-200/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Items</th>
                  <th className="px-6 py-3 text-left">Method</th>
                  <th className="px-6 py-3 text-left">Collected by</th>
                  <th className="px-6 py-3 text-right">Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(p => (
                  <tr key={p.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {new Date(p.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700">
                      <span>{p.items.map(i => i.title).join(" + ")}</span>
                      {p.discount > 0 && (
                        <span className="ml-1 text-[11px] text-slate-500">
                          (−{formatRupees(p.discount)})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-600 ring-1 ring-inset ring-slate-200">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {p.collectedBy?.name ?? p.collectedBy?.email ?? "—"}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-slate-900">
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
    <div className="rounded-xl border border-slate-200/70 bg-white p-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 text-xl font-semibold tracking-tight leading-tight ${toneClass[tone]}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function MedicalHistory({
  appointments,
  filters,
  onRepeat,
  onEdit,
}: {
  appointments: Appointment[];
  filters: EmrFilters;
  onRepeat: (a: Appointment) => void;
  onEdit: (a: Appointment) => void;
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

  // Reverse for the timeline so the latest visit is on top, then apply the
  // date-range window from the filter bar.
  const timeline = useMemo(() => {
    const fromTs = filters.from ? new Date(filters.from).getTime() : null;
    // Include the whole "to" day (end-of-day), not just its midnight.
    const toTs = filters.to
      ? new Date(filters.to).getTime() + 24 * 60 * 60 * 1000
      : null;
    return [...appointments]
      .filter(a => a.date)
      .filter(a => {
        const ts = new Date(a.date!).getTime();
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts >= toTs) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
  }, [appointments, filters.from, filters.to]);

  if (appointments.length === 0) {
    return (
      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Medical history
        </h2>
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center text-sm text-slate-400">
          No past visits yet. After the first appointment is completed, or a
          prescription is created, it will appear here.
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section data-tour="vitals-trend">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Vitals trend
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
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
        {timeline.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center text-sm text-slate-400">
            No visits in the selected date range.
          </div>
        ) : (
          <ol className="relative ml-3 space-y-5 border-l-2 border-slate-200 pl-5">
            {timeline.map(a => (
              <li key={a.id} className="relative">
                {/* Dot marker on the timeline */}
                <span
                  className="absolute -left-[27px] top-2 inline-flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-green-500 shadow"
                  aria-hidden
                />
                <EmrVisitCard
                  appointment={a}
                  filters={filters}
                  onRepeat={() => onRepeat(a)}
                  onEdit={() => onEdit(a)}
                />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

// ── EMR helpers ──────────────────────────────────────────────────────

// Normalise a medicine entry (legacy string or structured item) to a
// PrescriptionItem so both old and new data render through one path.
function normalizeMedicine(m: MedicineEntry): PrescriptionItem {
  return typeof m === "string" ? { name: m } : m;
}

// One-line label for compact lists (e.g. the Appointments tab).
function medicineLabel(m: MedicineEntry): string {
  const it = normalizeMedicine(m);
  const parts = [it.dosage, it.frequency, it.duration, it.instructions].filter(
    Boolean,
  );
  return parts.length ? `${it.name} — ${parts.join(" · ")}` : it.name;
}

// Seed the prescription modal from an appointment's existing clinical data —
// used by both Repeat Rx (clone) and Mark visited (complete in place).
function initialFromAppointment(a: Appointment): PrescriptionInitial {
  return {
    encounterType: a.encounterType ?? undefined,
    diagnosis: a.diagnosis || undefined,
    diagnosisCode: a.diagnosisCode ?? undefined,
    diagnosisStatus: a.diagnosisStatus ?? undefined,
    observations: a.observations ?? undefined,
    medicines: (a.medicines ?? []).map(normalizeMedicine),
    weightKg: a.weightKg ?? null,
    sugarMgDl: a.sugarMgDl ?? null,
    bpSystolic: a.bpSystolic ?? null,
    bpDiastolic: a.bpDiastolic ?? null,
  };
}

// Pill colour per dosing frequency, echoing the mockup (OD sky, BD amber,
// TDS/QID violet, others slate).
const FREQ_PILL: Record<string, string> = {
  OD: "bg-sky-50 text-sky-700",
  BD: "bg-amber-50 text-amber-700",
  TDS: "bg-violet-50 text-violet-700",
  QID: "bg-violet-50 text-violet-700",
  HS: "bg-indigo-50 text-indigo-700",
  SOS: "bg-slate-100 text-slate-600",
  STAT: "bg-red-50 text-red-700",
};

const freqLabel = (code?: string) => {
  if (!code) return null;
  const found = RX_FREQUENCIES.find(f => f.code === code);
  return found ? found.label : code;
};

// Status pill colour on the diagnosis row.
const DX_STATUS_PILL: Record<string, string> = {
  Improving: "bg-emerald-50 text-emerald-700",
  Stable: "bg-emerald-50 text-emerald-700",
  Resolved: "bg-emerald-50 text-emerald-700",
  "Initial Entry": "bg-amber-50 text-amber-700",
  Worsening: "bg-red-50 text-red-700",
};

const EMR_SECTION_TOGGLES: Array<{
  k: "diagnosis" | "observations" | "medicines";
  label: string;
}> = [
  { k: "diagnosis", label: "Diagnosis" },
  { k: "observations", label: "Observations" },
  { k: "medicines", label: "Prescribed Medicines" },
];

function EmrFilterBar({
  filters,
  onChange,
}: {
  filters: EmrFilters;
  onChange: (f: EmrFilters) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/70 bg-white px-5 py-3">
      <div className="flex flex-wrap items-center gap-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Filters
        </span>
        {EMR_SECTION_TOGGLES.map(({ k, label }) => (
          <label
            key={k}
            className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              checked={filters[k]}
              onChange={() => onChange({ ...filters, [k]: !filters[k] })}
              className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-200"
            />
            {label}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="date"
          value={filters.from}
          onChange={e => onChange({ ...filters, from: e.target.value })}
          className="rounded-lg border border-slate-200/70 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          aria-label="From date"
        />
        <span className="text-xs text-slate-400">→</span>
        <input
          type="date"
          value={filters.to}
          onChange={e => onChange({ ...filters, to: e.target.value })}
          className="rounded-lg border border-slate-200/70 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          aria-label="To date"
        />
        {(filters.from || filters.to) && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, from: "", to: "" })}
            className="text-xs font-medium text-green-600 hover:underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function EmrVisitCard({
  appointment: a,
  filters,
  onRepeat,
  onEdit,
}: {
  appointment: Appointment;
  filters: EmrFilters;
  onRepeat: () => void;
  onEdit: () => void;
}) {
  const meds = (a.medicines ?? []).map(normalizeMedicine);
  const dateStr = a.date
    ? new Date(a.date).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
  const hasVitals =
    a.weightKg != null ||
    a.sugarMgDl != null ||
    a.bpSystolic != null ||
    a.bpDiastolic != null;

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200/70 bg-white">
      {/* Card header: date + encounter type + repeat */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-700">
            {dateStr}
          </span>
          {a.encounterType && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
              {a.encounterType}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
            title="Edit this visit's diagnosis & prescription"
          >
            <Pencil size={11} />
            Edit
          </button>
          <button
            type="button"
            onClick={onRepeat}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
            title="Repeat this prescription in a new visit"
          >
            <RefreshCw size={11} />
            Repeat Rx
          </button>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        {filters.diagnosis && a.diagnosis && (
          <EmrSection icon={<Stethoscope size={13} />} label="Diagnosis">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">{a.diagnosis}</span>
              {a.diagnosisCode && (
                <span className="font-mono text-xs text-slate-400">
                  ({a.diagnosisCode})
                </span>
              )}
              {a.diagnosisStatus && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    DX_STATUS_PILL[a.diagnosisStatus] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {a.diagnosisStatus}
                </span>
              )}
            </div>
          </EmrSection>
        )}

        {filters.observations && a.observations && (
          <EmrSection icon={<Activity size={13} />} label="Observations">
            <p className="whitespace-pre-line text-slate-600">{a.observations}</p>
          </EmrSection>
        )}

        {filters.medicines && meds.length > 0 && (
          <EmrSection icon={<Pill size={13} />} label="Prescribed Medicines">
            <PrescriptionTable items={meds} />
          </EmrSection>
        )}

        {hasVitals && <VitalsBadges appointment={a} />}

        {!a.diagnosis && !a.observations && meds.length === 0 && !hasVitals && (
          <p className="text-xs italic text-slate-400">
            No clinical details recorded for this visit.
          </p>
        )}
      </div>
    </article>
  );
}

function EmrSection({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-slate-50/60 px-3.5 py-2.5">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function PrescriptionTable({ items }: { items: PrescriptionItem[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200/70 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200/70 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <th className="px-3 py-2">Medicine</th>
            <th className="px-3 py-2">Dosage &amp; Frequency</th>
            <th className="px-3 py-2">Duration</th>
            <th className="px-3 py-2">Instructions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((m, i) => (
            <tr key={i} className="align-top">
              <td className="px-3 py-2.5 font-medium text-slate-900">{m.name}</td>
              <td className="px-3 py-2.5 text-slate-700">
                <div className="flex flex-wrap items-center gap-1.5">
                  {m.dosage && <span>{m.dosage}</span>}
                  {m.dosage && m.frequency && (
                    <span className="text-slate-300">—</span>
                  )}
                  {m.frequency && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                        FREQ_PILL[m.frequency] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {freqLabel(m.frequency)}
                    </span>
                  )}
                  {m.timing && (
                    <span className="text-xs text-slate-400">[{m.timing}]</span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2.5 text-slate-700">{m.duration || "—"}</td>
              <td className="px-3 py-2.5 text-slate-600">
                {m.instructions || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Constant "everything visible" filter for surfaces without a filter bar
// (the Overview tab's embedded timeline).
const ALL_VISIBLE: EmrFilters = {
  diagnosis: true,
  observations: true,
  medicines: true,
  from: "",
  to: "",
};

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
    <div className="space-y-6">
      <Link href="/patients" className="text-sm text-green-600 hover:underline">
        ← Back to patients
      </Link>

      <div className="rounded-xl border border-slate-200/70 bg-white p-6">
        <div className="mb-3 flex items-center gap-2">
          <h1 className="text-base font-semibold tracking-tight text-slate-900">
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

      <div className="rounded-xl border border-slate-200/70 bg-white overflow-hidden">
        <div className="border-b border-slate-200/70 px-6 py-3.5">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
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
        <div className="px-6 py-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name or phone…"
            className="w-full rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
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
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200/70 overflow-hidden">
              {results.map(r => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70"
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
                    className="rounded-lg bg-[#1f3d2b] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#16301f] disabled:opacity-60"
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
