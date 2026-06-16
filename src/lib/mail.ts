// Transactional mail via the ClinicEssential notification service. Env-gated
// like turnstile.ts / r2.ts: disabled unless MAIL_NOTIFICATION_KEY is set, and
// every send is best-effort — failures are logged, never thrown, so mail can
// never block a request.

const MAIL_URL =
  process.env.MAIL_NOTIFICATION_URL ||
  "https://notifications.clinicessential.com/api/mail-notification";
const MAIL_KEY = process.env.MAIL_NOTIFICATION_KEY;
// schedule_datetime is sent as a naive "YYYY-MM-DD HH:MM:SS" string; format
// "now" in this timezone so the service sends immediately.
const MAIL_TZ = process.env.MAIL_NOTIFICATION_TZ || "Asia/Kolkata";

export const isMailEnabled = (): boolean => !!MAIL_KEY;

const esc = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );

const formatNow = (tz: string): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const m: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") m[p.type] = p.value;
  return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute}:${m.second}`;
};

// Low-level send: multipart POST matching the service's contract.
export async function sendMailNotification(opts: {
  recipients: string;
  subject: string;
  html: string;
  scheduleDatetime?: string;
}): Promise<void> {
  if (!MAIL_KEY || !opts.recipients) return;
  try {
    const form = new FormData();
    form.append("recipients", opts.recipients);
    form.append("subject", opts.subject);
    form.append("schedule_datetime", opts.scheduleDatetime ?? formatNow(MAIL_TZ));
    form.append("mail_body", opts.html);

    const res = await fetch(MAIL_URL, {
      method: "POST",
      // Content-Type (with boundary) is set automatically for FormData bodies.
      headers: { "x-mail-key": MAIL_KEY, Accept: "application/json" },
      body: form,
    });
    if (!res.ok) {
      console.error(
        "[mail] notification failed:",
        res.status,
        await res.text().catch(() => ""),
      );
    }
  } catch (err) {
    console.error("[mail] notification error:", err);
  }
}

// ─── Notifications to the clinic (Client.email) ──────────────────────────

export async function notifyNewLead(
  to: string | null | undefined,
  lead: { name: string; phone: string; source?: string | null },
): Promise<void> {
  if (!to) return;
  await sendMailNotification({
    recipients: to,
    subject: `New lead: ${lead.name}`,
    html:
      `<p>A new lead was captured.</p><ul>` +
      `<li><strong>Name:</strong> ${esc(lead.name)}</li>` +
      `<li><strong>Phone:</strong> ${esc(lead.phone)}</li>` +
      (lead.source ? `<li><strong>Source:</strong> ${esc(lead.source)}</li>` : "") +
      `</ul>`,
  });
}

export async function notifyNewAppointment(
  to: string | null | undefined,
  appt: {
    name?: string | null;
    phone?: string | null;
    whenLabel?: string | null;
    via?: string;
  },
): Promise<void> {
  if (!to) return;
  await sendMailNotification({
    recipients: to,
    subject: `New appointment: ${appt.name ?? "Unnamed"}`,
    html:
      `<p>A new appointment was booked${appt.via ? ` via ${esc(appt.via)}` : ""}.</p><ul>` +
      `<li><strong>Patient:</strong> ${esc(appt.name ?? "Unnamed")}</li>` +
      (appt.phone ? `<li><strong>Phone:</strong> ${esc(appt.phone)}</li>` : "") +
      (appt.whenLabel ? `<li><strong>When:</strong> ${esc(appt.whenLabel)}</li>` : "") +
      `</ul>`,
  });
}

// ─── Confirmation to the patient ─────────────────────────────────────────

export async function sendAppointmentConfirmation(params: {
  to: string;
  name?: string;
  whenLocalLabel: string;
  clinicName?: string;
}): Promise<void> {
  if (!params.to) return;
  const clinic = params.clinicName ? ` at ${esc(params.clinicName)}` : "";
  await sendMailNotification({
    recipients: params.to,
    subject: `Appointment confirmed${params.clinicName ? ` — ${params.clinicName}` : ""}`,
    html:
      `<p>Hi ${esc(params.name || "there")},</p>` +
      `<p>Your appointment${clinic} is confirmed for <strong>${esc(params.whenLocalLabel)}</strong>.</p>` +
      `<p>If you need to reschedule, please contact the clinic.</p>`,
  });
}
