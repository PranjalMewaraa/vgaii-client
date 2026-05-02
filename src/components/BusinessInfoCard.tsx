"use client";

import { useState } from "react";

type BusinessHour = {
  day?: string;
  open?: string;
  close?: string;
};

export type BusinessInfo = {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  category?: string;
  rating?: number;
  totalReviews?: number;
  hours?: BusinessHour[];
  mainPhoto?: string;
  mapsUrl?: string;
  syncedAt?: string;
};

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const todayHours = (hours?: BusinessHour[]) => {
  if (!hours?.length) return null;
  const todayKey = DAY_KEYS[new Date().getDay()];
  const match = hours.find(h => h.day?.toLowerCase() === todayKey);
  if (!match) return null;
  if (!match.open || !match.close) return "Closed today";
  return `${match.open} – ${match.close}`;
};

export default function BusinessInfoCard({
  businessInfo,
  onRefreshed,
}: {
  businessInfo: BusinessInfo | null;
  onRefreshed?: (next: BusinessInfo) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/business-info/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Refresh failed");
        return;
      }
      onRefreshed?.(data.businessInfo);
    } catch {
      setError("Network error");
    } finally {
      setRefreshing(false);
    }
  };

  if (!businessInfo || !businessInfo.name) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <h2 className="font-semibold text-slate-900">
          Connect your Google Business profile
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Your platform admin needs to set your Google Place ID first.
          Once that&apos;s in place, click refresh to pull your business
          listing into the dashboard.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "Refresh now"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    );
  }

  const hoursToday = todayHours(businessInfo.hours);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="shrink-0">
          {businessInfo.mainPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={businessInfo.mainPhoto}
              alt={businessInfo.name}
              className="h-28 w-28 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-indigo-600 text-3xl font-bold text-white">
              {businessInfo.name.charAt(0)}
            </div>
          )}
          {businessInfo.mapsUrl && (
            <a
              href={businessInfo.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-center text-xs text-indigo-600 hover:underline"
            >
              View on Maps →
            </a>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-900">
                {businessInfo.name}
              </h2>
              {businessInfo.category && (
                <p className="text-sm text-slate-500">{businessInfo.category}</p>
              )}
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {refreshing ? "…" : "↻ Refresh"}
            </button>
          </div>

          <div className="mt-3 space-y-1 text-sm text-slate-700">
            {businessInfo.address && <p>📍 {businessInfo.address}</p>}
            {businessInfo.phone && <p>📞 {businessInfo.phone}</p>}
            {businessInfo.website && (
              <p className="truncate">
                🌐{" "}
                <a
                  href={businessInfo.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  {businessInfo.website}
                </a>
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            {typeof businessInfo.rating === "number" && (
              <span className="font-semibold text-slate-900">
                ⭐ {businessInfo.rating.toFixed(1)}
                {typeof businessInfo.totalReviews === "number" && (
                  <span className="ml-1 font-normal text-slate-500">
                    ({businessInfo.totalReviews} reviews)
                  </span>
                )}
              </span>
            )}
            {hoursToday && (
              <span className="text-slate-600">🕐 Today: {hoursToday}</span>
            )}
          </div>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
