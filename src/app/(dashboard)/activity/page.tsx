"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGuard from "@/components/RoleGuard";

type Entry = {
  id: string;
  actorType: "user" | "webhook" | "public" | "system";
  actorId?: string | null;
  actorLabel: string;
  ip?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string;
  summary?: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

const ACTOR_BADGE: Record<string, string> = {
  user: "bg-indigo-100 text-indigo-700",
  webhook: "bg-amber-100 text-amber-700",
  public: "bg-sky-100 text-sky-700",
  system: "bg-slate-100 text-slate-700",
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function ActivityPage() {
  return (
    <RoleGuard allow={["CLIENT_ADMIN"]}>
      <ActivityPageInner />
    </RoleGuard>
  );
}

function ActivityPageInner() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [actorType, setActorType] = useState<string>("");
  const [entityType, setEntityType] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");

  const buildUrl = (cursor?: string | null) => {
    const url = new URL("/api/audit", window.location.origin);
    if (actorType) url.searchParams.set("actorType", actorType);
    if (entityType) url.searchParams.set("entityType", entityType);
    if (actionFilter) url.searchParams.set("action", actionFilter);
    if (cursor) url.searchParams.set("cursor", cursor);
    return url.toString();
  };

  useEffect(() => {
    // Loading state stays true on initial mount; subsequent filter changes
    // refetch silently to avoid flicker. (Matches the pattern used elsewhere
    // in the app for filter-driven re-fetches.)
    fetch(buildUrl(), { headers: authHeaders() })
      .then(res => res.json())
      .then(d => {
        setEntries(d.entries ?? []);
        setNextCursor(d.nextCursor ?? null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorType, entityType, actionFilter]);

  const loadMore = () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    fetch(buildUrl(nextCursor), { headers: authHeaders() })
      .then(res => res.json())
      .then(d => {
        setEntries(prev => [...prev, ...(d.entries ?? [])]);
        setNextCursor(d.nextCursor ?? null);
      })
      .finally(() => setLoadingMore(false));
  };

  const filtersActive = !!actorType || !!entityType || !!actionFilter;
  const clear = () => {
    setActorType("");
    setEntityType("");
    setActionFilter("");
  };

  // Group entries by day for the timeline view.
  const grouped = useMemo(() => {
    const out: Array<{ day: string; items: Entry[] }> = [];
    for (const e of entries) {
      const day = new Date(e.createdAt).toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const last = out[out.length - 1];
      if (last && last.day === day) {
        last.items.push(e);
      } else {
        out.push({ day, items: [e] });
      }
    }
    return out;
  }, [entries]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Activity log</h1>
        <p className="text-sm text-slate-500">
          Append-only record of every meaningful change in your account —
          patient edits, status changes, webhook events, settings updates.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Actor
            </span>
            <select
              value={actorType}
              onChange={e => setActorType(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All actors</option>
              <option value="user">Users</option>
              <option value="webhook">Webhooks</option>
              <option value="public">Public forms</option>
              <option value="system">System</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Entity
            </span>
            <select
              value={entityType}
              onChange={e => setEntityType(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All entities</option>
              <option value="Lead">Leads / Patients</option>
              <option value="Appointment">Appointments</option>
              <option value="Feedback">Feedback</option>
              <option value="Client">Client / Settings</option>
              <option value="User">Users / Staff</option>
            </select>
          </label>
          <label className="block flex-1 min-w-[200px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Action contains
            </span>
            <input
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              placeholder="e.g. lead.status.changed"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          {filtersActive && (
            <button
              type="button"
              onClick={clear}
              className="text-xs text-indigo-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
          No activity matches these filters.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <section key={group.day}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {group.day}
              </h2>
              <div className="rounded-xl border border-slate-200 bg-white">
                <ul className="divide-y divide-slate-200">
                  {group.items.map(e => (
                    <li key={e.id} className="px-5 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                ACTOR_BADGE[e.actorType] ?? ACTOR_BADGE.system
                              }`}
                            >
                              {e.actorType}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {e.actorLabel}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <code className="text-[11px] text-slate-500">
                              {e.action}
                            </code>
                          </div>
                          <p className="mt-1 text-sm text-slate-700">
                            {e.summary || e.action}
                          </p>
                          {e.entityLabel && (
                            <p className="text-xs text-slate-500">
                              {e.entityType}: {e.entityLabel}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <p>
                            {new Date(e.createdAt).toLocaleTimeString(
                              undefined,
                              { hour: "numeric", minute: "2-digit" },
                            )}
                          </p>
                          {e.ip && <p className="text-[10px]">{e.ip}</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}

          {nextCursor && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
