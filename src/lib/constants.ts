export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "appointment_booked",
  "visited",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Allowed manual transitions in the panel UI and on PATCH /api/leads/[id].
// `qualified → appointment_booked` is intentionally NOT here — that hop
// happens automatically when Calendly fires its webhook. Webhooks and the
// public feedback flow bypass this matrix for legitimate reasons.
export const LEAD_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  new: ["contacted", "lost"],
  contacted: ["qualified", "lost"],
  qualified: ["lost"],
  appointment_booked: ["visited", "lost"],
  visited: [],
  lost: [],
};

export const canTransition = (from: LeadStatus, to: LeadStatus) =>
  from === to || LEAD_TRANSITIONS[from].includes(to);

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "completed",
  "no_show",
  "cancelled",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
