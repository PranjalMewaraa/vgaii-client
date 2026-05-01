"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";

type FeedbackRow = {
  _id: string;
  clientName?: string;
  clientPhone?: string;
  rating?: number;
  reviewText?: string;
  remark?: string;
  status?: "open" | "resolved";
  submittedAt?: string;
  createdAt?: string;
  lead?: {
    _id: string;
    name?: string;
    phone?: string;
    status?: string;
  } | null;
};

export default function FeedbacksPage() {
  return (
    <RoleGuard module="feedback">
      <FeedbacksPageInner />
    </RoleGuard>
  );
}

function FeedbacksPageInner() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/feedbacks", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(data => setRows(data.feedbacks ?? []))
      .finally(() => setLoading(false));
  }, []);

  const resolve = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        setRows(rs =>
          rs.map(r => (r._id === id ? { ...r, status: "resolved" } : r)),
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const visible = rows.filter(r => filter === "all" || r.status === filter);
  const openCount = rows.filter(r => r.status === "open").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Feedbacks</h1>
        <p className="text-sm text-slate-500">
          Customer feedback submitted after a low-rated visit.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              All Feedbacks
            </h2>
            <p className="text-xs text-slate-500">
              {rows.length} total · {openCount} open
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs">
            {(["all", "open", "resolved"] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 font-medium uppercase tracking-wider transition ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="px-6 py-6 text-sm text-slate-500">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">No feedback yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {visible.map(f => {
              const date = f.submittedAt || f.createdAt;
              const ratingTone =
                f.rating === 1 ? "text-red-600" : "text-amber-600";

              return (
                <li key={f._id} className="px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {f.lead?.name || f.clientName || "Anonymous"}
                        </p>
                        {typeof f.rating === "number" && (
                          <span className={`text-sm font-semibold ${ratingTone}`}>
                            ⭐ {f.rating}/5
                          </span>
                        )}
                        <StatusPill status={f.status} />
                      </div>
                      <p className="text-sm text-slate-600">
                        {f.lead?.phone || f.clientPhone || "—"}
                      </p>
                    </div>

                    <div className="text-right">
                      {date && (
                        <p className="text-xs text-slate-500">
                          {new Date(date).toLocaleString()}
                        </p>
                      )}
                      {f.lead && (
                        <Link
                          href={`/patients/${f.lead._id}`}
                          className="mt-1 inline-block text-xs text-indigo-600 hover:underline"
                        >
                          View patient →
                        </Link>
                      )}
                    </div>
                  </div>

                  {f.reviewText && (
                    <p className="mt-3 text-sm text-slate-700">{f.reviewText}</p>
                  )}
                  {f.remark && (
                    <p className="mt-2 text-xs text-slate-500">
                      Internal note: {f.remark}
                    </p>
                  )}

                  {f.status === "open" && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => resolve(f._id)}
                        disabled={busyId === f._id}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {busyId === f._id ? "Resolving…" : "Mark resolved"}
                      </button>
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
