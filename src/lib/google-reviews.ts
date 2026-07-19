import { prisma } from "@/lib/prisma";
import {
  ensureReviewSite,
  getFetchLog,
  getLatestReviews,
  mapServiceReview,
  mapsUrlFromPlaceId,
  triggerReviewFetch,
} from "@/lib/google-review-service";
import type { Prisma } from "@/generated/prisma/client";

// Stored shape: a single item in the cached reviews array. Lives inside
// `Client.googleBusinessInfo.reviews`.
export type StoredGoogleReview = {
  id: string;
  reviewerName?: string;
  reviewerPhoto?: string;
  profileUrl?: string;
  rating?: number;
  text?: string;
  timestamp?: string;
  ownerAnswer?: string;
};

export type RefreshOutcome =
  | {
      status: "ready";
      reviews: StoredGoogleReview[];
      syncedAt: string;
    }
  | { status: "pending"; taskId: string }
  | { status: "no-place-id" };

// The slug a client is registered under in the a2zcloud review service.
// profileSlug is the natural key; fall back to the client id so every
// tenant has a stable, unique slug even before they pick a public handle.
const slugFor = (clientId: string, profileSlug: string | null) =>
  profileSlug || clientId;

// Pull the latest reviews from the review service into our own cache
// (Client.googleBusinessInfo.reviews) so reads stay fast and offline-safe.
// `marker` sets reviewsTaskId in the same write: a sentinel while a fresh
// scrape is in flight, or null to clear it once the scrape is done.
const cacheLatest = async (
  clientId: string,
  existingInfo: Prisma.JsonValue | null,
  slug: string,
  marker: string | null | undefined,
): Promise<{ reviews: StoredGoogleReview[]; syncedAt: string }> => {
  const items = await getLatestReviews(slug);
  const reviews = items.map(mapServiceReview);
  const syncedAt = new Date().toISOString();

  const merged = {
    ...((typeof existingInfo === "object" && existingInfo !== null
      ? (existingInfo as Record<string, unknown>)
      : {}) as Record<string, unknown>),
    reviews,
    reviewsSyncedAt: syncedAt,
  };

  const data: Prisma.ClientUpdateInput = {
    googleBusinessInfo: merged as Prisma.InputJsonValue,
  };
  if (marker !== undefined) data.reviewsTaskId = marker;

  await prisma.client.update({ where: { id: clientId }, data });
  return { reviews, syncedAt };
};

// Fast-return refresh, now backed by the a2zcloud review service.
//   - If a scrape is already in flight (reviewsTaskId set), check the
//     fetch-log once. If the latest fetch succeeded, pull + persist and
//     return ready; otherwise return pending so the UI keeps polling.
//   - Otherwise register the site (idempotent), kick off a fresh scrape,
//     surface whatever the service already has, and return pending.
// GET /api/google-reviews lazy-advances the in-flight scrape on every
// read, so the UI fills in without the user re-clicking.
export const refreshClientReviews = async (
  clientId: string,
): Promise<RefreshOutcome> => {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      name: true,
      googlePlaceId: true,
      googleMapsUrl: true,
      profileSlug: true,
      googleBusinessInfo: true,
      reviewsTaskId: true,
    },
  });
  if (!client) throw new Error("Client not found");

  // The service registers a business by its Google Maps URL. Prefer the
  // explicitly-stored URL (most reliable); otherwise derive one from the
  // place id. Without either we can't register — surface no-place-id.
  const mapsUrl =
    client.googleMapsUrl ||
    (client.googlePlaceId ? mapsUrlFromPlaceId(client.googlePlaceId) : null);
  if (!mapsUrl) return { status: "no-place-id" };

  const slug = slugFor(clientId, client.profileSlug);

  // Make sure the slug exists in the service before fetching/reading.
  await ensureReviewSite({
    website_slug: slug,
    business_name: client.name,
    google_maps_url: mapsUrl,
  });

  // 1. Scrape already in flight — advance it once.
  if (client.reviewsTaskId) {
    try {
      const log = await getFetchLog(slug);
      if (log?.latest_fetch?.status === "success") {
        const { reviews, syncedAt } = await cacheLatest(
          clientId,
          client.googleBusinessInfo,
          slug,
          null,
        );
        return { status: "ready", reviews, syncedAt };
      }
      return { status: "pending", taskId: client.reviewsTaskId };
    } catch (err) {
      // Stale marker (slug renamed, service reset, etc.) — fall through
      // and kick a fresh scrape.
      console.warn("[reviews] in-flight fetch-log check failed", err);
    }
  }

  // 2. Kick off a fresh scrape. Best-effort — if the trigger is slow or
  //    errors, the marker + fetch-log poll still surfaces the result.
  try {
    await triggerReviewFetch(slug);
  } catch (err) {
    console.warn("[reviews] trigger failed", err);
  }

  const marker = `a2z:${slug}`;
  // Surface whatever the service already holds so the card isn't empty
  // while the new scrape runs; mark the scrape in flight in the same write.
  try {
    await cacheLatest(clientId, client.googleBusinessInfo, slug, marker);
  } catch (err) {
    console.warn("[reviews] initial pull failed", err);
    await prisma.client.update({
      where: { id: clientId },
      data: { reviewsTaskId: marker },
    });
  }
  return { status: "pending", taskId: marker };
};

