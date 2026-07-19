// Centralized environment configuration with safe defaults.
//
// Values are read from process.env first, falling back to the baked-in
// defaults below so local/dev builds work out of the box. Override in
// production via real environment variables.

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");

/**
 * Google Review fetching microservice (a2zcloud).
 * Registers a business by slug + Google Maps URL, triggers a scrape, and
 * exposes the collected reviews / stats. See `src/lib/google-review-service.ts`.
 */
export const GOOGLE_REVIEW_API_URL = stripTrailingSlash(
  process.env.GOOGLE_REVIEW_API_URL || "https://google-review.a2zcloud.host",
);

export const GOOGLE_REVIEW_API_KEY =
  process.env.GOOGLE_REVIEW_API_KEY || "tlg-dev-api-key-change-in-production";
