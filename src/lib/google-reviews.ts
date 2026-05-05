import { prisma } from "@/lib/prisma";
import {
  type DataForSEOReviewItem,
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

// Refresh google reviews for a single client. Bounded polling: post a
// task if none is in flight, then poll task_get for up to 25s. Returns
// either the freshly cached reviews or a "still pending" state — the
// caller (and the user) can hit refresh again to keep polling.
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

  // Reuse an in-flight task ID if one was started recently.
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
      // Stale or invalid task id — drop it and start over below.
      return { kind: "stale" };
    }
  };

  // Step 1: see if an in-flight task is already done.
  const initial = taskId ? await tryFetch() : { kind: "pending" as const };
  if (initial.kind === "ready") {
    return persistAndReturn(clientId, client.googleBusinessInfo, initial.items);
  }

  // Stale or no task — submit a fresh one.
  if (initial.kind === "stale" || !taskId) {
    taskId = await submitReviewsTask(client.googlePlaceId);
    await prisma.client.update({
      where: { id: clientId },
      data: { reviewsTaskId: taskId },
    });
  }

  // Step 2: poll until ready or we hit the budget.
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
