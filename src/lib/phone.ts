/**
 * Canonical phone form used for cross-source matching.
 *
 * Strips every non-digit, then keeps only the last 10 digits — which means
 * `9717583895`, `+919717583895`, `+91 9717 583895`, `(971) 758-3895` all
 * collapse to `9717583895`. Two stores that both go through this helper can
 * be compared by exact equality, regardless of how the user typed it.
 *
 * Trade-off: 10-digit truncation is correct for India (and most national
 * phone plans). If we ever need to disambiguate two different countries
 * with the same trailing 10 digits, we'd switch to libphonenumber-js for
 * proper E.164 normalization. Not worth the dependency for now.
 */
export const canonicalPhone = (input: string | null | undefined): string => {
  if (!input) return "";
  return input.replace(/[^\d]/g, "").slice(-10);
};
