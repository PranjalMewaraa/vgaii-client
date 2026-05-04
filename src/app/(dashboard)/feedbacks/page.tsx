"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  Globe,
  MessageSquare,
  RefreshCw,
  Star,
} from "lucide-react";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";

type FeedbackRow = {
  id: string;
  clientName?: string;
  clientPhone?: string;
  rating?: number;
  reviewText?: string;
  remark?: string;
  status?: "open" | "resolved";
  submittedAt?: string;
  createdAt?: string;
  lead?: {
    id: string;
    name?: string;
    phone?: string;
    status?: string;
  } | null;
};

type GoogleReview = {
  id: string;
  reviewerName?: string;
  reviewerPhoto?: string;
  profileUrl?: string;
  rating?: number;
  text?: string;
  timestamp?: string;
  ownerAnswer?: string;
};

type GoogleReviewsResponse = {
  placeIdSet: boolean;
  reviews: GoogleReview[];
  syncedAt: string | null;
  pending: boolean;
  error?: string;
};

type Tab = "internal" | "google";

const authHeaders = () => ({
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function FeedbacksPage() {
  return (
    <RoleGuard module="feedback">
      <FeedbacksPageInner />
    </RoleGuard>
  );
}

function FeedbacksPageInner() {
  const [tab, setTab] = useState<Tab>("internal");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Feedbacks</h1>
        <p className="text-sm text-slate-500">
          Internal post-visit feedback alongside public reviews from your
          Google Business listing.
        </p>
      </header>

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
        <TabButton
          active={tab === "internal"}
          onClick={() => setTab("internal")}
          icon={MessageSquare}
        >
          Internal
        </TabButton>
        <TabButton
          active={tab === "google"}
          onClick={() => setTab("google")}
          icon={Globe}
        >
          Google reviews
        </TabButton>
      </div>

      {tab === "internal" ? <InternalFeedbacks /> : <GoogleReviews />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Globe;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium uppercase tracking-wider transition ${
        active
          ? "bg-indigo-600 text-white"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon size={12} />
      {children}
    </button>
  );
}

function InternalFeedbacks() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/feedbacks", { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setRows(data.feedbacks ?? []))
      .finally(() => setLoading(false));
  }, []);

  const resolve = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      if (res.ok) {
        setRows(rs =>
          rs.map(r => (r.id === id ? { ...r, status: "resolved" } : r)),
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const visible = rows.filter(r => filter === "all" || r.status === filter);
  const openCount = rows.filter(r => r.status === "open").length;

  return (
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
              <li key={f.id} className="px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {f.lead?.name || f.clientName || "Anonymous"}
                      </p>
                      {typeof f.rating === "number" && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-sm font-semibold ${ratingTone}`}
                        >
                          <Star size={13} className="fill-current" />
                          {f.rating}/5
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
                        href={`/patients/${f.lead.id}`}
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
                      onClick={() => resolve(f.id)}
                      disabled={busyId === f.id}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {busyId === f.id ? "Resolving…" : "Mark resolved"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function GoogleReviews() {
  const [data, setData] = useState<GoogleReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "5" | "4" | "3" | "2" | "1">(
    "all",
  );

  const load = () =>
    fetch("/api/google-reviews", { headers: authHeaders() })
      .then(res => res.json())
      .then((d: GoogleReviewsResponse) => setData(d))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    setRefreshNote(null);
    try {
      const res = await fetch("/api/google-reviews/refresh", {
        method: "POST",
        headers: authHeaders(),
      });
      const body = await res.json();
      if (!res.ok) {
        setRefreshError(
          typeof body.error === "string" ? body.error : "Refresh failed",
        );
        return;
      }
      if (body.status === "ready") {
        setRefreshNote(`Synced ${body.reviews?.length ?? 0} reviews.`);
        await load();
      } else if (body.status === "pending") {
        setRefreshNote(
          "DataForSEO is still preparing the review batch. Tap Refresh again in a minute.",
        );
        // Reflect the pending flag without re-fetching the list.
        setData(d => (d ? { ...d, pending: true } : d));
      }
    } catch {
      setRefreshError("Network error");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading || !data) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (!data.placeIdSet) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900">
          <AlertCircle size={14} />
          Google Place ID not set
        </p>
        <p className="mt-1 text-xs text-amber-800">
          Ask your platform admin to set the Google Place ID for this
          client (Admin → Clients → Integrations). Reviews can&apos;t be
          fetched without it.
        </p>
      </div>
    );
  }

  const visible =
    filter === "all"
      ? data.reviews
      : data.reviews.filter(
          r => r.rating === Number(filter as unknown as string),
        );

  const ratingCounts = countByRating(data.reviews);
  const avg =
    data.reviews.length === 0
      ? null
      : data.reviews.reduce((s, r) => s + (r.rating ?? 0), 0) /
        data.reviews.filter(r => typeof r.rating === "number").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Globe size={14} />
            </span>
            Google reviews
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {data.reviews.length === 0
              ? "No reviews fetched yet — tap Refresh to pull the latest from your Google listing."
              : `${data.reviews.length} cached review${data.reviews.length === 1 ? "" : "s"}.`}
            {avg != null && ` Average ${avg.toFixed(1)}/5.`}
            {data.syncedAt && (
              <>
                {" "}
                Last synced{" "}
                <span title={new Date(data.syncedAt).toLocaleString()}>
                  {relativeTime(data.syncedAt)}
                </span>
                .
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {refreshError && (
        <p className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle size={14} />
          {refreshError}
        </p>
      )}
      {refreshNote && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {refreshNote}
        </p>
      )}
      {data.pending && !refreshing && (
        <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
          A previous refresh is still preparing in the background. Tap
          Refresh again to check on it.
        </p>
      )}

      {data.reviews.length > 0 && (
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
          {(["all", "5", "4", "3", "2", "1"] as const).map(f => {
            const count =
              f === "all"
                ? data.reviews.length
                : ratingCounts[Number(f) as 1 | 2 | 3 | 4 | 5];
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f === "all" ? `All (${count})` : `${f}★ (${count})`}
              </button>
            );
          })}
        </div>
      )}

      {data.reviews.length === 0 ? null : visible.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
          No reviews match this filter.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map(r => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: GoogleReview }) {
  const initial = (review.reviewerName ?? "?").charAt(0).toUpperCase();
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start gap-3">
        {review.reviewerPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.reviewerPhoto}
            alt={review.reviewerName ?? "Reviewer"}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {review.profileUrl ? (
                <a
                  href={review.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:underline"
                >
                  {review.reviewerName || "Anonymous"}
                  <ExternalLink size={11} className="text-slate-400" />
                </a>
              ) : (
                <span className="text-sm font-semibold text-slate-900">
                  {review.reviewerName || "Anonymous"}
                </span>
              )}
              {typeof review.rating === "number" && (
                <Stars rating={review.rating} />
              )}
            </div>
            {review.timestamp && (
              <span
                className="text-xs text-slate-500"
                title={new Date(review.timestamp).toLocaleString()}
              >
                {relativeTime(review.timestamp)}
              </span>
            )}
          </div>
          {review.text && (
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
              {review.text}
            </p>
          )}
          {review.ownerAnswer && (
            <div className="mt-3 rounded-lg border-l-2 border-indigo-300 bg-indigo-50/60 px-3 py-2 text-xs text-slate-700">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
                Owner reply
              </p>
              <p className="mt-0.5 whitespace-pre-line">
                {review.ownerAnswer}
              </p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function Stars({ rating }: { rating: number }) {
  // 1..5 stars, filled vs empty.
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={12}
          className={i <= rating ? "fill-current" : "text-slate-300"}
        />
      ))}
    </span>
  );
}

const countByRating = (
  reviews: GoogleReview[],
): Record<1 | 2 | 3 | 4 | 5, number> => {
  const out: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const r of reviews) {
    if (r.rating && r.rating >= 1 && r.rating <= 5) {
      out[r.rating as 1 | 2 | 3 | 4 | 5] += 1;
    }
  }
  return out;
};

const relativeTime = (iso: string): string => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diffSec = Math.round((Date.now() - t) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 30)
    return `${Math.round(diffSec / 86400)}d ago`;
  if (diffSec < 86400 * 365)
    return `${Math.round(diffSec / (86400 * 30))}mo ago`;
  return `${Math.round(diffSec / (86400 * 365))}y ago`;
};
