// Env-gated transactional email via Resend (https://resend.com). Fetch-based,
// no SDK dependency. Mirrors the no-op pattern of turnstile.ts / r2.ts:
// disabled unless RESEND_API_KEY is set, and every send is best-effort —
// failures are logged, never thrown, so email can never block a booking.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Must be a verified Resend sender (e.g. "Clinic <noreply@yourdomain.com>").
// Falls back to Resend's shared test sender, which only delivers to the
// account owner — set RESEND_FROM for real sending.
const RESEND_FROM = process.env.RESEND_FROM || "onboarding@resend.dev";

export const isEmailEnabled = (): boolean => !!RESEND_API_KEY;

export async function sendAppointmentConfirmation(params: {
  to: string;
  name?: string;
  whenLocalLabel: string;
  clinicName?: string;
}): Promise<void> {
  if (!RESEND_API_KEY || !params.to) return;
  try {
    const clinic = params.clinicName ? ` at ${params.clinicName}` : "";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [params.to],
        subject: `Appointment confirmed${params.clinicName ? ` — ${params.clinicName}` : ""}`,
        text:
          `Hi ${params.name || "there"},\n\n` +
          `Your appointment${clinic} is confirmed for ${params.whenLocalLabel}.\n\n` +
          `If you need to reschedule, please contact the clinic.\n`,
      }),
    });
    if (!res.ok) {
      console.error(
        "[email] resend failed:",
        res.status,
        await res.text().catch(() => ""),
      );
    }
  } catch (err) {
    console.error("[email] appointment confirmation failed:", err);
  }
}
