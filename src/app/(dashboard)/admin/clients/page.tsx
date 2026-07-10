"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import {
  Braces,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  Globe,
  KeyRound,
  MapPin,
  MessageSquare,
  Pencil,
  Plug,
  Plus,
  RotateCcw,
  ShieldCheck,
  type LucideIcon,
  UserRound,
  Users,
  Webhook,
  X,
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import PlaceFinderModal from "@/components/PlaceFinderModal";
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
  subscriptionKey?: string;
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

  const refresh = () => mutate();

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
      window.location.href = "/dashboard";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Impersonation failed");
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every client on the platform with their team, integrations, and
            webhooks. Click a row to expand. Use Impersonate to view the
            panel as that user.
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <Plus size={14} />
          Onboard new clinic
        </Link>
      </header>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}


      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100">
              <Building2 size={14} />
            </span>
            All Clients
          </h2>
          <span className="text-xs text-slate-500">
            {clients.length} {clients.length === 1 ? "client" : "clients"}
          </span>
        </div>

        {isLoading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading…</p>
        ) : clients.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No clients yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
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
                    className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition-colors hover:bg-slate-50/70"
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
                        {c.subscriptionKey && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-sky-700"
                            title="Subscription API key configured"
                          >
                            <KeyRound size={10} />
                            Subscription API
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
                        onUpdated={refresh}
                      />

                      <ClientStaffBlock
                        staff={c.staff}
                        busyId={busyId}
                        onImpersonate={impersonate}
                        onUpdated={refresh}
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
  onUpdated,
}: {
  client: ClientRow;
  busyId: string | null;
  onImpersonate: (id: string) => void;
  onUpdated: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            <UserRound size={12} />
            {busyId === client.admin.id ? "Switching…" : "Impersonate"}
          </button>
        )}
      </div>
      {client.admin && (
        <UserSecurityActions
          userId={client.admin.id}
          email={client.admin.email}
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
}

function ClientStaffBlock({
  staff,
  busyId,
  onImpersonate,
  onUpdated,
}: {
  staff: StaffRow[];
  busyId: string | null;
  onImpersonate: (id: string) => void;
  onUpdated: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <Users size={11} />
          Staff ({staff.length})
        </p>
      </div>
      {staff.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-500">No staff yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                <UserRound size={12} />
                {busyId === s.id ? "Switching…" : "Impersonate"}
              </button>
              <div className="w-full">
                <UserSecurityActions
                  userId={s.id}
                  email={s.email}
                  onUpdated={onUpdated}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Super-admin reset-password + change-email actions for a single user. Used
// for the client admin and each staff member.
function UserSecurityActions({
  userId,
  email,
  onUpdated,
}: {
  userId: string;
  email?: string;
  onUpdated: () => void;
}) {
  const [mode, setMode] = useState<null | "password" | "email">(null);
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState(email ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const open = (m: "password" | "email") => {
    setMode(prev => (prev === m ? null : m));
    setErr(null);
    setDone(null);
    if (m === "email") setNewEmail(email ?? "");
    if (m === "password") setPassword("");
  };

  const errorFrom = (data: { error?: unknown }, fallback: string): string => {
    const e = data?.error as
      | { issues?: Array<{ message?: string }> }
      | string
      | undefined;
    if (e && typeof e === "object" && e.issues?.length) {
      return e.issues[0]?.message ?? fallback;
    }
    return typeof e === "string" ? e : fallback;
  };

  const resetPassword = async () => {
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(errorFrom(data, "Reset failed"));
        return;
      }
      setDone("Password reset.");
      setPassword("");
      setMode(null);
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  const changeEmail = async () => {
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(errorFrom(data, "Update failed"));
        return;
      }
      setDone("Email updated.");
      setMode(null);
      onUpdated();
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => open("password")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          <KeyRound size={11} />
          Reset password
        </button>
        <button
          type="button"
          onClick={() => open("email")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          <Pencil size={11} />
          Change email
        </button>
        {done && <span className="text-[11px] text-emerald-600">{done}</span>}
      </div>

      {mode === "password" && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block min-w-[200px] flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              New password
            </span>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="≥8 chars, letters + a digit"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <button
            type="button"
            onClick={resetPassword}
            disabled={busy || password.length < 8}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Set password"}
          </button>
        </div>
      )}

      {mode === "email" && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block min-w-[200px] flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              New email
            </span>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <button
            type="button"
            onClick={changeEmail}
            disabled={busy || !newEmail.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save email"}
          </button>
        </div>
      )}

      {err && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-700">
          {err}
        </p>
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
  const [subscriptionKey, setSubscriptionKey] = useState(client.subscriptionKey ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const startEdit = () => {
    setGooglePlaceId(client.googlePlaceId ?? "");
    setSubscriptionKey(client.subscriptionKey ?? "");
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
          subscriptionKey: subscriptionKey.trim() || null,
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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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
            <PlaceIdField
              value={googlePlaceId}
              onChange={setGooglePlaceId}
              hint="Empty to clear."
            />
            <Field
              label="Subscription key"
              value={subscriptionKey}
              onChange={setSubscriptionKey}
              placeholder="External subscription token"
              hint="Empty to clear. Sent to the subscription API as form field 'key'."
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
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
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
              label="Subscription key"
              icon={KeyRound}
              value={client.subscriptionKey}
              copyable
              mono
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
  const feedbackUrl = `${origin}/api/webhooks/feedback`;

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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <Webhook size={11} />
          Webhooks
        </p>
        <button
          type="button"
          onClick={rotate}
          disabled={rotating}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-60"
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
              label="Feedback capture"
              hint="External survey tools / SMS providers POST patient feedback here."
              url={feedbackUrl}
              webhookKey={client.webhookKey}
              schema={FEEDBACK_SCHEMA}
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
  icon?: LucideIcon;
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

const FEEDBACK_SCHEMA: WebhookSchema = {
  fields: [
    { name: "phone", type: "string", required: true, description: "Patient's phone. If a Lead with this phone exists in this client, the feedback links to it and the lead's outcomeRating + status are updated." },
    { name: "rating", type: "number (1–5)", required: true, description: "Star rating. Unlike the public-token flow, all values 1–5 are accepted here." },
    { name: "reviewText", type: "string", required: false, description: "What the patient wrote. Up to 2000 chars." },
    { name: "remark", type: "string", required: false, description: "Internal note from the operator who collected the feedback. Never shown publicly." },
    { name: "name", type: "string", required: false, description: "Used only when no Lead matches the phone — gives the standalone feedback row a name." },
  ],
  exampleRequest: `{
  "phone": "+91 98765 43210",
  "rating": 4,
  "reviewText": "Doctor was patient and explained things well.",
  "remark": "Collected via post-visit SMS survey"
}`,
  exampleResponse: `{
  "feedbackId": "cmox5xyz1234567890",
  "leadId": "cmox4abc1234567890",
  "leadMatched": true,
  "status": "open"
}`,
  responseStatus: "201 Created",
  notes: "leadMatched: true means the phone matched a Lead within this client, so the feedback is linked and the lead's status flipped to visited. leadMatched: false stores it standalone — still queryable from the Feedbacks tab.",
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
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 shadow-sm">
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
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
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
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </label>
  );
}

// Google Place ID field with an inline "Locate" button that opens the
// finder modal. Selecting a place fills the input with its place_id.
function PlaceIdField({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Google Place ID
        </span>
        <div className="mt-1 flex items-stretch gap-2">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="ChIJ…"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={() => setOpen(true)}
            title="Search a business and grab its Place ID"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <MapPin size={12} />
            Locate
          </button>
        </div>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </label>
      <PlaceFinderModal
        open={open}
        onClose={() => setOpen(false)}
        onPick={p => onChange(p.id)}
      />
    </div>
  );
}