// Read-side helper: pull cached reviews + sync state. If a task is in
// flight, opportunistically check on it once (no polling) — that way
// every GET /api/google-reviews advances the task one step, and a
// background batch finishing between user actions becomes visible on
// the next page load / SWR re-fetch without explicit user action.
export const readCachedReviews = async (
  clientId: string,
): Promise<{
  placeIdSet: boolean;
  reviews: StoredGoogleReview[];
  syncedAt: string | null;
  pending: boolean;
}> => {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      googlePlaceId: true,
      googleMapsUrl: true,
      profileSlug: true,
      googleBusinessInfo: true,
      reviewsTaskId: true,
    },
  });

  // Lazy-advance: if a scrape is in flight, check the fetch-log once. If
  // the latest fetch succeeded, pull + persist and return fresh data;
  // otherwise fall through to read whatever's cached.
  if (client?.reviewsTaskId) {
    const slug = slugFor(clientId, client.profileSlug);
    try {
      const log = await getFetchLog(slug);
      if (log?.latest_fetch?.status === "success") {
        await cacheLatest(clientId, client.googleBusinessInfo, slug, null);
        // Re-read so the response reflects the freshly-persisted reviews.
        const fresh = await prisma.client.findUnique({
          where: { id: clientId },
          select: {
            googlePlaceId: true,
            googleMapsUrl: true,
            googleBusinessInfo: true,
            reviewsTaskId: true,
          },
        });
        return shapeRead(fresh);
      }
    } catch (err) {
      // Service hiccup / stale marker; the next refresh will replace it.
      console.warn("[reviews] lazy fetch-log check failed", err);
    }
  }

  return shapeRead(client);
};

const shapeRead = (
  client: {
    googlePlaceId: string | null;
    googleMapsUrl?: string | null;
    googleBusinessInfo: Prisma.JsonValue | null;
    reviewsTaskId: string | null;
  } | null,
): {
  placeIdSet: boolean;
  reviews: StoredGoogleReview[];
  syncedAt: string | null;
  pending: boolean;
} => {
  const info =
    typeof client?.googleBusinessInfo === "object" &&
    client?.googleBusinessInfo !== null
      ? (client.googleBusinessInfo as Record<string, unknown>)
      : {};
  const reviews = Array.isArray(info.reviews)
    ? (info.reviews as StoredGoogleReview[])
    : [];
  const syncedAt =
    typeof info.reviewsSyncedAt === "string" ? info.reviewsSyncedAt : null;
  return {
    // Reviews can be fetched with either a place id or a full Maps URL.
    placeIdSet: !!(client?.googlePlaceId || client?.googleMapsUrl),
    reviews,
    syncedAt,
    pending: !!client?.reviewsTaskId,
  };
};
