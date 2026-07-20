import { GOOGLE_REVIEW_API_KEY, GOOGLE_REVIEW_API_URL } from "@/lib/env";
import type { StoredGoogleReview } from "@/lib/google-reviews";

// Server-only client for the a2zcloud Google-Review microservice.
// Never import this into client components — it carries the API key.
//
// API base + auth live in src/lib/env.ts. All responses use the envelope
// { success, message, data }; helpers below unwrap `data` for callers.

export type ReviewSite = {
  id: number;
  website_slug: string;
  business_name: string;
  google_maps_url: string;
  place_id?: string | null;
  rating?: number | null;
  review_count?: number | null;
  last_fetched_at?: string | null;
  status?: string;
  google_total_reviews?: number | null;
  google_average_rating?: number | null;
};

export type ServiceReview = {
  id: number;
  website_id: number;
  google_review_id: string;
  reviewer_name?: string | null;
  reviewer_avatar?: string | null;
  rating?: number | null;
  review_date?: string | null; // relative, e.g. "a year ago"
  review_text?: string | null;
  review_language?: string | null;
  owner_reply?: string | null;
  owner_reply_date?: string | null;
  review_url?: string | null;
  is_verified?: number;
};

export type ReviewStats = {
  average_rating: number;
  review_count: number;
  imported_review_count: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
  latest_review_date?: string | null;
  google_total_reviews?: number | null;
  google_average_rating?: number | null;
  imported_average_rating?: number | null;
};

export type FetchLog = {
  website?: {
    slug?: string;
    business_name?: string;
    last_fetched_at?: string | null;
    rating?: number | null;
    review_count?: number | null;
    imported_review_count?: number | null;
    google_total_reviews?: number | null;
    google_average_rating?: number | null;
  };
  latest_fetch?: {
    id?: number;
    website_id?: number;
    status?: string; // "success" | "pending" | "running" | "failed" | …
    reviews_found?: number;
    execution_time?: number;
    message?: string;
    created_at?: string;
  } | null;
};

type Envelope<T> = { success: boolean; message: string; data: T };
type Paginated<T> = { data: T[]; total?: number; page?: number; limit?: number };

const REQUEST_TIMEOUT_MS = 12_000;

async function call<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${GOOGLE_REVIEW_API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "X-API-Key": GOOGLE_REVIEW_API_KEY,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      // Never cache the microservice responses at the fetch layer — freshness
      // is controlled by the caller (e.g. SWR / manual refresh).
      cache: "no-store",
    });

    const body = (await res.json().catch(() => null)) as
      | Envelope<T>
      | { error?: string }
      | null;

    if (!res.ok || !body || (body as Envelope<T>).success === false) {
      const msg =
        (body as { error?: string; message?: string } | null)?.error ||
        (body as { message?: string } | null)?.message ||
        `Review service error (${res.status})`;
      throw new Error(msg);
    }
    return (body as Envelope<T>).data;
  } finally {
    clearTimeout(timer);
  }
}

/* ----------------------------- Endpoints ----------------------------- */

export const reviewServiceHealth = () =>
  call<{ status: string; version: string; timestamp: string }>("/api/health");

export const listReviewSites = () => call<ReviewSite[]>("/api/websites");

export const addReviewSite = (input: {
  website_slug: string;
  business_name: string;
  google_maps_url: string;
}) =>
  call<ReviewSite>("/api/websites", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateReviewSite = (
  id: number | string,
  patch: Partial<{
    business_name: string;
    google_maps_url: string;
    status: string;
  }>,
) =>
  call<ReviewSite>(`/api/websites/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });

export const deleteReviewSite = (id: number | string) =>
  call<unknown>(`/api/websites/${id}`, { method: "DELETE" });

/** Kick off a scrape for a registered slug. Returns immediately; poll fetch-log. */
export const triggerReviewFetch = (slug: string) =>
  call<FetchLog>(`/api/fetch/${encodeURIComponent(slug)}`, { method: "POST" });

export const getFetchLog = (slug: string) =>
  call<FetchLog>(`/api/fetch-log/${encodeURIComponent(slug)}`);

export const getReviewsPage = (
  slug: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
) =>
  call<Paginated<ServiceReview>>(
    `/api/reviews/${encodeURIComponent(slug)}?page=${page}&limit=${limit}`,
  );

export const getLatestReviews = (slug: string) =>
  call<ServiceReview[]>(`/api/reviews/${encodeURIComponent(slug)}/latest`);

export const getReviewStats = (slug: string) =>
  call<ReviewStats>(`/api/stats/${encodeURIComponent(slug)}`);

/* ----------------------------- Mapping ------------------------------- */

// Bridge the service's review shape into the app's cached `StoredGoogleReview`
// (used by ReputationPanel / the feedbacks page). `review_date` is relative
// ("a year ago") so it can't become a real timestamp — kept undefined.
export const mapServiceReview = (r: ServiceReview): StoredGoogleReview => ({
  id: r.google_review_id || String(r.id),
  reviewerName: r.reviewer_name ?? undefined,
  reviewerPhoto: r.reviewer_avatar ?? undefined,
  profileUrl: r.review_url ?? undefined,
  rating: r.rating ?? undefined,
  text: r.review_text ?? undefined,
  timestamp: undefined,
  ownerAnswer: r.owner_reply ?? undefined,
});

// Build a Google Maps place URL from a bare place_id when a full maps URL
// isn't stored on the client. Accepted by the service's add-website call.
export const mapsUrlFromPlaceId = (placeId: string) =>
  `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
