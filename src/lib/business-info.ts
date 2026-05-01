import { getBusinessInfoLive } from "@/lib/dataforseo";

type WorkHourEntry = { day?: string; open?: string; close?: string };

type DataForSEOBusinessInfo = {
  title?: string;
  address?: string;
  phone?: string;
  url?: string;
  category?: string;
  rating?: { value?: number; votes_count?: number };
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

export type MappedBusinessInfo = {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  category?: string;
  rating?: number;
  totalReviews?: number;
  hours: WorkHourEntry[];
  mainPhoto?: string;
  mapsUrl?: string;
  syncedAt: Date;
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
    hours: mapHours(info),
    mainPhoto: info.main_image || info.logo,
    mapsUrl: placeId
      ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
      : undefined,
    syncedAt: new Date(),
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

type ClientForBusinessInfo = {
  googlePlaceId?: string;
  googleBusinessInfo?: { syncedAt?: Date | string | null } & MappedBusinessInfo;
  save: () => Promise<unknown>;
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

export const selfHealBusinessInfo = async (client: ClientForBusinessInfo) => {
  if (!client.googlePlaceId) return false;
  if (!isStale(client.googleBusinessInfo?.syncedAt)) return false;

  try {
    const fresh = await withTimeout(
      fetchBusinessInfo(client.googlePlaceId),
      SELF_HEAL_TIMEOUT_MS,
      "business-info self-heal",
    );
    if (!fresh) return false;
    client.googleBusinessInfo = fresh;
    await client.save();
    return true;
  } catch (err) {
    console.error("[business-info] self-heal failed:", err);
    return false;
  }
};
