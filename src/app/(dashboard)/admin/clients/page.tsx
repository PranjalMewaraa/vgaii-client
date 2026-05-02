"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { startImpersonation } from "@/lib/impersonation";

type StaffRow = {
  _id: string;
  name?: string;
  email?: string;
  role: "STAFF";
  assignedModules?: string[];
  createdAt?: string;
};

type AdminRow = {
  _id: string;
  name?: string;
  email?: string;
  role: "CLIENT_ADMIN";
  createdAt?: string;
};

type ClientRow = {
  _id: string;
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
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
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

  const refresh = () =>
    fetch("/api/admin/clients", { headers: authHeaders() })
      .then(res => res.json())
      .then(d => setClients(d.clients ?? []));

  useEffect(() => {
    fetch("/api/admin/clients", { headers: authHeaders() })
      .then(res => res.json())
      .then(d => setClients(d.clients ?? []))
      .finally(() => setLoading(false));
  }, []);

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
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {showCreate ? "Cancel" : "+ New client"}
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
            <h2 className="text-base font-semibold text-slate-900">
              New client
            </h2>
            <p className="text-xs text-slate-500">
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
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create client"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            All Clients
          </h2>
          <span className="text-xs text-slate-500">
            {clients.length} {clients.length === 1 ? "client" : "clients"}
          </span>
        </div>

        {loading ? (
          <p className="px-6 py-6 text-sm text-slate-500">Loading…</p>
        ) : clients.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">No clients yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {clients.map(c => {
              const isOpen = expanded.has(c._id);
              const subStyle =
                SUBSCRIPTION_STYLES[c.subscriptionStatus ?? ""] ??
                "bg-slate-100 text-slate-700";
              return (
                <li key={c._id}>
                  <button
                    type="button"
                    onClick={() => toggle(c._id)}
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
                            className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-700"
                            title="Google Place ID configured"
                          >
                            Google
                          </span>
                        )}
                        {c.bookingUrl && (
                          <span
                            className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-violet-700"
                            title="Cal.com booking URL configured"
                          >
                            Cal.com
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {c.staff.length}{" "}
                        {c.staff.length === 1 ? "staff" : "staff"} ·{" "}
                        {c.stats.leads} leads · {c.stats.appointments} appts ·{" "}
                        {c.stats.openFeedback} open feedback
                      </p>
                    </div>
                    <span className="text-slate-400" aria-hidden="true">
                      {isOpen ? "▾" : "▸"}
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
                            className="text-indigo-600 hover:underline"
                          >
                            View public profile →
                          </Link>
                        )}
                        {c.customDomain && (
                          <span>Domain: {c.customDomain}</span>
                        )}
                        {c.renewalDate && (
                          <span>
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
            onClick={() => onImpersonate(client.admin!._id)}
            disabled={busyId === client.admin._id}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busyId === client.admin._id ? "Switching…" : "Impersonate"}
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Staff ({staff.length})
        </p>
      </div>
      {staff.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-500">No staff yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {staff.map(s => (
            <li
              key={s._id}
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
                onClick={() => onImpersonate(s._id)}
                disabled={busyId === s._id}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {busyId === s._id ? "Switching…" : "Impersonate"}
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
      const res = await fetch(`/api/admin/clients/${client._id}`, {
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Integrations
        </p>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="text-xs text-indigo-600 hover:underline"
          >
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
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        ) : (
          <>
            <ReadRow
              label="Google Place ID"
              value={client.googlePlaceId}
              copyable
            />
            <ReadRow label="Cal.com booking URL" value={client.bookingUrl} />
            {savedAt && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
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
        `/api/admin/clients/${client._id}/regenerate-key`,
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Webhooks
        </p>
        <button
          type="button"
          onClick={rotate}
          disabled={rotating}
          className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
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
            />
            <WebhookRow
              method="PATCH"
              label="Lead status update"
              hint="External automations advance leads through the funnel."
              url={leadStatusUrl}
              webhookKey={client.webhookKey}
            />
            <WebhookRow
              method="POST"
              label="Cal.com booking"
              hint="Cal.com → Settings → Developer → Webhooks → BOOKING_CREATED."
              url={bookingUrl}
              webhookKey={client.webhookKey}
              defaultMode="query"
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
}: {
  label: string;
  value?: string;
  copyable?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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

function WebhookRow({
  method,
  label,
  hint,
  url,
  webhookKey,
  defaultMode = "header",
}: {
  method: "POST" | "PATCH";
  label: string;
  hint?: string;
  url: string;
  webhookKey: string;
  defaultMode?: "header" | "query";
}) {
  const [mode, setMode] = useState<"header" | "query">(defaultMode);
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
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
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
