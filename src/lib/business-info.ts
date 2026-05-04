import { getBusinessInfoLive } from "@/lib/dataforseo";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type WorkHourEntry = { day?: string; open?: string; close?: string };

type DataForSEOBusinessInfo = {
  title?: string;
  address?: string;
  phone?: string;
  url?: string;
  category?: string;
  rating?: {
    value?: number;
    votes_count?: number;
    // DataForSEO sometimes includes a per-star breakdown when Google
    // exposes the histogram. Keys are stringified star counts ("1"–"5").
    rating_distribution?: Partial<Record<"1" | "2" | "3" | "4" | "5", number>>;
  };
  work_time?: {
    work_hours?: {
      timetable?: Record<
        string,
        Array<{
          open?: { hour?: number; minute?: number };
          close?: { hour?: number; minute?: number };
        }>
      >;
    };
  };
  main_image?: string;
  logo?: string;
  place_id?: string;
};

export type RatingDistribution = Record<"1" | "2" | "3" | "4" | "5", number>;

export type MappedBusinessInfo = {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  category?: string;
  rating?: number;
  totalReviews?: number;
  // Per-star breakdown when Google exposes it. Absent when DataForSEO's
  // response doesn't include the histogram.
  ratingDistribution?: RatingDistribution;
  hours: WorkHourEntry[];
  mainPhoto?: string;
  mapsUrl?: string;
  // ISO 8601 string instead of Date so the value is JSON-serializable
  // when stored in the Prisma `Json` column. The dashboard staleness
  // check parses it back when needed.
  syncedAt: string;
};

const fmtTime = (t?: { hour?: number; minute?: number }) => {
  if (!t || typeof t.hour !== "number") return undefined;
  const h = String(t.hour).padStart(2, "0");
  const m = String(t.minute ?? 0).padStart(2, "0");
  return `${h}:${m}`;
};

const mapHours = (info: DataForSEOBusinessInfo): WorkHourEntry[] => {
  const timetable = info.work_time?.work_hours?.timetable;
  if (!timetable) return [];
  return Object.entries(timetable).flatMap(([day, slots]) =>
    (slots ?? []).map(s => ({
      day,
      open: fmtTime(s?.open),
      close: fmtTime(s?.close),
    }))
  );
};

const mapDistribution = (
  raw?: NonNullable<DataForSEOBusinessInfo["rating"]>["rating_distribution"],
): RatingDistribution | undefined => {
  if (!raw) return undefined;
  // Coerce to a complete 1..5 record so consumers can iterate without
  // null checks. Missing buckets fall back to 0.
  return {
    "1": Number(raw["1"] ?? 0),
    "2": Number(raw["2"] ?? 0),
    "3": Number(raw["3"] ?? 0),
    "4": Number(raw["4"] ?? 0),
    "5": Number(raw["5"] ?? 0),
  };
};

export const mapBusinessInfo = (
  info: DataForSEOBusinessInfo,
  fallbackPlaceId?: string,
): MappedBusinessInfo => {
  const placeId = info.place_id || fallbackPlaceId;
  return {
    name: info.title,
    address: info.address,
    phone: info.phone,
    website: info.url,
    category: info.category,
    rating: info.rating?.value,
    totalReviews: info.rating?.votes_count,
    ratingDistribution: mapDistribution(info.rating?.rating_distribution),
    hours: mapHours(info),
    mainPhoto: info.main_image || info.logo,
    mapsUrl: placeId
      ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
      : undefined,
    syncedAt: new Date().toISOString(),
  };
};

export const fetchBusinessInfo = async (placeId: string) => {
  const info = (await getBusinessInfoLive(placeId)) as DataForSEOBusinessInfo | undefined;
  if (!info) return null;
  return mapBusinessInfo(info, placeId);
};

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export const isStale = (syncedAt?: Date | string | null) => {
  if (!syncedAt) return true;
  const ts = typeof syncedAt === "string" ? Date.parse(syncedAt) : syncedAt.getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > STALE_AFTER_MS;
};

type ClientSnapshot = {
  id: string;
  googlePlaceId?: string | null;
  googleBusinessInfo?: { syncedAt?: Date | string | null } | null;
};

// Belt-and-suspenders ceiling on top of the axios timeout: even if the network
// call doesn't fault cleanly, the dashboard never blocks longer than this on
// business-info self-heal.
const SELF_HEAL_TIMEOUT_MS = 5000;

const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);

// Returns the freshly fetched business info if it was actually refreshed,
// otherwise null. Caller can merge the returned value into its response so
// the dashboard sees the new data without re-reading from MySQL.
export const selfHealBusinessInfo = async (
  client: ClientSnapshot,
): Promise<MappedBusinessInfo | null> => {
  if (!client.googlePlaceId) return null;
  if (!isStale(client.googleBusinessInfo?.syncedAt)) return null;

  try {
    const fresh = await withTimeout(
      fetchBusinessInfo(client.googlePlaceId),
      SELF_HEAL_TIMEOUT_MS,
      "business-info self-heal",
    );
    if (!fresh) return null;
    await prisma.client.update({
      where: { id: client.id },
      data: { googleBusinessInfo: fresh as unknown as Prisma.InputJsonValue },
    });
    return fresh;
  } catch (err) {
    console.error("[business-info] self-heal failed:", err);
    return null;
  }
};
