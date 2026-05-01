"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  subscriptionStatus?: string;
  plan?: string;
  renewalDate?: string;
  profileSlug?: string;
  customDomain?: string;
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

  useEffect(() => {
    fetch("/api/admin/clients", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(d => setClients(d.clients ?? []))
      .finally(() => setLoading(false));
  }, []);

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
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <p className="text-sm text-slate-500">
          Every client on the platform with their team. Click a row to expand
          staff. Use Impersonate to view the panel as that user.
        </p>
      </header>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
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
                    <div className="space-y-3 bg-slate-50/60 px-6 pb-5">
                      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Client Admin
                            </p>
                            {c.admin ? (
                              <p className="mt-1 text-sm font-medium text-slate-900">
                                {c.admin.name || "—"}
                                <span className="ml-2 text-slate-500">
                                  {c.admin.email}
                                </span>
                              </p>
                            ) : (
                              <p className="mt-1 text-sm text-slate-500">
                                None — needs onboarding.
                              </p>
                            )}
                          </div>
                          {c.admin && (
                            <button
                              type="button"
                              onClick={() => impersonate(c.admin!._id)}
                              disabled={busyId === c.admin._id}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                              {busyId === c.admin._id
                                ? "Switching…"
                                : "Impersonate"}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 px-4 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Staff ({c.staff.length})
                          </p>
                        </div>
                        {c.staff.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-slate-500">
                            No staff yet.
                          </p>
                        ) : (
                          <ul className="divide-y divide-slate-200">
                            {c.staff.map(s => (
                              <li
                                key={s._id}
                                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-slate-900">
                                    {s.name || "—"}
                                    <span className="ml-2 text-slate-500">
                                      {s.email}
                                    </span>
                                  </p>
                                  {s.assignedModules &&
                                    s.assignedModules.length > 0 && (
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
                                  onClick={() => impersonate(s._id)}
                                  disabled={busyId === s._id}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                                >
                                  {busyId === s._id
                                    ? "Switching…"
                                    : "Impersonate"}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

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
