import { prisma } from "@/lib/prisma";
import {
  type DataForSEOReviewItem,
  getReviewsTaskResult,
  submitReviewsTask,
} from "@/lib/dataforseo";
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

const mapReview = (
  item: DataForSEOReviewItem,
  fallbackIndex: number,
): StoredGoogleReview => ({
  id:
    item.review_id ??
    `${item.timestamp ?? "ts"}-${item.profile_name ?? "anon"}-${fallbackIndex}`,
  reviewerName: item.profile_name,
  reviewerPhoto: item.profile_image_url,
  profileUrl: item.profile_url,
  rating: item.rating?.value,
  text: item.review_text,
  timestamp: item.timestamp
    ? new Date(item.timestamp).toISOString()
    : undefined,
  ownerAnswer: item.owner_answer,
});

export type RefreshOutcome =
  | {
      status: "ready";
      reviews: StoredGoogleReview[];
      syncedAt: string;
    }
  | { status: "pending"; taskId: string }
  | { status: "no-place-id" };

// Fast-return refresh. Behaviour:
//   - If a task is already in flight, check it once (no polling). If it's
//     ready, persist; otherwise return pending immediately so the UI can
//     show "fetching" and start auto-polling the read endpoint.
//   - If no task is in flight, submit a fresh one and return pending.
// Either way, GET /api/google-reviews lazy-advances the in-flight task
// on every read, so the UI fills in as soon as DataForSEO completes —
// without the user needing to keep clicking.
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

  // 1. If a task is already in flight, check it once. Don't poll —
  //    polling within a request handler is what made earlier refreshes
  //    feel broken on slow batches.
  if (client.reviewsTaskId) {
    try {
      const r = await getReviewsTaskResult(client.reviewsTaskId);
      if (r.ready) {
        return persistAndReturn(
          clientId,
          client.googleBusinessInfo,
          r.items,
        );
      }
      return { status: "pending", taskId: client.reviewsTaskId };
    } catch (err) {
      // Stale / invalid task id (older than DataForSEO's retention,
      // typo, etc.) — drop it and fall through to submit a fresh one.
      console.warn(
        "[google-reviews] in-flight task check failed, submitting fresh",
        err,
      );
    }
  }

  // 2. Submit a new task. The id is persisted so subsequent GETs (and
  //    the next refresh click) can advance it.
  const taskId = await submitReviewsTask(client.googlePlaceId);
  await prisma.client.update({
    where: { id: clientId },
    data: { reviewsTaskId: taskId },
  });
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
      // Task is finished — clear so the next refresh starts fresh.
      reviewsTaskId: null,
    },
  });

  return { status: "ready", reviews, syncedAt };
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
      googleBusinessInfo: true,
      reviewsTaskId: true,
    },
  });

  // Lazy-advance: if there's a task in flight, check it once. If it's
  // ready, persist + return fresh data. If not, fall through to read
  // whatever's cached.
  if (client?.googlePlaceId && client.reviewsTaskId) {
    try {
      const r = await getReviewsTaskResult(client.reviewsTaskId);
      if (r.ready) {
        await persistAndReturn(
          client.googlePlaceId, // unused by persistAndReturn, just nonempty
          client.googleBusinessInfo,
          r.items,
        );
        // Re-read the row so the response reflects the freshly-persisted
        // reviews (instead of the pre-task cache).
        const fresh = await prisma.client.findUnique({
          where: { id: clientId },
          select: {
            googlePlaceId: true,
            googleBusinessInfo: true,
            reviewsTaskId: true,
          },
        });
        return shapeRead(fresh);
      }
    } catch (err) {
      // Stale task id; the next refresh will replace it.
      console.warn("[google-reviews] lazy task check failed", err);
    }
  }

  return shapeRead(client);
};

const shapeRead = (
  client: {
    googlePlaceId: string | null;
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
    placeIdSet: !!client?.googlePlaceId,
    reviews,
    syncedAt,
    pending: !!client?.reviewsTaskId,
  };
};
