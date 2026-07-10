"use client";

import Link from "next/link";
import useSWR from "swr";

type Entry = {
  id: string;
  action: string;
  entityType: string;
  entityLabel?: string;
  summary?: string;
  createdAt: string;
};

type Response = {
  entries: Entry[];
};

// Dot tone per action family — gives the timeline a hint of meaning without
// adding a separate icon column. Resolved/created/booked all use semantic
// colors; everything else falls through to slate.
const dotTone = (action: string): string => {
  if (/resolved|completed|visited/.test(action)) return "bg-emerald-500";
  if (/created|booked|added/.test(action)) return "bg-indigo-500";
  if (/deleted|removed|cancelled|expired|no_show/.test(action))
    return "bg-red-500";
  return "bg-slate-400";
};

export default function RecentActivityCard() {
  // 403 on STAFF role — fall back to a friendly empty state instead of
  // surfacing a permission error on the dashboard.
  const { data, error, isLoading } = useSWR<Response>("/api/audit?limit=2", {
    shouldRetryOnError: false,
  });

  const entries = data?.entries ?? [];
  const forbidden = (error as { status?: number } | undefined)?.status === 403;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            Recent Activity
          </h2>
          <p className="text-xs text-slate-500">
            Latest updates from your system.
          </p>
        </div>
        <Link
          href="/activity"
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          View all activity →
        </Link>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : forbidden ? (
          <p className="text-xs text-slate-500">
            Activity log is admin-only.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-slate-500">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map(e => {
              const dt = new Date(e.createdAt);
              return (
                <li key={e.id} className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${dotTone(e.action)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {e.summary || e.action.replace(/\./g, " ")}
                    </p>
                    {e.entityLabel && (
                      <p className="truncate text-xs text-slate-500">
                        {e.entityType}: {e.entityLabel}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-[11px] text-slate-400">
                    <p>{dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                    <p>{dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
