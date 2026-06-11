// Cloudflare Turnstile server-side verification.
//
// Captcha is enforced ONLY when TURNSTILE_SECRET_KEY is set. With it unset
// (local dev, or before keys are configured) verification is skipped so login
// keeps working — you can never lock yourself out by not setting a key.

const SECRET = process.env.TURNSTILE_SECRET_KEY;
const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const isTurnstileEnabled = (): boolean => !!SECRET;

export async function verifyTurnstile(
  token: unknown,
  ip?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!SECRET) return { ok: true }; // disabled
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, error: "Please complete the captcha." };
  }

  try {
    const form = new URLSearchParams();
    form.set("secret", SECRET);
    form.set("response", token);
    if (ip) form.set("remoteip", ip);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success
      ? { ok: true }
      : { ok: false, error: "Captcha verification failed. Try again." };
  } catch {
    return { ok: false, error: "Couldn't verify the captcha. Try again." };
  }
}
