"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Star,
} from "lucide-react";
import type { BusinessInfo } from "@/components/BusinessInfoCard";

export type InternalFeedbackSummary = {
  total: number;
  open: number;
  resolved: number;
  ratedCount: number;
  avgRating: number | null;
};

const Stars = ({ value }: { value: number }) => (
  <span className="inline-flex items-center gap-1 text-amber-500">
    <Star size={14} className="fill-current" />
    <span className="text-sm font-semibold text-slate-900">
      {value.toFixed(1)}
    </span>
  </span>
);

const EMPTY_INTERNAL: InternalFeedbackSummary = {
  total: 0,
  open: 0,
  resolved: 0,
  ratedCount: 0,
  avgRating: null,
};

export default function ReputationPanel({
  businessInfo,
  internal: internalProp,
}: {
  businessInfo: BusinessInfo | null;
  internal: InternalFeedbackSummary | null | undefined;
}) {
  const internal = internalProp ?? EMPTY_INTERNAL;
  const hasGoogle =
    !!businessInfo &&
    typeof businessInfo.rating === "number" &&
    typeof businessInfo.totalReviews === "number";

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
        <div>
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
              <Star size={14} className="fill-current" />
            </span>
            Reputation
          </h2>
          <p className="text-xs text-slate-500">
            Public Google reviews and internal post-visit feedback at a
            glance.
          </p>
        </div>
        <Link
          href="/feedbacks"
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          View internal feedback →
        </Link>
      </header>

      <div className="grid flex-1 grid-cols-1 divide-y divide-slate-200 md:grid-cols-2 md:divide-x md:divide-y-0">
        {/* Google reviews */}
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Google Business
          </p>
          {hasGoogle ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div>
                <Stars value={businessInfo!.rating!} />
                <p className="mt-1 text-xs text-slate-500">
                  {businessInfo!.totalReviews!.toLocaleString()} review
                  {businessInfo!.totalReviews === 1 ? "" : "s"}
                </p>
              </div>
              {businessInfo?.mapsUrl && (
                <a
                  href={businessInfo.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                >
                  <ExternalLink size={11} />
                  Open in Maps
                </a>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Not connected. Ask your platform admin to set the Google
              Place ID, then refresh from the listing card above.
            </p>
          )}
        </div>

        {/* Internal feedback */}
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Internal feedback
          </p>
          {internal.total === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              No post-visit feedback submitted yet. Patients are prompted
              after their visit via the link sent on the appointment row.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                {internal.avgRating != null ? (
                  <div>
                    <Stars value={internal.avgRating} />
                    <p className="mt-1 text-xs text-slate-500">
                      from {internal.ratedCount} rated submission
                      {internal.ratedCount === 1 ? "" : "s"}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    No ratings yet.
                  </p>
                )}
                <span className="ml-auto text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  {internal.total} total
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <Pill tone={internal.open > 0 ? "red" : "slate"}>
                  <AlertCircle size={11} />
                  {internal.open} open
                </Pill>
                <Pill tone="emerald">
                  <CheckCircle2 size={11} />
                  {internal.resolved} resolved
                </Pill>
                <Pill tone="indigo">
                  <MessageSquare size={11} />
                  {internal.ratedCount} with rating
                </Pill>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "red" | "emerald" | "indigo" | "slate";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    red: "bg-red-50 text-red-700",
    emerald: "bg-emerald-50 text-emerald-700",
    indigo: "bg-blue-50 text-blue-700",
    slate: "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}
