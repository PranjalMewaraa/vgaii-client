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

/**
 * E.164 form for India: always returns `+91XXXXXXXXXX` (13 chars) when
 * the input has at least 10 digits, or `""` if it doesn't.
 *
 * Reuses `canonicalPhone` to strip everything to the last 10 digits, then
 * prepends `+91`. This means a number stored as `9717583895` or
 * `+91 9717-583895` or `0091 9717 583895` all normalize to `+919717583895`.
 *
 * Used for Cal.com prefill and any other downstream that expects E.164.
 */
export const toE164India = (input: string | null | undefined): string => {
  const digits = canonicalPhone(input);
  if (digits.length < 10) return "";
  return `+91${digits}`;
};
