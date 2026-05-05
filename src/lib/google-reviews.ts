import { prisma } from "@/lib/prisma";
import {
  type DataForSEOReviewItem,
  getReviewsLive,
  getReviewsTaskResult,
  submitReviewsTask,
} from "@/lib/dataforseo";
import type { Prisma } from "@/generated/prisma/client";

// Stored shape: a single item in the cached reviews array. Lives inside
// `Client.googleBusinessInfo.reviews`. Kept stable across DataForSEO
// schema changes — the mapping is here, not in components.
export type StoredGoogleReview = {
  id: string;
  reviewerName?: string;
  reviewerPhoto?: string;
  profileUrl?: string;
  rating?: number;
  text?: string;
  timestamp?: string; // ISO
  ownerAnswer?: string;
};

const mapReview = (
  item: DataForSEOReviewItem,
  fallbackIndex: number,
): StoredGoogleReview => ({
  // DataForSEO doesn't always include a stable ID; falling back to a
  // composite of timestamp+name+index keeps React keys stable across
  // re-fetches as long as the underlying review hasn't moved positions.
  id:
    item.review_id ??
    `${item.timestamp ?? "ts"}-${item.profile_name ?? "anon"}-${fallbackIndex}`,
  reviewerName: item.profile_name,
  reviewerPhoto: item.profile_image_url,
  profileUrl: item.profile_url,
  rating: item.rating?.value,
  text: item.review_text,
  // DataForSEO timestamps come as "2024-01-01 10:00:00 +00:00"; normalize
  // to ISO so the UI's `new Date(...)` works in every browser.
  timestamp: item.timestamp
    ? new Date(item.timestamp).toISOString()
    : undefined,
  ownerAnswer: item.owner_answer,
});

// Poll budget for one refresh cycle. DataForSEO Google reviews tasks
// usually finish in 10–60s; we cap our server-held connection at 45s so
// a single click resolves most of the time without hitting Vercel's
// function timeout. The taskId persists between refreshes either way,
// so a slow batch is just one more click.
const POLL_TOTAL_MS = 45_000;
const POLL_INTERVAL_MS = 3_000;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export type RefreshOutcome =
  | {
      status: "ready";
      reviews: StoredGoogleReview[];
      syncedAt: string;
    }
  | { status: "pending"; taskId: string }
  | { status: "no-place-id" };

// Refresh Google reviews for a single client. Strategy:
//   1. Try DataForSEO's *live* endpoint — synchronous, returns in 5–30s.
//      This is the happy path; covers ~95% of refreshes cleanly.
//   2. If live fails (account doesn't have access, network blip, etc.),
//      fall back to the task-based flow: submit a task, poll for ~45s,
//      return pending if it's still working — the same task id persists
//      in `Client.reviewsTaskId` and gets picked up on the next refresh.
export const refreshClientReviews = async (
  clientId: string,
): Promise<RefreshOutcome> => {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      googlePlaceId: true,
      googleBusinessInfo: true,
      reviewsTaskId: true,
    },
  });
  if (!client) throw new Error("Client not found");
  if (!client.googlePlaceId) return { status: "no-place-id" };

  // Step 1 — Live endpoint. Fast path.
  try {
    const items = await getReviewsLive(client.googlePlaceId);
    return persistAndReturn(clientId, client.googleBusinessInfo, items);
  } catch (err) {
    console.warn(
      "[google-reviews] live endpoint failed, falling back to task-based",
      err,
    );
    // Fall through to task-based path.
  }

  // Step 2 — Task fallback. Reuse an existing in-flight task if one is
  // around, otherwise submit a new one.
  let taskId = client.reviewsTaskId ?? null;

  const tryFetch = async (): Promise<
    | { kind: "ready"; items: DataForSEOReviewItem[] }
    | { kind: "pending" }
    | { kind: "stale" }
  > => {
    if (!taskId) return { kind: "pending" };
    try {
      const r = await getReviewsTaskResult(taskId);
      if (r.ready) return { kind: "ready", items: r.items };
      return { kind: "pending" };
    } catch {
      return { kind: "stale" };
    }
  };

  const initial = taskId ? await tryFetch() : { kind: "pending" as const };
  if (initial.kind === "ready") {
    return persistAndReturn(clientId, client.googleBusinessInfo, initial.items);
  }

  if (initial.kind === "stale" || !taskId) {
    taskId = await submitReviewsTask(client.googlePlaceId);
    await prisma.client.update({
      where: { id: clientId },
      data: { reviewsTaskId: taskId },
    });
  }

  const start = Date.now();
  while (Date.now() - start < POLL_TOTAL_MS) {
    await sleep(POLL_INTERVAL_MS);
    const r = await tryFetch();
    if (r.kind === "ready") {
      return persistAndReturn(clientId, client.googleBusinessInfo, r.items);
    }
    if (r.kind === "stale") break;
  }

  return { status: "pending", taskId };
};

const persistAndReturn = async (
  clientId: string,
  existingInfo: Prisma.JsonValue | null,
  items: DataForSEOReviewItem[],
): Promise<RefreshOutcome> => {
  const reviews = items.map(mapReview);
  const syncedAt = new Date().toISOString();

  const merged = {
    ...((typeof existingInfo === "object" && existingInfo !== null
      ? (existingInfo as Record<string, unknown>)
      : {}) as Record<string, unknown>),
    reviews,
    reviewsSyncedAt: syncedAt,
  };

  await prisma.client.update({
    where: { id: clientId },
    data: {
      googleBusinessInfo: merged as Prisma.InputJsonValue,
      // Task is finished — clear the marker so the next refresh starts
      // a fresh task instead of polling a completed one.
      reviewsTaskId: null,
    },
  });

  return { status: "ready", reviews, syncedAt };
};

// Read-side helper: pull cached reviews + sync state from the existing
// googleBusinessInfo blob.
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
      googleBusinessInfo: true,
      reviewsTaskId: true,
    },
  });
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
    placeIdSet: !!client?.googlePlaceId,
    reviews,
    syncedAt,
    pending: !!client?.reviewsTaskId,
  };
};
