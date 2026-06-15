// Env-gated transactional email (SMTP via nodemailer). Mirrors the no-op
// pattern of turnstile.ts / r2.ts: disabled unless SMTP_HOST is set, and all
// sends are best-effort — failures are logged, never thrown, so email can
// never block a booking.

const SMTP_HOST = process.env.SMTP_HOST;

export const isEmailEnabled = (): boolean => !!SMTP_HOST;

export async function sendAppointmentConfirmation(params: {
  to: string;
  name?: string;
  whenLocalLabel: string;
  clinicName?: string;
}): Promise<void> {
  if (!SMTP_HOST || !params.to) return;
  try {
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });

    const from =
      process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@localhost";
    const clinic = params.clinicName ? ` at ${params.clinicName}` : "";

    await transport.sendMail({
      from,
      to: params.to,
      subject: `Appointment confirmed${params.clinicName ? ` — ${params.clinicName}` : ""}`,
      text:
        `Hi ${params.name || "there"},\n\n` +
        `Your appointment${clinic} is confirmed for ${params.whenLocalLabel}.\n\n` +
        `If you need to reschedule, please contact the clinic.\n`,
    });
  } catch (err) {
    console.error("[email] appointment confirmation failed:", err);
  }
}
