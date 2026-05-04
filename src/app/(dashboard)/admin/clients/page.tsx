"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import useSWR from "swr";
import {
  Braces,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  Globe,
  MapPin,
  MessageSquare,
  Pencil,
  Plug,
  Plus,
  RotateCcw,
  ShieldCheck,
  UserRound,
  Users,
  Webhook,
  X,
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import { startImpersonation } from "@/lib/impersonation";
import { LEAD_STATUSES } from "@/lib/constants";

type StaffRow = {
  id: string;
  name?: string;
  email?: string;
  role: "STAFF";
  assignedModules?: string[];
  createdAt?: string;
};

type AdminRow = {
  id: string;
  name?: string;
  email?: string;
  role: "CLIENT_ADMIN";
  createdAt?: string;
};

type ClientRow = {
  id: string;
  name: string;
  subscriptionStatus?: "active" | "trial" | "expired";
  plan?: "basic" | "pro";
  renewalDate?: string;
  profileSlug?: string;
  customDomain?: string;
  googlePlaceId?: string;
  bookingUrl?: string;
  webhookKey?: string;
  createdAt?: string;
  admin: AdminRow | null;
  staff: StaffRow[];
  stats: {
    leads: number;
    appointments: number;
    openFeedback: number;
  };
};

const SUBSCRIPTION_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trial: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function AdminClientsPage() {
  return (
    <RoleGuard allow={["SUPER_ADMIN"]}>
      <AdminClientsPageInner />
    </RoleGuard>
  );
}

function AdminClientsPageInner() {
  const { data, isLoading, mutate } = useSWR<{ clients: ClientRow[] }>(
    "/api/admin/clients",
  );
  const clients = data?.clients ?? [];

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create-client form
  const [showCreate, setShowCreate] = useState(false);
  const [clientName, setClientName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [plan, setPlan] = useState<"basic" | "pro">("basic");
  const [createGooglePlaceId, setCreateGooglePlaceId] = useState("");
  const [createBookingUrl, setCreateBookingUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const refresh = () => mutate();

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: clientName,
          plan,
          googlePlaceId: createGooglePlaceId.trim() || undefined,
          bookingUrl: createBookingUrl.trim() || undefined,
          admin: {
            name: adminName,
            email: adminEmail,
            password: adminPassword,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(
          typeof data.error === "string" ? data.error : "Failed to create",
        );
        return;
      }
      setClientName("");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      setPlan("basic");
      setCreateGooglePlaceId("");
      setCreateBookingUrl("");
      setShowCreate(false);
      refresh();
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const impersonate = async (userId: string) => {
    setBusyId(userId);
    setError(null);
    try {
      await startImpersonation(userId);
      window.location.href = "/";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Impersonation failed");
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">
            Every client on the platform with their team, integrations, and
            webhooks. Click a row to expand. Use Impersonate to view the
            panel as that user.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(o => !o)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {showCreate ? (
            <>
              <X size={14} />
              Cancel
            </>
          ) : (
            <>
              <Plus size={14} />
              New client
            </>
          )}
        </button>
      </header>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {showCreate && (
        <form
          onSubmit={submitCreate}
          className="rounded-xl border border-slate-200 bg-white"
        >
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Building2 size={14} />
              </span>
              New client
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Creates the Client tenant + its first CLIENT_ADMIN user. A
              webhook key is generated automatically. Integrations can be
              filled now or edited later.
            </p>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Client name"
                value={clientName}
                onChange={setClientName}
                required
                minLength={2}
                placeholder="Aarogya Dental Studio"
              />
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Plan
                </span>
                <select
                  value={plan}
                  onChange={e => setPlan(e.target.value as "basic" | "pro")}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                </select>
              </label>
            </div>

            <fieldset>
              <legend className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Plug size={12} />
                Integrations (optional now, editable later)
              </legend>
              <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="Google Place ID"
                  value={createGooglePlaceId}
                  onChange={setCreateGooglePlaceId}
                  placeholder="ChIJ…"
                  hint="Pulls the client's Google Business listing."
                />
                <Field
                  label="Cal.com booking URL"
                  value={createBookingUrl}
                  onChange={setCreateBookingUrl}
                  type="url"
                  placeholder="https://cal.com/account/event"
                  hint="Embedded on the patient detail booking modal."
                />
              </div>
            </fieldset>

            <fieldset>
              <legend className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <ShieldCheck size={12} />
                Client admin (first user)
              </legend>
              <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field
                  label="Admin name"
                  value={adminName}
                  onChange={setAdminName}
                  required
                  minLength={2}
                  placeholder="Dr. Ananya Verma"
                />
                <Field
                  label="Admin email"
                  type="email"
                  value={adminEmail}
                  onChange={setAdminEmail}
                  required
                  placeholder="admin@aarogyadental.com"
                />
                <Field
                  label="Temporary password"
                  type="text"
                  value={adminPassword}
                  onChange={setAdminPassword}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Share this password with the client admin after creation —
                they can change it later.
              </p>
            </fieldset>
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <Plus size={14} />
              {creating ? "Creating…" : "Create client"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Building2 size={14} />
            </span>
            All Clients
          </h2>
          <span className="text-xs text-slate-500">
            {clients.length} {clients.length === 1 ? "client" : "clients"}
          </span>
        </div>

        {isLoading ? (
          <p className="px-6 py-6 text-sm text-slate-500">Loading…</p>
        ) : clients.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">No clients yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {clients.map(c => {
              const isOpen = expanded.has(c.id);
              const subStyle =
                SUBSCRIPTION_STYLES[c.subscriptionStatus ?? ""] ??
                "bg-slate-100 text-slate-700";
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {c.name}
                        </span>
                        {c.subscriptionStatus && (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${subStyle}`}
                          >
                            {c.subscriptionStatus}
                          </span>
                        )}
                        {c.plan && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-600">
                            {c.plan}
                          </span>
                        )}
                        {c.googlePlaceId && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-700"
                            title="Google Place ID configured"
                          >
                            <Globe size={10} />
                            Google
                          </span>
                        )}
                        {c.bookingUrl && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-violet-700"
                            title="Cal.com booking URL configured"
                          >
                            <Calendar size={10} />
                            Cal.com
                          </span>
                        )}
                      </div>
                      <p className="mt-1 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Users size={11} />
                          {c.staff.length} staff
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ClipboardList size={11} />
                          {c.stats.leads} leads
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={11} />
                          {c.stats.appointments} appts
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare size={11} />
                          {c.stats.openFeedback} open feedback
                        </span>
                      </p>
                    </div>
                    <span
                      className="text-slate-400"
                      aria-hidden="true"
                    >
                      {isOpen ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="space-y-4 bg-slate-50/60 px-6 pb-5 pt-1">
                      <ClientAdminBlock
                        client={c}
                        busyId={busyId}
                        onImpersonate={impersonate}
                      />

                      <ClientStaffBlock
                        staff={c.staff}
                        busyId={busyId}
                        onImpersonate={impersonate}
                      />

                      <ClientIntegrationsBlock client={c} onUpdated={refresh} />

                      <ClientWebhooksBlock client={c} onRotated={refresh} />

                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {c.profileSlug && (
                          <Link
                            href={`/p/${c.profileSlug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                          >
                            <ExternalLink size={11} />
                            View public profile
                          </Link>
                        )}
                        {c.customDomain && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={11} />
                            {c.customDomain}
                          </span>
                        )}
                        {c.renewalDate && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={11} />
                            Renews{" "}
                            {new Date(c.renewalDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
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

function ClientAdminBlock({
  client,
  busyId,
  onImpersonate,
}: {
  client: ClientRow;
  busyId: string | null;
  onImpersonate: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <ShieldCheck size={11} />
            Client Admin
          </p>
          {client.admin ? (
            <p className="mt-1 text-sm font-medium text-slate-900">
              {client.admin.name || "—"}
              <span className="ml-2 text-slate-500">
                {client.admin.email}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              None — needs onboarding.
            </p>
          )}
        </div>
        {client.admin && (
          <button
            type="button"
            onClick={() => onImpersonate(client.admin!.id)}
            disabled={busyId === client.admin.id}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <UserRound size={12} />
            {busyId === client.admin.id ? "Switching…" : "Impersonate"}
          </button>
        )}
      </div>
    </div>
  );
}

function ClientStaffBlock({
  staff,
  busyId,
  onImpersonate,
}: {
  staff: StaffRow[];
  busyId: string | null;
  onImpersonate: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <Users size={11} />
          Staff ({staff.length})
        </p>
      </div>
      {staff.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-500">No staff yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {staff.map(s => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {s.name || "—"}
                  <span className="ml-2 text-slate-500">{s.email}</span>
                </p>
                {s.assignedModules && s.assignedModules.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.assignedModules.map(m => (
                      <span
                        key={m}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-600"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onImpersonate(s.id)}
                disabled={busyId === s.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                <UserRound size={12} />
                {busyId === s.id ? "Switching…" : "Impersonate"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClientIntegrationsBlock({
  client,
  onUpdated,
}: {
  client: ClientRow;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [googlePlaceId, setGooglePlaceId] = useState(client.googlePlaceId ?? "");
  const [bookingUrl, setBookingUrl] = useState(client.bookingUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const startEdit = () => {
    setGooglePlaceId(client.googlePlaceId ?? "");
    setBookingUrl(client.bookingUrl ?? "");
    setErr(null);
    setSavedAt(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setErr(null);
  };

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          googlePlaceId: googlePlaceId.trim() || null,
          bookingUrl: bookingUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }
      setSavedAt(Date.now());
      setEditing(false);
      onUpdated();
    } catch {
      setErr("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <Plug size={11} />
          Integrations
        </p>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            <Pencil size={11} />
            Edit
          </button>
        )}
      </div>
      <div className="space-y-3 px-4 py-3">
        {editing ? (
          <>
            <Field
              label="Google Place ID"
              value={googlePlaceId}
              onChange={setGooglePlaceId}
              placeholder="ChIJ…"
              hint="Empty to clear."
            />
            <Field
              label="Cal.com booking URL"
              value={bookingUrl}
              onChange={setBookingUrl}
              type="url"
              placeholder="https://cal.com/account/event"
              hint="Empty to clear."
            />
            {err && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {err}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <Check size={12} />
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        ) : (
          <>
            <ReadRow
              label="Google Place ID"
              icon={Globe}
              value={client.googlePlaceId}
              copyable
            />
            <ReadRow
              label="Cal.com booking URL"
              icon={Calendar}
              value={client.bookingUrl}
            />
            {savedAt && (
              <p className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
                <Check size={12} />
                Updated.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ClientWebhooksBlock({
  client,
  onRotated,
}: {
  client: ClientRow;
  onRotated: () => void;
}) {
  const [rotating, setRotating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Build webhook URLs off the current origin so the displayed URLs work
  // for whichever environment a super admin is logged into.
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const leadUrl = `${origin}/api/webhooks/leads`;
  const leadStatusUrl = `${origin}/api/webhooks/leads/status`;
  const bookingUrl = `${origin}/api/webhooks/booking`;

  const rotate = async () => {
    if (
      !confirm(
        "Rotate this client's webhook key? Any existing integrations using the old key will break until updated.",
      )
    ) {
      return;
    }
    setRotating(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/clients/${client.id}/regenerate-key`,
        { method: "POST", headers: authHeaders() },
      );
      const data = await res.json();
      if (!res.ok) {
        setErr(
          typeof data.error === "string" ? data.error : "Rotation failed",
        );
        return;
      }
      onRotated();
    } catch {
      setErr("Network error");
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <Webhook size={11} />
          Webhooks
        </p>
        <button
          type="button"
          onClick={rotate}
          disabled={rotating}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          <RotateCcw size={12} />
          {rotating ? "Rotating…" : "Rotate key"}
        </button>
      </div>
      <div className="space-y-3 px-4 py-3">
        <ReadRow
          label="Webhook key"
          value={client.webhookKey}
          copyable
          mono
        />
        {err && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {err}
          </p>
        )}
        {client.webhookKey ? (
          <>
            <WebhookRow
              method="POST"
              label="Lead capture"
              hint="External landing pages POST new leads here."
              url={leadUrl}
              webhookKey={client.webhookKey}
              schema={LEAD_CAPTURE_SCHEMA}
            />
            <WebhookRow
              method="PATCH"
              label="Lead status update"
              hint="External automations advance leads through the funnel."
              url={leadStatusUrl}
              webhookKey={client.webhookKey}
              schema={LEAD_STATUS_SCHEMA}
            />
            <WebhookRow
              method="POST"
              label="Cal.com booking"
              hint="Cal.com → Settings → Developer → Webhooks → BOOKING_CREATED."
              url={bookingUrl}
              webhookKey={client.webhookKey}
              defaultMode="query"
              schema={CAL_BOOKING_SCHEMA}
            />
          </>
        ) : (
          <p className="text-xs text-slate-500">
            No webhook key on this client. Rotate to generate one.
          </p>
        )}
      </div>
    </div>
  );
}

function ReadRow({
  label,
  value,
  copyable = false,
  mono = false,
  icon: Icon,
}: {
  label: string;
  value?: string;
  copyable?: boolean;
  mono?: boolean;
  icon?: typeof Globe;
}) {
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {Icon && <Icon size={11} />}
        {label}
      </p>
      <div className="mt-1 flex items-stretch gap-2">
        <code
          className={`flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs ${
            mono ? "font-mono" : ""
          } ${value ? "text-slate-700" : "text-slate-400"}`}
        >
          {value || "(not set)"}
        </code>
        {copyable && value && <CopyButton value={value} />}
      </div>
    </div>
  );
}

type WebhookField = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

type WebhookSchema = {
  fields: WebhookField[];
  // Pretty-printed JSON shown verbatim. Hand-authored so comments stay
  // intact (JSON.stringify would strip them) and field order matches the
  // narrative we want.
  exampleRequest: string;
  exampleResponse: string;
  responseStatus: string;
  notes?: string;
};

const LEAD_CAPTURE_SCHEMA: WebhookSchema = {
  fields: [
    { name: "name", type: "string", required: true, description: "Lead's full name (≥2 chars)." },
    { name: "phone", type: "string", required: true, description: "Phone number (≥10 chars). Stored both as-entered and in a normalized form for de-dup." },
    { name: "source", type: "string", required: false, description: "Acquisition channel — e.g. \"google-ads\", \"instagram\", \"website\"." },
  ],
  exampleRequest: `{
  "name": "Riya Sharma",
  "phone": "+91 98765 43210",
  "source": "google-ads"
}`,
  exampleResponse: `{
  "leadId": "cmox4abc1234567890",
  "status": "new",
  "feedbackUrl": "https://app.example.com/f/<token>"
}`,
  responseStatus: "201 Created",
};

const LEAD_STATUS_SCHEMA: WebhookSchema = {
  fields: [
    { name: "phone", type: "string", required: true, description: "Phone number used to look up the existing lead within this client." },
    { name: "status", type: "enum", required: true, description: `One of: ${LEAD_STATUSES.join(", ")}.` },
    { name: "note", type: "string", required: false, description: "Free-text note. Not yet persisted on the Lead — accepted for forward compatibility." },
    { name: "outcomeRating", type: "number (1–5)", required: false, description: "Rating captured by an external follow-up flow. Stored on the lead." },
  ],
  exampleRequest: `{
  "phone": "+91 98765 43210",
  "status": "qualified",
  "outcomeRating": 5
}`,
  exampleResponse: `{
  "leadId": "cmox4abc1234567890",
  "status": "qualified",
  "outcomeRating": 5
}`,
  responseStatus: "200 OK",
  notes: "404 if no lead matches this phone for the client. The webhook key scopes the lookup, so phones don't need to be globally unique.",
};

const CAL_BOOKING_SCHEMA: WebhookSchema = {
  fields: [
    { name: "triggerEvent", type: "string", required: true, description: "Cal.com event type. Only BOOKING_CREATED is acted on; others are accepted and ignored." },
    { name: "payload.startTime", type: "ISO date", required: true, description: "Appointment date/time. Stored on the new Appointment row." },
    { name: "payload.attendees[0]", type: "object", required: true, description: "First attendee — uses .name, .email, .phoneNumber to build the patient record." },
    { name: "payload.responses", type: "object", required: false, description: "Cal.com booking-form answers. Used as a fallback for phone if attendees[0].phoneNumber is empty." },
  ],
  exampleRequest: `{
  "triggerEvent": "BOOKING_CREATED",
  "payload": {
    "startTime": "2026-04-20T10:00:00Z",
    "attendees": [
      {
        "name": "Riya Sharma",
        "email": "riya@example.com",
        "phoneNumber": "+91 98765 43210"
      }
    ],
    "responses": {
      "phone": { "label": "Phone", "value": "+91 98765 43210" }
    }
  }
}`,
  exampleResponse: `{
  "appointment": {
    "id": "cmox4def1234567890",
    "name": "Riya Sharma",
    "phone": "+91 98765 43210",
    "date": "2026-04-20T10:00:00.000Z",
    "status": "scheduled",
    "leadId": "cmox4abc1234567890",
    "source": "cal.com"
  }
}`,
  responseStatus: "200 OK",
  notes: "Cal.com sends this payload automatically — you don't construct it. If a Lead with the same phone exists in this client, the appointment links to it and the lead status flips to appointment_booked.",
};

function WebhookRow({
  method,
  label,
  hint,
  url,
  webhookKey,
  defaultMode = "header",
  schema,
}: {
  method: "POST" | "PATCH";
  label: string;
  hint?: string;
  url: string;
  webhookKey: string;
  defaultMode?: "header" | "query";
  schema?: WebhookSchema;
}) {
  const [mode, setMode] = useState<"header" | "query">(defaultMode);
  const [showSchema, setShowSchema] = useState(false);
  const queryUrl = `${url}?key=${webhookKey}`;
  const display = mode === "query" ? queryUrl : url;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setMode("header")}
            className={`rounded-md px-2 py-1 font-medium uppercase tracking-wider transition ${
              mode === "header"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Header
          </button>
          <button
            type="button"
            onClick={() => setMode("query")}
            className={`rounded-md px-2 py-1 font-medium uppercase tracking-wider transition ${
              mode === "query"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Query
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-stretch gap-2">
        <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-700">
          <span className="text-indigo-600">{method}</span> {display}
        </code>
        <CopyButton value={display} />
      </div>

      {mode === "header" && (
        <p className="mt-2 text-xs text-slate-500">
          Send header{" "}
          <code className="rounded bg-slate-100 px-1">
            x-webhook-key: {webhookKey}
          </code>
        </p>
      )}
      {mode === "query" && (
        <p className="mt-2 text-xs text-slate-500">
          The key is in the URL — anyone with this URL can call the
          endpoint. Don&apos;t share it publicly.
        </p>
      )}

      {schema && (
        <div className="mt-3 border-t border-slate-200 pt-2">
          <button
            type="button"
            onClick={() => setShowSchema(s => !s)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-600 hover:underline"
            aria-expanded={showSchema}
          >
            {showSchema ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Braces size={12} />
            {showSchema ? "Hide payload" : "Show payload"}
          </button>
          {showSchema && <SchemaPanel schema={schema} />}
        </div>
      )}
    </div>
  );
}

function SchemaPanel({ schema }: { schema: WebhookSchema }) {
  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Fields
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-1.5 font-semibold">Field</th>
                <th className="px-3 py-1.5 font-semibold">Type</th>
                <th className="px-3 py-1.5 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {schema.fields.map(f => (
                <tr key={f.name} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 font-mono text-slate-800">
                    {f.name}
                    {f.required ? (
                      <span className="ml-1 text-red-500" title="Required">
                        *
                      </span>
                    ) : (
                      <span
                        className="ml-1 text-[10px] uppercase tracking-wider text-slate-400"
                        title="Optional"
                      >
                        opt
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-slate-600">
                    {f.type}
                  </td>
                  <td className="px-3 py-1.5 text-slate-600">
                    {f.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          <span className="text-red-500">*</span> required ·{" "}
          <span className="uppercase tracking-wider">opt</span> optional
        </p>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Example request body
          </p>
          <CopyButton value={schema.exampleRequest} />
        </div>
        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
          {schema.exampleRequest}
        </pre>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Response · {schema.responseStatus}
          </p>
          <CopyButton value={schema.exampleResponse} />
        </div>
        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">
          {schema.exampleResponse}
        </pre>
      </div>

      {schema.notes && (
        <p className="rounded-lg border border-slate-200 bg-amber-50/60 px-3 py-2 text-[11px] text-slate-700">
          {schema.notes}
        </p>
      )}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  hint?: string;
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
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </label>
  );
}
